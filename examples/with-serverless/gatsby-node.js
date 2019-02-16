exports.createPages = ({ actions }) => {
    // create some test redirects
    actions.createRedirect({
        fromPath: '/',
        toPath: '/page-2',
        isPermanent: true,
        redirectInBrowser: true
    });
    actions.createRedirect({
        fromPath: '/hello-there',
        toPath: '/high-ground',
        isPermanent: false
    });
};