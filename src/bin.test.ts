import chalk from 'chalk';
import fetch from 'node-fetch';

const { TESTING_ENDPOINT } = process.env;

if (!TESTING_ENDPOINT) {
    throw new Error('TESTING_ENDPOINT env var must be set!');
}

console.debug(chalk`{blue.bold INFO} using {bold ${TESTING_ENDPOINT}} as endpoint to test against.`);

it('redirects from the index root', async () => {
    const response = await fetch(TESTING_ENDPOINT, { redirect: 'manual' });
    expect(response.status).toBeGreaterThanOrEqual(301);
    expect(response.status).toBeLessThanOrEqual(302);
    expect(response.headers.has('location')).toBe(true);
    const followedRedirect = await fetch(response.headers.get('location')!);
    expect(followedRedirect.status).toBe(200);
});

it('creates a temporary redirect', async () => {
    const response = await fetch(TESTING_ENDPOINT + 'hello-there', { redirect: 'manual' });
    expect(response.headers.get('location')).toBe(TESTING_ENDPOINT + 'client-only');
    expect(response.status).toBe(302);
    const followedRedirect = await fetch(response.headers.get('location')!);
    expect(followedRedirect.status).toBe(200);
});

it('creates a permanent redirect with a destination that is prefixed with itself', async () => {
    const response = await fetch(TESTING_ENDPOINT + 'blog', { redirect: 'manual' });
    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe(TESTING_ENDPOINT + 'blog/1');
    const followedRedirect = await fetch(response.headers.get('location')!);
    expect(followedRedirect.status).toBe(200);
});

it('rewrites client only routes', async () => {
    const response = await fetch(TESTING_ENDPOINT + 'client-only/test', { redirect: 'manual' });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(TESTING_ENDPOINT + 'client-only');
    const followedRedirect = await fetch(response.headers.get('location')!);
    expect(followedRedirect.status).toBe(200);
});
