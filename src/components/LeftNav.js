import React, { useState } from 'react';
import { Nav, Collapse } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
// see: https://fontawesome.com/icons?d=gallery&q=letter&m=free an search for free icons - prepend name with 'fa'
import { faTachometerAlt, faTable, faMedkit, faFolder, faTicketAlt, faChartBar, faDesktop, faNewspaper, faFile, faAngleLeft, faAngleDown, faBox, faServer, faChartLine, faEnvelope, faNetworkWired, faCalendar, faBook, faChartArea, faUser } from '@fortawesome/free-solid-svg-icons'
import { AppContext, LOGIN_LINK } from '../Auth'

const NONE_OPEN = 0;
const JOBS_OPEN = 1;
const STATUS_OPEN = 2;

export default function LeftNav() {
    const [open, setOpen] = useState(false);

    return <AppContext.Consumer>
        {context => <Nav defaultActiveKey="/dashboard" className="flex-column">
            {context.sfapiUid
                ? <Nav.Link>{"Hi, " + context.sfapiUid}</Nav.Link>            
                : <Nav.Link href={LOGIN_LINK}><FontAwesomeIcon icon={faUser} /> Sign In</Nav.Link>}
            <Nav.Link href="/dashboard"><FontAwesomeIcon icon={faTachometerAlt} /> Dashboard</Nav.Link>
            <Nav.Link onClick={e => setOpen(open === JOBS_OPEN ? NONE_OPEN : JOBS_OPEN)}>
                <FontAwesomeIcon icon={faTable} /> Jobs <FontAwesomeIcon style={{float: "right"}} icon={open === JOBS_OPEN ? faAngleDown : faAngleLeft} />
            </Nav.Link>
            <Collapse in={open === JOBS_OPEN}>
                <div>
                    <Nav.Link className="leftnav-level2" href="/jobscript-generator"><FontAwesomeIcon icon={faFile} /> Jobscript Generator</Nav.Link>
                    <Nav.Link className="leftnav-level2" href="/completed-jobs"><FontAwesomeIcon icon={faBox} /> Completed Jobs</Nav.Link>
                    <Nav.Link className="leftnav-level2" href="/cori-queues"><FontAwesomeIcon icon={faServer} /> Cori Queues</Nav.Link>
                    <Nav.Link className="leftnav-level2" href="/queue-backlog"><FontAwesomeIcon icon={faChartLine} /> Queue Backlog</Nav.Link>
                    <Nav.Link className="leftnav-level2" href="/job-completion-stats"><FontAwesomeIcon icon={faChartBar} /> Job Completion Stats</Nav.Link>
                </div>
            </Collapse>
            <Nav.Link onClick={e => setOpen(open === STATUS_OPEN ? NONE_OPEN : STATUS_OPEN)}>
                <FontAwesomeIcon icon={faMedkit} /> Center Status <FontAwesomeIcon style={{float: "right"}} icon={open === STATUS_OPEN ? faAngleDown : faAngleLeft} />
            </Nav.Link>
            <Collapse in={open === STATUS_OPEN}>
                <div>
                    <Nav.Link className="leftnav-level2" href="/announcements"><FontAwesomeIcon icon={faEnvelope} /> Announcements</Nav.Link>
                    <Nav.Link className="leftnav-level2" href="/filesystems-monitor"><FontAwesomeIcon icon={faNetworkWired} /> Filesystems Monitor</Nav.Link>
                    <Nav.Link className="leftnav-level2" href="/now-computing"><FontAwesomeIcon icon={faTable} /> Now Computing</Nav.Link>
                    <Nav.Link className="leftnav-level2" href="/outage-calendar"><FontAwesomeIcon icon={faCalendar} /> Outage Calendar</Nav.Link>
                    <Nav.Link className="leftnav-level2" href="/outage-log"><FontAwesomeIcon icon={faBook} /> Outage Log</Nav.Link>
                    <Nav.Link className="leftnav-level2" href="/job-size-charts"><FontAwesomeIcon icon={faChartArea} /> Job Size Charts</Nav.Link>
                    <Nav.Link className="leftnav-level2" href="/queue-wait-times"><FontAwesomeIcon icon={faTable} /> Queue Wait Times</Nav.Link>
                    <Nav.Link className="leftnav-level2" href="/cluster-viz"><FontAwesomeIcon icon={faTable} /> Cluster Visualization</Nav.Link>
                </div>
            </Collapse>        
            <Nav.Link href="/file-browser"><FontAwesomeIcon icon={faFolder} /> File Browser</Nav.Link>
            <Nav.Link href="https://help.nersc.gov"><FontAwesomeIcon icon={faTicketAlt} /> Service Tickets</Nav.Link>
            <Nav.Link href="/data-dashboard"><FontAwesomeIcon icon={faChartBar} /> Data Dashboard</Nav.Link>
            <Nav.Link href="https://nxcloud01.nersc.gov/nxwebplayer"><FontAwesomeIcon icon={faDesktop} /> NX Desktop</Nav.Link>
            <Nav.Link href="https://jupyter.nersc.gov/"><FontAwesomeIcon icon={faDesktop} /> Jupyter Hub</Nav.Link>
            <Nav.Link href="https://www.nersc.gov/"><FontAwesomeIcon icon={faNewspaper} /> NERSC Homepage</Nav.Link>
            <Nav.Link href="https://docs.nersc.gov/"><FontAwesomeIcon icon={faNewspaper} /> Documentation</Nav.Link>
            <Nav.Link href="https://iris.nersc.gov/"><FontAwesomeIcon icon={faNewspaper} /> Iris</Nav.Link>
        </Nav>}
    </AppContext.Consumer>;
}

