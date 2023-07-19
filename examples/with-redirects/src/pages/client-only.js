import React, {Fragment} from 'react';
import {Router} from '@reach/router';
import {Link} from 'gatsby';

const Home = () => (
    <div>
        <p>Welcome to the app!</p>
        <Link to="/client-only/secret">
            Here's a secret route that doesn't exist on the server
        </Link>
    </div>
);

const Secret = () => <div>You're visiting me from the client side!</div>;

const ClientOnlyRoutes = () => (
    <Router basepath="/client-only">
        <Home path="/"/>
        <Secret path="/secret"/>
    </Router>
)

export default ClientOnlyRoutes;
