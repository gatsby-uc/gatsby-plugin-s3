import { graphql, StaticQuery } from 'gatsby';
import React from 'react';

import Link from './Link';

// Header logo

interface IHeaderLogoProps {
    title: string;
    logo: string;
}

const HeaderLogo: React.FunctionComponent<IHeaderLogoProps> = (props: IHeaderLogoProps) => (
    <div
        css={{
            display: 'flex',
            position: 'relative',
            width: '22rem',
            padding: '1.2rem 0',
            paddingRight: '3.2rem',
            alignItems: 'center',
        }}
    >
        <Link
            to="/"
            css={{
                position: 'relative',
            }}
        >
            {props.logo ? (
                <img
                    src={props.logo}
                    height="25"
                    width="auto"
                    alt="Logo"
                    css={{
                        display: 'flex',
                        alignItems: 'center',
                    }}
                />
            ) : (
                props.title || 'Awesome'
            )}
        </Link>

        <Link
            to="/"
            css={{
                position: 'relative',
                marginLeft: '1.6rem',
                paddingLeft: '1.6rem',
                ':before': {
                    content: ' ',
                    position: 'absolute',
                    top: -3.5,
                    left: 1,
                    display: 'block',
                    width: 1,
                    height: 23,
                    background: '#333',
                    transform: 'rotate(25deg)',
                },
            }}
        >
            Docs
        </Link>
    </div>
);

interface IHeaderLink {
    name: string;
    link: string;
}

interface IHeaderLinksProps {
    color: string;
    links: IHeaderLink[];
}

const HeaderLinks: React.FunctionComponent<IHeaderLinksProps> = ({ color, links }) => (
    <ul
        css={{
            display: 'flex',
            margin: 0,
            padding: 0,
            listStyle: 'none',
            '@media (max-width: 768px)': {
                display: 'none',
            },
        }}
    >
        {links &&
            links.map((node: IHeaderLink, i: number) => (
                <li key={i}>
                    <Link
                        to={node.link}
                        css={{
                            padding: '20px 10px',
                            ':hover': {
                                color: color,
                            },
                        }}
                    >
                        {node.name}
                    </Link>
                </li>
            ))}
    </ul>
);

// Header

export default () => (
    <StaticQuery
        query={graphql`
            query HeaderLogoQuery {
                contentYaml {
                    title
                    color
                    logo
                    links {
                        name
                        link
                    }
                }
            }
        `}
        render={(data: any) => (
            <header
                css={{
                    display: 'block',
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    left: 0,
                    marginBottom: '4rem',
                    backgroundColor: '#0a0a0a',
                    borderBottom: '1px solid #1a1a1a',
                    boxShadow: '0 0 3px rgba(0, 0, 0, 1), 0 3px 46px rgba(0, 0, 0, 1)',
                    zIndex: 500,
                }}
            >
                <div
                    css={{
                        display: 'flex',
                        maxWidth: '128rem',
                        margin: '0 auto',
                        padding: '.8rem 4rem',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'noWrap',
                        flex: '1 1 auto',
                    }}
                >
                    <HeaderLogo title={data.contentYaml.title} logo={data.contentYaml.logo} />
                    <HeaderLinks color={data.contentYaml.color || '#3eb0ef'} links={data.contentYaml.links} />
                </div>
            </header>
        )}
    />
);
