#!/usr/bin/env node

import '@babel/polyfill';
import S3, { RoutingRules } from 'aws-sdk/clients/s3';
import yargs from 'yargs';
import { CACHE_FILES, Params, PluginOptions } from './constants';
import { readJson } from 'fs-extra';
import klaw from 'klaw';
import PrettyError from 'pretty-error';
import streamToPromise from 'stream-to-promise';
import ora from 'ora';
import chalk from 'chalk';
import { Writable } from 'stream';
import { relative, join } from 'path';
import fs from 'fs';
import minimatch from 'minimatch';
import mime from 'mime';

const cli = yargs();
const pe = new PrettyError();

const createBucketIfNeedBe = async (config: PluginOptions, s3: S3) => {
    try {
        const { $response } = await s3.getBucketLocation({ Bucket: config.bucketName }).promise();
        if ($response.data && config.region && $response.data.LocationConstraint !== config.region) {
            throw new Error(`
             Bucket already exists, but in a different region than configured.
             Please (re)move it in/to the correct region, or update your region configuration.
             
             Configured region: ${config.region}
             Detected region: ${$response.data.LocationConstraint || 'us-east-1'}
 `);
        }
    } catch (ex) {
        if (ex.code === 'NoSuchBucket') {
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

const deploy = async () => {
    const spinner = ora({ color: 'yellow', text: 'Configuring bucket...' }).start();
    try {
        const config: PluginOptions = await readJson(CACHE_FILES.config);
        const params: Params = await readJson(CACHE_FILES.params);
        const routingRules: RoutingRules = await readJson(CACHE_FILES.routingRules);
        
        const s3 = new S3({
            region: config.region
        });

        await createBucketIfNeedBe(config, s3);
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
        await streamToPromise(stream as any as Writable); // todo: find out why the typing won't allow this as-is
        await Promise.all(promises);
        spinner.succeed('Synced.');

        // we're gonna ask AWS where the bucket is at, because our own 'region' config value doesn't contain the full truth;
        // the region could also have been set through a env var or a global configuration
        const { $response: { data } } = await s3.getBucketLocation({ Bucket: config.bucketName }).promise();
        
        if (!data) {
            throw new Error('Unable to determine bucket region');
        }
        
        console.log(chalk`
        {bold Your website is online at:}
        {blue.underline http://${config.bucketName}.s3-website-${data.LocationConstraint || 'us-east-1'}.amazonaws.com}
`)
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
        () => {
        },
        deploy
    )
    .wrap(cli.terminalWidth())
    .demandCommand(1, `Pass --help to see all available commands and options.`)
    .strict()
    .showHelpOnFail(true)
    .recommendCommands()
    .parse(process.argv.slice(2));

