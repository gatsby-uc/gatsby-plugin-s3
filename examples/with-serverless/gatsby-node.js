exports.createPages = ({actions}) => {
    // create some test redirects
    actions.createRedirect({
        fromPath: '/',
        toPath: '/page-2/',
        isPermanent: true,
        redirectInBrowser: true
    });
    actions.createRedirect({
        fromPath: '/hello-there',
        toPath: '/high-ground/',
        isPermanent: false
    });
};

// Required for client only paths to work
exports.onCreatePage = async ({page, actions}) => {
    const {createPage} = actions
    if (page.path.match(/^\/client-only/)) {
        page.matchPath = "/client-only/*"
        createPage(page)
    }
}
