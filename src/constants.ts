import * as S3 from 'aws-sdk/clients/s3';
import path from 'path';
import { BucketCannedACL } from 'aws-sdk/clients/s3';

export const CACHE_FILES = {
    config: path.join('.cache', 's3.config.json'),
    params: path.join('.cache', 's3.params.json'),
    routingRules: path.join('.cache', 's3.routingRules.json'),
    redirectObjects: path.join('.cache', 's3.redirectObjects.json'),
};

export type Params = {
    [k in string]: Partial<S3.Types.PutObjectRequest>
};

export interface PluginOptions {
    // Your bucket name (required)
    bucketName: string;

    // Your region
    // If not specified: will default to whatever the AWS SDK decides is the default otherwise
    // https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-region.html#setting-region-environment-variable
    region?: string;

    // The protocol & hostname of your site
    // If you are using a CDN or reverse-proxy (such as CloudFront) in front of S3
    // then you must fill out these fields to ensure redirects work correctly
    // If you are just using your S3 website directly, this is unnecessary
    protocol?: 'http' | 'https';
    hostname?: string;

    // Custom params to apply to your files
    // see all available params here:
    // https://github.com/aws/aws-sdk-js/blob/83ebfbcc6ab30b9a486b15cdede26a1bd03c72e4/clients/s3.d.ts#L3573
    // @example:
    // { 'static/**': {
    //     CacheControl: 'public, max-age=31536000, immutable'
    // },
    params?: Params;

    // Define bucket ACL, defaults to 'public-read'
    // If you don't want to use an ACL, set this to null
    acl?: null | BucketCannedACL;

    // Enable gatsby recommended caching settings
    mergeCachingParams?: boolean;

    // The plugin will generate routing rules to be applied to the website config for all redirects it can find
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-websiteconfiguration-routingrules.html
    generateRoutingRules?: boolean;

    // The plugin will not generate routing rules for permanent (301) redirects, but will instead upload empty objects
    // with the `x-amz-website-redirect-location` property.  This can be used to get around the hard limit of 50
    // routing rules on AWS S3.
    // https://docs.aws.amazon.com/AmazonS3/latest/dev/how-to-page-redirect.html
    generateRedirectObjectsForPermanentRedirects?: boolean;

    // The plugin will create a fake index page if a redirect from the root path is made - as a workaround,
    // Because routing rules can't be applied in that situation
    generateIndexPageForRedirect?: boolean;

    // Generate rewrites for client only paths
    generateMatchPathRewrites?: boolean;

    // Remove S3 objects if they no longer exist locally
    removeNonexistentObjects?: boolean;

    // Custom AWS S3 endpoint, default Amazon AWS hostname  - amazonaws.com
    customAwsEndpointHostname?: string;

    // Disables modifications to the S3 Static Website Hosting configuration.
    // Without S3 Static Website Hosting some features
    // (index.html rewriting, trailing slash redirects, and serverside redirects)
    // will not function. Not recommended,
    // but could be useful for preventing Cloud formation Stack Drift or suppressing Terraform noise if you don't need
    // the static website hosting functionality.
    enableS3StaticWebsiteHosting?: boolean;

    // S3 static webhosting error document name
    s3StaticWebsiteHostingErrorDocument?: string;
}

export const DEFAULT_OPTIONS: PluginOptions = {
    bucketName: '',

    params: {},
    mergeCachingParams: true,
    generateRoutingRules: true,
    // TODO: set this to true by default in the next major version
    generateRedirectObjectsForPermanentRedirects: false,
    generateIndexPageForRedirect: true,
    generateMatchPathRewrites: true,
    removeNonexistentObjects: true,
    enableS3StaticWebsiteHosting: true,
};

// https://www.gatsbyjs.org/docs/caching/
export const CACHING_PARAMS: Params = {
    '**/**.html': {
        CacheControl: 'public, max-age=0, must-revalidate',
    },
    'page-data/**/**.json': {
        CacheControl: 'public, max-age=0, must-revalidate',
    },
    'static/**': {
        CacheControl: 'public, max-age=31536000, immutable',
    },
    '**/**/!(sw).js': {
        CacheControl: 'public, max-age=31536000, immutable',
    },
    '**/**.css': {
        CacheControl: 'public, max-age=31536000, immutable',
    },
    'sw.js': {
        CacheControl: 'public, max-age=0, must-revalidate',
    },
};
