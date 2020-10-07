import React, { useState, useEffect, useContext } from 'react'
import { AppContext, LOGIN_LINK } from '../Auth'
import { Container, Alert, Row, Col, Spinner,
    ButtonToolbar, ButtonGroup, ToggleButton } from 'react-bootstrap'
import AceEditor from "react-ace"
import "ace-builds/src-noconflict/mode-plain_text"
import "ace-builds/src-noconflict/theme-idle_fingers"
import "ace-builds/src-noconflict/ext-language_tools"
import "./hide-ace-cursor.css"
import { jobs_command } from '../sfapi'
import PageHeader from './PageHeader'
import CustomModal from './CustomModal'

// This page is a redirect from CoriQueues and CompletedJobs
export default function SlurmOut() {
    
    // Get app context (used to get jwt)
    const context = useContext(AppContext);

    // State hooks
    const [outPath, setOutPath] = useState(null);
    const [errPath, setErrPath] = useState(null);
    const [outText, setOutText] = useState(null);
    const [errText, setErrText] = useState(null);
    const [updateStatus, setUpdateStatus] = useState("");
    const [isUpdating, setIsUpdating] = useState(true);
    const [logType, setLogType] = useState("StdOut");
    const [error, setError] = useState(null);

    // Get StdOut and StdErr paths and initial file fetch
    useEffect(() => {
        setUpdateStatus(<>
            <Spinner animation="border" variant="primary" size="sm" role="status">
                <span className="sr-only">Fetching path</span>
            </Spinner>
            {" Fetching log paths..."}
        </>);
        let out, err;
        if (id && status === "incomplete") {
            jobs_command({data: {executable: `scontrol show job ${id}`},
                          jwt: context.sfapiJwt, machine: "cori"}
            ).then(res => {
                if (res.status === "ok") {
                    for (let line of res.output.split("\n")) {
                        if (line.trim().startsWith("StdOut=")) {
                            out = line.trim().slice(7);
                        } else if (line.trim().startsWith("StdErr=")) {
                            err = line.trim().slice(7);
                        }
                    }
                    setOutPath(out);
                    setErrPath(err);
                    getLogs(out, err);
                } else {
                    setError(res.error);
                    setUpdateStatus("");
                }
            }).catch(error => {
                setError(error.message);
                setUpdateStatus("");
            });
        } else if (id && status === "complete") {
            jobs_command({data: {executable: `sacct -X -j ${id} -n -P -o admincomment | python -m json.tool`},
                          jwt: context.sfapiJwt, machine: "cori"}
            ).then(res => {
                if (res.status === "ok") {
                    let output = JSON.parse(res.output);
                    //TODO: add full support for slurm filepath patterns
                    out = output["stdoutPath"] || `${output["workingDirectory"]}/slurm-${output["jobId"]}.out`;
                    err = output["stderrPath"] || `${output["workingDirectory"]}/slurm-${output["jobId"]}.out`;
                    setOutPath(out.replace("%j", output["jobId"]));
                    setErrPath(err.replace("%j", output["jobId"]));
                    getLogs(out, err);
                } else {
                    setError(res.error);
                    setUpdateStatus("");
                }
            }).catch(error => {
                setError(error.message);
                setUpdateStatus("");
            });
        } else {
            setError("Please specify 'status' as 'complete' or 'incomplete' in the url search parameters.");
            setUpdateStatus("");
        }
    }, []);

    // Update slurm file text every ten seconds
    useEffect(() => {
        let refresher;
        if (context.sfapiJwt && id && !isUpdating && error === null) {
            refresher = setInterval(() => {getLogs(outPath, errPath)}, 10000);
        }
        return () => clearInterval(refresher);
    });

    // Get path from url search params
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    const status = urlParams.get("status");
    
    // Fetch slurm .out file
    function getLogs(out, err) {
        setIsUpdating(true);
        setUpdateStatus(<>
            <Spinner animation="border" variant="primary" size="sm" role="status">
                <span className="sr-only">Updating</span>
            </Spinner>
            {" Updating..."}
        </>);
        let command = `cat ${out} && echo "<mynersc-unique-log-file-separator>"${out !== err ? ` && cat ${err}` : ""}`;
        jobs_command({data: {executable: command}, jwt: context.sfapiJwt, machine: "cori"}
        ).then(res => {
            if (res.status === "ok") {
                let logs = res.output.split("<mynersc-unique-log-file-separator>");
                setOutText(logs[0]);
                if (out !== err) {setErrText(logs[1])}
            } else {
                setError(res.error);
            }
        }).catch(error => {
            setError(error.message);
        }).finally(() => {
            setUpdateStatus(currentTime());
            setIsUpdating(false);
        });
    }

    // Generate current time string
    function currentTime() {
        let d = new Date();
        return (
            "Last updated " + d.getHours().toString().padStart(2,"0") + ":" +
            d.getMinutes().toString().padStart(2,"0") + ":" +
            d.getSeconds().toString().padStart(2,"0")
        );
    }

    return (
        <Container fluid>
            {context.sfapiJwt
                ? <>
                    <CustomModal show={error !== null} handleClose={() => setError(null)}
                        title="Error" body={error}
                    />

                    {id
                        ? <>
                            <PageHeader title={`Logs for Job ${id}`} />

                            {(outText && outPath !== errPath) &&
                                <ButtonToolbar aria-label="Toolbar with button group">
                                    <ButtonGroup toggle  className="mb-2"
                                        aria-label="Button group for selecting either standard output or standard error"
                                    >
                                        <ToggleButton
                                            key="StdOut"
                                            type="checkbox"
                                            variant="secondary"
                                            checked={logType === "StdOut"}
                                            value="StdOut"
                                            onChange={(e) => {setLogType(prev => prev === "StdOut" ? "StdErr" : "StdOut")}}
                                            >
                                            StdOut
                                        </ToggleButton>
                                        <ToggleButton
                                            key="StdErr"
                                            type="checkbox"
                                            variant="secondary"
                                            checked={logType === "StdErr"}
                                            value="StdErr"
                                            onChange={(e) => {setLogType(prev => prev === "StdErr" ? "StdOut" : "StdErr")}}
                                            >
                                            StdErr
                                        </ToggleButton>
                                    </ButtonGroup>
                                </ButtonToolbar>
                            }

                            <Row>
                                <Col className="mb-2">
                                    <b>{logType === "StdErr" ? errPath : outPath}</b><br />
                                    {updateStatus}
                                </Col>
                            </Row>

                            {outText && <span style={{"pointerEvents": "none"}}>
                                <AceEditor mode="plain_text" theme="idle_fingers"
                                    value={logType === "StdErr" ? errText : outText}
                                    wrapEnabled={true} width="100%" fontSize={14} name="logText"
                                    readOnly={true} highlightActiveLine={false}
                                    showPrintMargin={false} onFocus={(event) => event.target.blur()}
                                    setOptions={{highlightGutterLine: false}}
                                />
                            </span>}
                        </>
                        : <Alert variant="warning">
                            Please specify a Job ID in the URL search parameters.
                        </Alert>
                    }
                </>
                : <div>Please <a href={LOGIN_LINK}>log in</a></div>
            }
        </Container>
    );
}
