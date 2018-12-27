module.exports = {
    siteMetadata: {
        title: 'Gatsby Default Starter',
        description: 'Kick off your next, great Gatsby project with this default starter. This barebones starter ships with the main Gatsby configuration files you might need.',
        author: '@gatsbyjs'
    },
    plugins: [
        {
            resolve: `gatsby-plugin-s3`,
            options: {
                bucketName: 'gatsby-plugin-s3-dev-serverless',
                region: 'eu-west-1'
            },
        },
        {
            resolve: `gatsby-plugin-create-client-paths`,
            options: { prefixes: [`/client-only/*`] },
        }
    ]
};
