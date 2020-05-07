/* eslint-disable @typescript-eslint/no-non-null-assertion */

import chalk from 'chalk';
import fetch from 'node-fetch';
import { CACHING_PARAMS } from './constants';
import path from 'path';
import glob from 'glob';
import mime from 'mime';

const { TESTING_ENDPOINT } = process.env;

if (!TESTING_ENDPOINT) {
    throw new Error('TESTING_ENDPOINT env var must be set!');
}

console.debug(chalk`{blue.bold INFO} using {bold ${TESTING_ENDPOINT}} as endpoint to test against.`);

const PUBLIC_DIR = path.join(__dirname, '..', 'examples', 'with-redirects', 'public');

describe('applies caching and content type headers', () => {
    for (const pattern of Object.keys(CACHING_PARAMS)) {
        const params = CACHING_PARAMS[pattern];
        if (!('CacheControl' in params)) {
            continue;
        }

        // eslint-disable-next-line no-loop-func
        it(`to ${pattern} files`, async () => {
            // find a file that matches this pattern
            const files = glob.sync(pattern, { cwd: PUBLIC_DIR, nodir: true });
            const file = files[0];
            const response = await fetch(`${TESTING_ENDPOINT}/${file}`);
            const contentType = mime.getType(file) ?? 'application/octet-stream';
            expect(response.ok).toBe(true);
            expect(response.headers.get('cache-control')).toBe(params.CacheControl);
            expect(response.headers.get('content-type')).toBe(contentType);
        });
    }
});

describe('redirects', () => {
    test('from the index root', async () => {
        const response = await fetch(TESTING_ENDPOINT, { redirect: 'manual' });
        expect(response.status).toBeGreaterThanOrEqual(301);
        expect(response.status).toBeLessThanOrEqual(302);
        expect(response.headers.has('location')).toBe(true);
        const followedRedirect = await fetch(response.headers.get('location')!);
        expect(followedRedirect.status).toBe(200);
    });

    test('temporarily', async () => {
        const response = await fetch(`${TESTING_ENDPOINT}/hello-there`, { redirect: 'manual' });
        expect(response.headers.get('location')).toBe(`${TESTING_ENDPOINT}/client-only`);
        expect(response.status).toBe(302);
        const followedRedirect = await fetch(response.headers.get('location')!);
        expect(followedRedirect.status).toBe(200);
    });

    test('permanently with a destination that is prefixed with itself', async () => {
        const response = await fetch(`${TESTING_ENDPOINT}/blog`, { redirect: 'manual' });
        expect(response.status).toBe(301);
        expect(response.headers.get('location')).toBe(`${TESTING_ENDPOINT}/blog/1`);
        const followedRedirect = await fetch(response.headers.get('location')!);
        expect(followedRedirect.status).toBe(200);
    });

    test('client only routes', async () => {
        const response = await fetch(`${TESTING_ENDPOINT}/client-only/test`, { redirect: 'manual' });
        expect(response.status).toBe(302);
        expect(response.headers.get('location')).toBe(`${TESTING_ENDPOINT}/client-only`);
        const followedRedirect = await fetch(response.headers.get('location')!);
        expect(followedRedirect.status).toBe(200);
    });

    test('special characters using WebsiteRedirectLocation', async () => {
        const response = await fetch(`${TESTING_ENDPOINT}/asdf123.-~_!%24%26'()*%2B%2C%3B%3D%3A%40%25`, {
            redirect: 'manual',
        });
        expect(response.status).toBe(301);
        expect(response.headers.get('location')).toBe(`${TESTING_ENDPOINT}/special-characters`);
    });

    test('trailing slash using WebsiteRedirectLocation', async () => {
        const response = await fetch(`${TESTING_ENDPOINT}/trailing-slash/`, { redirect: 'manual' });
        expect(response.status).toBe(301);
        expect(response.headers.get('location')).toBe(`${TESTING_ENDPOINT}/trailing-slash/1`);
    });
});
