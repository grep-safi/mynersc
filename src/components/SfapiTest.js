import React, { useState, useContext } from 'react'
import { AppContext, LOGIN_LINK } from '../Auth'
import { Container, Row, Col, Button } from 'react-bootstrap'
import CustomModal from './CustomModal'
import * as sfapi from '../sfapi'

/*
This page demonstrates various functions from the sfapi.js module
and can be removed, along with its associated Route in App.js, when
development on the Superfacility API and sfapi.js is complete.
*/
export default function SfapiTest() {

    // Get app context (used to get jwt)
    const context = useContext(AppContext);

    // show info modal
    const [showModal, setShowModal] = useState(false);
    const [modalTitle, setModalTitle] = useState("");
    const [modalBody, setModalBody] = useState("");

    // params to pass to sfapi functions
    let sfapiParams = {
        //"auth_login" (deprecated)
        //"auth_revoke" (deprecated)
        "auth_verify": {data: {"jwt": context.sfapiJwt, "username": context.sfapiUid}, jwt: context.sfapiJwt},
            // note: auth_verify is deprecated, testing for the sake of testing asForm=false in sfapi.js
        "get_file": {data: {"view": "no"}, jwt: context.sfapiJwt, machine:"cori", path: "global/homes/s/sbear/sfapi-get-file-test.txt"},
        //"put_file" (how to test uploading a file?)
        "accounting_projects": {jwt: context.sfapiJwt},
        //"accounting_projects_jobs" (in development)
        "accounting_roles": {jwt: context.sfapiJwt},
        //"get_callbacks" (in development)
        //"post_callbacks" (in development)
        //"get_callbacks_id" (in development)
        //"transfer_check" (need to figure out generate_token)
        //"post_transfer" (need to figure out generate_token)
        "jobs_command": {data: {"executable": "ls -l $HOME"}, jwt: context.sfapiJwt, machine: "cori"},
        "get_jobs_queue": {data: {"index": 0, "limit": 10, "sacct": false}, jwt: context.sfapiJwt, machine: "cori"},
        //"post_jobs_queue" (how to test posting a job?)
        //"delete_jobs_queue" (how to test deleting a job?)
        //reservations/* (all in development)
        "health_resourceStatuses": {data: {"notes": true, "outages": true}, jwt: context.sfapiJwt},
        "health_resourceStatuses_machine": {data: {"notes": true, "outages": true}, jwt: context.sfapiJwt, machine: "cori"}
    }

    let sfapiList = [];
    for (let func in sfapi) {
        if (typeof sfapi[func] === "function" && Object.keys(sfapiParams).includes(func)) {
            sfapiList.push(sfapi[func]);
        }
    }

    function handleClick(sfapiFunc) {
        setModalTitle(sfapiFunc.name);
        setModalBody("Loading...")
        setShowModal(true);
        console.log(sfapiParams[sfapiFunc.name]);
        sfapiFunc(sfapiParams[sfapiFunc.name]
        ).then(res => {
            setModalBody(JSON.stringify(res, null, 4));
        }).catch(error => {
            setModalTitle("Error");
            setModalBody(error.message);
        });
    }

    return (
        <Container fluid>

            <CustomModal show={showModal} handleClose={() => setShowModal(false)} title={modalTitle}
                body={modalBody} otherButton={null}
            />

            {context.sfapiJwt
            ? <>
                <Row>
                    <Col lg={12}>
                        <h4 className="page-header" style={{"fontSize": "18px", "paddingBottom": "9px",
                            margin: "40px 0 20px", "borderBottom": "1px solid #eee"}}>
                            SFAPI Tests
                        </h4>
                    </Col>
                </Row>
                {sfapiList.map((func) => (
                    <Row key={func.name}>
                        <Button onClick={() => handleClick(func)}>{func.name}</Button>
                    </Row>
                ))}
            </>
            : <div>Please <a href={LOGIN_LINK}>log in</a></div>}
        </Container>
    );
}
