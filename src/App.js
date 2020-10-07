import React from 'react';
import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import {
    BrowserRouter as Router,
    Switch,
    Route,
} from "react-router-dom";
import {Container} from 'react-bootstrap'
import Header from './components/Header'
import LeftNav from './components/LeftNav'
import Auth from './Auth'
import SystemHealthExample from './components/SystemHealthExample'
import JobscriptGenerator from './components/JobscriptGenerator'
import SfapiTest from './components/SfapiTest'
import CompletedJobs from './components/CompletedJobs'
import CoriQueues from './components/CoriQueues'
import JobLogs from './components/JobLogs'
import ClusterViz from './components/ClusterViz'

function App() {
    return <Auth component={
            <Router>
                <div className="App">
                    <header className="App-header">            
                        <Header />
                    </header>
                    <Container fluid>
                        <div id="sidebar">
                            <LeftNav />
                        </div>
                        <div id="content">
                            <Switch>
                                <Route exact path="/dashboard">
                                    <SystemHealthExample />
                                </Route>
                                <Route exact path="/jobscript-generator">
                                    <JobscriptGenerator />
                                </Route>
                                <Route exact path="/sfapi-test">
                                    <SfapiTest />
                                </Route>
                                <Route exact path="/completed-jobs">
                                    <CompletedJobs />
                                </Route>
                                <Route exact path="/cori-queues">
                                    <CoriQueues />
                                </Route>
                                <Route exact path="/job-logs">
                                    <JobLogs />
                                </Route>
                                <Route exact path="/cluster-viz">
                                    <ClusterViz />
                                </Route>
                            </Switch>
                        </div> 
                    </Container>
                </div>
            </Router>
        } />;
    }

export default App;
