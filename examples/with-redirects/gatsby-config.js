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
                bucketName: process.env.TARGET_BUCKET,
                region: 'eu-west-1',
                generateRedirectObjectsForPermanentRedirects: !process.env.LEGACY_REDIRECTS,
            },
        },
        {
            resolve: `gatsby-plugin-create-client-paths`,
            options: { prefixes: [`/client-only/*`] },
        },
        'gatsby-plugin-offline',
    ],
};
