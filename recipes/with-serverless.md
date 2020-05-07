---
title: Using Serverless with gatsby-plugin-s3
description: Serverless can be used in combination with gatsby-plugin-s3, swapping the plugin's deployment step for `sls deploy` instead.
---

It will give you the added advantage of being able to add lambda functions, a cloudfront CDN in front of your bucket and other functionality, all in the same repo, deployment step and CloudFormation stack while still being able to profit from all the optimisations gatsby-plugin-s3 does.

## Install serverless and required plugins
First things first: install serverless and the s3 sync plugin.
```bash
npm i -D serverless serverless-s3-sync
```

## Create serverless config

Next up, create a serverless config file (`serverless.yaml`), that makes use of the routing rules and params that gatsby-plugin-s3 generates.
An example:

```yaml
service: my-stack-name-replace-me-please

plugins:
- serverless-s3-sync

provider:
  name: aws
  region: ${file(./.cache/s3.config.json):region}

custom:
  frontendBucketName: ${file(./.cache/s3.config.json):bucketName}
  s3Sync:
  - bucketName: ${self:custom.frontendBucketName}
    localDir: public
    acl: public-read
    defaultContentType: text/html
    params: ${file(./.cache/s3.params.json)}

resources:
  Resources:
    FrontendBucket:
      Type: AWS::S3::Bucket
      Properties:
        BucketName: ${self:custom.frontendBucketName}
        AccessControl: PublicRead
        WebsiteConfiguration:
          IndexDocument: index.html
          ErrorDocument: 404.html
          RoutingRules: ${file(./.cache/s3.sls.routingRules.json)}
```

What is happening here? Let's break it down a bit.  
With this config file you have a setup that is very similar to what the plugin's `deploy` command does.  
We configure the plugin, and declare a 'resource' (`FrontendBucket`) that will ensure our bucket gets created before we deploy to it.

This makes use of 3 files that the `deploy` command of gatsby-plugin-s3 uses internally as well:

- `s3.sls.routingRules.json`: the generated [routing rules](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-websiteconfiguration-routingrules.html)
- `s3.params.json`: the generated [params](https://github.com/aws/aws-sdk-js/blob/83ebfbcc6ab30b9a486b15cdede26a1bd03c72e4/clients/s3.d.ts#L3573) for all files.
- `s3.config.json`: a dump of the options that get passed to the plugin.  
You can replace these with hardcoded values into the config if you wish, using the config however makes the plugin configuration the single source of truth regarding bucketname & region.

## Swap out deploy script

OK, Final step: now that serverless is good to go, swap out your old deploy script with your shiny new serverless one✨

```diff
"scripts": {
- "deploy": "gatsby-plugin-s3 deploy",
+ "deploy": "sls deploy",
}
```

## That's it!
You can now start adding [lambda functions](https://serverless.com/framework/docs/providers/aws/guide/functions/), [cloudfront](https://github.com/serverless/examples/tree/master/aws-node-single-page-app-via-cloudfront), and other AWS services to your config file.

