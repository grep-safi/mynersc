import React from 'react'
import { Row, Col } from 'react-bootstrap'

// Page header to use for all pages
export default function PageHeader(props) {
    return (
        <Row>
            <Col lg={12}>
                <h4 className="page-header" style={{"fontSize": "18px", "paddingBottom": "9px",
                    margin: "40px 0 20px", "borderBottom": "1px solid #eee"}}>
                    {props.title || ""}
                </h4>
            </Col>
        </Row>
    );
}
