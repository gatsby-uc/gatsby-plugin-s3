# gatsby-plugin-s3

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

After configuring credentials (see below), you can now execute `npm run build && npm run deploy` to have your site be build and immediately deployed to S3.

## Credentials

### Globally

A couple of different methods of specifying credentials exist, the easiest one being using the AWS CLI:

```bash
# NOTE: ensure python is installed
pip install aws
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
    generateIndexPageForRedirect: true,
    generateMatchPathRewrites: true,
    removeNonexistentObjects: true
};
```

Read the full spec with explanation of each field here:  

https://github.com/jariz/gatsby-plugin-s3/blob/master/src/constants.ts#L15-L55

## Recipes

Several recipes are available:

### Using a different bucket name per environment

Learn how to retrieve AWS credentials from a .env file.
Additionally setup a different bucket name depending on your environment.

- [See the recipe](recipes/with-dotenv.md)

### Using a different content type for files

Learn how to override the content type gatsby-plugin-s3 sets on your files.

- [See the recipe](recipes/custom-content-type.md) 

### Using serverless with gatsby-plugin-s3

[Serverless](https://serverless.com) can be used in combination with gatsby-plugin-s3, swapping the plugin's deployment step for `sls deploy` instead.  
Serverless will give you the added advantage of being able to add lambda functions, a cloudfront CDN in front of your bucket and other functionality, all in the same repo, deployment step and CloudFormation stack while still being able to profit from all the optimisations gatsby-plugin-s3 does.

- [See the recipe](recipes/with-serverless.md)  
Bare bones implementation details on how to set up serverless & gatsby-plugin-s3
- [See the `with-serverless` example](examples/with-serverless)  
Advanced example that will show you how to set up a fully featured serverless stack with:  
    - S3.
    - CloudFront in front of S3. (optional)
    - Lambda serverless functions.

## Design choices made
My rationalizations for the choices I made regarding this plugin, mostly eying at what's being recommended on the gatsby website.

### Why have a separate deploy command?
For context: there's [a tutorial out there](http://lofi.fi/deploying-gatsbyjs-to-amazon-aws/) featured on the gatsby site telling you to add a post build hook that uploads your files.  
I believe deployment is a separate process, and a conscious choice a developer should make.  

_For instance_; if I were to run a build on a project that I'm new to, I would possibly be overriding production with my dev build!
The build process is very much something else than the deployment step.

As a separate bonus: making the deployment step a separate command also allows you to easily swap out it out for other deployment processes (e.g. [serverless](examples/with-serverless))

### Why not just use amplify-cli?

The [gatsby docs recommend amplify-cli](https://www.gatsbyjs.org/docs/deploying-to-s3-cloudfront#getting-started-aws-amplify), however, I tend to disagree.

- Redirects are lost (!)
- Client only routes will 404 (!!)
- Gatsby's [recommended caching rules](https://www.gatsbyjs.org/docs/caching/#caching) are not applied.
- Amplify CLI requires a lot of unnecessary setup steps that are identical between gatsby projects.
- Amplify CLI is very hard to use with CI environments (that aren't their own 🙄):
    - Amplify's CLI does not respect environment variables(?!), making it harder to use with a CI environment that isn't amplify.
    - Amplify's 'deploy' command has a prompt that can't be disabled making it impossible to use with CI environments.
