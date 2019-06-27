import chalk from 'chalk';
import fetch from 'node-fetch';
// import { CACHING_PARAMS } from '../constants';
import path from 'path';
// import glob from 'glob';
// import mime from 'mime';
import { fork } from 'child_process';
import * as dotenv from 'dotenv';
import { Readable } from 'stream';

dotenv.config();
const { TARGET_BUCKET, TESTING_ENDPOINT } = process.env;

enum EnvironmentBoolean {
    False = '',
    True = 'true',
}

jest.setTimeout(30000);

const runScript = (cwd: string, script: string, args: string[], env: NodeJS.ProcessEnv) => {
    return new Promise<{exitCode: number, stdout: string, stderr: string}>((resolve, reject) => {
        const proc = fork(script, args, { env: Object.assign({}, process.env, env), cwd, stdio: 'pipe' });

        let running = true;
        let stdout = '';
        const stderr = '';

        (proc.stdout as Readable).on('data', (chunk: Buffer) => {
            const str = chunk.toString();
            console.log(str);
            stdout += str;
        });

        (proc.stderr as Readable).on('data', (chunk: Buffer) => {
            const str = chunk.toString();
            console.error(str);
            stdout += str;
        });

        proc.once('error', (err) => {
            if (running) {
                running = false;
                reject(err);
            }
        });

        proc.once('exit', (exitCode, signal) => {
            if (running) {
                running = false;
                if (exitCode !== null) {
                    resolve({ exitCode, stdout, stderr });
                } else {
                    // If exitCode is null signal will be non-null
                    // https://nodejs.org/api/child_process.html#child_process_event_exit
                    reject(new Error('Child process was unexpectedly terminated: ' + signal));
                }
            }
        });
    });
};

const resolveSiteDirectory = (site: string): string => path.resolve('./examples/', site);

const buildSite = async (site: string, env: NodeJS.ProcessEnv): Promise<string> => {
    const siteDirectory = resolveSiteDirectory(site);
    console.debug(chalk`{blue.bold INFO} building site {bold ${site}}.`);
    const output = await runScript(siteDirectory, './node_modules/gatsby/dist/bin/gatsby.js', ['build'], env);

    if (output.exitCode) {
        throw new Error(`Failed to build site ${site}, exited with error code ${output.exitCode}`);
    }
    console.debug(chalk`{blue.bold INFO} built site {bold ${site}}.`);

    return output.stdout;
};

const deploySite = async (site: string): Promise<string> => {
    const siteDirectory = resolveSiteDirectory(site);
    console.debug(chalk`{blue.bold INFO} deploying site {bold ${site}}.`);
    const output = await runScript(siteDirectory, './node_modules/gatsby-plugin-s3/bin.js', ['build', '-y'], {});

    if (output.exitCode) {
        throw new Error(`Failed to deploy site ${site}, exited with error code ${output.exitCode}`);
    }
    console.debug(chalk`{blue.bold INFO} deployed site {bold ${site}}.`);

    return output.stdout;
};

if (!TARGET_BUCKET) {
    throw new Error('TARGET_BUCKET env var must be set!');
}

console.debug(chalk`{blue.bold INFO} testing using bucket {bold ${TARGET_BUCKET}}.`);

describe('object-based redirects', () => {
    beforeAll(async () => {
        await buildSite('with-redirects', { LEGACY_REDIRECTS: EnvironmentBoolean.False });
        await deploySite('with-redirects');
    });

    test('trailing slash using WebsiteRedirectLocation', async () => {
        const response = await fetch(TESTING_ENDPOINT + '/trailing-slash/', { redirect: 'manual' });
        expect(response.status).toBe(301);
        expect(response.headers.get('location')).toBe(TESTING_ENDPOINT + '/trailing-slash/1');
    });
});

describe('rules-based redirects', () => {
    beforeAll(async () => {
        await buildSite('with-redirects', { LEGACY_REDIRECTS: EnvironmentBoolean.True });
        await deploySite('with-redirects');
    });

    test('trailing slash using WebsiteRedirectLocation', async () => {
        const response = await fetch(TESTING_ENDPOINT + '/trailing-slash/', { redirect: 'manual' });
        expect(response.status).toBe(301);
        expect(response.headers.get('location')).toBe(TESTING_ENDPOINT + '/trailing-slash/1');
    });
});