# gatsby-plugin-s3

[![](https://img.shields.io/npm/v/gatsby-plugin-s3.svg?style=flat)](https://npmjs.com/package/gatsby-plugin-s3) [![CircleCI](https://img.shields.io/circleci/build/github/jariz/gatsby-plugin-s3)](https://circleci.com/gh/jariz/gatsby-plugin-s3)  

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

As mentioned above, the `bucketName` is required, but there's much more to configure (add to the `options` object) as you please:

| Property                                       | Type                                                                                                                             | Default                                                                                                                                                                             | Description                                                                                                                                                                                                                                                                                                                                                                                       |
|------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `bucketName`                                   | `string`                                                                                                                         | n/a                                                                                                                                                                                 | Your bucket name (required)                                                                                                                                                                                                                                                                                                                                                                       |
| `bucketPrefix`                                 | `string \| undefined`                                                                                                            | `undefined`                                                                                                                                                                         | An optional prefix/directory to use on the bucket. This requires the bucket to already be created. Do not include leading or trailing slashes. Can be useful with CloudFront originPath option.                                                                                                                                                                                                   |
| `region`                                       | `string \| undefined`                                                                                                            | [Whatever the AWS SDK decides is the default otherwise.](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-region.html#setting-region-environment-variable) | Your region.                                                                                                                                                                                                                                                                                                                                                                                      |
| `protocol`                                     | `'http' \| 'https' \| undefined`                                                                                                 | `undefined`                                                                                                                                                                         | The protocol of your site. If you are using a CDN or reverse-proxy (such as CloudFront) in front of S3. then you must fill out this and the `hostname` field to ensure redirects work correctly. If you are just using your S3 website directly, this is unnecessary..                                                                                                                            |
| `hostname`                                     | `string \| undefined`                                                                                                            | `undefined`                                                                                                                                                                         | The hostname of your site. See above.                                                                                                                                                                                                                                                                                                                                                             |
| `params`                                       | [`Params`](https://github.com/aws/aws-sdk-js/blob/83ebfbcc6ab30b9a486b15cdede26a1bd03c72e4/clients/s3.d.ts#L3573)` \| undefined` | Depending on your `mergeCachingParams` setting, either an empty object or [the recommended headers](https://www.gatsbyjs.org/docs/caching/).                                        | Custom params to apply to your files                                                                                                                                                                                                                                                                                                                                                              |
| `acl`                                          | `string \| null \| undefined`                                                                                                    | `"public-read"`                                                                                                                                                                     | Define bucket ACL. If you don't want to use an ACL, set this to null                                                                                                                                                                                                                                                                                                                              |
| `mergeCachingParams`                           | `boolean \| undefined`                                                                                                           | `true`                                                                                                                                                                              | Enable [Gatsby recommended caching settings](https://www.gatsbyjs.org/docs/caching/)                                                                                                                                                                                                                                                                                                              |
| `generateRoutingRules`                         | `boolean \| undefined`                                                                                                           | `true`                                                                                                                                                                              | The plugin will generate [routing rules](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-websiteconfiguration-routingrules.html) to be applied to the website config for all redirects it can find.                                                                                                                                                              |
| `generateRedirectObjectsForPermanentRedirects` | `boolean \| undefined`                                                                                                           | `false` (until 1.0)                                                                                                                                                                 | The plugin will not generate routing rules for permanent (301) redirects, but [will instead upload empty objects](https://docs.aws.amazon.com/AmazonS3/latest/dev/how-to-page-redirect.html) with the `x-amz-website-redirect-location` property. This can be used to get around the hard limit of 50 routing rules on AWS S3.                                                                    |
| `generateIndexPageForRedirect`                 | `boolean \| undefined`                                                                                                           | `true`                                                                                                                                                                              | The plugin will create a fake index page if a redirect from the root path is made - as a workaround, because routing rules can't be applied in that situation.                                                                                                                                                                                                                                    |
| `generateMatchPathRewrites`                    | `boolean \| undefined`                                                                                                           | `true`                                                                                                                                                                              | Generate rewrites for client only paths                                                                                                                                                                                                                                                                                                                                                           |
| `removeNonexistentObjects`                     | `boolean \| undefined`                                                                                                           | `true`                                                                                                                                                                              | Remove S3 objects if they no longer exist locally                                                                                                                                                                                                                                                                                                                                                 |
| `customAwsEndpointHostname`                    | `string \| undefined`                                                                                                            | `amazonaws.com`                                                                                                                                                                     | Custom AWS S3 endpoint.  [See our docs for all available options](https://gatsby-plugin-s3.jari.io/recipes/custom-endpoint)                                                                                                                                                                                                                                                                       |
| `enableS3StaticWebsiteHosting`                 | `boolean \| undefined`                                                                                                           | `true`                                                                                                                                                                              | Disables modifications to the S3 Static Website Hosting configuration. Without S3 Static Website Hosting some features (index.html rewriting, trailing slash redirects, and serverside redirects), will not function. Not recommended, but could be useful for preventing Cloud formation Stack Drift or suppressing Terraform noise if you don't need, the static website hosting functionality. |
| `parallelLimit`                                | `number \| undefined`                                                                                                            | `20`                                                                                                                                                                                | Max number of files to upload in parallel.                                                                                                                                                                                                                                                                                                                                                        |
## Recipes

Several recipes are available:

### Adding environment specific settings

Learn how to retrieve AWS credentials from a .env file.
Additionally setup a different bucket name depending on your environment.

- [See the recipe](https://gatsby-plugin-s3.jari.io/recipes/with-dotenv)

### Using a different content type for files

Learn how to override the content type gatsby-plugin-s3 sets on your files.

- [See the recipe](https://gatsby-plugin-s3.jari.io/recipes/custom-content-type)


### Using CloudFront with gatsby-plugin-s3

CloudFront is a global CDN and can be used to make your blazing fast Gatsby site load even faster, particularly for first-time visitors. Additionally, CloudFront provides the easiest way to give your S3 bucket a custom domain name and HTTPS support.

- [See the recipe](https://gatsby-plugin-s3.jari.io/recipes/with-cloudfront)

### Using serverless with gatsby-plugin-s3

[Serverless](https://serverless.com) can be used in combination with gatsby-plugin-s3, swapping the plugin's deployment step for `sls deploy` instead.  
Serverless will give you the added advantage of being able to add multiple AWS services such as Lambda, CloudFront, and more all in the same repo, deployment step and CloudFormation stack while still being able to profit from all the optimisations gatsby-plugin-s3 does.

- [See the recipe](https://gatsby-plugin-s3.jari.io/recipes/with-serverless)  
Bare bones implementation details on how to set up serverless & gatsby-plugin-s3
- [See the `with-serverless` example](examples/with-serverless)


### Using a proxy

Routing traffic from gatsby-plugin-s3 during the deployment through a http proxy can be done with a env var.

- [See the recipe](https://gatsby-plugin-s3.jari.io/recipes/with-proxy)

### Configuring a custom endpoint
Using Yandex, DigitalOcean, or any other S3-compliant storage service together with gatsby-plugin-s3

- [See the recipe](https://gatsby-plugin-s3.jari.io/recipes/with-proxy)

### Deploying your gatsby site under a prefix in your bucket

You can deploy your site to a prefix, leaving all other data in the bucket intact.
`gatsby-plugin-s3` respects the `pathPrefix` gatsby option with no additional setup needed for this plugin, so you can [follow the guide in the gatsby docs.](https://www.gatsbyjs.org/docs/path-prefix/)

### AWS S3 Routing Rules Limit

AWS S3 has an undocumented limit on the number of Routing Rules that can be applied to a bucket.  Unfortunately this limits
the number of 302 (temporary) redirects you can create.  For 301 (permanent) redirects, a way to get around the limit is
[setting the `x-amz-website-redirect-location` header on an empty object](https://docs.aws.amazon.com/AmazonS3/latest/dev/how-to-page-redirect.html).
To enable this behavior, set the `generateRedirectObjectsForPermanentRedirects` configuration option to `true`.
