import React, { useState, useEffect, useContext, useRef } from 'react'
import { AppContext, LOGIN_LINK } from '../Auth'
import { Container, Row, Col, Table, Form,
    ButtonToolbar, ButtonGroup, ToggleButton,
    DropdownButton, Dropdown, Button, Spinner, } from 'react-bootstrap'
import BootstrapTable from 'react-bootstrap-table-next';
import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css';
import paginationFactory from 'react-bootstrap-table2-paginator'
import 'react-bootstrap-table2-paginator/dist/react-bootstrap-table2-paginator.min.css'
import filterFactory, { textFilter } from 'react-bootstrap-table2-filter'
import 'react-bootstrap-table2-filter/dist/react-bootstrap-table2-filter.min.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faBan, faClock, faStream, faPeopleArrows, faPause, faPlay, faUndoAlt, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons'
import { jobs_command, accounting_projects } from '../sfapi'
import PageHeader from './PageHeader'
import CustomModal from "./CustomModal"

export default function CoriQueues() {

    // Get app context (used to get jwt and uid)
    const context = useContext(AppContext);

    // Column display state hooks
    const [hideJobName, setHideJobName] = useState(true);
    const [hideRepo, setHideRepo] = useState(true);
    const [hideNodes, setHideNodes] = useState(true);
    const [hideCpus, setHideCpus] = useState(true);
    const [hideStartTime, setHideStartTime] = useState(true);
    const [hideSubmitTime, setHideSubmitTime] = useState(true);
    const [hideTimeRequired, setHideTimeRequired] = useState(true);
    const [hideTimeUsed, setHideTimeUsed] = useState(true);

    // Table data state hooks
    const [userType, setUserType] = useState("current");
    const [allData, setAllData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentRow, setCurrentRow] = useState({});
    const [showJobInfo, setShowJobInfo] = useState(false);
    const [selectedRows, setSelectedRows] = useState([]);

    // Action feedback state hooks
    const [actionInfo, setActionInfo] = useState({type: "", title: "", command: "", body: <></>,
        actionParams: {jobids: [], machine: ""}});
    const [showProceedButton, setShowProceedButton] = useState(true);
    const [showActionInfo, setShowActionInfo] = useState(false);

    // Error state hook
    const [error, setError] = useState(null);

    // Fetch table data
    useEffect(() => {
        if (context.sfapiJwt && isLoading) {
            setSelectedRows([]);
            jobs_command({data: {executable: 'squeue -a --noheader -o "%i %j %u %a %D %C %T %S %V %l %M %q %r %f"'},
                         jwt: context.sfapiJwt,
                         machine: "cori"}
            ).then(res => {
                if (res.status === "ok") {
                    let data = res.output.split("\n").map(line => {
                        line = line.split(" ");
                        line = {jobid: line[0], jobname: line[1], user: line[2], repo: line[3],
                            nodes: line[4], cpus: line[5], status: line[6], estimatedstarttime: line[7],
                            submittime: line[8], timerequired: line[9], timeused: line[10],
                            qos: line[11], reason: line[12], feature: line[13]};
                        return line;
                    });
                    setAllData(data);
                } else {
                    setError(res.error);
                }
            }).catch(error => {
                setError(error.message);
            }).finally(() => setIsLoading(false));
        }
    }, [context.sfapiJwt, isLoading]);

    // Filter if current user
    useEffect(() => {
        if (userType === "current") {
            let userData = [];
            for (let row of allData) {
                if (row.user === context.sfapiUid) {
                    userData.push(row);
                }
            }
            setFilteredData(userData);
        } else {
            setFilteredData(allData);
        }
    }, [allData, userType, context.sfapiUid]);

    // Table columns
    const columns = [
        {
            text: "Job ID",
            dataField: "jobid",
            sort: true,
            filter: textFilter(),
        },
        {
            text: "Job Name",
            dataField: "jobname",
            sort: true,
            filter: textFilter(),
            hidden: hideJobName,
        },
        {
            text: "User",
            dataField: "user",
            sort: true,
            filter: textFilter(),
        },
        {
            text: "Repo",
            dataField: "repo",
            sort: true,
            filter: textFilter(),
            hidden: hideRepo,
        },
        {
            text: "Nodes",
            dataField: "nodes",
            sort: true,
            filter: textFilter(),
            hidden: hideNodes,
        },
        {
            text: "CPUs",
            dataField: "cpus",
            sort: true,
            filter: textFilter(),
            hidden: hideCpus,
        },
        {
            text: "Status",
            dataField: "status",
            sort: true,
            filter: textFilter(),
        },
        {
            text: "Estimated Start Time (PST)",
            dataField: "estimatedstarttime",
            sort: true,
            filter: textFilter(),
            hidden: hideStartTime,
        },
        {
            text: "Submit Time",
            dataField: "submittime",
            sort: true,
            filter: textFilter(),
            hidden: hideSubmitTime,
        },
        {
            text: "Time Required",
            dataField: "timerequired",
            sort: true,
            filter: textFilter(),
            hidden: hideTimeRequired,
        },
        {
            text: "Time Used",
            dataField: "timeused",
            sort: true,
            filter: textFilter(),
            hidden: hideTimeUsed,
        },
        {
            text: "QOS",
            dataField: "qos",
            sort: true,
            filter: textFilter(),
        },
        {
            text: "Reason",
            dataField: "reason",
            sort: true,
            filter: textFilter(),
        },
        {
            text: "Feature",
            dataField: "feature",
            sort: true,
            filter: textFilter(),
        }
    ];

    // Properties associated with each action
    const actionsMap = new Map([
        ["time",    {title: "Change time limit", icon: faClock, command: "scontrol update jobid="}],
        ["qos",     {title: "Change QOS", icon: faStream, command: "scontrol update jobid="}],
        ["account", {title: "Change account", icon: faPeopleArrows, command: "scontrol update jobid="}],
        ["hold",    {title: `Hold job${selectedRows.length > 1 ? "s" : ""}`, icon: faPause, command: "scontrol hold "}],
        ["release", {title: `Release job${selectedRows.length > 1 ? "s" : ""}`, icon: faPlay, command: "scontrol release "}],
        ["requeue", {title: `Requeue job${selectedRows.length > 1 ? "s" : ""}`, icon: faUndoAlt, command: "scontrol requeue "}],
        ["cancel",  {title: `Cancel job${selectedRows.length > 1 ? "s" : ""}`, icon: faBan, command: "scancel "}],
    ]);

    // Handle clicking on an action
    function handleAction(action, jobids) {
        const actionObj = actionsMap.get(action);
        setActionInfo({
            type: action,
            title: actionObj.title,
            command: actionObj.command,
            body: <ActionSetup actionsMap={actionsMap} action={action} jobids={jobids}
                jwt={context.sfapiJwt} actionParams={{jobids: jobids, machine: "cori"}} setActionInfo={setActionInfo}
            />,
            actionParams: {jobids: jobids, machine: "cori"}
        });
        setShowProceedButton(true);
        setShowActionInfo(true);
    }

    return (
        <Container fluid>

            {context.sfapiJwt
                ? <>
                    <CustomModal show={error ? true : false} handleClose={() => setError(null)}
                        title="Error" body={error}
                    />

                    <CustomModal show={showJobInfo} handleClose={() => setShowJobInfo(false)}
                        title={currentRow.jobid}
                        body={<>
                            {(currentRow.user === context.sfapiUid && currentRow.status !== "PENDING") &&
                                <Button variant="outline-primary" className="mb-2"
                                    href={`/job-logs?id=${currentRow.jobid}&status=incomplete`}
                                >
                                    View logs
                                </Button>
                            }
                            <ModalTable data={currentRow} />
                        </>}
                    />

                    <ActionInfoModal show={showActionInfo} setShowActionInfo={setShowActionInfo}
                        actionInfo={actionInfo} setActionInfo={setActionInfo} jwt={context.sfapiJwt}
                        setError={setError} setIsLoading={setIsLoading}
                        showProceedButton={showProceedButton} setShowProceedButton={setShowProceedButton}
                    />

                    <PageHeader title="Cori Queues" />

                    <Row style={{marginBottom: "20px"}}>
                        <Col>
                            <ButtonToolbar aria-label="Toolbar with button groups">
                                <ButtonGroup toggle  className="mr-2"
                                    aria-label="Button group for selecting either current user or all users"
                                >
                                    <ToggleButton
                                        key="Current User"
                                        type="checkbox"
                                        variant="secondary"
                                        checked={userType === "current"}
                                        value="Current User"
                                        onChange={(e) => {setUserType(prev => prev === "current" ? "all" : "current")}}
                                        >
                                        Current User
                                    </ToggleButton>
                                    <ToggleButton
                                        key="All Users"
                                        type="checkbox"
                                        variant="secondary"
                                        checked={userType === "all"}
                                        value="All Users"
                                        onChange={(e) => {setUserType(prev => prev === "all" ? "current" : "all")}}
                                        >
                                        All Users
                                    </ToggleButton>
                                </ButtonGroup>
                                {userType === "current" &&
                                    <ButtonGroup aria-label="Job actions dropdown">
                                        <DropdownButton id="actions-dropdown" title="Job Actions" menuRole="menu"
                                            variant="outline-primary" disabled={selectedRows.length === 0}
                                        >
                                            {Array.from(actionsMap.entries()).map(([action, actionObj]) => (
                                                <Dropdown.Item key={action} as="button"
                                                    disabled={action === "time" || action === "qos"}
                                                    onClick={() => handleAction(action, selectedRows)}
                                                >
                                                    <FontAwesomeIcon icon={actionObj.icon} /> {actionObj.title}
                                                </Dropdown.Item>
                                            ))}
                                        </DropdownButton>
                                    </ButtonGroup>
                                }
                            </ButtonToolbar>
                            
                        </Col>
                    </Row>

                    {isLoading
                        ?<Spinner animation="border" variant="primary" role="status">
                            <span className="sr-only">Loading queue data</span>
                        </Spinner>
                        :<>
                            <BootstrapTable columns={columns} data={filteredData}
                                keyField="jobid" defaultSorted = {[{dataField: 'jobid', order: 'desc'}]}
                                pagination={paginationFactory({
                                    sizePerPageList: [10,25,50,100],
                                    showTotal: true,
                                })}
                                filter={filterFactory()}
                                rowEvents={{onClick: (e, row, rowIndex) => {
                                    setCurrentRow(row);
                                    setShowJobInfo(true);}}}
                                selectRow={{
                                    mode: "checkbox",
                                    hideSelectColumn: userType === "all",
                                    selected: selectedRows,
                                    onSelect: (row, isSelect) => {
                                        isSelect
                                        ? setSelectedRows(prev => !prev.includes(row.jobid) ? [...selectedRows, row.jobid] : prev)
                                        : setSelectedRows(prev => prev.includes(row.jobid) ? prev.filter(x => x !== row.jobid) : prev);
                                    },
                                    onSelectAll: (isSelect, rows) => {
                                        const jobids = rows.map(r => r.jobid);
                                        isSelect
                                        ? setSelectedRows(jobids)
                                        : setSelectedRows([]);
                                    },
                                }}
                                bootstrap4={true}
                                striped={true} bordered={true} hover={true}
                                noDataIndication={() => <p>There is no data to display.</p>}
                            />
                            <Row>
                                <Col>
                                    <span>Toggle columns: </span>
                                    <ButtonGroup toggle>
                                        <ToggleButton
                                            type="checkbox"
                                            variant="outline-primary"
                                            checked={!hideJobName}
                                            value="Job Name"
                                            onChange={(e) => {setHideJobName(prev => !prev)}}
                                            >
                                            Job Name
                                        </ToggleButton>
                                        <ToggleButton
                                            type="checkbox"
                                            variant="outline-primary"
                                            checked={!hideRepo}
                                            value="Repo"
                                            onChange={(e) => {setHideRepo(prev => !prev)}}
                                            >
                                            Repo
                                        </ToggleButton>
                                        <ToggleButton
                                            type="checkbox"
                                            variant="outline-primary"
                                            checked={!hideNodes}
                                            value="Nodes"
                                            onChange={(e) => {setHideNodes(prev => !prev)}}
                                            >
                                            Nodes
                                        </ToggleButton>
                                        <ToggleButton
                                            type="checkbox"
                                            variant="outline-primary"
                                            checked={!hideCpus}
                                            value="CPUs"
                                            onChange={(e) => {setHideCpus(prev => !prev)}}
                                            >
                                            CPUs
                                        </ToggleButton>
                                        <ToggleButton
                                            type="checkbox"
                                            variant="outline-primary"
                                            checked={!hideStartTime}
                                            value="Start Time"
                                            onChange={(e) => {setHideStartTime(prev => !prev)}}
                                            >
                                            Start Time
                                        </ToggleButton>
                                        <ToggleButton
                                            type="checkbox"
                                            variant="outline-primary"
                                            checked={!hideSubmitTime}
                                            value="Submit Time"
                                            onChange={(e) => {setHideSubmitTime(prev => !prev)}}
                                            >
                                            Submit Time
                                        </ToggleButton>
                                        <ToggleButton
                                            type="checkbox"
                                            variant="outline-primary"
                                            checked={!hideTimeRequired}
                                            value="Time Required"
                                            onChange={(e) => {setHideTimeRequired(prev => !prev)}}
                                            >
                                            Time Required
                                        </ToggleButton>
                                        <ToggleButton
                                            type="checkbox"
                                            variant="outline-primary"
                                            checked={!hideTimeUsed}
                                            value="Time Used"
                                            onChange={(e) => {setHideTimeUsed(prev => !prev)}}
                                            >
                                            Time Used
                                        </ToggleButton>
                                    </ButtonGroup>
                                </Col>
                            </Row>
                        </>
                    }
                </>

                : <div>Please <a href={LOGIN_LINK}>log in</a></div>
            }
        </Container>
    );
}

// Table for displaying job data when row is clicked
function ModalTable(props) {
    return (
        <Table striped bordered>
            <tbody>
                <tr>
                    <td>Name</td>
                    <td>{props.data.jobname}</td>
                </tr>
                <tr>
                    <td>User</td>
                    <td>{props.data.user}</td>
                </tr>
                <tr>
                    <td>Repo</td>
                    <td>{props.data.repo}</td>
                </tr>
                <tr>
                    <td>Nodes</td>
                    <td>{props.data.nodes}</td>
                </tr>
                <tr>
                    <td>CPUs</td>
                    <td>{props.data.cpus}</td>
                </tr>
                <tr>
                    <td>Status</td>
                    <td>{props.data.status}</td>
                </tr>
                <tr>
                    <td>Estimated Start Time (PST)</td>
                    <td>{props.data.estimatedstarttime}</td>
                </tr>
                <tr>
                    <td>Submit Time</td>
                    <td>{props.data.submittime}</td>
                </tr>
                <tr>
                    <td>Time Required</td>
                    <td>{props.data.timerequired}</td>
                </tr>
                <tr>
                    <td>Time Used</td>
                    <td>{props.data.timeused}</td>
                </tr>
                <tr>
                    <td>QOS</td>
                    <td>{props.data.qos}</td>
                </tr>
                <tr>
                    <td>Reason</td>
                    <td>{props.data.reason}</td>
                </tr>
                <tr>
                    <td>Feature</td>
                    <td>{props.data.feature}</td>
                </tr>
            </tbody>
        </Table>
    );
}

// Modal to display info after an action is selected
function ActionInfoModal(props) {

    return (
        <CustomModal show={props.show} title={props.actionInfo.title}
            body={props.actionInfo.body} handleClose={() => props.setShowActionInfo(false)}
            otherButton={
                <ActionProceedButton action={props.actionInfo.type} command={props.actionInfo.command}
                    title={props.actionInfo.title} actionParams={props.actionInfo.actionParams}
                    jwt={props.jwt} setActionInfo={props.setActionInfo}
                    setError={props.setError} setIsLoading={props.setIsLoading}
                    showProceedButton={props.showProceedButton} setShowProceedButton={props.setShowProceedButton}
                />
            }
            
        />
    );
}

// Content to display for each action inside ActionInfoModal when action is selected
function ActionSetup(props) {

    const [projects, setProjects] = useState(null);
    const [newProject, setNewProject] = useState("");
    const [newHours, setNewHours] = useState("0");
    const [newMinutes, setNewMinutes] = useState("0");
    const [newSeconds, setNewSeconds] = useState("0");
    const [newQOS, setNewQOS] = useState("debug");

    useEffect(() => {
        if (props.action === "account") {
            setProjects(null);
            accounting_projects({jwt: props.jwt}
            ).then(res => {
                if (!res.message) {
                    let accts = [];
                    for (let proj of res) {
                        accts.push(proj["repo_name"]);
                    }
                    setProjects(accts);
                    if (accts.length > 0) {setNewProject(accts[0])}
                } else {
                    setProjects("Error fetching accounts");
                }
            }).catch(error => {
                setProjects("Error fetching accounts");
            });
        }
    }, [props.jwt])

    useEffect(() => {
        if (props.action === "account") {
            props.setActionInfo(prev => {
                prev.actionParams = {...props.actionParams, account: newProject};
                return {...prev};
            });
        } else if (props.action === "time") {
            props.setActionInfo(prev => {
                prev.actionParams = {...props.actionParams, timelimit: `${newHours}:${newMinutes}:${newSeconds}`};
                return {...prev};
            });
        } else if (props.action === "qos") {
            props.setActionInfo(prev => {
                prev.actionParams = {...props.actionParams, qos: newQOS};
                return {...prev};
            });
        }
    }, [newProject, newHours, newMinutes, newSeconds, newQOS]);

    let prompt = <p>{props.actionsMap.get(props.action).title} for {props.jobids.length > 1 ? "these jobs" : "this job"}:</p>;
    let form = null;
    
    if (props.action === "time") {
        //TODO: Add time update form (see WallclockTimeGroup in JobscriptGenerator)
        form = (<Form>
            
        </Form>);
    } else if (props.action === "qos") {
        //TODO: Add qos update form (see QosGroup in JobscriptGenerator)
        form = (<Form>
            
        </Form>);
    } else if (props.action === "account") {
        form = (
            <Form>
                {projects !== null
                    ? projects === "Error fetching accounts" || projects === []
                        ? <>
                            <Form.Label>Enter account manually:</Form.Label>
                            <Form.Control value={newProject}
                                onChange={(event) => setNewProject(event.target.value)}
                            />
                            <Form.Text>Error fetching accounts</Form.Text>
                        </>
                        : <>
                            <Form.Label>Select account:</Form.Label>
                            <Form.Control as="select"
                                onChange={(event) => setNewProject(event.target.value)}
                            >
                                {projects.map(
                                    (project) => <option key={project} value={project} selected={newProject===project}>{project}</option>
                                )}
                            </Form.Control>
                        </>
                    : <>
                        <Spinner as="span" animation="border" variant="primary" size="sm" role="status">
                            <span className="sr-only">Loading user's accounts</span>
                        </Spinner> {"Loading user's accounts..."}
                    </>
                }
            </Form>
        );
    } else {
        prompt = (<p>
            Are you sure you want to {props.action} {props.jobids.length > 1 ? "these jobs" : "this job"}?
        </p>);
    }

    return (<>
        {prompt}
        {props.jobids.map(jobid => (
            <p key={jobid}>{jobid}</p>
        ))}
        {form}
    </>);
    
}

// Button to submit action
function ActionProceedButton(props) {

    // ref hooks (used to avoid a re-render while asynchronous processes are running)
    const jobResults = useRef({});
    const jobErrors = useRef({});
    
    let options = "";
    if (props.action === "time") {options = `timelimit=${props.actionParams.timelimit}`}
    else if (props.action === "qos") {options = `qos=${props.actionParams.qos}`}
    else if (props.action === "account") {options = `account=${props.actionParams.account}`}

    const handleProceed = () => {
        props.setShowProceedButton(false);
        props.setActionInfo({
            type: props.action,
            title: props.title,
            command: props.command,
            body: <ActionResults jobids={props.actionParams.jobids} jwt={props.jwt}
                        jobResults={{}} jobErrors={{}} setError={props.setError}
                    />,
            actionParams: props.actionParams
        });
        jobResults.current = {};
        jobErrors.current = {};
        for (let jobid of props.actionParams.jobids) {
            jobs_command({
                data: {executable: `${props.command}${jobid} ${options}`},
                jwt: props.jwt,
                machine: props.actionParams.machine
            }).then(res => {
                res.status === "ok"
                ? jobResults.current[jobid] = "ok"
                : jobErrors.current[jobid] = res.error;
            }).catch(error =>{
                jobErrors.current[jobid] = error.message;
            }).finally(() => {
                props.setActionInfo({
                    type: props.action,
                    title: props.title,
                    command: props.command,
                    body: <ActionResults jobids={props.actionParams.jobids} jwt={props.jwt}
                                jobResults={jobResults.current} jobErrors={jobErrors.current}
                                setError={props.setError}
                            />,
                    actionParams: props.actionParams
                });
                props.setIsLoading(true);
            });
        }
    }

    return (<>
        {props.showProceedButton
            ? <Button variant="primary"
                onClick={() => handleProceed()}
            >
            {props.title}
            </Button>
            : null}
        
    </>);
}

// Displays the results of an action for each job
function ActionResults(props) {

    let color;
    let icon;
    let err;

    return (<>
        {props.jobids.map(jobid => {
            color = "black";
            icon = (
                <Spinner animation="border" variant="dark" size="sm" as="span" role="status">
                    <span className="sr-only">Submitting action</span>
                </Spinner>
            );
            err = "";
            if (Object.keys(props.jobResults).includes(jobid)) {
                color = "green";
                icon = <FontAwesomeIcon icon={faCheck} />;
            } else if (Object.keys(props.jobErrors).includes(jobid)) {
                color = "red";
                icon = <FontAwesomeIcon icon={faTimes} />;
                err = <span>(<a href="#" onClick={() => {props.setError(props.jobErrors[jobid])}}
                            style={{"color": "red"}}>
                                view error
                          </a>)</span>;
            }
            return <p key={jobid} style={{"color": color}}>{icon} {jobid} {err}</p>;
        })}
    </>);
}
