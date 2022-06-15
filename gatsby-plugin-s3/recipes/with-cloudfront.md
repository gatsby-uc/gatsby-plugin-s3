---
title: Using CloudFront with gatsby-plugin-s3
description: CloudFront is a global CDN and can be used to make your blazing fast Gatsby site load even faster, particularly for first-time visitors. Additionally, CloudFront provides the easiest way to give your S3 bucket a custom domain name and HTTPS support.
---

*Written by @JoshuaWalsh*

## CloudFront setup

There are two ways that you can connect CloudFront to an S3 origin. The most obvious way, which the AWS Console will suggest, is to type the bucket name in the Origin Domain Name field. This sets up an S3 origin, and allows you to configure CloudFront to use IAM to access your bucket. Unfortunately, it also makes it impossible to perform serverside (301/302) redirects, and it also means that directory indexes (having index.html be served when someone tries to access a directory) will only work in the root directory. You might not initially notice these issues, because Gatsby's clientside JavaScript compensates for the latter and plugins such as `gatsby-plugin-meta-redirect` can compensate for the former. But just because you can't see these issues, doesn't mean they won't affect search engines.

In order for all the features of your site to work correctly, you must instead use your S3 bucket's Static Website Hosting Endpoint as the CloudFront origin. This does (sadly) mean that your bucket will have to be configured for public-read, because when CloudFront is using an S3 Static Website Hosting Endpoint address as the Origin, it's incapable of authenticating via IAM.

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