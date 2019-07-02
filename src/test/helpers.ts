import path from 'path';
import { fork } from 'child_process';
import { Readable } from 'stream';
import * as dotenv from 'dotenv';
// import S3, { NextToken } from 'aws-sdk/clients/s3';

dotenv.config();
export const { TARGET_BUCKET, TESTING_ENDPOINT } = process.env;

export enum EnvironmentBoolean {
    False = '',
    True = 'true',
}

/*const s3 = new S3({
    customUserAgent: "TestPerms/Admin"
});*/

/**
 * Permissions to request from IAM when using the included policy for the test runner
 * Basic permissions (ListBucket, GetBucketLocation & GetObject) are automatically included
 */
export enum Permission {
    PutObject = 'PutObject',
    PutObjectAcl = 'PutObjectAcl',
    PutBucketWebsite = 'PutBucketWebsite',
    DeleteObject = 'DeleteObject',
    CreateBucket = 'CreateBucket',
    PutBucketAcl = 'PutBucketAcl',
}

export const runScript = (cwd: string, script: string, args: string[], env: NodeJS.ProcessEnv) => {
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

export const resolveSiteDirectory = (site: string): string => path.resolve('./examples/', site);

export const buildSite = async (site: string, env: NodeJS.ProcessEnv): Promise<string> => {
    const siteDirectory = resolveSiteDirectory(site);
    console.debug(`building site ${site}.`);
    const output = await runScript(siteDirectory, './node_modules/gatsby/dist/bin/gatsby.js', ['build'], env);

    if (output.exitCode) {
        throw new Error(`Failed to build site ${site}, exited with error code ${output.exitCode}`);
    }
    console.debug(`built site ${site}.`);

    return output.stdout;
};

export const deploySite = async (site: string, additionalPermissions: Permission[]): Promise<string> => {
    const siteDirectory = resolveSiteDirectory(site);
    const userAgent = 'TestPerms/' + additionalPermissions.join('+');
    // const userAgent = additionalPermissions.map(p => "TestPerms/" + p).join(" ");
    console.log(userAgent);
    console.debug(`deploying site ${site}.`);
    const output = await runScript(
        siteDirectory,
        './node_modules/gatsby-plugin-s3/bin.js',
        ['build', '-y', '--userAgent', userAgent],
        {}
    );

    if (output.exitCode) {
        throw new Error(`Failed to deploy site ${site}, exited with error code ${output.exitCode}`);
    }
    console.debug(`deployed site ${site}.`);

    return output.stdout;
};