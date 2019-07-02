import fetch from 'node-fetch';
// import { CACHING_PARAMS } from '../constants';
// import glob from 'glob';
// import mime from 'mime';
import { buildSite, deploySite, TARGET_BUCKET, TESTING_ENDPOINT, EnvironmentBoolean, Permission } from './helpers';

jest.setTimeout(30000);

console.debug(`testing using bucket ${TARGET_BUCKET}.`);

describe('gatsby-plugin-s3', () => {
    beforeAll(async () => {
        await buildSite('with-redirects', {});
    });

    test(`IAM policy to enable testing permissions is present`, async () => {
        await expect(
            deploySite(
                'with-redirects',
                [
                    Permission.PutObject,
                    Permission.PutBucketAcl,
                    Permission.PutBucketWebsite,
                ]
            )
        ).rejects.toThrow();
    });

    it(`can create a bucket if it doesn't already exist`, async () => {
        await deploySite(
            'with-redirects',
            [
                Permission.PutObject,
                Permission.PutObjectAcl,
                Permission.CreateBucket,
                Permission.PutBucketAcl,
                Permission.PutBucketWebsite,
            ]
        );
    });
});

describe('object-based redirects', () => {
    beforeAll(async () => {
        await buildSite('with-redirects', { LEGACY_REDIRECTS: EnvironmentBoolean.False });
        await deploySite(
            'with-redirects',
            [
                Permission.CreateBucket,
                Permission.PutObject,
                Permission.PutBucketWebsite,
                Permission.DeleteObject,
            ]
        );
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
        await deploySite(
            'with-redirects',
            [
                Permission.CreateBucket,
                Permission.PutObject,
                Permission.PutBucketWebsite,
                Permission.DeleteObject,
            ]
        );
    });

    test('trailing slash using WebsiteRedirectLocation', async () => {
        const response = await fetch(TESTING_ENDPOINT + '/trailing-slash/', { redirect: 'manual' });
        expect(response.status).toBe(301);
        expect(response.headers.get('location')).toBe(TESTING_ENDPOINT + '/trailing-slash/1');
    });
});