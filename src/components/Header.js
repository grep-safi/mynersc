import React from 'react';
import { Navbar, Nav, NavDropdown } from 'react-bootstrap';
import My from './my.png'
import NerscLogo from './NERSC-Small-Logo.png'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// see: https://fontawesome.com/icons?d=gallery&q=letter&m=free an search for free icons - prepend name with 'fa'
import { faUser, faServer, faEnvelope } from '@fortawesome/free-solid-svg-icons'

function Header() {
    return <Navbar bg="light" fixed="top">
        <Navbar.Brand href="#home">
            <img alt="my" src={My} style={{height: 35}}/>
            <img alt="nersc-logo" src={NerscLogo} style={{height: 40}} />
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="mr-auto">
            </Nav>
            <NavDropdown title={<FontAwesomeIcon icon={faEnvelope} />} alignRight>
                <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>
                <NavDropdown.Item href="#action/3.2">Another action</NavDropdown.Item>
                <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item href="#action/3.4">Separated link</NavDropdown.Item>
            </NavDropdown>
            <NavDropdown title={<FontAwesomeIcon icon={faServer} />} alignRight>
                <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>
                <NavDropdown.Item href="#action/3.2">Another action</NavDropdown.Item>
                <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item href="#action/3.4">Separated link</NavDropdown.Item>
            </NavDropdown>
            <NavDropdown title={<FontAwesomeIcon icon={faUser} />} alignRight>
                <NavDropdown.Item href="#action/3.1">Action</NavDropdown.Item>
                <NavDropdown.Item href="#action/3.2">Another action</NavDropdown.Item>
                <NavDropdown.Item href="#action/3.3">Something</NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item href="#action/3.4">Separated link</NavDropdown.Item>
            </NavDropdown>                        
        </Navbar.Collapse>
    </Navbar>;
}

export default Header;

