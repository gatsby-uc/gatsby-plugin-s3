import { graphql, StaticQuery } from 'gatsby';
import React from 'react';
import Helmet from 'react-helmet';

import Footer from '../components/Footer';
import Header from '../components/Header';
import Main from '../components/Main';

import './index.css';
import './normalize.css';

export default (props: any) => (
    <StaticQuery
        query={graphql`
            query DefaultLayoutQuery {
                contentYaml {
                    title
                    description
                }
            }
        `}
        render={(data: any) => (
            <>
                <Helmet
                    defaultTitle={data.contentYaml.title}
                    title={props.title || data.contentYaml.title}
                    titleTemplate={'%s - ' + data.contentYaml.title}
                >
                    <meta name="description" content={props.description || data.contentYaml.description} />
                </Helmet>
                <Header />
                <Main>{props.children}</Main>
                <Footer />
            </>
        )}
    />
);
