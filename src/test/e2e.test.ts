import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
import glob from 'glob';
import {
    buildSite,
    cleanupExistingBuckets,
    deploySite,
    EnvironmentBoolean,
    forceDeleteBucket,
    generateBucketName,
    Permission,
    resolveSiteDirectory,
    s3,
} from './helpers';
import 'jest-expect-message';

jest.setTimeout(150000);
dotenv.config();

const bucketName = generateBucketName();
const testingEndpoint = `http://${bucketName}.s3-website-eu-west-1.amazonaws.com`;

console.debug(`Testing using bucket ${bucketName}.`);

beforeAll(async () => {
    // If a previous test execution failed spectacularly, it's possible the bucket may have been left behind
    // Here we scan for leftover buckets warn about them/delete them.
    if (!process.env.SKIP_BUCKET_CLEANUP) {
        try {
            await cleanupExistingBuckets(!!process.env.CLEANUP_TEST_BUCKETS);
        } catch (err) {
            // We can't use console.error here because Jest swallows it.
            // I'd love to just throw an error instead of killing the process, but if we do that
            // Jest continues running tests but the results are unusable!
            // https://github.com/facebook/jest/issues/2713
            process.stderr.write('[IMPORTANT] Failed to cleanup leftover buckets! All tests will now fail!\n');
            process.stderr.write(`${err}\n`);
            process.exit(1);
        }
    }
});

afterAll(async () => {
    try {
        await forceDeleteBucket(bucketName);
    } catch (err) {
        console.error('Failed to delete bucket after test completion:', bucketName);
    }
});

describe('gatsby-plugin-s3', () => {
    beforeAll(async () => {
        await buildSite('with-redirects', { GATSBY_S3_TARGET_BUCKET: bucketName });
    });

    test(`IAM policy to enable testing permissions is present and bucket doesn't already exist`, async () => {
        await expect(
            deploySite('with-redirects', [Permission.PutObject, Permission.PutBucketAcl, Permission.PutBucketWebsite])
        ).rejects.toThrow();
    });

    test(`can create a bucket if it doesn't already exist`, async () => {
        await expect(
            deploySite('with-redirects', [
                Permission.PutObject,
                Permission.PutObjectAcl,
                Permission.CreateBucket,
                Permission.PutBucketAcl,
                Permission.PutBucketWebsite,
            ])
        ).resolves.toBeTruthy();
    });

    test(`correctly handles non-built files`, async () => {
        await deploySite('with-redirects', [
            Permission.PutObject,
            Permission.PutObjectAcl,
            Permission.CreateBucket,
            Permission.PutBucketAcl,
            Permission.PutBucketWebsite,
            Permission.DeleteObject,
        ]);
        console.log('[debug]', 'uploads', bucketName);
        async function createTestFile(Key: string) {
            await s3
                .putObject({
                    Bucket: bucketName,
                    Key,
                    Body: `test content for ${Key}`,
                })
                .promise();
        }
        await createTestFile('file.retain.js');
        await createTestFile('file.remove.js');
        await createTestFile('sub-folder/file.retain.js');
        await createTestFile('sub-folder/file.remove.js');
        await createTestFile('sub-folder/retain-folder/file.js');
        await createTestFile('retain-folder/file.js');
        await deploySite('with-redirects', [
            Permission.PutObject,
            Permission.PutObjectAcl,
            Permission.CreateBucket,
            Permission.PutBucketAcl,
            Permission.PutBucketWebsite,
            Permission.DeleteObject,
        ]);
        await expect(s3.headObject({ Bucket: bucketName, Key: 'file.retain.js' }).promise()).resolves.toBeTruthy();
        await expect(s3.headObject({ Bucket: bucketName, Key: 'file.remove.js' }).promise()).rejects.toThrow();
        await expect(
            s3.headObject({ Bucket: bucketName, Key: 'sub-folder/file.retain.js' }).promise()
        ).resolves.toBeTruthy();
        await expect(
            s3.headObject({ Bucket: bucketName, Key: 'sub-folder/file.remove.js' }).promise()
        ).rejects.toThrow();
        await expect(
            s3
                .headObject({
                    Bucket: bucketName,
                    Key: 'sub-folder/retain-folder/file.js',
                })
                .promise()
        ).resolves.toBeTruthy();
        await expect(
            s3.headObject({ Bucket: bucketName, Key: 'retain-folder/file.js' }).promise()
        ).resolves.toBeTruthy();
    });
});

describe('object-based redirects', () => {
    const siteDirectory = resolveSiteDirectory('with-redirects');
    beforeAll(async () => {
        await buildSite('with-redirects', {
            GATSBY_S3_TARGET_BUCKET: bucketName,
            GATSBY_S3_LEGACY_REDIRECTS: EnvironmentBoolean.False,
        });
        await deploySite('with-redirects', [
            Permission.PutObject,
            Permission.PutObjectAcl,
            Permission.CreateBucket,
            Permission.PutBucketAcl,
            Permission.PutBucketWebsite,
        ]);
    });

    const headerTests = [
        {
            name: 'html files',
            path: '/',
            cacheControl: 'public, max-age=0, must-revalidate',
            contentType: 'text/html',
        },
        {
            name: 'page-data files',
            path: '/page-data/index/page-data.json',
            cacheControl: 'public, max-age=0, must-revalidate',
            contentType: 'application/json',
        },
        {
            name: 'sw.js',
            path: '/sw.js',
            cacheControl: 'public, max-age=0, must-revalidate',
            contentType: 'application/javascript',
        },
        {
            name: 'static files',
            searchPattern: 'static/**/**.json',
            cacheControl: 'public, max-age=31536000, immutable',
            contentType: 'application/json',
        },
        {
            name: 'js files',
            searchPattern: '**/**/!(sw).js',
            cacheControl: 'public, max-age=31536000, immutable',
            contentType: 'application/javascript',
        },
        {
            name: 'css files',
            searchPattern: '**/**.css',
            cacheControl: 'public, max-age=31536000, immutable',
            contentType: 'text/css',
        },
    ];

    headerTests.forEach(t => {
        test(`caching and content type headers are correctly set for ${t.name}`, async () => {
            let path;
            if (t.path) {
                path = t.path;
            } else if (t.searchPattern) {
                console.log(`${siteDirectory}/`);
                const matchingFiles = glob.sync(t.searchPattern, { cwd: `${siteDirectory}/public`, nodir: true });
                path = `/${matchingFiles[0]}`;
                console.log(path);
            }

            if (!path) {
                throw new Error(`Failed to find matching file for pattern ${t.searchPattern}`);
            }

            const response = await fetch(`${testingEndpoint}${path}`);
            expect(response.status, `Error accessing ${testingEndpoint}${path}`).toBe(200);
            expect(response.headers.get('cache-control'), `Incorrect Cache-Control for ${path}`).toBe(t.cacheControl);
            expect(response.headers.get('content-type'), `Incorrect Content-Type for ${path}`).toBe(t.contentType);
        });
    });

    const redirectTests = [
        {
            name: 'from root',
            source: '/',
            expectedDestination: '/page-2',
            expectedResponseCode: 301,
        },
        {
            name: 'temporarily',
            source: '/hello-there',
            expectedDestination: '/client-only',
            expectedResponseCode: 302,
        },
        {
            name: 'to a child directory',
            source: '/blog',
            expectedDestination: '/blog/1',
            expectedResponseCode: 301,
        },
        {
            name: 'client-only routes',
            source: '/client-only/test',
            expectedDestination: '/client-only',
            expectedResponseCode: 302,
        },
        {
            name: 'from a path containing special characters',
            source: "/asdf123.-~_!%24%26'()*%2B%2C%3B%3D%3A%40%25",
            expectedDestination: '/special-characters',
            expectedResponseCode: 301,
        },
        {
            name: 'from a path with a trailing slash',
            source: '/trailing-slash/',
            expectedDestination: '/trailing-slash/1',
            expectedResponseCode: 301,
        },
    ];

    redirectTests.forEach(t => {
        test(`can redirect ${t.name}`, async () => {
            const response = await fetch(`${testingEndpoint}${t.source}`, { redirect: 'manual' });
            expect(response.status, `Incorrect response status for ${t.source}`).toBe(t.expectedResponseCode);
            expect(response.headers.get('location'), `Incorrect Content-Type for ${t.source}`).toBe(
                `${testingEndpoint}${t.expectedDestination}`
            );
        });
    });
});

describe('rules-based redirects', () => {
    beforeAll(async () => {
        await buildSite('with-redirects', {
            GATSBY_S3_TARGET_BUCKET: bucketName,
            GATSBY_S3_LEGACY_REDIRECTS: EnvironmentBoolean.True,
        });
        await deploySite('with-redirects', [
            Permission.CreateBucket,
            Permission.PutObject,
            Permission.PutBucketWebsite,
            Permission.DeleteObject,
        ]);
    });

    const redirectTests = [
        {
            name: 'from root',
            source: '/',
            expectedDestination: '/page-2',
            expectedResponseCode: 301,
        },
        {
            name: 'temporarily',
            source: '/hello-there',
            expectedDestination: '/client-only',
            expectedResponseCode: 302,
        },
        {
            name: 'to a child directory',
            source: '/blog',
            expectedDestination: '/blog/1',
            expectedResponseCode: 301,
        },
        {
            name: 'client-only routes',
            source: '/client-only/test',
            expectedDestination: '/client-only',
            expectedResponseCode: 302,
        },
        {
            name: 'from a path containing special characters',
            source: "/asdf123.-~_!%24%26'()*%2B%2C%3B%3D%3A%40%25",
            expectedDestination: '/special-characters',
            expectedResponseCode: 301,
        },
        {
            name: 'from a path with a trailing slash',
            source: '/trailing-slash/',
            expectedDestination: '/trailing-slash/1',
            expectedResponseCode: 301,
        },
    ];

    redirectTests.forEach(t => {
        test(`can redirect ${t.name}`, async () => {
            const response = await fetch(`${testingEndpoint}${t.source}`, { redirect: 'manual' });
            expect(response.status, `Incorrect response status for ${t.source}`).toBe(t.expectedResponseCode);
            expect(response.headers.get('location'), `Incorrect Content-Type for ${t.source}`).toBe(
                `${testingEndpoint}${t.expectedDestination}`
            );
        });
    });
});
