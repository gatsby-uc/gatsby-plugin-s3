require('dotenv').config();

module.exports = {
    siteMetadata: {
        title: 'Gatsby Default Starter',
        description:
            'Kick off your next, great Gatsby project with this default starter. This barebones starter ships with the main Gatsby configuration files you might need.',
        author: '@gatsbyjs',
    },
    plugins: [
        {
            resolve: `gatsby-plugin-s3`,
            options: {
                bucketName: process.env.GATSBY_S3_TARGET_BUCKET || 'test',
                bucketPrefix: process.env.GATSBY_S3_BUCKET_PREFIX ? process.env.GATSBY_S3_BUCKET_PREFIX : null,
                region: 'eu-west-1',
                generateRedirectObjectsForPermanentRedirects: !process.env.GATSBY_S3_LEGACY_REDIRECTS,
                ...(process.env.GATSBY_S3_ACL
                    ? {
                          acl: process.env.ACL != 'NULL' ? process.env.ACL : null,
                      }
                    : {}),
                removeNonexistentObjects: true,
                retainObjectsPatterns: ['**/*.retain.js', '**/retain-folder/*'],
            },
        },
        'gatsby-plugin-offline',
    ],
};
