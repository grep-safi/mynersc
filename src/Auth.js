/**
 * A higher-order component that handles authentication.
 */
import React, { useEffect, useState } from 'react';

export const SFAPI_JWT = "SFAPI_JWT";
export const SFAPI_EXP = "SFAPI_EXP";
export const SFAPI_UID = "SFAPI_UID";

export const AppContext = React.createContext();
export const LOGIN_LINK = "https://api.nersc.gov/sso?dst=" + window.location.href;

function storeJwt() {
    // if this is a callback from auth, save the values
    const urlParams = new URLSearchParams(window.location.search);
    const jwt = urlParams.get('jwt');
    const username = urlParams.get('uid');
    const expiresAt = urlParams.get('exp');

    if(jwt) {
        window.localStorage.setItem(SFAPI_JWT, jwt);
        window.localStorage.setItem(SFAPI_UID, username);
        window.localStorage.setItem(SFAPI_EXP, expiresAt);
        // remove query_string
        window.history.replaceState(null, null, "/");        
    }
}

export default function Auth(props) {
    storeJwt();

    const [sfapiUid, setSfapiUid] = useState(window.localStorage.getItem(SFAPI_UID))
    const [sfapiJwt, setSfapiJwt] = useState(window.localStorage.getItem(SFAPI_JWT))
    const [sfapiExp, setSfapiExp] = useState(window.localStorage.getItem(SFAPI_EXP))
    
    useEffect(() => {
        const validateJwt = () => {
            let jwt = localStorage.getItem(SFAPI_JWT);
            if(jwt) {
                const exp = localStorage.getItem(SFAPI_EXP);
                const isValid = jwt && exp && new Date().getTime() < parseInt(exp, 10);
                if(!isValid) {
                    // console.log("JWT expired.")
                    localStorage.removeItem(SFAPI_JWT);
                    localStorage.removeItem(SFAPI_UID);
                    localStorage.removeItem(SFAPI_EXP);                
                    jwt = null;
                }            
            }
            if(!jwt) {
                setSfapiUid(null);
                setSfapiJwt(null);
                setSfapiExp(null);
            }
        };

        const jwtValidator = window.setInterval(() => validateJwt(), 5000);
        validateJwt();
        return () => {
            window.clearInterval(jwtValidator);
        }
    }, []);

    return <AppContext.Provider value={{sfapiUid, sfapiJwt, sfapiExp}}>
            {props.component}
        </AppContext.Provider>;
}

