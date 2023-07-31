import crypto from 'crypto';
import path from 'path';
import { fork } from 'child_process';
import { ProxyAgent } from 'proxy-agent';
import { Readable } from 'stream';
import { S3, ListObjectsV2CommandOutput } from "@aws-sdk/client-s3";
import resolvePackagePath from 'resolve-package-path';
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import axios from "axios";

// IMPORTANT: Must match what's in test-infrastructure/template.tf
const bucketPrefix = 'gatsby-plugin-s3-tests-';
const bucketRandomCharacters = 12; // Must be an even number
const considerBucketsLeftoverIfOlderThan = 1000 * 60 * 60; // 1 hour
const region = 'us-east-1';

export enum EnvironmentBoolean {
    False = '',
    True = 'true',
}

export const getUrl = async (url: string) => axios.get(url, {
    maxRedirects: 0, validateStatus: (status) => status >= 200 && status < 500
})

export const makeAgent = (proxy?: string): ProxyAgent | undefined => proxy
    ? new ProxyAgent({ getProxyForUrl: () => proxy })
    : undefined

export const s3 = new S3({
    region,
    customUserAgent: 'TestPerms/Admin+PutObject',
    requestHandler: new NodeHttpHandler({
        httpAgent: makeAgent(process.env.HTTP_PROXY),
        httpsAgent: makeAgent(process.env.HTTPS_PROXY),
    }),
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
    PutBucketPublicAccessBlock = 'PutBucketPublicAccessBlock',
}

export const emptyBucket = async (bucketName: string): Promise<void> => {
    let token = null;
    do {
        const response: ListObjectsV2CommandOutput = await s3
            .listObjectsV2({
                Bucket: bucketName,
                ...(token ? { ContinuationToken: token } : {}),
            });

        if (response.Contents && response.Contents.length > 0) {
            await s3
                .deleteObjects({
                    Bucket: bucketName,
                    Delete: {
                        Objects: response.Contents.map(o => ({ Key: o.Key as string })),
                    },
                });
        }

        token = response.NextContinuationToken;
    } while (token);
};

export const forceDeleteBucket = async (bucketName: string): Promise<void> => {
    await emptyBucket(bucketName);

    await s3
        .deleteBucket({
            Bucket: bucketName,
        });
};

export const generateBucketName = () => bucketPrefix + crypto.randomBytes(bucketRandomCharacters / 2).toString('hex');

export const runScript = (cwd: string, script: string, args: string[], env: NodeJS.ProcessEnv) => new Promise<{
    exitCode: number;
    output: string
}>((resolve, reject) => {
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
                reject(new Error(`Child process was unexpectedly terminated: ${ signal }`));
            }
        }
    });
});

export function getPackageDirectory(packageName: string, startPath?: string): string {
    const searchPath = startPath ?? process.cwd();
    const packageJsonPath = resolvePackagePath(packageName, searchPath);
    if (!packageJsonPath) {
        throw new Error(`Failed to resolve package ${ packageName } from path "${ searchPath }".`);
    }
    return path.dirname(packageJsonPath);
}

export const buildSite = async (site: string, env: NodeJS.ProcessEnv): Promise<string> => {
    const siteDirectory = getPackageDirectory(site);
    const gatsbyPath = getPackageDirectory('gatsby', siteDirectory);
    console.debug(`building site ${ site }.`);
    const output = await runScript(siteDirectory, path.resolve(gatsbyPath, 'dist/bin/gatsby.js'), [ 'build' ], env);

    if (output.exitCode) {
        throw new Error(`Failed to build site ${ site }, exited with error code ${ output.exitCode }`);
    }
    console.debug(`built site ${ site }.`);

    return output.output;
};

export const deploySite = async (site: string, additionalPermissions: Permission[]): Promise<string> => {
    const siteDirectory = getPackageDirectory(site);
    const gatsbyPluginS3Path = getPackageDirectory('gatsby-plugin-s3', siteDirectory);
    const userAgent = `TestPerms/${ additionalPermissions.join('+') }`;
    // const userAgent = additionalPermissions.map(p => "TestPerms/" + p).join(" ");
    console.log(userAgent);
    console.debug(`deploying site ${ site }.`);
    const output = await runScript(
        siteDirectory,
        path.resolve(gatsbyPluginS3Path, 'bin.js'),
        [ '-y', '--userAgent', userAgent ],
        {}
    );

    if (output.exitCode) {
        throw new Error(
            `Failed to deploy site ${ site }, exited with error \
code ${ output.exitCode } and the following output:\n${ output.output }`
        );
    }
    console.debug(`deployed site ${ site }.`);

    return output.output;
};

export const cleanupExistingBuckets = async (deleteBuckets: boolean): Promise<void> => {
    const buckets = (await s3.listBuckets({})).Buckets;
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
