import crypto from 'crypto';
import path from 'path';
import { fork } from 'child_process';
import { Readable } from 'stream';
import S3, { NextToken } from 'aws-sdk/clients/s3';

// IMPORTANT: Must match what's in test-infrastructure/template.tf
const bucketPrefix = 'gatsby-plugin-s3-tests-';
const bucketRandomCharacters = 12; // Must be an even number
const considerBucketsLeftoverIfOlderThan = 1000 * 60 * 60 * 1; // 1 hour
const region = 'eu-west-1';

export enum EnvironmentBoolean {
    False = '',
    True = 'true',
}

export const s3 = new S3({
    region,
    customUserAgent: 'TestPerms/Admin+PutObject',
    httpOptions: {
        proxy: process.env.HTTPS_PROXY,
    },
});

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

export const emptyBucket = async (bucketName: string): Promise<void> => {
    let token: NextToken | undefined;
    do {
        const response = await s3
            .listObjectsV2({
                Bucket: bucketName,
                ContinuationToken: token,
            })
            .promise();

        if (response.Contents && response.Contents.length > 0) {
            await s3
                .deleteObjects({
                    Bucket: bucketName,
                    Delete: {
                        Objects: response.Contents.map(o => ({ Key: o.Key as string })),
                    },
                })
                .promise();
        }

        token = response.NextContinuationToken;
    } while (token);
};

export const forceDeleteBucket = async (bucketName: string): Promise<void> => {
    await emptyBucket(bucketName);

    await s3
        .deleteBucket({
            Bucket: bucketName,
        })
        .promise();
};

export const generateBucketName = () => {
    return bucketPrefix + crypto.randomBytes(bucketRandomCharacters / 2).toString('hex');
};

export const runScript = (cwd: string, script: string, args: string[], env: NodeJS.ProcessEnv) => {
    return new Promise<{ exitCode: number; output: string }>((resolve, reject) => {
        const proc = fork(script, args, { env: { ...process.env, ...env }, cwd, stdio: 'pipe' });

        let running = true;
        let output = '';

        (proc.stdout as Readable).on('data', (chunk: Buffer) => {
            const str = chunk.toString();
            console.log(str);
            output += str;
        });

        (proc.stderr as Readable).on('data', (chunk: Buffer) => {
            const str = chunk.toString();
            console.warn(str);
            output += str;
        });

        proc.once('error', err => {
            if (running) {
                running = false;
                reject(err);
            }
        });

        proc.once('exit', (exitCode, signal) => {
            if (running) {
                running = false;
                if (exitCode !== null) {
                    resolve({ exitCode, output });
                } else {
                    // If exitCode is null signal will be non-null
                    // https://nodejs.org/api/child_process.html#child_process_event_exit
                    reject(new Error(`Child process was unexpectedly terminated: ${signal}`));
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

    return output.output;
};

export const deploySite = async (site: string, additionalPermissions: Permission[]): Promise<string> => {
    const siteDirectory = resolveSiteDirectory(site);
    const userAgent = `TestPerms/${additionalPermissions.join('+')}`;
    // const userAgent = additionalPermissions.map(p => "TestPerms/" + p).join(" ");
    console.log(userAgent);
    console.debug(`deploying site ${site}.`);
    const output = await runScript(
        siteDirectory,
        './node_modules/gatsby-plugin-s3/bin.js',
        ['-y', '--userAgent', userAgent],
        {}
    );

    if (output.exitCode) {
        throw new Error(
            `Failed to deploy site ${site}, exited with error \
code ${output.exitCode} and the following output:\n${output.output}`
        );
    }
    console.debug(`deployed site ${site}.`);

    return output.output;
};

export const cleanupExistingBuckets = async (deleteBuckets: boolean): Promise<void> => {
    const buckets = (await s3.listBuckets().promise()).Buckets;
    if (buckets) {
        const bucketsToDelete = buckets
            .filter(
                b =>
                    !b.CreationDate ||
                    b.CreationDate.valueOf() + considerBucketsLeftoverIfOlderThan < Date.now().valueOf()
            )
            .map(b => b.Name as string)
            .filter(n => n.startsWith(bucketPrefix));

        if (bucketsToDelete.length > 0) {
            if (deleteBuckets) {
                console.log('Deleting leftover test buckets:', bucketsToDelete);
                await Promise.all(bucketsToDelete.map(n => forceDeleteBucket(n)));
            } else {
                console.log('Detected leftover test buckets');
                console.log('Set environment variable CLEANUP_TEST_BUCKETS to 1 to remove:', bucketsToDelete);
            }
        }
    }
};
