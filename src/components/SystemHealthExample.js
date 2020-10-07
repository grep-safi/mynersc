import React, { useState, useEffect, useContext } from 'react'
import { AppContext, LOGIN_LINK } from '../Auth'
import { Alert } from 'react-bootstrap'
import { health_resourceStatuses } from '../sfapi'

export default function SystemHealthExample() {
    const context = useContext(AppContext);
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        if(context.sfapiJwt) {
            health_resourceStatuses({data: {'outages': false, 'notes': false}, jwt: context.sfapiJwt}
            ).then(res => {
                setStatus(res);
            }).catch(error => {
                setError(error.message);
            });
        }
    }, [context.sfapiJwt]);

    return <div>
            {context.sfapiJwt 
            ? <div>
                {error 
                ? <Alert variant="danger">Error: {error}</Alert>
                : (status 
                    ? <div>
                        {status.map(section => <div key={section.machine} style={{margin: 10, borderRadius: 5, background: "#f0f0f0", float: "left", padding: 10, border: "1px solid #ccc"}}>
                            <b>{section.full_name}</b><br/>
                            Status: {section.status}<br/>
                            Last changed: {section.last_changed}<br/>
                            System type: {section.system_type}<br/>
                            {section.notes.length > 0 && <div>Notes: <pre>{section.notes.join("\n")}</pre></div>}
                            {section.outages.length > 0 && <div>Outages: <pre>{section.outages.join("\n")}</pre></div>}
                        </div>)}
                    </div>
                    : <div>...loading...</div>)
                }
            </div> 
            : <div>Please <a href={LOGIN_LINK}>log in</a></div>}
        </div>;
}

