import React from 'react';

import Content from './Content';
import Sidebar from './Sidebar';
import SidebarToggle from './SidebarToggle';

export default class Main extends React.PureComponent {
    state = {
        sidebar: false,
    };

    private toggleSidebar = () => {
        this.setState({
            sidebar: !this.state.sidebar,
        });
    };

    public render = () => {
        return (
            <main
                css={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'flex-start',
                    position: 'relative',
                    margin: '9.8rem auto 0 auto',
                    padding: '0 4rem 4rem 4rem',
                    minHeight: 'calc(100vh - 9.8rem)',
                    maxWidth: '128rem',
                    '@media (max-width: 768px)': {
                        padding: '0 0 4rem 0',
                    },
                }}
            >
                <Sidebar open={this.state.sidebar} />
                <Content>{this.props.children}</Content>
                <SidebarToggle open={this.state.sidebar} onClickHandler={this.toggleSidebar} />
            </main>
        );
    };
}
