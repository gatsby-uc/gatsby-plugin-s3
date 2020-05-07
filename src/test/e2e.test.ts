import fetch from 'node-fetch';
import * as dotenv from 'dotenv';
// import { CACHING_PARAMS } from '../constants';
// import glob from 'glob';
// import mime from 'mime';
import {
    generateBucketName,
    buildSite,
    deploySite,
    forceDeleteBucket,
    cleanupExistingBuckets,
    EnvironmentBoolean,
    Permission,
} from './helpers';

jest.setTimeout(300000);
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
            console.error('[IMPORTANT] Failed to cleanup leftover buckets! All tests will now fail!');
            console.error(err);
            throw new Error('[IMPORTANT] Failed to cleanup leftover buckets! All tests will now fail!');
            // Note that even with this failure, Jest continues running tests but the results are unusable!
            // https://github.com/facebook/jest/issues/2713
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
        await buildSite('with-redirects', { TARGET_BUCKET: bucketName });
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
});

describe('object-based redirects', () => {
    beforeAll(async () => {
        await buildSite('with-redirects', { TARGET_BUCKET: bucketName, LEGACY_REDIRECTS: EnvironmentBoolean.False });
        await deploySite('with-redirects', [
            Permission.CreateBucket,
            Permission.PutObject,
            Permission.PutBucketWebsite,
            Permission.DeleteObject,
        ]);
    });

    test('trailing slash using WebsiteRedirectLocation', async () => {
        const response = await fetch(`${testingEndpoint}/trailing-slash/`, { redirect: 'manual' });
        expect(response.status).toBe(301);
        expect(response.headers.get('location')).toBe(`${testingEndpoint}/trailing-slash/1`);
    });
});

describe('rules-based redirects', () => {
    beforeAll(async () => {
        await buildSite('with-redirects', { TARGET_BUCKET: bucketName, LEGACY_REDIRECTS: EnvironmentBoolean.True });
        await deploySite('with-redirects', [
            Permission.CreateBucket,
            Permission.PutObject,
            Permission.PutBucketWebsite,
            Permission.DeleteObject,
        ]);
    });

    test('trailing slash using WebsiteRedirectLocation', async () => {
        const response = await fetch(`${testingEndpoint}/trailing-slash/`, { redirect: 'manual' });
        expect(response.status).toBe(301);
        expect(response.headers.get('location')).toBe(`${testingEndpoint}/trailing-slash/1`);
    });
});
