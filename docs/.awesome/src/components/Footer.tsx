import { graphql, StaticQuery } from 'gatsby';
import React from 'react';

import Link from './Link';
import Logo from './Logo';

// Feedback Container

interface IFeedbackContainerProps {
    url: string;
}

const FeedbackContainer: React.FunctionComponent<IFeedbackContainerProps> = (props: IFeedbackContainerProps) =>
    props.url ? (
        <div
            style={{
                maxWidth: '60rem',
                margin: '0 auto',
                paddingBottom: '3rem',
                textAlign: 'center',
            }}
        >
            <div
                style={{
                    marginTop: '0 !important',
                }}
            >
                <p>
                    Hey!
                    <span role="img" aria-label="hello">
                        {' '}
                        👋{' '}
                    </span>
                    Was this page helpful?
                </p>
            </div>
            <div>
                <p>
                    We're always looking to make our docs better, please let us know if you have any suggestions or
                    advice about what's working and what's not!
                </p>
                <div>
                    <Link to={props.url} title="Give Feedback">
                        <button>Send Feedback</button>
                    </Link>
                </div>
            </div>
        </div>
    ) : null;

// Copyright Notice

interface ICopyrightNoticeProps {
    notice: string;
}

const CopyrightNotice: React.FunctionComponent<ICopyrightNoticeProps> = (props: ICopyrightNoticeProps) => (
    <div
        style={{
            opacity: 0.5,
        }}
    >
        {props.notice}
    </div>
);

// Powered by AwesomeDocs

const PoweredByAwesomeDocs: React.FunctionComponent = () => (
    <div>
        <a
            href="https://github.com/AwesomeDocs"
            title="Build awesome documentation sites with AwesomeDocs"
            css={{
                display: 'flex',
                alignItems: 'center',
                filter: 'saturate(0%)',
                opacity: 0.5,
                transition: 'filter .2s ease-in, opacity .2s ease-in',
                ':hover': {
                    opacity: 1,
                    filter: 'saturate(100%)',
                },
            }}
        >
            <span
                style={{
                    marginRight: 8,
                }}
            >
                Powered by
            </span>
            <Logo size={25} />
        </a>
    </div>
);

// Meta Footer

interface IMetaFooterProps {
    copyright: string;
}

const MetaFooter: React.FunctionComponent<IMetaFooterProps> = (props: IMetaFooterProps) => (
    <div
        css={{
            display: 'flex',
            paddingTop: '1.6rem',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px dashed #1a1a1a',
            '@media (max-width: 768px)': {
                flexDirection: 'column',
            },
        }}
    >
        <CopyrightNotice notice={props.copyright} />
        <PoweredByAwesomeDocs />
    </div>
);

// Footer

export default () => (
    <StaticQuery
        query={graphql`
            query {
                contentYaml {
                    feedback
                    copyright
                }
            }
        `}
        render={(data: any) => (
            <footer
                style={{
                    display: 'block',
                    padding: '4vw',
                    borderTop: '1px solid #1a1a1a',
                    backgroundColor: '#0a0a0a',
                }}
            >
                <section
                    style={{
                        display: 'block',
                        margin: '0 auto',
                        padding: '0 4rem',
                        maxWidth: '128rem',
                    }}
                >
                    <FeedbackContainer url={data.contentYaml.feedback} />
                    <MetaFooter copyright={data.contentYaml.copyright} />
                </section>
            </footer>
        )}
    />
);
