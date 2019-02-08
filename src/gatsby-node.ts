import { CACHING_PARAMS, DEFAULT_OPTIONS, Params, PluginOptions } from './constants';
import fs from 'fs';
import path from 'path';
import { RoutingRule, RoutingRules } from 'aws-sdk/clients/s3';
import { withoutLeadingSlash, withTrailingSlash } from './util';

// for whatever reason, the keys of the RoutingRules object in the SDK and the actual API differ.
// so we have a separate object with those differing keys which we can throw into the sls config.
interface ServerlessRoutingRule {
    RoutingRuleCondition: RoutingRule['Condition'],
    RedirectRule: RoutingRule['Redirect']
};

// converts gatsby redirects + rewrites to S3 routing rules
// https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-websiteconfiguration-routingrules.html
const getRules = (pluginOptions: PluginOptions, routes: GatsbyRedirect[]): RoutingRules => (
    routes.map(route => {
        const alwaysTheSame = {
            HttpRedirectCode: route.isPermanent ? '301' : '302',
            Protocol: pluginOptions.protocol,
            HostName: pluginOptions.hostname,
        };

        return route.fromPath.endsWith('*')
            ? {
                Condition: {
                    // doing route.toPath.substring here is sort of (w)hack. https://i.giphy.com/media/iN5qfn8S2qVgI/giphy.webp
                    // the syntax that gatsby invented here does not work with routing rules.
                    // routing rules syntax is `/app/` not `/app/*` (it's basically prefix by default)
                    KeyPrefixEquals: withoutLeadingSlash(route.fromPath.substring(0, route.fromPath.length - 1))
                },
                Redirect: {
                    ReplaceKeyPrefixWith: withTrailingSlash(withoutLeadingSlash(route.toPath)),
                    ...alwaysTheSame
                }
            }
            : {

                Condition: {
                    KeyPrefixEquals: withoutLeadingSlash(route.fromPath),
                    HttpErrorCodeReturnedEquals: '404'
                },
                Redirect: {
                    ReplaceKeyWith: withoutLeadingSlash(route.toPath),
                    ...alwaysTheSame
                }
            };
    })
);

let params: Params = {};

export const onPreBootstrap = ({ reporter }: any, { bucketName }: PluginOptions) => {
    if (!bucketName) {
        reporter.panic(`
      "bucketName" is a required option for gatsby-plugin-s3
      See docs here - https://github.com/jariz/gatsby-plugin-s3
      `);
        process.exit(1);
    }

    params = {};
};

// I have no understanding of what createPagesStatefully is supposed to accomplish.
// all I know is that it's being ran after createPages which is what I need to create pages after the other plugins have.
export const createPagesStatefully = ({ store, actions: { createPage } }: any, userPluginOptions: PluginOptions) => {
    const pluginOptions = { ...DEFAULT_OPTIONS, ...userPluginOptions };
    const { redirects, pages }: GatsbyState = store.getState();

    if (pluginOptions.generateIndexPageForRedirect) {
        const indexRedirect = redirects.find(redirect => redirect.fromPath === '/');
        const indexPage = Array.from(pages.values()).find(page => page.path === '/');
        if (indexRedirect) {
            if (!indexPage) {
                // no index page yet, create one so we can add a redirect to it's metadata when uploading
                createPage({
                    path: '/',
                    component: path.join(__dirname, './fake-index.js')
                });
            }

            params = {
                ...params,
                'index.html': {
                    WebsiteRedirectLocation: indexRedirect.toPath
                }
            };
        }
    }
};

export const onPostBuild = ({ store }: any, userPluginOptions: PluginOptions) => {
    const pluginOptions = { ...DEFAULT_OPTIONS, ...userPluginOptions };
    const { redirects, pages, program }: GatsbyState = store.getState();

    let rewrites: GatsbyRedirect[] = [];
    if (pluginOptions.generateMatchPathRewrites) {
        rewrites = Array.from(pages.values())
            .filter((page): page is Required<GatsbyPage> => !!page.matchPath && page.matchPath !== page.path)
            .map(page => {
                return {
                    fromPath: page.matchPath,
                    toPath: page.path,
                }
            })
    }

    if (pluginOptions.mergeCachingParams) {
        params = {
            ...params,
            ...CACHING_PARAMS
        };
    }

    params = {
        ...params,
        ...pluginOptions.params
    };

    const routingRules = [
        ...getRules(pluginOptions, redirects.filter(redirect => redirect.fromPath !== '/')),
        ...getRules(pluginOptions, rewrites)
    ];

    const slsRoutingRules: ServerlessRoutingRule[] = routingRules.map(({ Redirect, Condition }) => ({
        RoutingRuleCondition: Condition,
        RedirectRule: Redirect
    }));

    fs.writeFileSync(
        path.join(program.directory, './.cache/s3.routingRules.json'),
        JSON.stringify(routingRules)
    );

    fs.writeFileSync(
        path.join(program.directory, './.cache/s3.sls.routingRules.json'),
        JSON.stringify(slsRoutingRules)
    );

    fs.writeFileSync(
        path.join(program.directory, './.cache/s3.params.json'),
        JSON.stringify(params)
    );

    fs.writeFileSync(
        path.join(program.directory, './.cache/s3.config.json'),
        JSON.stringify(pluginOptions)
    );
};
