#!/usr/bin/env node

import '@babel/polyfill';
import S3, { RoutingRules } from 'aws-sdk/clients/s3';
import yargs, { Argv } from 'yargs';
import { CACHE_FILES, Params, PluginOptions } from './constants';
import { readJson } from 'fs-extra';
import klaw from 'klaw';
import PrettyError from 'pretty-error';
import streamToPromise from 'stream-to-promise';
import ora from 'ora';
import chalk from 'chalk';
import { Readable } from 'stream';
import { join, relative } from 'path';
import fs from 'fs';
import minimatch from 'minimatch';
import mime from 'mime';
import inquirer from 'inquirer';
import { config } from 'aws-sdk';

const cli = yargs();
const pe = new PrettyError();

const guessRegion = (s3: S3, constraint: void | string | undefined) => (
    constraint || s3.config.region || config.region
);

const getBucketInfo = async (config: PluginOptions, s3: S3): Promise<{ exists: boolean, region?: string }> => {
    try {
        const { $response } = await s3.getBucketLocation({ Bucket: config.bucketName }).promise();
        const detectedRegion = guessRegion(s3, ($response.data && $response.data.LocationConstraint));

        return {
            exists: true,
            region: detectedRegion
        };
    } catch (ex) {
        if (ex.code === 'NoSuchBucket') {
            return {
                exists: false,
                region: guessRegion(s3)
            };
        } else {
            throw ex;
        }
    }
};

const getParams = (path: string, params: Params): Partial<S3.Types.PutObjectRequest> => {
    let returned = {};
    for (const key of Object.keys(params)) {
        if (minimatch(path, key)) {
            returned = {
                ...params[key]
            };
        }
    }
    return returned;
};

const deploy = async ({ yes }: { yes: boolean }) => {
    const spinner = ora({ text: 'Retrieving bucket info...', color: 'magenta' }).start();

    try {
        const config: PluginOptions = await readJson(CACHE_FILES.config);
        const params: Params = await readJson(CACHE_FILES.params);
        const routingRules: RoutingRules = await readJson(CACHE_FILES.routingRules);

        const s3 = new S3({
            region: config.region
        });

        const { exists, region } = await getBucketInfo(config, s3);

        if (!yes) {
            spinner.stop();
            console.log(chalk`
    {underline Please review the following:} ({dim pass -y next time to skip this})

    Deploying to bucket: {cyan.bold ${config.bucketName}}
    In region: {yellow.bold ${region || 'UNKNOWN!'}}
    Gatsby will: ${!exists ? chalk`{bold.greenBright CREATE}` : chalk`{bold.blueBright UPDATE} {dim (any existing website configuration will be overwritten!)}`}
`);
            const { confirm } = await inquirer.prompt([{
                message: 'OK?',
                name: 'confirm',
                type: 'confirm'
            }]);

            if (!confirm) {
                throw new Error('User aborted!');
            }
            spinner.start();
        }

        spinner.text = 'Configuring bucket...';
        spinner.color = 'yellow';

        if (!exists) {
            let params: S3.Types.CreateBucketRequest = {
                Bucket: config.bucketName,
                ACL: config.acl || 'public-read'
            };
            if (config.region) {
                params['CreateBucketConfiguration'] = {
                    LocationConstraint: config.region
                };
            }
            await s3.createBucket(params).promise();
        }

        await s3.putBucketWebsite({
            Bucket: config.bucketName,
            WebsiteConfiguration: {
                IndexDocument: {
                    Suffix: 'index.html'
                },
                ErrorDocument: {
                    Key: '404.html'
                },
                RoutingRules: routingRules
            }
        }, () => {
        }).promise();

        spinner.color = 'cyan';
        spinner.text = 'Uploading...';
        const dir = join(process.cwd(), 'public');
        const stream = klaw(dir);
        const promises: Promise<any>[] = [];

        stream.on('data', async ({ path, stats }) => {
            if (stats.isDirectory()) {
                return;
            }

            const key = relative(dir, path);
            const promise = s3.upload({
                Key: key,
                Body: fs.createReadStream(path),
                Bucket: config.bucketName,
                ContentType: mime.getType(key) || 'application/octet-stream',
                ACL: config.acl || 'public-read',
                ...getParams(key, params)
            }).promise();
            promises.push(promise);
            await promise;
            spinner.text = chalk`Uploading...\n{dim   Uploaded {cyan ${key}}}`;
        });
        
        // now we play the waiting game.
        await streamToPromise(stream as any as Readable); // todo: find out why the typing won't allow this as-is
        await Promise.all(promises);
        spinner.succeed('Synced.');

        // might as well ask the AWS sdk again where the bucket is at
        // because the global config is not very trustworthy
        const { $response: { data } } = await s3.getBucketLocation({ Bucket: config.bucketName }).promise();

        if (!data) {
            throw new Error('Unable to determine bucket region');
        }

        console.log(chalk`
        {bold Your website is online at:}
        {blue.underline http://${config.bucketName}.s3-website-${guessRegion(s3, data.LocationConstraint) || 'us-east-1'}.amazonaws.com}
`);
    }
    catch (ex) {
        spinner.fail('Failed.');
        console.error(pe.render(ex));
    }
};

cli
    .command(
        'deploy',
        'Deploy bucket. If it doesn\'t exist, it will be created. Otherwise, it will be updated.',
        (args: Argv) => (
            args.option('yes', {
                alias: 'y',
                describe: 'Skip confirmation prompt',
                boolean: true
            })
        ),
        deploy
    )
    .wrap(cli.terminalWidth())
    .demandCommand(1, `Pass --help to see all available commands and options.`)
    .strict()
    .showHelpOnFail(true)
    .recommendCommands()
    .parse(process.argv.slice(2));

