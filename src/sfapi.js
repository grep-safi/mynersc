/* Adapted from Gabor Torok and Bjoern Enders's
jupyter notebook demonstrating the use of the sfapi.

Recommended usage (don't directly use sfapi()):
    api_function_call(dataObject, jwtString, otherParamsIfApplicable
    ).then(response => {
        somethingUsingResponse(response);
    }).catch(error => {
        handleError(error);
    });

Full sfapi documentation at https://api.nersc.gov/api/v1/
*/

export const SFAPI_URL = "https://api.nersc.gov/api/v1/";

export default async function sfapi({subpath, data=null, asForm=false, jwt=null, method='GET'}) {

    /* Note: asForm=true means data object is converted to url search params
             asForm=false means data object is converted to json string */
    
    let init = {method: method};
    init.headers = {};
    
    if (data) {
        if (asForm) {
            let params = new URLSearchParams(data);
            if (method === 'GET') {
                subpath = subpath + '?' + params.toString();
            } else {
                init.body = params.toString();
            }
            init.headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        } else {
            init.body = JSON.stringify(data);
            init.headers = {
                'Content-Type': 'application/json'
            }
        }
    }

    if (jwt) {
        init.headers.Authorization = jwt;
    }
    let response = await fetch(SFAPI_URL+subpath, init);
    
    return response.json();
}

// auth (all deprecated, use `https://api.nersc.gov/sso?dst=${window.location.href}` instead)

export function auth_login({data, jwt}) {
    return sfapi({subpath: "auth/login", data: data, asForm: false, jwt: jwt, method: 'POST'});
}

export function auth_revoke({data, jwt}) {
    return sfapi({subpath: "auth/revoke", data: data, asForm: true, jwt: jwt, method: 'POST'});
}

export function auth_verify({data, jwt}) {
    return sfapi({subpath: "auth/verify", data: data, asForm: false, jwt: jwt, method: 'POST'});
}

// file
    // note: path should have no leading or trailing slashes

export function get_file({data, jwt, machine, path}) {
    return sfapi({subpath: "file/"+machine+"/"+path, data: data, asForm: true, jwt: jwt, method: 'GET'});
}

export function put_file({data, jwt, machine, path}) {
    return sfapi({subpath: "file/"+machine+"/"+path, data: data, asForm: true, jwt: jwt, method: 'PUT'});
}

// accounting

export function accounting_projects({data=null, jwt}) {
    return sfapi({subpath: "accounting/projects", data: data, asForm: true, jwt: jwt, method: 'GET'});
}

export function accounting_projects_jobs({data, jwt, repoName}) {
    return sfapi({subpath: "accounting/projects/"+repoName+"/jobs", data: data, asForm: true, jwt: jwt, method: 'GET'});
} // note: accounting_projects_jobs is in development (comment written 08/06/2020)

export function accounting_roles({data=null, jwt}) {
    return sfapi({subpath: "accounting/roles", data: data, asForm: true, jwt: jwt, method: 'GET'});
}

// callbacks/callbacks
    // note: in development (comment written 08/06/2020)

export function get_callbacks({data=null, jwt}) {
    return sfapi({subpath: "callbacks/callbacks/", data: data, asForm: true, jwt: jwt, method: 'GET'});
}

export function post_callbacks({data, jwt}) {
    return sfapi({subpath: "callbacks/callbacks/", data: data, asForm: false, jwt: jwt, method: 'POST'});
}

export function get_callbacks_id({data=null, jwt, id}) {
    return sfapi({subpath: "callbacks/callbacks/"+id, data: data, asForm: true, jwt: jwt, method: 'GET'});
}

// transfer

export function transfer_check({data, jwt}) {
    return sfapi({subpath: "transfer/check", data: data, asForm: true, jwt: jwt, method: 'POST'});
}

export function post_transfer({data, jwt}) {
    return sfapi({subpath: "transfer/transfer", data: data, asForm: true, jwt: jwt, method: 'POST'});
}

export function get_transfer({data, jwt}) {
    return sfapi({subpath: "transfer/transfer", data: data, asForm: true, jwt: jwt, method: 'GET'});
}

// jobs

export function jobs_command({data, jwt, machine}) {
    return sfapi({subpath: "jobs/command/"+machine, data: data, asForm: true, jwt: jwt, method: 'POST'});
}

export function get_jobs_queue({data, jwt, machine}) {
    return sfapi({subpath: "jobs/queue/"+machine, data: data, asForm: true, jwt: jwt, method: 'GET'});
}

export function post_jobs_queue({data, jwt, machine}) {
    return sfapi({subpath: "jobs/queue/"+machine, data: data, asForm: true, jwt: jwt, method: 'POST'});
}

export function delete_jobs_queue({data=null, jwt, machine, jobId}) {
    return sfapi({subpath: "jobs/queue/"+machine+"/"+jobId, data: data, asForm: true, jwt: jwt, method: 'DELETE'});
}

// reservations/reservations
    // note: in development (comment written 08/06/2020)

export function get_reservations({data=null, jwt}) {
    return sfapi({subpath: "reservations/reservations/", data: data, asForm: true, jwt: jwt, method: 'GET'});
}

export function post_reservations({data, jwt}) {
    return sfapi({subpath: "reservations/reservations/", data: data, asForm: false, jwt: jwt, method: 'POST'});
}

export function get_reservations_id({data=null, jwt, id}) {
    return sfapi({subpath: "reservations/reservations/"+id, data: data, asForm: true, jwt: jwt, method: 'GET'});
}

export function put_reservations_id({data, jwt, id}) {
    return sfapi({subpath: "reservations/reservations/"+id, data: data, asForm: false, jwt: jwt, method: 'PUT'});
}

// reservations/resources
    // note: in development (comment written 08/06/2020)

export function reservations_resources({data=null, jwt}) {
    return sfapi({subpath: "reservations/resources/", data: data, asForm: true, jwt: jwt, method: 'GET'});
}

// health/resource_statuses

export function health_resourceStatuses({data, jwt}) {
    return sfapi({subpath: "health/resource_statuses/", data: data, asForm: true, jwt: jwt, method: 'POST'});
}

export function health_resourceStatuses_machine({data, jwt, machine}) {
    return sfapi({subpath: "health/resource_statuses/"+machine, data: data, asForm: true, jwt: jwt, method: 'POST'});
}
