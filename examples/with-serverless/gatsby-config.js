require('dotenv').config();

module.exports = {
    siteMetadata: {
        title: 'Gatsby Default Starter',
        description: 'Kick off your next, great Gatsby project with this default starter. This barebones starter ships with the main Gatsby configuration files you might need.',
        author: '@gatsbyjs'
    },
    plugins: [
        {
            resolve: 'gatsby-plugin-s3',
            options: {
                bucketName: process.env.GATSBY_S3_TARGET_BUCKET || 'gatsby-plugin-s3-dev-serverless',
                region: process.env.AWS_REGION || 'eu-west-1',
            },
        }
    ]
};
