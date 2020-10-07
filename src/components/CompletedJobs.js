import React, { useState, useEffect, useContext } from 'react'
import { AppContext, LOGIN_LINK } from '../Auth'
import { Container, Row, Col, Form, Table,
    Button, ButtonToolbar, ButtonGroup, ToggleButton, Spinner } from 'react-bootstrap'
import BootstrapTable from 'react-bootstrap-table-next';
import 'react-bootstrap-table-next/dist/react-bootstrap-table2.min.css';
import paginationFactory from 'react-bootstrap-table2-paginator'
import 'react-bootstrap-table2-paginator/dist/react-bootstrap-table2-paginator.min.css'
import filterFactory, { textFilter } from 'react-bootstrap-table2-filter'
import 'react-bootstrap-table2-filter/dist/react-bootstrap-table2-filter.min.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQuestionCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import { jobs_command, get_jobs_queue, delete_jobs_queue } from '../sfapi'
import PageHeader from './PageHeader'
import CustomModal from "./CustomModal"

export default function CompletedJobs() {

    // Get app context (used to get jwt and uid)
    const context = useContext(AppContext);

    // Column display state hooks
    const [hideStartTime, setHideStartTime] = useState(true);
    const [hideCompletionTime, setHideCompletionTime] = useState(true);
    const [hideCpuTime, setHideCpuTime] = useState(true);
    const [hideAccount, setHideAccount] = useState(true);
    const [hideQOS, setHideQOS] = useState(true);
    const [hideNodes, setHideNodes] = useState(true);

    // Table data state hooks
    const [userType, setUserType] = useState("current");
    const [allData, setAllData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentRow, setCurrentRow] = useState({});
    const [showJobInfo, setShowJobInfo] = useState(false);
    const [year, setYear] = useState((new Date()).getFullYear().toString());
    const [month, setMonth] = useState(((new Date()).getMonth()+1).toString().padStart(2, "0"));
    const [date, setDate] = useState((new Date()).getDate().toString().padStart(2, "0"));

    // Error state hook
    const [error, setError] = useState(null);

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
        },
        {
            text: "User",
            dataField: "user",
            sort: true,
            filter: textFilter(),
        },
        {
            text: "Host",
            dataField: "host",
            sort: true,
            filter: textFilter(),
        },
        {
            text: "Partition",
            dataField: "partition",
            sort: true,
            filter: textFilter(),
        },
        {
            text: "Account",
            dataField: "account",
            sort: true,
            filter: textFilter(),
            hidden: hideAccount,
        },
        {
            text: "QOS",
            dataField: "qos",
            sort: true,
            filter: textFilter(),
            hidden: hideQOS,
        },
        {
            text: "Status",
            dataField: "status",
            sort: true,
            filter: textFilter(),
        },
        {
            text: "Start Time",
            dataField: "starttime",
            sort: true,
            filter: textFilter(),
            hidden: hideStartTime,
        },
        {
            text: "Completion Time",
            dataField: "completiontime",
            sort: true,
            filter: textFilter(),
            hidden: hideCompletionTime,
        },
        {
            text: "CPU Time* Used",
            dataField: "cputimeused",
            sort: true,
            filter: textFilter(),
            hidden: hideCpuTime,
        },
        {
            text: "Nodes",
            dataField: "nodes",
            sort: true,
            filter: textFilter(),
            hidden: hideNodes,
        },
    ];

    // Fetch table data
    useEffect(() => {
        let d = new Date();
        let currentYear = d.getFullYear();
        let currentMonth = (d.getMonth()+1).toString().padStart(2,"0");
        let currentDate = d.getDate().toString().padStart(2,"0");
        let now = `${currentYear}-${currentMonth}-${currentDate}T23:59:59`;
        let start = `${year}-${month}-${date}T00:00:00`;
        let end = `${year}-${month}-${date}T23:59:59`;
        if (context.sfapiJwt && isLoading) {
            jobs_command({data: {executable: `sacct ${userType === "current" ? `-u ${context.sfapiUid} -S 2015-01-01T00:00:00 -E ${now}` : `--allusers -S ${start} -E ${end}`} --noheader -P -s BOOT_FAIL,CANCELLED,COMPLETED,DEADLINE,FAILED,NODE_FAIL,OUT_OF_MEMORY,PREEMPTED,TIMEOUT -o JobID,JobName,User,Cluster,Partition,Account,QOS,State,Start,End,CPUTime,NNodes`},
                         jwt: context.sfapiJwt,
                         machine: "cori"}
            ).then(res => {
                if (res.status === "ok") {
                    let data = res.output.split("\n").map(line => {
                        line = line.split("|");
                        line = {jobid: line[0], jobname: line[1], user: line[2], host: line[3],
                            partition: line[4], account: line[5], qos: line[6], status: line[7],
                            starttime: line[8], completiontime: line[9], cputimeused: line[10],
                            nodes: line[11],
                            };
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

    function rangeInclusive(start, stop) {
        let arr = [];
        for (let i = start; i <= stop; i++) {
            arr.push(i.toString().padStart(2, "0"));
        }
        return arr;
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
                                    href={`/job-logs?id=${currentRow.jobid}&status=complete`}
                                >
                                    View logs
                                </Button>
                            }
                            <ModalTable data={currentRow} />
                        </>}
                    />

                    <PageHeader title="Completed Jobs" />

                    <Row style={{marginBottom: "20px"}}>
                        <Col>
                            <ButtonToolbar aria-label="Toolbar with button group">
                                <ButtonGroup toggle  className="mr-2"
                                    aria-label="Button group for selecting either current user or all users"
                                >
                                    <ToggleButton
                                        key="Current User"
                                        type="checkbox"
                                        variant="secondary"
                                        checked={userType === "current"}
                                        value="Current User"
                                        onChange={(e) => {
                                            setUserType(prev => prev === "current" ? "all" : "current");
                                            setIsLoading(true);
                                        }}
                                        >
                                        Current User
                                    </ToggleButton>
                                    <ToggleButton
                                        key="All Users"
                                        type="checkbox"
                                        variant="secondary"
                                        checked={userType === "all"}
                                        value="All Users"
                                        onChange={(e) => {
                                            setUserType(prev => prev === "all" ? "current" : "all");
                                            setIsLoading(true);
                                        }}
                                        >
                                        All Users
                                    </ToggleButton>
                                </ButtonGroup>
                            </ButtonToolbar>
                        </Col>
                    </Row>

                    {userType === "all" && <Row>
                        <Col sm={2}>
                            <Form.Group controlId="year">
                                <Form.Control as="select" aria-describedby="yearHelp"
                                    onChange={(event) => setYear(event.target.value)}
                                >
                                    {rangeInclusive(2015, (new Date()).getFullYear()).map(y => (
                                        <option key={y} value={y} selected={year === y}>{y}</option>
                                    ))}
                                </Form.Control>
                                <Form.Text id="yearHelp">year</Form.Text>
                            </Form.Group>
                        </Col>
                        <Col sm={2}>
                            <Form.Group controlId="month">
                                <Form.Control as="select" aria-describedby="monthHelp"
                                    onChange={(event) => setMonth(event.target.value)}
                                >
                                    {rangeInclusive(1, 12).map(m => (
                                        <option key={m} value={m} selected={month === m}>{m}</option>
                                    ))}
                                </Form.Control>
                                <Form.Text id="monthHelp">month</Form.Text>
                            </Form.Group>
                        </Col>
                        <Col sm={2}>
                            <Form.Group controlId="date">
                                <Form.Control as="select" aria-describedby="dateHelp"
                                    onChange={(event) => setDate(event.target.value)}
                                >
                                    {rangeInclusive(1, 31).map(d => (
                                        <option key={d} value={d} selected={date === d}>{d}</option>
                                    ))}
                                </Form.Control>
                                <Form.Text id="dateHelp">date</Form.Text>
                            </Form.Group>
                        </Col>
                        <Col sm={2}>
                            <Button variant="primary" onClick={() => setIsLoading(true)}>Reload</Button>
                        </Col>
                    </Row>}
            
                    {isLoading
                        ? <Spinner animation="border" variant="primary" role="status">
                            <span className="sr-only">Loading job data...</span>
                        </Spinner>
                        :<>
                            <BootstrapTable columns={columns} data={allData}
                                keyField="jobid" defaultSorted = {[{dataField: 'jobid', order: 'desc'}]}
                                pagination={paginationFactory({
                                    sizePerPageList: [10,25,50,100],
                                    showTotal: true,
                                })}
                                filter={filterFactory()}
                                rowEvents={{onClick: (e, row, rowIndex) => {
                                    setCurrentRow(row);
                                    setShowJobInfo(true);}}}
                                bootstrap4={true}
                                striped={true} bordered={true} hover={true}
                                noDataIndication={() => <p>There are no completed jobs to display.</p>}
                            />
                            <Row>
                                <Col>
                                    <p>*<b>IMPORTANT</b> CPU Time Does Not Contain Queue or Machine Charge Factors. It should not be interprted as MPP hours.</p>
                                    <span>Toggle columns: </span>
                                    <ButtonGroup toggle>
                                        <ToggleButton
                                            key="Account"
                                            type="checkbox"
                                            variant="outline-primary"
                                            checked={!hideAccount}
                                            value="Account"
                                            onChange={(e) => {setHideAccount(prev => !prev)}}
                                            >
                                            Account
                                        </ToggleButton>
                                        <ToggleButton
                                            key="QOS"
                                            type="checkbox"
                                            variant="outline-primary"
                                            checked={!hideQOS}
                                            value="QOS"
                                            onChange={(e) => {setHideQOS(prev => !prev)}}
                                            >
                                            QOS
                                        </ToggleButton>
                                        <ToggleButton
                                            key="Start Time"
                                            type="checkbox"
                                            variant="outline-primary"
                                            checked={!hideStartTime}
                                            value="Start Time"
                                            onChange={(e) => {setHideStartTime(prev => !prev)}}
                                            >
                                            Start Time
                                        </ToggleButton>
                                        <ToggleButton
                                            key="Completion Time"
                                            type="checkbox"
                                            variant="outline-primary"
                                            checked={!hideCompletionTime}
                                            value="Completion Time"
                                            onChange={(e) => {setHideCompletionTime(prev => !prev)}}
                                            >
                                            Completion Time
                                        </ToggleButton>
                                        <ToggleButton
                                            key="CPU Time"
                                            type="checkbox"
                                            variant="outline-primary"
                                            checked={!hideCpuTime}
                                            value="CPU Time"
                                            onChange={(e) => {setHideCpuTime(prev => !prev)}}
                                            >
                                            CPU Time *
                                        </ToggleButton>
                                        <ToggleButton
                                            key="Nodes"
                                            type="checkbox"
                                            variant="outline-primary"
                                            checked={!hideNodes}
                                            value="Nodes"
                                            onChange={(e) => {setHideNodes(prev => !prev)}}
                                            >
                                            Nodes
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
                    <td>Host</td>
                    <td>{props.data.host}</td>
                </tr>
                <tr>
                    <td>Partition</td>
                    <td>{props.data.partition}</td>
                </tr>
                <tr>
                    <td>Account</td>
                    <td>{props.data.account}</td>
                </tr>
                <tr>
                    <td>QOS</td>
                    <td>{props.data.qos}</td>
                </tr>
                <tr>
                    <td>Status</td>
                    <td>{props.data.status}</td>
                </tr>
                <tr>
                    <td>Start Time</td>
                    <td>{props.data.starttime}</td>
                </tr>
                <tr>
                    <td>Completion Time</td>
                    <td>{props.data.completiontime}</td>
                </tr>
                <tr>
                    <td>CPU Time Used</td>
                    <td>{props.data.cputimeused}</td>
                </tr>
                <tr>
                    <td>Nodes</td>
                    <td>{props.data.nodes}</td>
                </tr>
            </tbody>
        </Table>
    );
}
