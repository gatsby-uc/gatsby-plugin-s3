import React, { Fragment } from 'react';
import { Router } from '@reach/router';
import { Link } from 'gatsby';

export default () => (
    <Fragment>
        Welcome to the app!
        <Link to="/client-only/secret">
            Here's a secret route that doesn't exist on the server
        </Link>
        <Router>
            <Secret path="/client-only/secret" />
        </Router>
    </Fragment>
);

const Secret = () => 'You\'re visiting me from the client side!';
