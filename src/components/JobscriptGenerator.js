/* 
Adapted from the jobscript generator page at https://my.nersc.gov/script_generator.php
Used parts of the script_generator.js source code from that page
*/

import React, { useState, useEffect, useContext } from 'react'
import { AppContext, LOGIN_LINK } from '../Auth'
import { Container, Row, Col, Alert, Form, Tabs, Tab, Button, Spinner,
    OverlayTrigger, Popover, Badge } from 'react-bootstrap'
import CustomModal from './CustomModal'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faQuestionCircle, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
import AceEditor from "react-ace"
import "ace-builds/src-noconflict/mode-sh"
import "ace-builds/src-noconflict/theme-chrome"
import "ace-builds/src-noconflict/ext-language_tools"
import { jobs_command, post_jobs_queue } from '../sfapi'


// machine-specific specifications
const machinespecs = { 
    'cori-haswell': {'maxnnodes': 2388, 'maxnsockets': 2, 'maxncores': 32, 'maxnht': 2, 'nranks_bc': 50000 },	
    'cori-knl':     {'maxnnodes': 9688, 'maxnsockets': 1, 'maxncores': 68, 'maxnht': 4, 'nranks_bc': 20000 }
};

// qos specifications from https://docs.nersc.gov/jobs/policy/#queues-and-qos-on-cori
const qosspecs = {
    "cori-haswell": {"debug":   {"maxnnodes": "64",   "maxhrs": "0",    "maxmins": "30", "submitlim": 5,    "runlim": 2,      "priority": 3,      "qosfactor": 1,      "charge": 140},
                    "regular":  {"maxnnodes": "1932", "maxhrs": "48",   "maxmins": "59", "submitlim": 5000, "runlim": "none", "priority": 4,      "qosfactor": 1,      "charge": 140},
                    "premium":  {"maxnnodes": "1772", "maxhrs": "48",   "maxmins": "59", "submitlim": 5,    "runlim": "none", "priority": 2,      "qosfactor": 2,      "charge": 280},
                    "overrun":  {"maxnnodes": "1772", "maxhrs": "48",   "maxmins": "59", "submitlim": 5000, "runlim": "none", "priority": 5,      "qosfactor": 0,      "charge": 0},
                    "xfer":     {"maxnnodes": "1",    "maxhrs": "48",   "maxmins": "59", "submitlim": 100,  "runlim": 15,     "priority": "none", "qosfactor": "none", "charge": 0},
                    "bigmem":   {"maxnnodes": "1",    "maxhrs": "72",   "maxmins": "59", "submitlim": 100,  "runlim": 1,      "priority": "none", "qosfactor": "none", "charge": 0},
                    "realtime": {"maxnnodes": "2388", "maxhrs": "9999", "maxmins": "59", "submitlim": 9999, "runlim": 9999,   "priority": 1,      "qosfactor": "none", "charge": "none"}
                    },
    "cori-knl":     {"debug":   {"maxnnodes": "512",  "maxhrs": "0",    "maxmins": "30", "submitlim": 5,    "runlim": 2,      "priority": 3,      "qosfactor": 1,      "charge": 80},
                    "regular":  {"maxnnodes": "9489", "maxhrs": "48",   "maxmins": "59", "submitlim": 5000, "runlim": "none", "priority": 4,      "qosfactor": 1,      "charge": 80},
                    "premium":  {"maxnnodes": "9489", "maxhrs": "48",   "maxmins": "59", "submitlim": 5,    "runlim": "none", "priority": 2,      "qosfactor": 2,      "charge": 160},
                    "low":      {"maxnnodes": "9489", "maxhrs": "48",   "maxmins": "59", "submitlim": 5000, "runlim": "none", "priority": 5,      "qosfactor": 0.5,    "charge": 40},
                    "flex":     {"maxnnodes": "256",  "maxhrs": "48",   "maxmins": "59", "submitlim": 5000, "runlim": "none", "priority": 6,      "qosfactor": 0.25,   "charge": 20},
                    "overrun":  {"maxnnodes": "9489", "maxhrs": "48",   "maxmins": "59", "submitlim": 5000, "runlim": "none", "priority": 7,      "qosfactor": 0,      "charge": 0}
                    }
}


// Batch script generator and job submission page
export default function JobscriptGenerator() {

    // Get app context (used to get jwt)
    const context = useContext(AppContext);

    // State hooks
    const [batchText, setBatchText] = useState("#!/bin/bash\n\n" +
                                               "#SBATCH --nodes=1\n" +
                                               "#SBATCH --constraint=haswell\n" +
                                               "#SBATCH --qos=debug\n" +
                                               "#SBATCH --time=00:10:00\n\n" +
                                               "export OMP_NUM_THREADS=1\n" +
                                               "export OMP_PLACES=threads\n" +
                                               "export OMP_PROC_BIND=spread\n\n" +
                                               "srun -n 1 -c 64 --cpu-bind=cores ./myapp.x"
                                              );

    const [pathText, setPathText] = useState(defaultFileName());
    const [jobStatus, setJobStatus] = useState(null);
    const [submitStatus, setSubmitStatus] = useState(null);
    const [submitWarning, setSubmitWarning] = useState(false);
    const [saveWarning, setSaveWarning] = useState(false);
    const [error, setError] = useState(null);
    const [useGenerator, setUseGenerator] = useState(false);
    const [noParse, setNoParse] = useState(false);
    const [editorFocus, setEditorFocus] = useState(true);

    // Generate default batch file name using current date and time
    function defaultFileName() {
        let d = new Date();
        return ("$HOME/mynersc-" + d.getFullYear() + (d.getMonth()+1).toString().padStart(2,"0") +
            d.getDate().toString().padStart(2,"0") + "-" + d.getHours().toString().padStart(2,"0") +
            d.getMinutes().toString().padStart(2,"0") + d.getSeconds().toString().padStart(2,"0") + ".sh");
    }

    // Write the batch script to the file path and submit the job
    function submitJob() {
        setError(null);
        jobs_command({data: {executable: `echo '${batchText.split("\n").join("'$'\\n''")}' > ${pathText}`},
                     jwt: context.sfapiJwt,
                     machine: "cori"}
        ).then(fileRes => {
            if (fileRes.status === "ok") {
                post_jobs_queue({data: {job: pathText, isPath:"true"}, jwt: context.sfapiJwt, machine: "cori"}
                ).then(jobRes => {
                    setJobStatus(jobRes);
                }).catch(error => {
                    setError(`Job not submitted. ${error.message}`);
                }).finally(() => {
                    setSubmitStatus(null);
                });
            } else {
                setError(`File not transferred. ${fileRes.error}`);
                setSubmitStatus(null);
            }
        }).catch(error => {
            setError(`File not transferred. ${error.message}`);
            setSubmitStatus(null);
        });
    }

    // Write the batch script to the file path
    function saveToPath() {
        setError(null);
        jobs_command({data: {executable: `echo '${batchText.split("\n").join("'$'\\n''")}' > ${pathText}`},
                     jwt: context.sfapiJwt,
                     machine: "cori"}
        ).then(fileRes => {
            if (fileRes.status === "ok") {
                setSubmitStatus(null);
                setEditorFocus(true);
            } else {
                setError(`File not saved. ${fileRes.error}`);
                setSubmitStatus(null);
            }
        }).catch(error => {
            setError(`File not saved. ${error.message}`);
            setSubmitStatus(null);
        });
    }

    // Handle job submit button event
    function handleSubmit(event) {
        setError(null);
        setNoParse(false);
        setSubmitStatus("submitting");
        setSubmitWarning(false);
        jobs_command({data: {executable: `ls ${pathText}`}, jwt: context.sfapiJwt, machine: "cori"}
        ).then(lsRes => {
            if (lsRes.status === "ok") {
                setSubmitWarning(true);
            } else {
                submitJob();
            }
        }).catch(error => {
            setError(`File not transferred. ${error.message}`);
            setSubmitStatus(null);
        })
        event.preventDefault();
    }

    // Handle save file button event
    function handleSave(event) {
        setError(null);
        setNoParse(false);
        setSubmitStatus("saving");
        setSaveWarning(false);
        jobs_command({data: {executable: `ls ${pathText}`}, jwt: context.sfapiJwt, machine: "cori"}
        ).then(lsRes => {
            if (lsRes.status === "ok") {
                setSaveWarning(true);
            } else {
                saveToPath();
            }
        }).catch(error => {
            setError(`File not transferred. ${error.message}`);
            setSubmitStatus(null);
        })
        event.preventDefault();
    }

    // Handle load from file button event
    function handleLoadFromFile(event) {
        setError(null);
        setNoParse(false);
        setSubmitStatus("loading");
        jobs_command({data: {executable: `cat ${pathText}`}, jwt: context.sfapiJwt, machine: "cori"}
        ).then(res => {
            if (res.status === "ok") {
                setBatchText(res.output);
                setEditorFocus(true);
            } else {
                setError(`File not loaded. ${res.error}`);
            }
        }).catch(error => {
            setError(`File not loaded. ${error}`);
        }).finally(() => {
            setSubmitStatus(null);
        });
    }

    // Modal event handlers
    function handleErrorClose(event) {
        setError(null);
        setEditorFocus(true);
    }

    function handleSubmitFromWarning(event) {
        setSubmitWarning(false);
        submitJob();
    }
    
    function handleSaveFromWarning(event) {
        setSaveWarning(false);
        saveToPath();
    }

    function handleWarningClose(event) {
        setSubmitWarning(false);
        setSaveWarning(false);
        setSubmitStatus(null);
        setEditorFocus(true);
    }

    function handleStatusClose(event) {
        setJobStatus(null);
        setEditorFocus(true);
    }

    return (
        <Container fluid>

            <InfoModals error={error} handleErrorClose={handleErrorClose}
                submitWarning={submitWarning} handleWarningClose={handleWarningClose}
                pathText={pathText} handleSubmitFromWarning={handleSubmitFromWarning}
                saveWarning={saveWarning} handleSaveFromWarning={handleSaveFromWarning}
                jobStatus={jobStatus} handleStatusClose={handleStatusClose}
            />

            <PageHeader />

            <Form onSubmit={handleSave}>
                <fieldset disabled={submitStatus === "submitting" || submitStatus === "loading" || submitStatus === "saving"}>
                    <Row>
                        <Col md={6} style={{"borderRight": "1px solid #eee"}}>

                            <GeneratorSwitch useGenerator={useGenerator} setUseGenerator={setUseGenerator}
                                setNoParse={setNoParse} setEditorFocus={setEditorFocus}
                            />
                            <GeneratorForm batchText={batchText} setBatchText={setBatchText}
                                submitStatus={submitStatus} useGenerator={useGenerator}
                            />
                        </Col>

                        <Col md={6}>
                            {!context.sfapiJwt
                                ? <><Alert variant="warning">Please <Alert.Link href={LOGIN_LINK}>log in</Alert.Link> to load, save, or submit.</Alert><hr /></>
                                : null}
                            
                            <FilePathGroup pathText={pathText} setPathText={setPathText}
                                handleLoadFromFile={handleLoadFromFile} submitStatus={submitStatus}
                                setNoParse={setNoParse}
                                isDisabled={!context.sfapiJwt || submitStatus === "submitting" || submitStatus === "loading" || submitStatus === "saving"}
                            />
                            <hr />
                            <BatchScriptGroup batchText={batchText} setBatchText={setBatchText}
                                useGenerator={useGenerator} parseScript={GeneratorForm.parseScript}
                                editorFocus={editorFocus} setEditorFocus={setEditorFocus}
                                noParse={noParse}
                            />
                            <SubmitButtonsGroup submitStatus={submitStatus} handleSubmit={handleSubmit}
                                setNoParse={setNoParse}
                                isDisabled={!context.sfapiJwt || submitStatus === "submitting" || submitStatus === "loading" || submitStatus === "saving"}
                            />
                        </Col>
                    </Row>
                </fieldset>
            </Form>
        </Container>
    );
}


// CustomModals to display results after various actions are taken
function InfoModals(props) {
    return (<>
        <CustomModal show={props.error ? true : false} handleClose={props.handleErrorClose}
            title="Error" body={<p>{props.error}</p>} otherButton={null}
        />

        <CustomModal show={props.submitWarning} handleClose={props.handleWarningClose} title="Warning"
            body={<>
                <p>The file {props.pathText} already exists.</p>
                <p>
                    Submitting this job will overwrite the existing file with the batch
                    script from this page. If you loaded the script from a file, this is
                    expected, and you may continue. However, any changes you might have
                    made will be written to the existing file.
                </p>
                <p>Click "Submit anyway" to continue or "Close" to cancel the submission.</p>
            </>}
            otherButton={
                <Button variant="primary" onClick={props.handleSubmitFromWarning}>
                    Submit anyway
                </Button>
            }
        />

        <CustomModal show={props.saveWarning} handleClose={props.handleWarningClose} title="Warning"
            body={<>
                <p>The file {props.pathText} already exists.</p>
                <p>
                    Saving to this path will overwrite the existing file with the batch
                    script from this page. If you loaded the script from a file, this is
                    expected, and you may continue. However, any changes you might have
                    made will be written to the existing file.
                </p>
                <p>Click "Save anyway" to continue or "Close" to cancel the save.</p>
            </>}
            otherButton={
                <Button variant="primary" onClick={props.handleSaveFromWarning}>
                    Save anyway
                </Button>
            }
        />

        <CustomModal show={props.jobStatus === null ? false : true} handleClose={props.handleStatusClose}
            title="Submission Results"
            body={
                props.jobStatus
                ? <>
                    <h6>Status: {props.jobStatus.status}</h6>
                    <h6>Job ID: {props.jobStatus.jobid}</h6>
                    <h6>Error: {props.jobStatus.error === null ? "none" : props.jobStatus.error}</h6>
                </>
                : null
            }
            otherButton={
                <Button variant="primary" href={`cori-queues`}>
                    Monitor jobs
                </Button>
            }
        />
    </>);
}

// Page header
function PageHeader(props) {
    return (
        <Row>
            <Col lg={12}>
                <h4 className="page-header" style={{"fontSize": "18px", "paddingBottom": "9px",
                    margin: "40px 0 20px", "borderBottom": "1px solid #eee"}}>
                    Jobscript Generator
                </h4>
            </Col>
        </Row>
    );
}

// Generator switch
function GeneratorSwitch(props) {
    return (
        <Form.Group controlId="generatorSwitch">
            <div onMouseEnter={(event) => props.setNoParse(true)}
                onMouseLeave={(event) => props.setNoParse(false)}
            >
                <Form.Check 
                    type="switch" id="generatorSwitch"
                    label="Use script generator/formatter"
                    checked={props.useGenerator} value={false} focus="true"
                    onChange={(event) => {props.setUseGenerator(prev => !prev);
                                          props.setEditorFocus(true);}}
                />
            </div>
            
            <Form.Text>
                When using the script generator, form fields and formatting
                will be applied to the batch script upon changing any part of
                the form, and changes made to the script will be reflected in 
                the form upon clicking away from the editor. (Note: Short flags
                in the script should be followed by a space and then the value.
                For example, '-n 1', not '-n=1' or '-n1'.)
            </Form.Text>
        </Form.Group>
    );
}


// Generator form (left side of the page)
function GeneratorForm(props) {

    // State hooks
    const [constraint, setConstraint] = useState("haswell");
    const [appName, setAppName] = useState("./myapp.x");
    const [jobName, setJobName] = useState("");
    const [emailAddr, setEmailAddr] = useState("");
    const [notifyType, setNotifyType] = useState(["NONE"])
    const [hours, setHours] = useState("0");
    const [minutes, setMinutes] = useState("10");
    const [seconds, setSeconds] = useState("0");
    const [qos, setQOS] = useState("debug");
    const [numNodes, setNumNodes] = useState("1");
    const [maxNodes, setMaxNodes] = useState("");
    const [thBinding, setThBinding] = useState(true);
    const [thBindType, setThBindType] = useState("basicThreadBinding");
    const [procPerNode, setProcPerNode] = useState("1");
    const [thPerProc, setThPerProc] = useState("1");
    const [coresPerProc, setCoresPerProc] = useState("1");
    const [hyperThreads, setHyperThreads] = useState("1");
    const [places, setPlaces] = useState("threads");
    const [layout, setLayout] = useState("spread");


    // Call parser on every form change
    useEffect(() => {
        if (props.useGenerator) {
            parseScript(props.batchText, true);
        }
    }, [constraint, appName, jobName, emailAddr, notifyType, hours, minutes, seconds, qos, numNodes, 
        maxNodes, thBinding, thBindType, procPerNode, thPerProc, coresPerProc, hyperThreads, places, layout]);


    // Parse the batch script and set states accordingly
    function parseScript(text, fromForm=false) {

        // booleans to check if certain lines are already there
        let sbatchExists = {C: false, J: false, eAddr: false, nType: false, t: false, q: false, N: false};
        let ompExists = {numThreads: false, places: false, procBind: false};
        let appExists = false;

        // these are used to ensure that the delay in changing state
        // does not affect things that rely on those changed states
        let instantNumNodes = numNodes;
        let instantProcPerNode = procPerNode;
        let instantConstraint = constraint;
        let instantQOS = qos;

        // array of sbatch file lines
        let lines = text.split("\n");
        lines = lines.map(line => line.trim());

        // order lines
        lines = sbatchOrder(lines);

        // parse lines for #SBATCH, OMP settings, srun, and app name
        lines = lines.map(line => {

            // #SBATCH lines
            if (line.startsWith("#SBATCH")) {
                let [flag, val] = parseSbatchLine(line.slice(7).trim());
                if (flag === "-C" || flag === "--constraint") {
                    sbatchExists.C = true;
                    if (fromForm) {
                        line = `#SBATCH --constraint=${constraint}`;
                    } else {
                        if (Object.keys(qosspecs).includes(`cori-${val}`)) {
                            setConstraint(val);
                            instantConstraint = val;
                        } else {
                            setConstraint("haswell");
                            instantConstraint = "haswell";
                        }
                        if (Object.keys(qosspecs[`cori-${instantConstraint}`]).includes(instantQOS)) {
                            setQOS(instantQOS);
                        } else {
                            setQOS("debug");
                        }
                    }
                } else if (flag === "-J" || flag === "--job-name") {
                    sbatchExists.J = true;
                    fromForm ? line = `${jobName === "" ? "" : `#SBATCH --job-name=${jobName}`}` : setJobName(val);
                } else if (flag === "--mail-user") {
                    sbatchExists.eAddr = true;
                    fromForm ? line = `${emailAddr === "" ? "" : `#SBATCH --mail-user=${emailAddr}`}` : setEmailAddr(val);
                } else if (flag === "--mail-type") {
                    sbatchExists.nType = true;
                    fromForm ? line = `${notifyType.includes("NONE") ? "" : `#SBATCH --mail-type=${notifyType.join()}`}` : setNotifyType(val.split(","));
                } else if (flag === "-t" || flag === "--time") {
                    sbatchExists.t = true;
                    if (fromForm) {
                        line = `#SBATCH --time=${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:${seconds.padStart(2, "0")}`;
                    } else {
                        let [h, m, s] = parseSbatchTime(val);
                        setHours(h); setMinutes(m); setSeconds(s);
                    }
                } else if (flag === "-q" || flag === "--qos") {
                    sbatchExists.q = true;
                    if (fromForm) {
                        line = `#SBATCH --qos=${qos}`
                    } else {
                        if (Object.keys(qosspecs[`cori-${instantConstraint}`]).includes(val)) {
                            setQOS(val);
                        } else {
                            setQOS("debug");
                        }
                        instantQOS = val;
                    }
                } else if (flag === "-N" || flag === "--nodes") {
                    sbatchExists.N = true;
                    if (fromForm) {
                        line = `#SBATCH --nodes=${numNodes}${maxNodes !== "" ? `-${maxNodes}` : ""}`
                    } else {
                        if (val.includes("-")) {
                            setNumNodes(val.split("-")[0]);
                            instantNumNodes = val.split("-")[0];
                            setMaxNodes(val.split("-")[1]);
                        } else {
                            setNumNodes(val);
                            instantNumNodes = val;
                            setMaxNodes("");
                        }
                    }
                }

            // OMP lines
            } else if (line.startsWith("export OMP_")) {
                let [ompVar, ompVal] = parseOmpLine(line.slice(11).trim());
                if (ompVar === "NUM_THREADS") {
                    ompExists.numThreads = true;
                    if (fromForm) {
                        !thBinding ?  line = "" : line = `export OMP_NUM_THREADS=${thBindType === "basicThreadBinding" ? thPerProc : parseInt(coresPerProc)*parseInt(hyperThreads)}`
                    } else {
                        thBindType === "basicThreadBinding" ? setThPerProc(ompVal) : setCoresPerProc(ompVal/parseInt(hyperThreads));
                    }
                } else if (ompVar === "PLACES") {
                    ompExists.places = true;
                    fromForm ? line = `${!thBinding ? "" : `export OMP_PLACES=${places}`}` : setPlaces(ompVal);
                } else if (ompVar === "PROC_BIND") {
                    ompExists.procBind = true;
                    fromForm ? line = `${!thBinding ? "" : `export OMP_PROC_BIND=${layout}`}` : setLayout(ompVal);
                }
            
            // srun lines
            } else if (line.startsWith("srun ") && !appExists) {
                appExists = true;
                let [ntasks, cpusPerTask, exec, cpuBindBegin, cpuBindType, otherOptions, execArgs] = parseSrunLine(line.slice(5).trim());
                if (!fromForm) {instantProcPerNode = ntasks/instantNumNodes}
                cpusPerTask = Math.floor(machinespecs[`cori-${instantConstraint}`]["maxncores"]/instantProcPerNode)*machinespecs[`cori-${instantConstraint}`]["maxnht"];
                if (!cpuBindType.includes(":")) {
                    if (instantProcPerNode !== machinespecs[`cori-${instantConstraint}`]["maxncores"]*machinespecs[`cori-${instantConstraint}`]["maxnsockets"] && instantProcPerNode > machinespecs[`cori-${instantConstraint}`]["maxncores"]*machinespecs[`cori-${instantConstraint}`]["maxnsockets"]/2) {
                        cpuBindType = "threads";
                    } else if (machinespecs[`cori-${instantConstraint}`]["maxncores"]*machinespecs[`cori-${instantConstraint}`]["maxnsockets"] % instantProcPerNode !== 0) {
                        cpuBindType = "cores";
                    }
                }
                if (cpusPerTask === 0) {cpusPerTask = 1}
                if (fromForm) {
                    thBinding ? line = `srun -n ${procPerNode*instantNumNodes} -c ${cpusPerTask} ${cpuBindBegin}${cpuBindType} ${otherOptions==="" ? "" : `${otherOptions} `}${appName} ${execArgs}` : line = appName;
                } else {
                    setThBinding(true); setProcPerNode(ntasks/instantNumNodes); setAppName(exec);
                    line = `srun -n ${ntasks} -c ${cpusPerTask} ${cpuBindBegin}${cpuBindType} ${otherOptions==="" ? "" : `${otherOptions} `}${exec} ${execArgs}`
                }

            // executable lines (beginning with './')
            } else if (line.startsWith("./") && !appExists) {
                appExists = true;
                if (fromForm && appName.startsWith("./")) {
                    line = appName;
                } else if (!fromForm) {
                    setAppName(line.split(" ")[0]);
                }
            }

            return line;
        });

        // add lines that weren't there if applicable
        if (!sbatchExists.C) {lines.push(`#SBATCH --constraint=${constraint}`)}
        if (!sbatchExists.J && jobName !== "") {lines.push(`#SBATCH --job-name=${jobName}`)}
        if (!sbatchExists.eAddr && emailAddr !== "") {lines.push(`#SBATCH --mail-user=${emailAddr}`)}
        if (!sbatchExists.nType && !notifyType.includes("NONE")) {lines.push(`#SBATCH --mail-type=${notifyType.join()}`)}
        if (!sbatchExists.t && !(hours === "" || minutes === "" || seconds === "")) {lines.push(`#SBATCH --time=${hours}:${minutes}:${seconds}`)}
        if (!sbatchExists.q) {lines.push(`#SBATCH --qos=${qos}`)}
        if (!sbatchExists.N) {lines.push(`#SBATCH --nodes=${numNodes}${maxNodes !== "" ? `-${maxNodes}` : ""}`)}
        if (thBinding) {
            if (thBindType === "basicThreadBinding") {
                if (!ompExists.numThreads && thPerProc !== "") {lines.push(`export OMP_NUM_THREADS=${thPerProc}`)}
            } else {
                if (!ompExists.numThreads && coresPerProc !== "" && hyperThreads !== "") {lines.push(`export OMP_NUM_THREADS=${parseInt(coresPerProc)*parseInt(hyperThreads)}`)}
            }
            if (!ompExists.places && places !== "") {lines.push(`export OMP_PLACES=${places}`)}
            if (!ompExists.procBind && layout !== "") {lines.push(`export OMP_PROC_BIND=${layout}`)}
        }
        if (!appExists && appName.startsWith("./")) {lines.push(appName)}
        
        // order lines again, remove excessive newlines
        lines = sbatchOrder(lines);
        lines = lines.join("\n");
        let finalText = "";
        for (let i = 0; i < lines.length; i++) {
            if (i < lines.length-2 && lines[i] === "\n" && lines[i+1] === "\n" && lines[i+2] === "\n") {
                finalText += "";
            } else {
                finalText += lines[i];
            }
        }

        // change batch text
        props.setBatchText(finalText);
    }

    // make parseScript accessible to higher components
    GeneratorForm.parseScript = parseScript;

    // handle changing the notification type form element
    function handleNotify(event) {
        let options = event.target.options;
        let values = [];
        for (let option of options) {
            if (option.selected) {
                values.push(option.value);
            }
        }
        setNotifyType(values);
    }

    // form validation for numerical fields
    function validateRange(min, max, number) {
        if (number === "") {return ""}
        else if (parseInt(number) >= parseInt(max)) {return parseInt(max).toString()}
        else if (parseInt(number) <= parseInt(min)) {return parseInt(min).toString()}
        else {return parseInt(number).toString()}
    }

    return (<fieldset disabled={!props.useGenerator}>
        <MachineGroup constraint={constraint} setConstraint={setConstraint} />

        <AppNameGroup appName={appName} setAppName={setAppName} />
        
        <JobNameGroup jobName={jobName} setJobName={setJobName} />
        
        <EmailAddressGroup emailAddr={emailAddr} setEmailAddr={setEmailAddr} />
        
        <NotificationEventsGroup notifyType={notifyType} handleNotify={handleNotify} />
        
        <WallclockTimeGroup hours={hours} minutes={minutes} seconds={seconds}
            setHours={setHours} setMinutes={setMinutes} setSeconds={setSeconds}
            qos={qos} constraint={constraint} validateRange={validateRange}
        />
        
        <QosGroup qos={qos} setQOS={setQOS} constraint={constraint} />
        
        <NumberOfNodesGroup numNodes={numNodes} setNumNodes={setNumNodes} constraint={constraint}
            qos={qos} maxNodes={maxNodes} setMaxNodes={setMaxNodes} validateRange={validateRange}
        />
        
        <ThreadBindingGroup thBinding={thBinding} setThBinding={setThBinding} />
        
        <TabsGroup thBindType={thBindType} setThBindType={setThBindType} thBinding={thBinding}
            isDisabled={!props.useGenerator || !thBinding || props.submitStatus === "submitting" || props.submitStatus === "loading" || props.submitStatus === "saving"}
            procPerNode={procPerNode} setProcPerNode={setProcPerNode}
            thPerProc={thPerProc} setThPerProc={setThPerProc}
            coresPerProc={coresPerProc} setCoresPerProc={setCoresPerProc}
            hyperThreads={hyperThreads} setHyperThreads={setHyperThreads}
            constraint={constraint} places={places} setPlaces={setPlaces}
            layout={layout} setLayout={setLayout} validateRange={validateRange}
        />
    </fieldset>);
}

// Form groups

function MachineGroup(props) {
    return (
        <Form.Group controlId="machine">
            <Form.Label>Machine</Form.Label>
            <Form.Text id="machineHelp">
                Select the machine on which you want to submit your job. <a href="https://docs.nersc.gov/systems/cori/#configuration" target="_blank" rel="noopener noreferrer">
                    <FontAwesomeIcon icon={faQuestionCircle} style={{"color": "gray"}} />
                </a>
            </Form.Text>
            <Form.Control as="select" aria-describedby="machineHelp"
                onChange={(event) => {props.setConstraint(event.target.value)}}
            >
                <option value="haswell" selected={props.constraint==="haswell"}>Cori - Haswell</option>
                <option value="knl" selected={props.constraint==="knl"}>Cori - KNL</option>
            </Form.Control>
        </Form.Group>
    );
}

function AppNameGroup(props) {
    return (
        <Form.Group controlId="appName">
            <Form.Label>Application Name</Form.Label>
            <Form.Text id="appNameHelp">
                Specify your application, including the full path.
            </Form.Text>
            <Form.Control type="text" value={props.appName} aria-describedby="appNameHelp"
                onChange={(event) => {props.setAppName(event.target.value)}}
            />
        </Form.Group>
    );
}

function JobNameGroup(props) {
    return (
        <Form.Group controlId="jobName">
            <Form.Label>Job Name</Form.Label>
            <Form.Text id="jobNameHelp">
                Specify a name for your job.
            </Form.Text>
            <Form.Control type="text" value={props.jobName} aria-describedby="jobNameHelp"
                onChange={(event) => {props.setJobName(event.target.value)}}
            />
        </Form.Group>
    );
}

function EmailAddressGroup(props) {
    return (
        <Form.Group controlId="emailAddress">
            <Form.Label>Email Address</Form.Label>
            <Form.Text id="emailAddressHelp">
                Specify your email address to get notified when the job
                enters a certain state.
            </Form.Text>
            <Form.Control type="email" value={props.emailAddr} aria-describedby="emailAddressHelp"
                onChange={(event) => {props.setEmailAddr(event.target.value)}}
            />
        </Form.Group>
    );
}

function NotificationEventsGroup(props) {
    return (
        <Form.Group controlId="notificationEvents">
            <Form.Label>Notification Events</Form.Label>
            <Form.Text id="notificationEventsHelp">
                Select the events for which you would like to receive
                a notification email.
            </Form.Text>
            <Form.Control as="select" multiple onChange={props.handleNotify}
                aria-describedby="notificationEventsHelp"
            >
                {["BEGIN", "END", "FAIL", "REQUEUE", "STAGE_OUT"].map(
                    (value) => <option key={value} value={value} selected={props.notifyType.includes(value)}>{value}</option>
                )}
                <option value="ALL" selected={props.notifyType.includes("ALL")}>ALL (of the above)</option>
                {["NONE", "TIME_LIMIT", "TIME_LIMIT_90", "TIME_LIMIT_80", "TIME_LIMIT_50", "ARRAY_TASKS"].map(
                    (value) => <option key={value} value={value} selected={props.notifyType.includes(value)}>{value}</option>
                )}
            </Form.Control>
        </Form.Group>
    );
}

function WallclockTimeGroup(props) {

    let correctQos = props.qos;
    if (!Object.keys(qosspecs[`cori-${props.constraint}`]).includes(props.qos)) {
        correctQos = "debug";
    }
    const maxhrs = qosspecs[`cori-${props.constraint}`][correctQos]["maxhrs"];
    const maxmins = (props.hours === maxhrs && maxhrs !== "0" ? "0"
                     : qosspecs[`cori-${props.constraint}`][correctQos]["maxmins"]);
    const maxsec = (props.hours === maxhrs && props.minutes === maxmins ? "0" : "59");
    
    useEffect(() => {
        props.setHours(prevHours => props.validateRange(0, maxhrs, prevHours));
        props.setMinutes(prevMinutes => props.validateRange(0, maxmins, prevMinutes));
        props.setSeconds(prevSeconds => props.validateRange(0, maxsec, prevSeconds));
    });
    
    return(
        <Form.Group controlId="wallclockTime">
            <Form.Label>Wallclock Time</Form.Label>
            <Form.Text>
                Specify the duration of the job.
                {correctQos !== "realtime" ? ` Maximum for the ${correctQos} queue is ${maxhrs === "0" ? `${maxmins} minutes` : `${maxhrs} hours`}.` : ""}
            </Form.Text>
            <Row>
                <Col sm={4}>
                    <Form.Control type="number" value={props.hours} min="0" max={maxhrs}
                        aria-describedby="hoursHelp"
                        onChange={(event) => {props.setHours(props.validateRange(0, maxhrs, event.target.value))}}
                    />
                    <Form.Text id="hoursHelp">hours</Form.Text>
                </Col>
                <Col sm={4}>
                    <Form.Control type="number" value={props.minutes} min="0" max={maxmins}
                        aria-describedby="minutesHelp"
                        onChange={(event) => {props.setMinutes(props.validateRange(0, maxmins, event.target.value))}}
                    />
                    <Form.Text id="minutesHelp">minutes</Form.Text>
                </Col>
                <Col sm={4}>
                    <Form.Control type="number" value={props.seconds} min="0" max={maxsec}
                        aria-describedby="secondsHelp"
                        onChange={(event) => {props.setSeconds(props.validateRange(0, maxsec, event.target.value))}}
                    />
                    <Form.Text id="secondsHelp">seconds</Form.Text>
                </Col>
            </Row>
        </Form.Group>
    );
}

function QosGroup(props) {
    return (
        <Form.Group controlId="qos">
            <Form.Label>Quality of Service</Form.Label>
            <Form.Text id="qosHelp">
                Select the QoS you request for your job. <a href="https://docs.nersc.gov/jobs/policy/" target="_blank" rel="noopener noreferrer">
                    <FontAwesomeIcon icon={faQuestionCircle} style={{"color": "gray"}} />
                </a>
            </Form.Text>
            <Form.Control as="select" onChange={(event) => {props.setQOS(event.target.value)}}
                aria-describedby="qosHelp"
            >
                {Object.keys(qosspecs[`cori-${props.constraint}`]).map(
                    (value) => <option key={value} value={value} selected={props.qos===value}>{value}</option>
                )}
            </Form.Control>
        </Form.Group>
    );
}

function NumberOfNodesGroup(props) {

    let correctQos = props.qos;
    if (!Object.keys(qosspecs[`cori-${props.constraint}`]).includes(props.qos)) {
        correctQos = "debug";
    }
    const maxNumNodes = qosspecs[`cori-${props.constraint}`][correctQos]["maxnnodes"];
    const minMaxNodes = props.numNodes;
    const maxMaxNodes = maxNumNodes;

    useEffect(() => {
        props.setNumNodes(prevNumNodes => props.validateRange("1", maxNumNodes, prevNumNodes));
        props.setMaxNodes(prevMaxNodes => props.validateRange(minMaxNodes, maxMaxNodes, prevMaxNodes));
    });

    return (
        <Form.Group controlId="numberOfNodes">
            <Form.Label>Number of Nodes</Form.Label>
            <Form.Text id="numberOfNodesHelp">
                How many nodes are used? (Up to {maxNumNodes}) <a href={`https://docs.nersc.gov/jobs/policy/#${props.constraint}`} target="_blank" rel="noopener noreferrer">
                    <FontAwesomeIcon icon={faQuestionCircle} style={{"color": "gray"}} />
                </a>
            </Form.Text>
            <Form.Control type="number" value={props.numNodes} min="1" max={maxNumNodes}
                aria-describedby="numberOfNodesHelp"
                onChange={(event) => {props.setNumNodes(props.validateRange("1", maxNumNodes, event.target.value))}}
            />
            <Form.Text>
                What is the maximum number of nodes to be used? (optional)
            </Form.Text>
            <Form.Control type="number" value={props.maxNodes} min={minMaxNodes} max={maxMaxNodes}
                onChange={(event) => {props.setMaxNodes(props.validateRange(minMaxNodes, maxMaxNodes, event.target.value))}}
            />
        </Form.Group>
    );
}

function ThreadBindingGroup(props) {
    return (
        <Form.Group>
            <Form.Label>
                Thread Binding <a href="https://docs.nersc.gov/jobs/affinity/" target="_blank" rel="noopener noreferrer">
                    <FontAwesomeIcon icon={faQuestionCircle} style={{"color": "gray"}} />
                </a>
            </Form.Label>
            <Form.Check type="radio" label="Use" id="thBinding"
                checked={props.thBinding} value={true} focus="true"
                onChange={(event) => {props.setThBinding(true)}}
            />
            <Form.Check type="radio" label="Don't use" id="thBinding"
                checked={!props.thBinding} value={false}
                onChange={(event) => {props.setThBinding(false)}}
            />
        </Form.Group>
    );
}

function TabsGroup(props) {
    return (
        <Tabs activeKey={props.thBindType} id="thBindingTabs" onSelect={(type) => (props.setThBindType(type))}>
            <Tab eventKey="basicThreadBinding" title="Basic Thread Binding" disabled={props.isDisabled}>
                <fieldset disabled={!props.thBinding}>
                    <ProcessesPerNodeGroup cid="processesPerNodeBasic" procPerNode={props.procPerNode}
                        setProcPerNode={props.setProcPerNode} constraint={props.constraint}
                        validateRange={props.validateRange}
                    />
                    <ThreadsPerProcessGroup thPerProc={props.thPerProc} setThPerProc={props.setThPerProc}
                        constraint={props.constraint} procPerNode={props.procPerNode}
                        validateRange={props.validateRange}
                    />
                </fieldset>
            </Tab>
            <Tab eventKey="advancedThreadBinding" title="Advanced Thread Binding" disabled={props.isDisabled}>
                <fieldset disabled={!props.thBinding}>
                    <ProcessesPerNodeGroup cid="processesPerNodeAdv" procPerNode={props.procPerNode}
                        setProcPerNode={props.setProcPerNode} constraint={props.constraint}
                        validateRange={props.validateRange}
                    />
                    <CoresPerProcessGroup coresPerProc={props.coresPerProc} constraint={props.constraint}
                        setCoresPerProc={props.setCoresPerProc} procPerNode={props.procPerNode}
                        validateRange={props.validateRange}
                    />
                    <HyperThreadsGroup hyperThreads={props.hyperThreads} constraint={props.constraint}
                        setHyperThreads={props.setHyperThreads} procPerNode={props.procPerNode}
                        validateRange={props.validateRange}
                    />
                    <PlacesGroup places={props.places} setPlaces={props.setPlaces} />

                    <LayoutGroup layout={props.layout} setLayout={props.setLayout} />
                </fieldset>
            </Tab>
        </Tabs>
    );
}

function ProcessesPerNodeGroup(props) {

    const machineObj = machinespecs[`cori-${props.constraint}`];
    const maxProcPerNode = machineObj["maxncores"] * machineObj["maxnht"];
    const numSockets = machineObj["maxnsockets"];
    let [warningMessages, setWarningMessages] = useState([]);

    function returnCorrectStep(number, step) {
        let intNumber = parseInt(number), intStep = parseInt(step);
        if (intNumber === 0) {return "1"}
        else if (intNumber % intStep !== 0 && intNumber > 1) {return (intNumber-1).toString()}
        else {return number}
    }

    useEffect(() => {
        props.setProcPerNode(prevProcPerNode => props.validateRange("1", maxProcPerNode, prevProcPerNode));
    });

    useEffect(() => {
        let messageList = [];
        if (props.procPerNode !== "") {
            if (props.procPerNode > machineObj["maxncores"]) {
                messageList.push("It is rare to get good performance when using more MPI ranks than physical cores.");
            }
            if (machineObj["maxncores"] % props.procPerNode !== 0 && props.procPerNode % machineObj["maxncores"] !== 0) {
                messageList.push(`The number of processes per node should evenly divide the number of cores available, which is ${machineObj["maxncores"]}.`);
            }
            if (props.constraint === "knl" && (machineObj["maxncores"]/props.procPerNode)%2 !== 0 && props.procPerNode < machineObj["maxncores"]) {
                messageList.push("You have selected a process configuration which leaves an odd number of cores per rank. This might decrease your performance significantly as you split tiles. Try using a configuration where 68/#processes/2 is even or use only an even number of cores and leave some cores idle.");
            }
        }
        if (messageList.length > 1) {
            messageList = messageList.map((m, i) => `${(i+1).toString()}) ${m}`);
        }
        setWarningMessages(messageList);
    }, [props.procPerNode, props.constraint]);

    return (
        <Form.Group controlId={props.cid}>
            <Form.Label>Processes per Node {warningMessages.length === 0 ? null : <WarningPopover id="hyperThreads" messages={warningMessages} component={
                <Badge pill={true} variant="warning">
                    <FontAwesomeIcon icon={faExclamationTriangle} /> {warningMessages.length}
                </Badge>
            } />}</Form.Label>
            <Form.Text id="processesPerNodeHelp">
                How many processes, e.g. MPI ranks per node,
                do you want to use?
            </Form.Text>
            <Form.Control type="number" value={props.procPerNode} aria-describedby="processesPerNodeHelp"
                min="0" max={maxProcPerNode} step={props.procPerNode === "1" ? "1" : numSockets}
                onChange={(event) => {
                    props.setProcPerNode(props.validateRange("1", maxProcPerNode, event.target.value))}}
                onBlur={(event) => {
                    props.setProcPerNode(returnCorrectStep(props.validateRange("1", maxProcPerNode, event.target.value), numSockets));}}
            />
            <Form.Text>Max: {maxProcPerNode}{numSockets !== 1 ? `. "1" or multiples of ${numSockets} only.` : ""}</Form.Text>
        </Form.Group>
    );
}

function ThreadsPerProcessGroup(props) {

    const [maxEffCores, maxEffHt] = calcEffCoresAndHt(props.procPerNode,
        machinespecs[`cori-${props.constraint}`]["maxncores"],
        machinespecs[`cori-${props.constraint}`]["maxnht"]);

    const maxThPerProc = maxEffCores*maxEffHt;

    useEffect(() => {
        props.setThPerProc(prevThPerProc => props.validateRange("1", maxThPerProc, prevThPerProc));
    });

    return (
        <Form.Group controlId="threadsPerProcess">
            <Form.Label>Threads per Process</Form.Label>
            <Form.Text id="threadsPerProcessHelp">
                How many OpenMP threads per process do you want to use?
                Note that SLURM currently only supports jobs which
                use the same number of processor per process. <a href="https://docs.nersc.gov/jobs/affinity/#omp_num_threads" target="_blank" rel="noopener noreferrer">
                    <FontAwesomeIcon icon={faQuestionCircle} style={{"color": "gray"}} />
                </a>
            </Form.Text>
            <Form.Control type="number" value={props.thPerProc} min="1" max={maxThPerProc}
                aria-describedby="threadsPerProcessHelp"
                onChange={(event) => {props.setThPerProc(props.validateRange("1", maxThPerProc, event.target.value))}}
            />
            <Form.Text>Max: {maxThPerProc}</Form.Text>
        </Form.Group>
    );
}

function CoresPerProcessGroup(props) {

    const maxCoresPerProc = calcEffCoresAndHt(props.procPerNode,
        machinespecs[`cori-${props.constraint}`]["maxncores"],
        machinespecs[`cori-${props.constraint}`]["maxnht"])[0];

    useEffect(() => {
        props.setCoresPerProc(prevCoresPerProc => props.validateRange("1", maxCoresPerProc, prevCoresPerProc));
    });

    return (
        <Form.Group controlId="coresPerProcess">
            <Form.Label>Cores per Process</Form.Label>
            <Form.Text id="coresPerProcessHelp">
                How many physical cores per process do you want to use?
                Note that SLURM currently only supports jobs which
                use the same number of processors per process.
            </Form.Text>
            <Form.Control type="number" value={props.coresPerProc} min="1" max={maxCoresPerProc}
                aria-describedby="coresPerProcessHelp"
                onChange={(event) => {props.setCoresPerProc(props.validateRange("1", maxCoresPerProc, event.target.value))}}
            />
            <Form.Text>Max: {maxCoresPerProc}</Form.Text>
        </Form.Group>
    );
}

function HyperThreadsGroup(props) {

    const maxHyperThreads = calcEffCoresAndHt(props.procPerNode,
        machinespecs[`cori-${props.constraint}`]["maxncores"],
        machinespecs[`cori-${props.constraint}`]["maxnht"])[1];

    useEffect(() => {
        props.setHyperThreads(prevHyperThreads => props.validateRange("1", maxHyperThreads, prevHyperThreads));
    });

    return (
        <Form.Group controlId="hyperThreads">
            <Form.Label>Hyper-Threads</Form.Label>
            <Form.Text id="hyperThreadsHelp">
                How many OpenMP threads per core do you want to use?
            </Form.Text>
            <Form.Control type="number" value={props.hyperThreads} min="1" max={maxHyperThreads}
                aria-describedby="hyperThreadsHelp"
                onChange={(event) => {props.setHyperThreads(props.validateRange("1", maxHyperThreads, event.target.value))}}
            />
            <Form.Text>Max: {maxHyperThreads}</Form.Text>
        </Form.Group>
    );
}

function PlacesGroup(props) {
    return (
        <Form.Group controlId="places">
            <Form.Label>Thread Places</Form.Label>
            <Form.Text id="placesHelp">
                Specify a value or a list of OpenMP thread places. <a href="https://docs.nersc.gov/jobs/affinity/#omp_places" target="_blank" rel="noopener noreferrer">
                    <FontAwesomeIcon icon={faQuestionCircle} style={{"color": "gray"}} />
                </a>
            </Form.Text>
            <Form.Control type="text" value={props.places} aria-describedby="placesHelp"
                onChange={(event) => {props.setPlaces(event.target.value)}}
            />
        </Form.Group>
    );
}

function LayoutGroup(props) {
    return (
        <Form.Group controlId="layout">
            <Form.Label>Layout</Form.Label>
            <Form.Text id="layoutHelp">
                Select an OpenMP thread layout. <a href="https://docs.nersc.gov/jobs/affinity/#omp_proc_bind" target="_blank" rel="noopener noreferrer">
                    <FontAwesomeIcon icon={faQuestionCircle} style={{"color": "gray"}} />
                </a>
            </Form.Text>
            <Form.Control as="select" onChange={(event) => {props.setLayout(event.target.value)}}
                aria-describedby="layoutHelp"
            >
                <option value="">not specified</option>
                {["true", "spread", "close", "false", "master"].map(
                    (value) => <option key={value} value={value} selected={props.layout===value}>{value}</option>
                )}
            </Form.Control>
        </Form.Group>
    );
}


// file path text box and load from file button
function FilePathGroup(props) {
    return (<>
        <Form.Group controlId="filePath">
            <Form.Label id="pathHelp">Path to Batch Script</Form.Label>
            <Form.Control type="text" value={props.pathText} aria-describedby="pathHelp"
                onChange={(event) => (props.setPathText(event.target.value))}
            />
        </Form.Group>
        <Button variant="outline-primary" size="sm" disabled={props.isDisabled}
            onClick={props.handleLoadFromFile}
            onMouseEnter={(event) => props.setNoParse(true)}
            onMouseLeave={(event) => props.setNoParse(false)}
        >
            {props.submitStatus === "loading"
                ? <>
                    <Spinner as="span" animation="border" size="sm" variant="primary" role="status">
                        <span className="sr-only">Loading file...</span>
                    </Spinner>
                    {" Loading..."}
                </>
                : "Load from this file (optional)"}
        </Button>
    </>);
}

// script editor
function BatchScriptGroup(props) {
    return (
        <Form.Group controlId="batchScript">
            <Form.Label>Batch Script</Form.Label>
            <AceEditor mode="sh" theme="chrome" value={props.batchText}
                onChange={(newValue) => (props.setBatchText(newValue))}
                focus={props.editorFocus} onFocus={() => (props.setEditorFocus(true))}
                wrapEnabled={true} minLines={10} width="100%" fontSize={14}
                onBlur={() => {if (props.useGenerator && !props.noParse) {props.parseScript(props.batchText, false)};
                               props.setEditorFocus(false);}}
                name="batchScript" editorProps={{ $blockScrolling: true }}
                setOptions={{enableBasicAutocompletion: true, enableLiveAutocompletion: true}}
            />
        </Form.Group>
    );
}

// save button and save/submit button
function SubmitButtonsGroup(props) {
    return (<>
        <Form.Group>
            <Button variant="outline-primary" type="submit" disabled={props.isDisabled}
                onMouseEnter={(event) => props.setNoParse(true)}
                onMouseLeave={(event) => props.setNoParse(false)}
            >
                {props.submitStatus === "saving"
                    ? <>
                        <Spinner as="span" animation="border" size="sm" variant="primary" role="status">
                            <span className="sr-only">Saving file...</span>
                        </Spinner>
                        {" Saving..."}
                    </>
                    : "Save to path"}
            </Button>
        </Form.Group>
        <Form.Group>
            <Button variant="primary" onClick={props.handleSubmit} disabled={props.isDisabled}
                onMouseEnter={(event) => props.setNoParse(true)}
                onMouseLeave={(event) => props.setNoParse(false)}
            >
                {props.submitStatus === "submitting"
                    ? <>
                        <Spinner as="span" animation="border" size="sm" variant="light" role="status">
                            <span className="sr-only">Submitting job...</span>
                        </Spinner>
                        {" Submitting..."}
                    </>
                    : "Save and submit job"}
            </Button>
        </Form.Group>
    </>);
}

// popover for form element warnings
function WarningPopover(props) {
    return (<>
        {props.messages.length !== 0
        ?   <OverlayTrigger placement="right" delay={{ show: 0, hide: 0 }}
                overlay={
                    <Popover id={`${props.id}Warning`} >
                        <Popover.Title as="h3">Warning{props.messages.length > 1 ? "s" : ""}</Popover.Title>
                        <Popover.Content>{props.messages.map((m, i) => <p key={i}>{m}</p>)}</Popover.Content>
                    </Popover>
                }
            >
                {props.component}
            </OverlayTrigger>
        : props.component}
    </>);
}


// calculate maximum effective cores and hyper-threads
function calcEffCoresAndHt(nprocs, maxncores, maxnht) {
    let maxEffCores, maxEffHt;
    if (nprocs>(maxncores*maxnht)) {
        maxEffCores=0;
    } else { 
        maxEffCores=Math.max(Math.floor(maxncores/nprocs),1);
    }
    if (nprocs<=maxncores) {
        maxEffHt=maxnht;
    } else{ 
        maxEffHt=Math.max(Math.floor(maxncores*maxnht/nprocs),1);
    }
    return [maxEffCores, maxEffHt];
}

/*
order sbatch file lines as so:
    #!shebang
    #SBATCH options
    anything else before OMP_ variables
    export OMP_ variables
    everything else
*/
function sbatchOrder(linesArray) {

    let orderedLines = [];
    let foundShebang = false;

    // try to find shebang, insert if not there
    linesArray = linesArray.map(line => {
        if (line.startsWith("#!") && !foundShebang) {
            orderedLines.push(line);
            line = "";
            foundShebang = true;
        } else if (line !== "" && !foundShebang) {
            orderedLines.push("#!/bin/bash");
            foundShebang = true;
        }
        return line;
    });

    orderedLines.push("");
    let addComments = true;

    // push SBATCH lines and any associated comments
    linesArray = linesArray.map(line => {
        if (line.startsWith("#SBATCH")) {
            orderedLines.push(line);
            line = "";
        } else if (line.startsWith("#") && addComments) {
            orderedLines.push(line);
            line = "";
        } else if(!line.startsWith("#") && line !== "") {
            addComments = false;
        }
        return line;
    });

    orderedLines.push("");
    let addStuffBeforeOMP = true;

    // push everything else before OMP lines
    linesArray = linesArray.map(line => {
        if (line.startsWith("export OMP_")) {
            addStuffBeforeOMP = false;
        } else if(addStuffBeforeOMP && !line.startsWith("srun")) {
            orderedLines.push(line);
            line = "";
        }
        return line;
    });

    orderedLines.push("");
    addComments = true;

    // push OMP lines and associated comments
    linesArray = linesArray.map(line => {
        if (line.startsWith("export OMP_")) {
            orderedLines.push(line);
            line = "";
        } else if (line.startsWith("#") && addComments) {
            orderedLines.push(line);
            line = "";
        } else if(!line.startsWith("#") && line !== "") {
            addComments = false;
        }
        return line;
    });

    orderedLines.push("");
    let addBlankLines = false;

    // push everything else
    linesArray = linesArray.map(line => {
        if (line !== "") {
            orderedLines.push(line);
            addBlankLines = true;
        } else if (addBlankLines) {
            orderedLines.push(line);
        }
        return line;
    });

    return orderedLines;
}


// Parsing helper functions

// parse lines beginning with '#SBATCH'
// restOfLine is the line not including '#SBATCH' and with no leading or trailing whitespace
function parseSbatchLine(restOfLine) {

    // check double dash flags
    if (restOfLine.startsWith("--")) {
        if (!restOfLine.includes("=")) {
            return [restOfLine, ""];
        } else {
            return [restOfLine.split("=")[0], restOfLine.split("=")[1]];
        }

    // check single dash flags
    } else if (restOfLine.startsWith("-")) {
        if (!restOfLine.includes(" ")) {
            return [restOfLine, ""];
        } else {
            return [restOfLine.split(" ")[0], restOfLine.split(" ")[1]];
        }

    // handle invalid flags
    } else {
        return ["", ""];
    }
}

// parse values passed to the --time or -t #SBATCH line
// accounts for all formats documented at https://slurm.schedmd.com/sbatch.html under '-t, --time'
function parseSbatchTime(timeVal) {

    let h = "0", m = "0", s = "0";
    let times = timeVal.split(":");

    // days-hours or minutes
    if (times.length === 1) {
        if (times[0].includes("-")) {
            h = parseInt(times[0].split("-")[0]) * 24 + parseInt(times[0].split("-")[1]);
        } else {
            m = times[0];
        }

    // days-hours:minutes or minutes:seconds
    } else if (times.length === 2) {
        if (times[0].includes("-")) {
            h = parseInt(times[0].split("-")[0]) * 24 + parseInt(times[0].split("-")[1]);
            m = times[1];
        } else {
            m = times[0];
            s = times[1];
        }

    // days-hours:minutes:seconds or hours:minutes:seconds
    } else if (times.length === 3) {
        if (times[0].includes("-")) {
            h = parseInt(times[0].split("-")[0]) * 24 + parseInt(times[0].split("-")[1]);
        } else {
            h = times[0];
        }
        m = times[1];
        s = times[2];
    }

    // return all as strings converted from integers (to ensure, for example, "3" not "03")
    return [parseInt(h.toString()).toString(), parseInt(m).toString(), parseInt(s).toString()];
}

// parse OpenMP variable lines
// restOfLine is the line excluding 'export OMP_' at the beginning
function parseOmpLine(restOfLine) {
    if (restOfLine.includes("=")) {
        return [restOfLine.split("=")[0], restOfLine.split("=")[1]];
    } else {
        return [restOfLine, ""];
    }
}

// parse srun statement line
// restOfLine is the line excluding 'srun ' at the beginning
// expects flag-variable pairs to be separated by whitespace
function parseSrunLine(restOfLine) {

    let ntasks="1", cpusPerTask="1", exec="", cpuBindBegin="--cpu-bind=", cpuBindType="none", otherOptions="", execArgs="";
    let options = restOfLine.split(" ");
    options.push("");
    let skipNext = false;
    let expectingVal = false;
    let execFound = false;

    // look through all the options passed to srun
    options = options.map((option, index) => {

        // if the executable has not been reached and not expecting a flag's value
        if (option !== "" && option !== " " && !execFound && !skipNext) {

            // check double dash flags
            if (option.startsWith("--")) {
                skipNext = false;
                expectingVal = false;
                // valid option should contain =
                if (option.includes("=")) {
                    let pair = option.split("=");
                    // check for the ones we care about
                    if (pair[0] === "--cpus-per-task") {
                        cpusPerTask = pair[1];
                    } else if (pair[0] === "--ntasks") {
                        ntasks = pair[1];
                    } else if (pair[0] === "--cpu-bind") {
                        if (pair[1].startsWith("quiet,")) {
                            cpuBindBegin = "--cpu-bind=quiet,";
                            cpuBindType = pair[1].slice(6);
                        } else if (pair[0].startsWith("verbose,")) {
                            cpuBindBegin = "--cpu-bind=verbose,";
                            cpuBindType = pair[1].slice(8);
                        } else {
                            cpuBindBegin = "--cpu-bind=";
                            cpuBindType = pair[1];
                        }
                    // handle ones we don't care about
                    } else {
                        otherOptions += option + " ";
                    }
                // handle invalid options
                } else {
                    otherOptions += option + " ";
                }

            // check single dash flags
            } else if (option.startsWith("-")) {
                // these are all the flags that don't take a value
                expectingVal = !(["-E","-H","-h","-l","-O","-Q","-s","-u","-V","-v","-X","-Z"].includes(option));
                // check for the ones we care about
                if (option === "-n" || option === "-c") {
                    if (options[index + 1].startsWith("-")) {
                        skipNext = false;
                    } else if (isNaN(parseInt(options[index + 1]))) {
                        skipNext = true;
                    } else {
                        skipNext = true;
                        option === "-n" ? ntasks = options[index + 1] : cpusPerTask = options[index + 1];
                    }
                
                // handle ones we don't care about
                } else {
                    otherOptions += option + " ";
                }
            
            // if first and not flag, must be executable
            } else if (index === 0) {
                exec = option;
                execFound = true;
            
            // if not flag and not expecting flag value, mush be executable
            } else if (!expectingVal) {
                exec = option;
                execFound = true;

            // if none of the above, must be a value to another flag
            } else {
                expectingVal = false;
                otherOptions += option + " ";
            }

        // if executable has already been reached, rest are exec's arguments
        } else if (execFound) {
            execArgs += option + " ";

        // if skipping, reset variables accordingly
        } else if (skipNext) {
            expectingVal = false;
            skipNext = false;
        }

        // didn't change option, just for the sake of using map()
        return option;
    });

    // return all without leading or trailing whitespace
    return [ntasks.trim(), cpusPerTask.trim(), exec.trim(), cpuBindBegin.trim(),
            cpuBindType.trim(), otherOptions.trim(), execArgs.trim()];
}
