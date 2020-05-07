import { graphql, StaticQuery } from 'gatsby';
import React from 'react';

import './content.css';

export default (props: any) => (
    <StaticQuery
        query={graphql`
            query ContentMetaQuery {
                contentYaml {
                    color
                }
            }
        `}
        render={(data: any) => (
            <div
                css={{
                    display: 'flex',
                    maxWidth: 'calc(100% - 22rem)',
                    width: '100%',
                    '@media (max-width: 768px)': {
                        maxWidth: '100%',
                    },
                }}
            >
                <div
                    css={{
                        width: '100%',
                        borderRadius: '.2rem',
                        backgroundColor: '#0a0a0a',
                        boxShadow: '0 0 5px rgba(0, 0, 0, 1), 0 5px 22px -8px rgba(0, 0, 0, 1)',
                        border: '1px solid #1a1a1a',
                        '@media (max-width: 768px)': {
                            borderRadius: 0,
                        },
                    }}
                >
                    <article
                        css={{
                            padding: '4rem 6rem',
                            flex: '1 1 auto',
                            lineHeight: '2rem',
                            '@media (max-width: 768px)': {
                                padding: '4rem',
                            },
                            '& a': {
                                color: data.contentYaml.color || '#3eb0ef',
                                fontWeight: 500,
                                position: 'relative',
                                '::before': {
                                    content: ' ',
                                    position: 'absolute',
                                    bottom: -4,
                                    left: 0,
                                    width: '100%',
                                    height: 1.5,
                                    opacity: 0,
                                    backgroundColor: data.contentYaml.color || '#3eb0ef',
                                    transition:
                                        'width 250ms cubic-bezier(0.4, 0, 0.2, 1), opacity 250ms cubic-bezier(0.4, 0, 0.2, 1)',
                                },
                                '::after': {
                                    content: ' ',
                                    position: 'absolute',
                                    bottom: -4,
                                    left: 0,
                                    right: 0,
                                    height: 1.5,
                                    backgroundColor: data.contentYaml.color || '#3eb0ef',
                                    opacity: 0.1,
                                },
                                ':hover::before': {
                                    opacity: 1,
                                    width: '42%',
                                },
                            },
                        }}
                    >
                        {props.children}
                    </article>
                </div>
            </div>
        )}
    />
);
