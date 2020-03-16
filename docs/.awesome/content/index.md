---
title: gatsby-plugin-s3
description: Enables you to deploy your gatsby site to a S3 bucket.
---
![](https://jari.lol/KCB4gNo4Xg.gif)

Requires very little configuration, while optimizing your site as much as possible.

## Features:

- 📦 Fully handles the deployment process for you, all you need to configure is your bucket name.
    - Automatically creates/updates bucket with optimal configuration applied.
    - Syncs gatsby files to the bucket & updates metadata.
- ⏭ Redirects.
- 💾 Optimizes caching for you.
- ☁️ Optional serverless framework support if you want to take things a step further.
- ✏️ Add your own params to uploaded S3 objects (if you wish).

## Usage

Install the plugin:
```bash
npm i gatsby-plugin-s3
```

Add it to your `gatsby-config.js` & configure the bucket name (required)
```js
plugins: [
  {
      resolve: `gatsby-plugin-s3`,
      options: {
          bucketName: 'my-website-bucket'
      },
  },
]
```
_There are more fields that can be configured, see below._

Add a deployment script to your `package.json`
```json
"scripts": {
    ...
    "deploy": "gatsby-plugin-s3 deploy"
}
```

Optionally you can skip the confirmation prompt automatically by adding `--yes` like so:
```js
    "deploy": "gatsby-plugin-s3 deploy --yes"
```
When `gatsby-plugin-s3` detects a [CI](https://en.wikipedia.org/wiki/Continuous_integration) environment, it will automatically skip this prompt by default.

After configuring credentials (see below), you can now execute `npm run build && npm run deploy` to have your site be build and immediately deployed to S3.

## Credentials

### Globally

A couple of different methods of specifying credentials exist, the easiest one being using the AWS CLI:

```bash
# NOTE: ensure python is installed
pip install awscli
aws configure
```

### Environment variables
If you don't want to have your credentials saved globally (i.e. you're dealing with multiple tokens on the same environment), [they can be set as environment variables](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-environment.html), for example:

```bash
AWS_ACCESS_KEY_ID=xxxx AWS_SECRET_ACCESS_KEY=xxxx npm run deploy
```

Additionally, these can be set in a local `.env` file too, but this requires a bit more setup work. [See the recipe here](recipes/with-dotenv).

## Configuration
Most of the aspects of the plugin can be configured.  
Default configuration is as follows:

```typescript
{
    bucketName: '',
    region: undefined,
    protocol: undefined,
    hostname: undefined,
    params: {},
    mergeCachingParams: true,
    generateRoutingRules: true,
    generateRedirectObjectsForPermanentRedirects: false,
    generateIndexPageForRedirect: true,
    generateMatchPathRewrites: true,
    removeNonexistentObjects: true,
    customAwsEndpointHostname: undefined,
    enableS3StaticWebsiteHosting: true,
    parallelLimit: 20,
};
```

Read the full spec with explanation of each field here:

https://github.com/jariz/gatsby-plugin-s3/blob/master/src/constants.ts#L15-L60
