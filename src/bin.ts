#!/usr/bin/env node

import '@babel/polyfill';
import 'fs-posix';
import S3, { NextToken, RoutingRules } from 'aws-sdk/clients/s3';
import yargs from 'yargs';
import { CACHE_FILES, GatsbyRedirect, Params, S3PluginOptions } from './constants';
import { readJson } from 'fs-extra';
import klaw from 'klaw';
import PrettyError from 'pretty-error';
import streamToPromise from 'stream-to-promise';
import ora from 'ora';
import chalk from 'chalk';
import { Readable } from 'stream';
import { join, relative, resolve, sep } from 'path';
import { resolve as resolveUrl } from 'url';
import fs from 'fs';
import util from 'util';
import minimatch from 'minimatch';
import mime from 'mime';
import inquirer from 'inquirer';
import { config as awsConfig } from 'aws-sdk';
import { createHash, randomBytes } from 'crypto';
import isCI from 'is-ci';
import { getS3WebsiteDomainUrl, pick, withoutLeadingSlash } from './util';
import { AsyncFunction, asyncify, parallelLimit } from 'async';
import proxy from 'proxy-agent';
import globToRegExp from 'glob-to-regexp';
import { EOL } from 'os';
import readline from 'readline';

const pe = new PrettyError();

const OBJECTS_TO_REMOVE_PER_REQUEST = 1000;

const promisifiedParallelLimit: <T, E = Error>(
    tasks: Array<AsyncFunction<T, E>>,
    limit: number
) => // Have to cast this due to https://github.com/DefinitelyTyped/DefinitelyTyped/issues/20497
// eslint-disable-next-line @typescript-eslint/no-explicit-any
Promise<T[]> = util.promisify(parallelLimit) as any;

const promisifiedFs = {
    exists: util.promisify(fs.exists),
    open: util.promisify(fs.open),
    appendFile: util.promisify(fs.appendFile),
    rename: util.promisify(fs.rename),
};

const guessRegion = (s3: S3, constraint?: string): string | undefined =>
    constraint ?? s3.config.region ?? awsConfig.region;

const getBucketInfo = async (config: S3PluginOptions, s3: S3): Promise<{ exists: boolean; region?: string }> => {
    try {
        const { $response } = await s3.getBucketLocation({ Bucket: config.bucketName }).promise();

        const detectedRegion = guessRegion(s3, ($response.data && $response.data.LocationConstraint) || undefined);
        return {
            exists: true,
            region: detectedRegion,
        };
    } catch (ex) {
        if (ex.code === 'NoSuchBucket') {
            return {
                exists: false,
                region: guessRegion(s3),
            };
        }
        throw ex;
    }
};

const getParams = (path: string, params: Params): Partial<S3.Types.PutObjectRequest> => {
    let returned = {};
    for (const key of Object.keys(params)) {
        if (minimatch(path, key)) {
            returned = {
                ...returned,
                ...params[key],
            };
        }
    }

    return returned;
};

type CachedS3Object = Pick<S3.Object, 'Key' | 'ETag'>;
type ObjectMap = Map<CachedS3Object['Key'], CachedS3Object>;

const listAllObjects = async (s3: S3, bucketName: string, bucketPrefix: string | undefined): Promise<ObjectMap> => {
    const map: ObjectMap = new Map();

    let token: NextToken | undefined;
    do {
        const response = await s3
            .listObjectsV2({
                Bucket: bucketName,
                ContinuationToken: token,
                Prefix: bucketPrefix,
            })
            .promise();

        if (response.Contents) {
            response.Contents.forEach(o => {
                map.set(o.Key, o);
            });
        }

        token = response.NextContinuationToken;
    } while (token);

    return map;
};

const loadObjectsFromCache = async (): Promise<ObjectMap | undefined> => {
    if (!(await promisifiedFs.exists(CACHE_FILES.objectList))) {
        return undefined;
    }
    const map: ObjectMap = new Map();
    const fileStream = fs.createReadStream(CACHE_FILES.objectList);
    try {
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity,
        });

        for await (const line of rl) {
            if (/\S/.test(line)) {
                const obj: CachedS3Object = JSON.parse(line);
                map.set(obj.Key, obj);
            }
        }
    } finally {
        fileStream.close();
    }

    return map.size > 0 ? map : undefined;
};

const writeObjectsToCache = async (objects: ObjectMap): Promise<void> => {
    // write to tmp file in case other process is writing at the same time
    const tmpFile = `${CACHE_FILES.objectList}.tmp${randomBytes(4).toString('hex')}`;
    const fd = await promisifiedFs.open(tmpFile, 'w');
    try {
        for (let obj of objects.values()) {
            obj = pick(obj, 'ETag', 'Key');
            const line = JSON.stringify(obj, undefined, 0);
            await promisifiedFs.appendFile(fd, line + EOL);
        }
    } finally {
        fs.closeSync(fd);
    }
    await promisifiedFs.rename(tmpFile, CACHE_FILES.objectList);
};

const createSafeS3Key = (key: string): string => {
    if (sep === '\\') {
        return key.replace(/\\/g, '/');
    }

    return key;
};

export interface DeployArguments {
    yes?: boolean;
    bucket?: string;
    userAgent?: string;
}
export const deploy = async ({ yes, bucket, userAgent }: DeployArguments = {}) => {
    const spinner = ora({ text: 'Retrieving bucket info...', color: 'magenta', stream: process.stdout }).start();
    let dontPrompt = yes;

    const uploadQueue: Array<AsyncFunction<void, Error>> = [];

    try {
        const config: S3PluginOptions = await readJson(CACHE_FILES.config);
        const params: Params = await readJson(CACHE_FILES.params);
        const routingRules: RoutingRules = await readJson(CACHE_FILES.routingRules);
        const redirectObjects: GatsbyRedirect[] = fs.existsSync(CACHE_FILES.redirectObjects)
            ? await readJson(CACHE_FILES.redirectObjects)
            : [];

        // Override the bucket name if it is set via command line
        if (bucket) {
            config.bucketName = bucket;
        }

        let httpOptions = {};
        if (process.env.HTTP_PROXY) {
            httpOptions = {
                agent: proxy(process.env.HTTP_PROXY),
            };
        }

        httpOptions = {
            agent: process.env.HTTP_PROXY ? proxy(process.env.HTTP_PROXY) : undefined,
            timeout: config.timeout,
            connectTimeout: config.connectTimeout,
            ...httpOptions,
        };

        const s3 = new S3({
            region: config.region,
            endpoint: config.customAwsEndpointHostname,
            customUserAgent: userAgent ?? '',
            httpOptions,
            logger: config.verbose ? console : undefined,
            retryDelayOptions: {
                customBackoff: process.env.fixedRetryDelay ? () => Number(config.fixedRetryDelay) : undefined,
            },
        });

        const { exists, region } = await getBucketInfo(config, s3);

        if (isCI && !dontPrompt) {
            dontPrompt = true;
        }

        if (!dontPrompt) {
            spinner.stop();
            console.log(chalk`
    {underline Please review the following:} ({dim pass -y next time to skip this})

    Deploying to bucket: {cyan.bold ${config.bucketName}}
    In region: {yellow.bold ${region ?? 'UNKNOWN!'}}
    Gatsby will: ${
        !exists
            ? chalk`{bold.greenBright CREATE}`
            : chalk`{bold.blueBright UPDATE} {dim (any existing website configuration will be overwritten!)}`
    }
`);
            const { confirm } = await inquirer.prompt([
                {
                    message: 'OK?',
                    name: 'confirm',
                    type: 'confirm',
                },
            ]);

            if (!confirm) {
                throw new Error('User aborted!');
            }
            spinner.start();
        }

        spinner.text = 'Configuring bucket...';
        spinner.color = 'yellow';

        if (!exists) {
            const createParams: S3.Types.CreateBucketRequest = {
                Bucket: config.bucketName,
                ACL: config.acl === null ? undefined : config.acl ?? 'public-read',
            };
            if (config.region) {
                createParams.CreateBucketConfiguration = {
                    LocationConstraint: config.region,
                };
            }
            await s3.createBucket(createParams).promise();
        }

        if (config.enableS3StaticWebsiteHosting) {
            const websiteConfig: S3.Types.PutBucketWebsiteRequest = {
                Bucket: config.bucketName,
                WebsiteConfiguration: {
                    IndexDocument: {
                        Suffix: 'index.html',
                    },
                    ErrorDocument: {
                        Key: '404.html',
                    },
                },
            };

            if (routingRules.length) {
                websiteConfig.WebsiteConfiguration.RoutingRules = routingRules;
            }

            await s3.putBucketWebsite(websiteConfig).promise();
        }

        spinner.text = 'Listing objects...';
        spinner.color = 'green';
        const objects =
            (config.cacheS3ObjectList && (await loadObjectsFromCache())) ||
            (await listAllObjects(s3, config.bucketName, config.bucketPrefix));

        spinner.color = 'cyan';
        spinner.text = 'Syncing...';
        const publicDir = resolve('./public');
        const stream = klaw(publicDir);
        const isKeyInUse: { [objectKey: string]: boolean } = {};

        stream.on('data', ({ path, stats }) => {
            if (!stats.isFile()) {
                return;
            }
            uploadQueue.push(
                asyncify(async () => {
                    let key = createSafeS3Key(relative(publicDir, path));
                    if (config.bucketPrefix) {
                        key = `${config.bucketPrefix}/${key}`;
                    }
                    const readStream = fs.createReadStream(path);
                    const hashStream = readStream.pipe(createHash('md5').setEncoding('hex'));
                    const data = await streamToPromise(hashStream);

                    const tag = `"${data}"`;
                    const object = objects.get(key);
                    const objectUnchanged = object && object.ETag === tag;

                    isKeyInUse[key] = true;

                    if (!objectUnchanged) {
                        try {
                            const upload = new S3.ManagedUpload({
                                service: s3,
                                params: {
                                    Bucket: config.bucketName,
                                    Key: key,
                                    Body: fs.createReadStream(path),
                                    ACL: config.acl === null ? undefined : config.acl ?? 'public-read',
                                    ContentType: mime.getType(path) ?? 'application/octet-stream',
                                    ...getParams(key, params),
                                },
                            });

                            upload.on('httpUploadProgress', evt => {
                                spinner.text = chalk`Syncing...
{dim   Uploading {cyan ${key}} ${evt.loaded.toString()}/${evt.total.toString()}}`;
                            });

                            const uploadData = await upload.promise();
                            objects.set(uploadData.Key, uploadData);

                            spinner.text = chalk`Syncing...\n{dim   Uploaded {cyan ${key}}}`;
                        } catch (ex) {
                            console.error(ex);
                            process.exit(1);
                        }
                    }
                })
            );
        });

        const base = config.protocol && config.hostname ? `${config.protocol}://${config.hostname}` : null;
        uploadQueue.push(
            ...redirectObjects.map(redirect =>
                asyncify(async () => {
                    const { fromPath, toPath: redirectPath } = redirect;
                    const redirectLocation = base ? resolveUrl(base, redirectPath) : redirectPath;

                    let key = withoutLeadingSlash(fromPath);
                    if (key.endsWith('/')) {
                        key = join(key, 'index.html');
                    }
                    key = createSafeS3Key(key);
                    if (config.bucketPrefix) {
                        key = withoutLeadingSlash(`${config.bucketPrefix}/${key}`);
                    }

                    const tag = `"${createHash('md5')
                        .update(redirectLocation)
                        .digest('hex')}"`;
                    const object = objects.get(key);
                    const objectUnchanged = object && object.ETag === tag;

                    isKeyInUse[key] = true;

                    if (objectUnchanged) {
                        // object with exact hash already exists, abort.
                        return;
                    }

                    try {
                        const upload = new S3.ManagedUpload({
                            service: s3,
                            params: {
                                Bucket: config.bucketName,
                                Key: key,
                                Body: redirectLocation,
                                ACL: config.acl === null ? undefined : config.acl ?? 'public-read',
                                ContentType: 'application/octet-stream',
                                WebsiteRedirectLocation: redirectLocation,
                                ...getParams(key, params),
                            },
                        });

                        const data = await upload.promise();
                        objects.set(data.Key, data);

                        spinner.text = chalk`Syncing...
{dim   Created Redirect {cyan ${key}} => {cyan ${redirectLocation}}}\n`;
                    } catch (ex) {
                        spinner.fail(chalk`Upload failure for object {cyan ${key}}`);
                        console.error(pe.render(ex));
                        process.exit(1);
                    }
                })
            )
        );

        await streamToPromise(stream as Readable);
        await promisifiedParallelLimit(uploadQueue, config.parallelLimit as number);

        if (config.removeNonexistentObjects) {
            const persistObjects = (config.retainObjectsPatterns ?? []).map(glob =>
                globToRegExp(glob, { globstar: true, extended: true })
            );
            const objectsToRemove: S3.ObjectIdentifierList = [];
            objects.forEach((_, Key) => {
                if (!Key || isKeyInUse[Key]) return;
                if (persistObjects.find(regexp => !regexp.test(Key))) return;

                objectsToRemove.push({ Key });
            });

            for (let i = 0; i < objectsToRemove.length; i += OBJECTS_TO_REMOVE_PER_REQUEST) {
                const objectsToRemoveInThisRequest = objectsToRemove.slice(i, i + OBJECTS_TO_REMOVE_PER_REQUEST);

                spinner.text = `Removing objects ${i + 1} to ${i + objectsToRemoveInThisRequest.length} of ${
                    objectsToRemove.length
                }`;

                const result = await s3
                    .deleteObjects({
                        Bucket: config.bucketName,
                        Delete: {
                            Objects: objectsToRemoveInThisRequest,
                            Quiet: true,
                        },
                    })
                    .promise();
                if (result.Deleted) {
                    result.Deleted.forEach(o => {
                        objects.delete(o.Key);
                    });
                }
            }
        }

        if (config.cacheS3ObjectList) {
            spinner.text = `Writing object ETags to Cache`;
            await writeObjectsToCache(objects);
        }

        spinner.succeed('Synced.');
        if (config.enableS3StaticWebsiteHosting) {
            const s3WebsiteDomain = getS3WebsiteDomainUrl(region ?? 'us-east-1');
            console.log(chalk`
            {bold Your website is online at:}
            {blue.underline http://${config.bucketName}.${s3WebsiteDomain}}
            `);
        } else {
            console.log(chalk`
            {bold Your website has now been published to:}
            {blue.underline ${config.bucketName}}
            `);
        }
    } catch (ex) {
        spinner.fail('Failed.');
        console.error(pe.render(ex));
        process.exit(1);
    }
};

export interface UpdateS3ObjectCacheArguments {
    bucket?: string;
    userAgent?: string;
}
export const updateS3ObjectCache = async ({ bucket, userAgent }: DeployArguments = {}) => {
    const spinner = ora({ text: 'Retrieving bucket info...', color: 'magenta', stream: process.stdout }).start();

    try {
        const config: S3PluginOptions = await readJson(CACHE_FILES.config);

        // Override the bucket name if it is set via command line
        if (bucket) {
            config.bucketName = bucket;
        }

        let httpOptions = {};
        if (process.env.HTTP_PROXY) {
            httpOptions = {
                agent: proxy(process.env.HTTP_PROXY),
            };
        }

        httpOptions = {
            agent: process.env.HTTP_PROXY ? proxy(process.env.HTTP_PROXY) : undefined,
            timeout: config.timeout,
            connectTimeout: config.connectTimeout,
            ...httpOptions,
        };

        const s3 = new S3({
            region: config.region,
            endpoint: config.customAwsEndpointHostname,
            customUserAgent: userAgent ?? '',
            httpOptions,
            logger: config.verbose ? console : undefined,
            retryDelayOptions: {
                customBackoff: process.env.fixedRetryDelay ? () => Number(config.fixedRetryDelay) : undefined,
            },
        });

        const { exists } = await getBucketInfo(config, s3);

        if (!exists) {
            throw new Error(`Bucket '${config.bucketName}' does not exist`);
        }

        spinner.text = 'Listing objects...';
        spinner.color = 'green';
        const objects = await listAllObjects(s3, config.bucketName, config.bucketPrefix);

        spinner.text = `Writing object ETags to Cache`;
        await writeObjectsToCache(objects);

        spinner.succeed('Cache Synced.');
    } catch (ex) {
        spinner.fail('Failed.');
        console.error(pe.render(ex));
        process.exit(1);
    }
};

yargs
    .command(
        ['deploy', '$0'],
        "Deploy bucket. If it doesn't exist, it will be created. Otherwise, it will be updated.",
        args =>
            args
                .option('yes', {
                    alias: 'y',
                    describe: 'Skip confirmation prompt',
                    boolean: true,
                })
                .option('bucket', {
                    alias: 'b',
                    describe: 'Bucket name (if you wish to override default bucket name)',
                })
                .option('userAgent', {
                    describe: 'Allow appending custom text to the User Agent string (Used in automated tests)',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }) as any,
        deploy as (args: { yes: boolean; bucket: string; userAgent: string }) => void
    )
    .command(
        ['update-s3-cache'],
        "Lists all objects in s3 and updates the local cache of ETags used by the 'cacheS3ObjectList' option",
        args =>
            args
                .option('bucket', {
                    alias: 'b',
                    describe: 'Bucket name (if you wish to override default bucket name)',
                })
                .option('userAgent', {
                    describe: 'Allow appending custom text to the User Agent string (Used in automated tests)',
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                }) as any,
        updateS3ObjectCache as (args: { bucket: string; userAgent: string }) => void
    )
    .wrap(yargs.terminalWidth())
    .demandCommand(1, `Pass --help to see all available commands and options.`)
    .strict()
    .showHelpOnFail(true)
    .recommendCommands()
    .parse(process.argv.slice(2));
