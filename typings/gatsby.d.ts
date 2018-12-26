// all these are probably incomplete;
// only the fields gatsby-plugin-s3 actually uses are included

interface GatsbyRedirect {
    fromPath: string;
    toPath: string;
    isPermanent?: boolean;
}

interface GatsbyPage {
    component: string;
    path: string;
    matchPath?: string;
}

interface GatsbyState {
    redirects: GatsbyRedirect[];
    pages: Map<string, GatsbyPage>;
    program: { directory: string };
}