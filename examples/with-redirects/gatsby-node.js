const path = require('path');

exports.createPages = ({ actions }) => {
    // create some test redirects
    actions.createRedirect({
        fromPath: '/',
        toPath: '/page-2',
    });

    actions.createRedirect({
        fromPath: '/blog',
        toPath: '/blog/1',
        isPermanent: true
    });
    
    actions.createRedirect({
        fromPath: '/hello-there',
        toPath: '/client-only',
        isPermanent: false
    });
};