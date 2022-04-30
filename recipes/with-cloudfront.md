---
title: Using CloudFront with gatsby-plugin-s3
description: CloudFront is a global CDN and can be used to make your blazing fast Gatsby site load even faster, particularly for first-time visitors. Additionally, CloudFront provides the easiest way to give your S3 bucket a custom domain name and HTTPS support.
---

*Written by @JoshuaWalsh*

## CloudFront setup

There are two ways that you can connect CloudFront to an S3 origin. The most obvious way, which the AWS Console will suggest, is to type the bucket name in the Origin Domain Name field. This sets up an S3 origin, and allows you to configure CloudFront to use IAM to access your bucket. Unfortunately, it also makes it impossible to perform serverside (301/302) redirects, and it also means that directory indexes (having index.html be served when someone tries to access a directory) will only work in the root directory. You might not initially notice these issues, because Gatsby's clientside JavaScript compensates for the latter and plugins such as `gatsby-plugin-meta-redirect` can compensate for the former. But just because you can't see these issues, doesn't mean they won't affect search engines.

In order for all the features of your site to work correctly, you must instead use your S3 bucket's Static Website Hosting Endpoint as the CloudFront origin. This does (sadly) mean that your bucket will have to be configured for public-read, because when CloudFront is using an S3 Static Website Hosting Endpoint address as the Origin, it's incapable of authenticating via IAM.

**Note**: The above issues, directory indexes, serverside redirects and even client-only routes can be solved with [AWS Lambda@Edge functions](https://docs.aws.amazon.com/lambda/latest/dg/lambda-edge.html) while allowing you to keep the S3 Bucket private (*not* setup for static-hosting). See this alternative setup below.

## gatsby-plugin-s3 configuration

In the gatsby-plugin-s3 configuration file, there are a couple of optional parameters that you can usually leave blank, `protocol` and `hostname`. But when you're using CloudFront, these parameters are vital for ensuring redirects work correctly. If you omit these parameters, redirects will be performed relative to your S3 Static Website Hosting Endpoint. This means if a user visits your site via the CloudFront URL and hits a redirect, they will be redirected to your S3 Static Website Hosting Endpoint instead. This will disable HTTPS and (more importantly) will display an ugly and unprofessional URL in the user's address bar.

By specifying the `protocol` and `hostname` parameters, you can cause redirects to be applied relative to a domain of your choosing.

```javascript
{
    resolve: `gatsby-plugin-s3`,
    options: {
        bucketName: "my-example-bucket",
        protocol: "https",
        hostname: "www.example.com",
    },
}
```

If you use your site's URL elsewhere in gatsby-config.js, I have a tip for you. You can define the URL once at the top of the config:

```javascript
const siteAddress = new URL("https://www.example.com");
```

And then in the Gatsby config you can reference it like so:

```javascript
{
    resolve: `gatsby-plugin-s3`,
    options: {
        bucketName: "my-example-bucket",
        protocol: siteAddress.protocol.slice(0, -1),
        hostname: siteAddress.hostname,
    },
}
```

If you need the full address elsewhere in your config, you can access it via `siteAddress.href`.

## (Optional) Override caching settings for CloudFront & automate CloudFront invalidations

CloudFront by default will cache responses in accordance with the Cache-Control header, which is the same header that indicates how browsers (and proxy servers) should cache the response. gatsby-plugin-s3 adheres to [Gatsby's caching recommendations](https://www.gatsbyjs.org/docs/caching/#caching), which means that static files (CSS, JS, images) will be cached forever (or one year, whichever comes first) and content (HTML) will never be cached. This is a great policy for preventing users from seeing stale content, but it does mean that every request for an HTML document will cause a cache miss in CloudFront, requiring the file to be refetched from S3. Gatsby's catch-cry is "blazing fast" and there's room for an optimisation here.

In your Distribution's Cache Behaviour Settings, select "Customize" for Object Caching. In all 3 TTL fields, specify 31536000. This will cause CloudFront to ignore the Cache-Control header and instead cache every request for 1 year.

Next we need to ensure that your site's users aren't going to see stale content. You can do this by invalidating the CloudFront cache every time you deploy your site to S3. The easiest way to do this is to add a command to your npm deploy script within package.json.

```json
"deploy": "gatsby-plugin-s3 deploy --yes && aws cloudfront create-invalidation --distribution-id EXAMPLEDISTRIBUTIONID --paths \"/*\""
```

This means when you run `npm run deploy` the CloudFront cache will be invalidated after the deploy completes. (You'll need to change EXAMPLEDISTRIBUTIONID to your CloudFront Distribution's ID.)

Be aware that CloudFront invalidations do take a little bit of time, usually less than 1 minute but ocassionally up to 20 minutes. During this time, viewers may see stale content.

## (Optional) Domain canonicalisation

As mentioned previously, because we are using S3's Static Website Hosting feature our bucket has to be publicly accessible. This means that as well as visitors being able to access your site at it's main address (www.example.com) there's nothing stopping them viewing it at the Static Website Hosting Endpoint (my-example-bucket.s3-website-us-east-1.amazonaws.com) if they find the address for it. Additionally, if a link to this endpoint is ever published online, there's a chance that search engines may index it, possibly even penalising you for duplicate content.

In order to prevent any SEO impact, you can use the `gatsby-plugin-canonical-urls` plugin to canonicalise your site:

```javascript
{
    resolve: `gatsby-plugin-canonical-urls`,
    options: {
        siteUrl: "https://www.example.com",
    }
}
```

Or, if you're following my tip from above:

```javascript
{
    resolve: `gatsby-plugin-canonical-urls`,
    options: {
        siteUrl: siteAddress.href.slice(0, -1),
    }
}
```

## (Optional) Private S3 Bucket with CloudFront and Lambda@Edge Functions

To keep your S3 Bucket Private while serving a Gatsby powered website with CloudFront you can use the Lambda@Edge functions.

1. Viewer Request - runs after CloudFront receives a request from the user (browser, etc.)
2. Origin Request - runs before CloudFront make a request to S3 (non-cached files)
3. Origin Response - runs after CloudFront receives the response from S3
4. Viewer Response - runs before CloudFront responds to the user

#### Fix Directory Index Request

A very simple version of a Lambda function to fix this issues is as follows:

```javascript
exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;
  const uri = request.uri;

  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!uri.includes('.')) {
    request.uri += '/index.html';
  }

  callback(null, request);
};
```

If the URI ends with a trailing slash then add `index.html` to the end, or add `/index.html` when the URI does not include a `.`

A more *comprehensive* version can be found here, https://github.com/widdix/aws-cf-templates/blob/master/static-website/lambdaedge-index-document.yaml.
Which is also a CloudFormation template which you can use to deploy this Lambda@Edge function.

This Lambda@Edge function should be set as Viewer Request.

#### Fix Client-Only Routes

First update this setting
```
generateMatchPathRewrites: false
```

Let us say that user Gatsby site is using [client-only routes](https://www.gatsbyjs.org/docs/client-only-routes-and-user-authentication/). And that your application lives under the prefix `/app`.

Because the client-only routes do not correspond to `.html` in the S3 bucket, when requested the response is a 'Not found' object (403). Therefore you can use a Lambda@Edge function to redirect any application route to the `/app` page which will take over the routing from there.

The Lambda function 

```javascript
exports.handler = async function(event) {
  const cf = event.Records[0].cf;
  const uri = cf.request.uri
  if (/^\/app\//i.test(uri)) { // change /app\/ to any path you have for client only routes
      return Object.assign({}, cf.request, {uri: '/app/index.html'});
  }
  return cf.request;
};
```

And a CloudFormation template do deploy this Origin Request Lamdba@Edge function can be found [https://gist.github.com/natac13/dd8c34009077c83760549bb404dc522f](https://gist.github.com/natac13/dd8c34009077c83760549bb404dc522f)

#### Fix Server Side Redirects

Can be done in two ways.

1. Using `x-amz-website-redirect-location` header set in the metadata of an object in the S3 bucket. https://docs.aws.amazon.com/AmazonS3/latest/dev/how-to-page-redirect.html

And then using a Lambda@Edge Origin Response function

```js
const domainName = '${DomainName}'.toLowerCase();
exports.handler = async (event) => {
var response = event.Records[0].cf.response;
const headers = response.headers;
if (headers['x-amz-website-redirect-location']) {
    let redirectURI = headers['x-amz-website-redirect-location'][0].value;
    if (redirectURI.startsWith('/')) {
    redirectURI = 'https://' + domainName + redirectURI;
    }
    response = {
    status: '302',
    statusDescription: 'Found',
    headers: {
        'location': [{
        key: 'Location',
        value: redirectURI,
        }],
        'cache-control': [{
        key: 'Cache-Control',
        value: 'public, max-age=300, s-maxage=3600'
        }]
    }
    }
}
return response;
}
```
With the CloudFormation Template https://gist.github.com/natac13/062a979b5133ecbcd3c513231661d970

2. Or using 'hard-coded' old url to new ones in a Origin Request Lambda@Edge function

```js
exports.handler = (event, context, callback) => {
  const request = event.Records[0].cf.request;
  const uri = request.uri;

  // Redirect old pages to new ones
  const redirects = [
    { test: /^\/old-contact\/?$/g, targetURI: '/contact-us/' },
    { test: /^\/old-about\/?$/g, targetURI: '/about-us/' }
  ];

  const redirect = redirects.find((r) => uri.match(r.test));
  if (redirect) {
    const response = {
      status: '301',
      statusDescription: 'Moved Permanently',
      headers: {
        location: [
          {
            key: 'Location',
            value: 'https://www.yourdomain.com' + redirect.targetURI
          }
        ]
      }
    };

    callback(null, response);
    return;
  }
  callback(null, request);
};
```