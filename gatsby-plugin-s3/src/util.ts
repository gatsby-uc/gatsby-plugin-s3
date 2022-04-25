export const withoutLeadingSlash = (s: string) => (s.startsWith('/') ? s.substring(1) : s);
export const withoutTrailingSlash = (s: string) => (s.endsWith('/') ? s.substring(0, s.length - 1) : s);
export const withTrailingSlash = (s: string) => (s.endsWith('/') ? s : `${s}/`);

const oldRegions: string[] = [
    'ap-northeast-1',
    'ap-southeast-1',
    'ap-southeast-2',
    'eu-west-1',
    'sa-east-1',
    'us-east-1',
    'us-gov-west-1',
    'us-west-1',
    'us-west-2',
];

// Inspired by Terraform implementation:
// https://git.io/fjr2Q
export const getS3WebsiteDomainUrl = (region: string): string => {
    // New regions uses different syntax for website endpoints
    // http://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteEndpoints.html
    if (oldRegions.includes(region)) {
        return `s3-website-${region}.amazonaws.com`;
    }
    return `s3-website.${region}.amazonaws.com`;
};
