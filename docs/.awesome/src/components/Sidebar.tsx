import { graphql, StaticQuery } from 'gatsby';
import React from 'react';

import Link from './Link';

interface ISidebarItemProps {
    color: string;
    title: string;
    link: string;
}

const SidebarItem: React.FunctionComponent<ISidebarItemProps> = ({ color, title, link }) => (
    <li
        css={{
            fontSize: '1.45rem',
            lineHeight: '1.65rem',
            '& > a.active': {
                color: color || '#3eb0ef',
                fontWeight: 500,
            },
        }}
    >
        <Link
            className={typeof document !== 'undefined' && document.location.pathname === link ? 'active' : ''}
            to={link}
            css={{
                display: 'inline-block',
                width: '100%',
                height: '100%',
                padding: '6px 0',
                color: '#738a94',
                lineHeight: '1.5em',
            }}
        >
            {title}
        </Link>
    </li>
);

interface ISidebarSectionProps {
    color: string;
    title: string;
    links: any;
}

const SidebarSection: React.FunctionComponent<ISidebarSectionProps> = ({ color, title, links }) => (
    <li
        css={{
            paddingBottom: 20,
        }}
    >
        <div
            css={{
                fontSize: '1.5rem',
                paddingBottom: 10,
                fontWeight: 500,
            }}
        >
            {title}
        </div>
        <ul
            css={{
                margin: 0,
                padding: 0,
                listStyle: 'none',
            }}
        >
            {links.map((node: any, i: number) => (
                <SidebarItem key={i} color={color} title={node.name} link={node.link} />
            ))}
        </ul>
    </li>
);

export default props => (
    <StaticQuery
        query={graphql`
            query SidebarQuery {
                allMarkdownRemark {
                    nodes {
                        frontmatter {
                            title
                        }
                        fields {
                            slug
                        }
                    }
                }
                contentYaml {
                    color
                    navigation {
                        links {
                            name
                            link
                        }
                        section
                    }
                }
            }
        `}
        render={(data: any) => (
            <div
                css={{
                    display: 'block',
                    position: 'relative',
                    width: '22rem',
                    paddingRight: '4rem',
                    flexShrink: 0,
                    '@media (max-width: 768px)': {
                        display: props.open ? 'block' : 'none',
                        position: 'fixed',
                        top: 60,
                        width: '100%',
                        height: 'calc(100% - 60px)',
                        padding: 30,
                        backgroundColor: '#111',
                        overflowY: 'auto',
                        zIndex: 400,
                    },
                }}
            >
                <div
                    css={{
                        marginRight: '-1.2rem',
                        top: '10rem',
                        '@media (min-width: 769px)': {
                            position: 'sticky',
                        },
                    }}
                >
                    <nav
                        css={{
                            display: 'block',
                        }}
                    >
                        <ol
                            css={{
                                margin: 0,
                                padding: 0,
                                listStyle: 'none',
                            }}
                        >
                            {data.contentYaml.navigation
                                ? data.contentYaml.navigation.map((node: any, i: number) => (
                                      <SidebarSection
                                          key={i}
                                          color={data.contentYaml.color}
                                          title={node.section}
                                          links={node.links}
                                      />
                                  ))
                                : data.allMarkdownRemark.nodes
                                      .filter((node: any) => node.fields.slug !== '/404/')
                                      .map((node: any, i: number) => (
                                          <SidebarItem
                                              key={i}
                                              color={data.contentYaml.color}
                                              title={node.frontmatter.title}
                                              link={node.fields.slug}
                                          />
                                      ))}
                        </ol>
                    </nav>
                </div>
            </div>
        )}
    />
);
