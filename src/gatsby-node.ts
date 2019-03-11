import { CACHING_PARAMS, DEFAULT_OPTIONS, Params, PluginOptions } from './constants';
import fs from 'fs';
import path from 'path';
import { RoutingRule, RoutingRules } from 'aws-sdk/clients/s3';
import { withoutLeadingSlash, withoutTrailingSlash } from './util';

// for whatever reason, the keys of the RoutingRules object in the SDK and the actual API differ.
// so we have a separate object with those differing keys which we can throw into the sls config.
interface ServerlessRoutingRule {
    RoutingRuleCondition: RoutingRule['Condition'],
    RedirectRule: RoutingRule['Redirect']
};

// converts gatsby redirects + rewrites to S3 routing rules
// https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-s3-websiteconfiguration-routingrules.html
const getRules = (pluginOptions: PluginOptions, routes: GatsbyRedirect[]): RoutingRules => (
    routes.map(route => ({
            Condition: {
                KeyPrefixEquals: withoutLeadingSlash(route.fromPath),
                HttpErrorCodeReturnedEquals: '404'
            },
            Redirect: {
                ReplaceKeyWith: withoutTrailingSlash(withoutLeadingSlash(route.toPath)),
                HttpRedirectCode: route.isPermanent ? '301' : '302',
                Protocol: pluginOptions.protocol,
                HostName: pluginOptions.hostname
            }
        })
    )
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

export const onPostBuild = ({ store, graphql }: any, userPluginOptions: PluginOptions) => {
    const pluginOptions = { ...DEFAULT_OPTIONS, ...userPluginOptions };

    if (!pluginOptions.pathPrefix) {
        graphql(`
            query {
              site {
                pathPrefix
              }
            }
        `)
            .then(({ data: { site } }: { data: { site?: { pathPrefix?: string; } } }) => {
                if (site && typeof site.pathPrefix === 'string') {
                    pluginOptions.pathPrefix = site.pathPrefix;
                }
                writePluginData(store, pluginOptions);
            });
    } else {
        writePluginData(store, pluginOptions);
    }
};

const writePluginData = (store: { getState: () => GatsbyState }, pluginOptions: PluginOptions) => {
    const { redirects, pages, program } = store.getState();

    let rewrites: GatsbyRedirect[] = [];
    if (pluginOptions.generateMatchPathRewrites) {
        rewrites = Array.from(pages.values())
            .filter((page): page is Required<GatsbyPage> => !!page.matchPath && page.matchPath !== page.path)
            .map(page => ({
                // routing rules syntax is `/app/` not `/app/*` (it's basically prefix by default)
                fromPath:
                    page.matchPath.endsWith('*')
                        ? page.matchPath.substring(0, page.matchPath.length - 1)
                        : page.matchPath,
                toPath: page.path
            }));

        // prepend prefix to rewrites if it's set
        if (pluginOptions.pathPrefix) {
            rewrites = rewrites.map(({ fromPath, toPath, ...rest }): GatsbyRedirect => ({
                fromPath: pluginOptions.pathPrefix + fromPath,
                toPath: pluginOptions.pathPrefix + toPath,
                ...rest
            }));
        }
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

    // sort routing rules by key prefix (descending order)
    routingRules.sort(({ Condition: aCondition }, { Condition: bCondition }) => {
        if (aCondition!.KeyPrefixEquals! > bCondition!.KeyPrefixEquals!) {
            return -1;
        }
        else if (aCondition!.KeyPrefixEquals! < bCondition!.KeyPrefixEquals!) {
            return 1;
        }

        return 0;
    });

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
