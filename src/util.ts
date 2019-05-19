export const withoutLeadingSlash = (string: string) => string.startsWith('/') ? string.substring(1) : string;
export const withoutTrailingSlash = (string: string) => string.endsWith('/') ? string.substring(0, string.length - 1) : string;
export const withTrailingSlash = (string: string) => string.endsWith('/') ? string : (string + '/');

const oldRegions: Array<string> = [
    "ap-northeast-1",
    "ap-southeast-1",
    "ap-southeast-2",
    "eu-west-1",
    "sa-east-1",
    "us-east-1",
    "us-gov-west-1",
    "us-west-1",
    "us-west-2",
];

// Inspired by Terraform implementation:
// https://github.com/terraform-providers/terraform-provider-aws/blob/e18168ba0dfd860bbd8f333a93791a2a7eab41db/aws/resource_aws_s3_bucket.go#L1584-L1613
export const getS3WebsiteDomainUrl = (region: string): string => {
        // New regions uses different syntax for website endpoints
        // http://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteEndpoints.html
        if (oldRegions.indexOf(region) !== -1) {
            return `s3-website-${region}.amazonaws.com`;
        } else {
            return `s3-website.${region}.amazonaws.com`;
        }
};
