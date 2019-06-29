# gatsby-plugin-s3

[![](https://img.shields.io/npm/v/gatsby-plugin-s3.svg?style=flat)](https://npmjs.com/package/gatsby-plugin-s3)
[![](https://img.shields.io/travis/jariz/gatsby-plugin-s3/master.svg?label=unix&style=flat&logo=travis)](https://travis-ci.org/jariz/gatsby-plugin-s3)
[![](https://img.shields.io/azure-devops/build/jarizw/jarizw/1.svg?label=windows&style=flat&logo=azuredevops)](https://dev.azure.com/jarizw/jarizw/_build?definitionId=1)

![](https://jari.lol/KCB4gNo4Xg.gif)  

Enables you to deploy your gatsby site to a S3 bucket.  
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

Additionally, these can be set in a local `.env` file too, but this requires a bit more setup work. [See the recipe here](recipes/with-dotenv.md).

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
    enableS3StaticWebsiteHosting: true
};
```

Read the full spec with explanation of each field here:  

https://github.com/jariz/gatsby-plugin-s3/blob/master/src/constants.ts#L15-L60

## Recipes

Several recipes are available:

### Adding environment specific settings

Learn how to retrieve AWS credentials from a .env file.
Additionally setup a different bucket name depending on your environment.

- [See the recipe](recipes/with-dotenv.md)

### Using a different content type for files

Learn how to override the content type gatsby-plugin-s3 sets on your files.

- [See the recipe](recipes/custom-content-type.md) 


### Using CloudFront with gatsby-plugin-s3

CloudFront is a global CDN and can be used to make your blazing fast Gatsby site load even faster, particularly for first-time visitors. Additionally, CloudFront provides the easiest way to give your S3 bucket a custom domain name and HTTPS support.  

- [See the recipe](recipes/with-cloudfront.md) 

### Using serverless with gatsby-plugin-s3

[Serverless](https://serverless.com) can be used in combination with gatsby-plugin-s3, swapping the plugin's deployment step for `sls deploy` instead.  
Serverless will give you the added advantage of being able to add multiple AWS services such as Lambda, CloudFront, and more all in the same repo, deployment step and CloudFormation stack while still being able to profit from all the optimisations gatsby-plugin-s3 does.

- [See the recipe](recipes/with-serverless.md)  
Bare bones implementation details on how to set up serverless & gatsby-plugin-s3
- [See the `with-serverless` example](examples/with-serverless)  


### Using Yandex S3 or any AWS supported services with gatsby-plugin-s3

To use Yandex S3 or any supported AWS services you need only to change region & customAwsEndpointHostname params (provided by service) before deploy.
Yandex example:
```typescript
{
    bucketName: 'YOUR_BUCKET_NAME',
    region: 'us-east-1',
    customAwsEndpointHostname: 'storage.yandexcloud.net'
};
```

### Deploying your gatsby site under a prefix in your bucket

You can deploy your site to a prefix, leaving all other data in the bucket intact.  
`gatsby-plugin-s3` respects the `pathPrefix` gatsby option with no additional setup needed for this plugin, so you can [follow the guide in the gatsby docs.](https://www.gatsbyjs.org/docs/path-prefix/) 

### AWS S3 Routing Rules Limit

AWS S3 has an undocumented limit on the number of Routing Rules that can be applied to a bucket.  Unfortunately this limits 
the number of 302 (temporary) redirects you can create.  For 301 (permanent) redirects, a way to get around the limit is 
[setting the `x-amz-website-redirect-location` header on an empty object](https://docs.aws.amazon.com/AmazonS3/latest/dev/how-to-page-redirect.html).
To enable this behavior, set the `generateRedirectObjectsForPermanentRedirects` configuration option to `true`.
