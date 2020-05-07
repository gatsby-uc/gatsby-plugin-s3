import { Link as GatsbyLink } from 'gatsby';
import React from 'react';

export default (props: any) => {
    if (props.to === '') {
        return <a {...props}>{props.children}</a>;
    }

    const internal = /^\/(?!\/)/.test(props.to);

    if (internal) {
        return (
            <GatsbyLink to={props.to} {...props}>
                {props.children}
            </GatsbyLink>
        );
    }

    return (
        <a href={props.to} target="_blank" rel="noopener noreferrer" {...props}>
            {props.children}
        </a>
    );
};
