import React from 'react'
import { Modal, Button } from 'react-bootstrap'

// Create a modal with header, close (X) button, body,
// footer with close button and optional second button
// Props: show (bool, required), handleClose (function, required),
//  title (str), body (str), otherButton (component)
export default function CustomModal(props) {
    return (
        <Modal size="lg" show={props.show} onHide={props.handleClose} aria-labelledby="modalTitle">
            <Modal.Header closeButton>
            <Modal.Title id="modalTitle">{props.title || ""}</Modal.Title>
            </Modal.Header>
            <Modal.Body>{props.body || ""}</Modal.Body>
            <Modal.Footer>
            {props.otherButton || null}
            <Button variant="secondary" onClick={props.handleClose}>
                Close
            </Button>
            </Modal.Footer>
        </Modal>
    );
}
