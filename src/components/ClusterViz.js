import React, { useState, useEffect, useContext } from 'react';
import {line, axisBottom, axisLeft, format, hierarchy, interpolate, scaleLinear, scaleLog, select, treemap, max} from "d3/dist/d3";
import { main } from './main.css';
import { AppContext, LOGIN_LINK } from '../Auth'
import { jobs_command } from '../sfapi'
import {Alert, Col} from "react-bootstrap";

const JWTTOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJ1c2VyIjogInNhZmktbSIsICJleHBpcmVzIjogMTYwMjE3OTk4NCwgImFyZ3MiOiB7Im1vZHVsZXMiOiBmYWxzZSwgImlvIjogZmFsc2UsICJjaWRyIjogIiIsICJtcHAiOiBmYWxzZSwgInNoaWZ0ZXIiOiBmYWxzZSwgImxpZmV0aW1lIjogMzB9fQ.jPve2FsFYJPjMJG_hF-3lZzZ6IOBZL9KihO6PhjDFvp9yBZp0tws6zVDU5Fl4wMzxl-aOaAEzuJ05lae3Q81AKb-UWe253UGZv0-o7rn7ohtI5fJPKgaNLYGW5XJOuUrkGUyfbIjJfAdJidXTMzUsvycqDmXKp8eIxsEzuyPycOPa91RCCnHXlLV9r-RySy1SFpuxSt5WD9rdY-QyDN-TLxT0Wz8w7i4b2aQYw7zltK_DSIUZqkdRmmiPvPmM7LtC7Ad11zDYEnvaokxkfp4etBmNt5IGtTJ8jq2XxOIRUPnizr02hspaW2NuSqm3z2EtrM2NBaGT9tx4Sbhy1stjw";

export default function ClusterViz() {
    const [jobSearch, handleJobChange] = useForm([{ input: "", option: "USER"}]);
    const [nodeSearch, handleNodeChange] = useForm([{ input: "", option: "State"}]);
    const [count, setCount] = useState(0);
    const [sControl, setSControl] = useState("");

    const context = useContext(AppContext);

    const initialDisplay = {};
    nodeDisplayAttributes.forEach(e => {
        const display = ['NodeName', 'CPUAlloc', 'CPUTot', 'CPULoad', 'RealMemory', 'AllocMem', 'FreeMem',
            'State', 'Partitions', 'Job ID', 'Account', 'User', 'Display Graph'];
        // const display = [];

        initialDisplay[e] = display.includes(e);
    });
    const [checkedItems, setCheckedItems] = useState(initialDisplay);

    const handleCheckboxChange = (event) => {
        setCheckedItems(
            {
                ...checkedItems,
                [event.target.name]: event.target.checked
            }
        );
    }

    useEffect(() => {
        if (count === 0) createTreemap(hierarchyData([], [{ input: "", option: "State"}]), checkedItems);
        else {
            // const newData = submitJob().then(success, failure);
            if (sControl) {
                console.log(`newdata: ${JSON.parse(sControl)[0]}`);
            }

            createTreemap(hierarchyData(jobSearch, nodeSearch, sControl), checkedItems);
            // createTreemap(hierarchyData(jobSearch, nodeSearch), checkedItems);
        }
    }, [count, sControl]);

    const jobArr = [];
    const nodeArr = [];
    const checkBoxes = [];

    // TODO Add better identifier keys for React as a field in each element
    // TODO Simplify the double for loops with a while loop and extract the React code into a function
    for (let i = 0; i < jobSearch.length; i++) {
        jobArr.push(
            <div>
                <SearchBar
                    searchField={jobSearch[i]}
                    handleChange={handleJobChange}
                    handleEnter={setCount}
                    options={jobOptions}
                    searchID={`job-search-${i}`}
                    optionsID={`job-options-${i}`}
                    index={i}
                />

                <button
                    name="remove job"
                    id="remove-job"
                    onClick={() => handleJobChange('USER', i, false, true, setCount)}
                >
                    X
                </button>
            </div>
        );
    }

    for (let i = 0; i < nodeSearch.length; i++) {
        nodeArr.push(
            <div>
                <SearchBar
                    searchField={nodeSearch}
                    handleChange={handleNodeChange}
                    handleEnter={setCount}
                    options={nodeOptions}
                    searchID={`node-search-${i}`}
                    optionsID={`node-options-${i}`}
                    index={i}
                />

                <button
                    name="remove node"
                    id="remove-node"
                    onClick={() => handleNodeChange('State', i, false, true, setCount)}
                >
                    X
                </button>
            </div>
        );
    }

    for (let i = 0; i < nodeDisplayAttributes.length; i++) {
        checkBoxes.push(
            <div className="checkbox-container">
                <input
                    type="checkbox"
                    id={`display-attr-${i}`}
                    className="checkbox"
                    name={nodeDisplayAttributes[i]}
                    checked={checkedItems[nodeDisplayAttributes[i]] || false}
                    onChange={handleCheckboxChange}
                />

                <label
                    htmlFor={`display-attr-${i}`}
                    className="checkbox-label"
                >
                    {nodeDisplayAttributes[i]}
                </label>
            </div>
        );
    }

    return (
        <>
            {!context.sfapiJwt
                ? <><Alert variant="warning">Please <Alert.Link href={LOGIN_LINK}>log in</Alert.Link> to load, save, or submit.</Alert><hr /></>
                : null}

            <h1 id="title">Cluster Visualization</h1>

            <div id="search-wrapper">
                <div id="job-search">
                    Job
                    { jobArr }

                    <button
                        name="add job"
                        id="add-job"
                        onClick={() => handleJobChange('USER', 1, true, false, setCount)}
                    >
                        Add job
                    </button>

                </div>

                <div id="node-search">
                    Node
                    { nodeArr }

                    <button
                        name="add node"
                        id="add-node"
                        onClick={() => handleNodeChange('State', 1, true, false, setCount)}
                    >
                        Add node
                    </button>

                </div>
            </div>

            <div className="apply-button-wrapper">
                <button
                    name="apply changes"
                    id="apply-changes"
                    onClick={() => submitJob(setCount, setSControl, context)}
                    // onClick={() => setCount(c => c + 1)}
                >
                    Apply Changes
                </button>
            </div>

            <p id="currentPosition" />

            <div className="main-wrapper">
                <div className="checkboxes">
                    <p id="display-options-text">Display Options</p>
                    <div className="checkbox-wrapper">
                        { checkBoxes }
                    </div>
                </div>

                <div id="main-container">
                    <div id="data-viz" />
                </div>

                {/*<div className="display-graph-button">*/}
                {/*    <input*/}
                {/*        type="checkbox"*/}
                {/*        id={`graph-display`}*/}
                {/*        name="Display Graph"*/}
                {/*        checked={checkedItems["Display Graph"] || false}*/}
                {/*        onChange={handleCheckboxChange}*/}
                {/*    />*/}

                {/*    <label*/}
                {/*        htmlFor={`graph-display`}*/}
                {/*        className="graph-checkbox"*/}
                {/*    >*/}
                {/*        Display Graph*/}
                {/*    </label>*/}
                {/*</div>*/}

                {/*<div id="div-graph" className="change-graph">*/}
                    {/*<button*/}
                    {/*    // className="button button1"*/}
                    {/*    id="graph-change-btn"*/}
                    {/*>*/}
                    {/*    Change Graph*/}
                    {/*</button>*/}
                {/*</div>*/}
            </div>
        </>
    );
}

const submitJob = (setCount, setSControl, ctx) => {
    jobs_command({data: {executable: `scontrol -o show nodes`},
        // jwt: ctx.sfapiJwt,
        jwt: JWTTOKEN,
        machine: "cori"}
    ).then(fileRes => {
        if (fileRes.status === "ok") {
            console.log(`The data has arrived: ${fileRes.output.substring(0, 50)}`);
            setSControl(scontrolFormatter(fileRes.output));
            setCount(c => c + 1);
        }
    }).catch(error => {
        console.log(`api go errrr ${error}`);
    });
}

const scontrolFormatter = (data) => {
    const dataStr = data.toString();
    const dataArr = dataStr.split('\n');
    const formattedDataArr = [];
    formattedDataArr.push('[\n')

    for (let i = 0; i < dataArr.length - 1; i++) {
        const str = dataArr[i];
        const comma = i === dataArr.length - 2 ? '' : ',';

        const dataLine = formatData(str, comma);
        formattedDataArr.push(`\t${dataLine}\n`);
    }

    formattedDataArr.push(']');
    return formattedDataArr.join(' ');
}

function formatData(string, comma) {
    let modifiedStr = string.replace(/  /g, ' ');
    const originalStrArr = modifiedStr.split(' ');

    handleReasonField(originalStrArr);

    const modifiedStringFields = [];
    modifiedStringFields.push('{');

    // If the last item in the string is just an empty space, then we
    // don't want to apply any transformations to it so don't include it
    const len = originalStrArr[originalStrArr.length - 1] === "" ? originalStrArr.length - 1 : originalStrArr.length;

    // Find the indices of the array which correspond to the undesirable field
    // start position and end position
    let startExclusion = indexOfKey(originalStrArr, 'OS=');
    let endExclusion = indexOfKey(originalStrArr, 'RealMemory=');

    if (startExclusion === -1) {
        startExclusion = len + 1;
        endExclusion = len + 1;
    }

    for (let i = 0; i < len; i++) {
        // We don't want to include the OS= field in our transformations
        if (!(i >= startExclusion && i < endExclusion)) {
            let entry = originalStrArr[i];
            entry = entry.replace(/=/, "\": \"");
            entry = entry.replace(entry, `\"${entry}`);

            // If this is the last entry in the string, then don't add the comma at the end
            let endStr = i === len - 1 ? `${entry}\"` : `${entry}\",`;
            entry = entry.replace(entry, endStr);

            modifiedStringFields.push(entry);
        }
    }

    // Add ending curly brace
    modifiedStringFields.push(` }${comma}`);
    // Join with space between each key-value pair
    modifiedStr = modifiedStringFields.join(' ');
    // Parse with json
    // let jsonStr = JSON.parse(modifiedStr);

    return modifiedStr;
}

function indexOfKey(arr, targetStr) {
    for (let i = 0; i < arr.length; i++) {
        const str = arr[i];
        if (str.includes(targetStr)) {
            return i;
        }
    }

    return -1;
}

// Handle cases where Reason doesn't exist on down nodes and reason exists on allocated nodes
function handleReasonField(arr) {
    let index = indexOfKey(arr, 'Reason');
    if (index !== -1) {
        let reasonMessage = "";
        let len = arr.length;
        for (let i = index; i < len - 1; i++) {
            let str = ` ${arr.pop()}`;
            reasonMessage = str.concat(`${reasonMessage}`);
        }

        arr[index] = arr[index].concat(`${reasonMessage}`);
    }
}

const SearchBar = (props) => {
    useEffect(() => {
        // Get options element
        const optionsElement = document.getElementById(props.optionsID);
        // Get the names of options
        const options = props.options;

        // Clear options array so it has no values
        optionsElement.length = 0;

        // Add each option to the options element
        for (let i = 0; i < options.length; i++) {
            optionsElement.options[optionsElement.length] = new Option(options[i], options[i]);
        }
    }, []);

    return (
        <>
            <select
                className="sel-light"
                id={props.optionsID}
                name="option"
                onChange={e => props.handleChange(e, props.index)}
                value={props.searchField.option}
            />

            <input
                id={props.searchID}
                name="input"
                value={props.searchField.input}
                onChange={e => props.handleChange(e, props.index)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        props.handleEnter(c => c + 1);
                    }
                }}
            />
        </>
    );
}


const useForm = initialValues => {
    const [values, setValue] = useState(initialValues);

    /**
     *
     * @param e            {string, Object} - If addSearch is true, this is a string specifying the option value.
     *                                        Otherwise it's an object passed from onChange
     * @param i            {Number}         - Index of the element in the array to be modified or deleted
     * @param addSearch    {boolean}        - Tells function to add a new object to the array
     * @param removeSearch {boolean}        - Tells function to remove a specified element in the array
     * @param refresh      {function}       - Updates the counter so that the page refreshes and reflects new data
     */
    const handleChanges = (e, i, addSearch, removeSearch, refresh) => {
        // React's setValue will only trigger a re-render if it detects
        // a new object, that's why we're using the spread operator.
        // Don't remove it.

        if (addSearch) {
            setValue( [...values, {input: "", option: e}]);
        }
        else if (removeSearch) {
            // console.log(`we're removing a serach bar: ${i} and ${values[i].input}`);
            values.splice(i, 1);
            // console.log(`part 2 bar: ${i + 1} and ${values[i + 1].input} and ${[...values]}`);
            console.log(`new values ${i} ${[...values]}`);
            for (let i = 0; i < values.length; i++) {
                console.log(`nums ${i} ${JSON.stringify(values[i])}`);
            }
            setValue([...values]);
            refresh(c => c + 1);
        }
        else {
            setValue(values.map((item, index) => {
                if (index === i) return { ...values[index], [e.target.name]: e.target.value };
                return item;
            }));
        }
    }

    return [
        values,
        handleChanges
    ];
}

const squeue = require('./temp-static-data/formatted-squeue.json');
const staticSControl = require('./temp-static-data/formatted-scontrol.json');
const nidToUser = require('./temp-static-data/nid-to-user.json');

const hierarchyData = (jobEntries, nodeEntries, scontrol) => {
    let nList = [];

    if (!scontrol || scontrol === "") {
        console.log('Gonna use static data');
        console.log(`the new scontrol: ${scontrol}`);
        scontrol = staticSControl;
    } else {
        scontrol = JSON.parse(scontrol);
        console.log(`nvm gonna use scontrol now: ${scontrol[0]['NodeName']}`);
    }

    // Get a list of nids that correspond to the entered search string in the jobs json file
    for (let entry = 0; jobEntries && entry < jobEntries.length; entry++) {
        const option = jobEntries[entry]['option'].replace(/\s+/g, '');
        const searchStr = jobEntries[entry]['input'];

        // If the user inputted empty space, just skip the search
        if (searchStr.replace(/\s+/g, '').length === 0) continue;
        for (let i = 0; i < squeue.length; i++) {
            if (squeue[i][option] === searchStr) {
                nList = nList.concat(squeue[i]['NODELIST']);
            }
        }
    }

    let jsonParseIndex = 0;

    let maxCabinet = 0;
    let maxChassis = 0;
    let maxBlade = 0;

    function generateNodeHierarchy(cabinets) {

        const numCabinets = 68;
        const numChassis = 3;
        const numBlades = 16;
        const numNodes = 4;

        let nodeNum = 0;
        for (let i = 0; i < numCabinets; i++) {
            const chassis = [];
            let cabinetVal = 0;

            for (let j = 0; j < numChassis; j++) {
                const blades = [];
                let chassisVal = 0;

                for (let k = 0; k < numBlades; k++) {
                    const nodes = [];
                    let bladeVal = 0;

                    for (let l = 0; l < numNodes; l++) {
                        let nodeActive = 0;

                        let nodeData = scontrol[jsonParseIndex];
                        let queueData = nidToUser[nodeData['NodeName']];
                        if (queueData) nodeData = {...nodeData, queueData};

                        // If node is a compute node, add it to hierarchy tree, else it is an 'invisible' service node
                        // So add a dummy node to the tree
                        if (getNodeID(nodeData['NodeName']) === nodeNum) {
                            // Check if the node is active
                            nodeActive = isActive(nList, nodeData, nodeEntries, jobEntries) ? 1 : 0;

                            nodes.push({
                                "name": `Node ${l}`,
                                "value": nodeActive,
                                "nodeData": nodeData
                            });

                            jsonParseIndex += 1;
                        } else {
                            nodes.push({
                                "name": "Service Node",
                                "value": 0,
                            });
                        }

                        nodeNum += 1;

                        bladeVal += nodeActive;
                        maxBlade = Math.max(bladeVal, maxBlade);
                    }

                    blades.push({
                        "name": `Blade ${k}`,
                        "children": nodes,
                        // "value": bladeVal
                    });
                    chassisVal += bladeVal;
                    maxChassis = Math.max(chassisVal, maxChassis);
                }

                chassis.push({
                    "name": `Chassis ${j}`,
                    "children": blades,
                    // "value": chassisVal
                });
                cabinetVal += chassisVal;
                maxCabinet = Math.max(cabinetVal, maxCabinet);
            }

            cabinets.push({
                "name": `Cabinet ${i}`,
                "children": chassis,
                // "value": cabinetVal
            });
        }
    }

    const numericFields = ['CPULoad', 'RealMemory', 'AllocMem', 'FreeMem'];

    // checks the node to see if it should be labeled active
    function isActive(nList, node, nodeEntries, jobEntries) {
        // If there are no nodes and the node input is empty then they're not searching for anything
        if (nList.length === 0 && isEmptyInput(nodeEntries)) return false;

        // If the length of nList is 0 and jobEntries is an empty input,
        // then the user isn't looking for jobs, so set it to true
        const jobNode = nList.length === 0 && isEmptyInput(jobEntries) ? true : nList.includes(node['NodeName']);

        let bool = true;
        for (let entry = 0; entry < nodeEntries.length; entry++) {
            const field = nodeEntries[entry]['option'].replace(/\s+/g, '');
            const nodeValue = node[field].toUpperCase();
            const userValue = nodeEntries[entry]['input'].toUpperCase();

            // If the user inputs whitespace or nothing, just skip
            if (userValue.replace(/\s+/g, '').length === 0) continue;

            let matches = nodeValue.split(',').includes(userValue);
            if (numericFields.includes(field)) matches = getMatch(nodeValue, userValue);
            bool = bool && matches;
        }

        return bool && jobNode;
    }

    /**
     * Takes in two strings with numbers and returns true if the operator matches or false if not
     * @param nodeVal
     * @param userVal
     * @returns {boolean}
     */
    function getMatch(nodeVal, userVal) {
        let userNum = 0;
        if (userVal.includes('>=')) {
            userNum = parseNumber(userVal, '=');
            return Number.parseFloat(nodeVal) >= userNum;
        } else if (userVal.includes('<=')) {
            userNum = parseNumber(userVal, '=');
            return Number.parseFloat(nodeVal) <= userNum;
        } else if (userVal.includes('<')) {
            userNum = parseNumber(userVal, '<');
            return Number.parseFloat(nodeVal) < userNum;
        } else if (userVal.includes('>')) {
            userNum = parseNumber(userVal, '>');
            return Number.parseFloat(nodeVal) > userNum;
        } else if (!Number.isNaN(Number.parseFloat(userVal))) {
            return Number.parseFloat(nodeVal) === Number.parseFloat(userVal);
        }

        return false;
    }

    /**
     * Returns a number that is parsed from a string
     * @param num {string} Gets the string that contains the number and comparison operator
     * @param char {string} Gets the character that should be the end of the comparison operator and beginning of
     * the actual num
     * @returns {number}
     */
    function parseNumber(num, char) {
        return Number.parseFloat(num.substring(num.indexOf(char) + 1, num.length));
    }

    // Check if the entries array has empty inputs
    function isEmptyInput(entries) {
        if (!entries) return false;
        if (entries.length === 1 && entries[0]['input'].replace(/\s+/g, '').length === 0) return true;

        return entries.length === 0;
    }

    // Returns the number of the Node ID
    function getNodeID(str) {
        return parseInt(str.substring(str.indexOf('d') + 1, str.length));
    }

    const cabinets = [];
    generateNodeHierarchy(cabinets); // Creates cabinets with randomly activated nodes

    return {
        "name": "Cori",
        "children": cabinets,
        "maxCabinet": maxCabinet,
        "maxChassis": maxChassis,
        "maxBlade": maxBlade,
    };
}


const createTreemap = (hData, nodeFieldList) => {
    const width = 1000;
    const height = 1000;

// Random data variables before we get LDMS / Slurm
// data output to draw our graphs with
    const dt = {
        time: [1,2,3,4,5,6,7,8,9,10],

        valueA: [2,3,1,7,8,8,5,14,9,11],
        valueB: [5,4,4,4,8,13,18,13,18],
        valueC: [13,14,16,12,7,9,3,2,1,1],
        valueD: [3,14,6,12,17,9,13,2,11,14],
    };

    const transitionSpeed = 500;

    const x = scaleLinear().rangeRound([0, width]);
    const y = scaleLinear().rangeRound([0, height]);

    const showGraph = nodeFieldList["Display Graph"];

    // Remove all the preexisting nodes so we can redraw the page with new data
    select('#data-viz').selectAll('*').remove();

    const svg = select("#data-viz")
        .append("svg")
        .attr("id", 'root')
        .attr("viewBox", `0 0 ${width} ${height}`);

    // This function sets the pixel positions of each child in the parent node for display
    function tile(parentNode, x0, y0, x1, y1) {
        equallySpacedTiling(parentNode, width, height);
        for (const child of parentNode.children) {
            child.x0 = x0 + child.x0 / width * (x1 - x0);
            child.x1 = x0 + child.x1 / width * (x1 - x0);
            child.y0 = y0 + child.y0 / height * (y1 - y0);
            child.y1 = y0 + child.y1 / height * (y1 - y0);
        }
    }

    // This function creates a treemap object with the given data
    const tree = data => treemap()
        .tile(tile)
        (hierarchy(data)
            .sum(d => d.value)
            .sort((a, b) => b.height - a.height)
        );

    // This function returns the name of where
    // we are the treemap.
    const name = d => d.ancestors().reverse().map(d => d.data.name).join("/");

    const formatNum = format(",d");

    // This is the title which allows users to zoom out and tells them
    // Of their position in the system at a given moment.
    const currentPosition = select("#currentPosition")
        .attr("style", "color: gold");

    // Append the group tag and call the render function for the first time
    // which draws the system level view of the Cori supercomputer
    let group = svg.append("g")
        .call(render, tree(hData));

    /**
     * Renders the screen with the tiles of the level that we are currently on
     * @param {Object} group The <g> (group) tag SVG elements
     * @param {Object} root  The d3.treemap object
     */
    function render(group, root) {
        // Select all the <g> tags and bind the root's
        // children as the data and join all the <g> paths
        const node = group
            .selectAll("g")
            .data(root.children)
            .join("g");

        // This returns the root nodes and child nodes and adds
        // a click event so that the user can zoom in and zoom out
        node.filter(d => d === root ? d.parent : d.children)
            .attr("cursor", "pointer")
            .on("click", d => d === root ? zoomout(root) : zoomin(d));

        // Clicking on the currentPosition text will zoom
        // out of the current level (unless it is the first level)
        currentPosition
            .text(name(root))
            .on("click", () => name(root) !== 'Cori' ? zoomout(root) : null);

        /**
         * These rects are shaded according to the number of matching nodes that are
         * children of the object to which they correspond.
         * Shading goes from white to dark orange
         */
        node
            .append("rect")
            .classed('rectGroup', true)
            .attr("fill", d => {
                // This function will fill the rect based on the node value and the maximum node value possible
                // Uses logarithmic scaling
                const maxValuesArray = [hData.maxCabinet, hData.maxChassis, hData.maxBlade, 1];
                const depth = d.depth - 1;
                let maxVal = maxValuesArray[depth] === 0 ? 2 : maxValuesArray[depth] + 1;
                const colorScale = scaleLog()
                    .domain([1, maxVal])
                    // .range(['white', 'magenta']);
                    .range(['steelblue', 'maroon']);

                const nodeValue = d.value === 0 ? 1 : d.value + 1;
                return d === root ? "#fff" : `${colorScale(nodeValue)}`;
            })
            .attr("stroke", "gold");

        /**
         * This function returns an array of all the attributes that must be displayed
         * On the node rectangle view itself
         * @param d The object which contains the data of the node
         * @returns {string[]|[]} A string of all the attributes that the user desires to be on the display
         */
        const displayFields = d => {
            // If the depth isn't 4, then we aren't at the node level, so simply return empty string
            // If there is no nodeData, then we're probably at a service node which has no fields so return empty string
            if (d.depth !== 4 || !d.data.nodeData) return [''];

            const jobAttributes = [
                'JOBID',
                'ACCOUNT',
                'USER'
            ];

            // This for loop iterates through node attributes that are checked by the user
            // And pushes those to an array
            // If the number of checked boxes is greater than 25, then there's no space for more,
            // so simply exit the for loop
            const displayAttributes = [];
            let count = 0;
            for (const property in nodeFieldList) {
                if (nodeFieldList.hasOwnProperty(property) && nodeFieldList[property]) {
                    if (d.data.nodeData.hasOwnProperty(property)) {
                        displayAttributes.push(`${property}: ${d.data.nodeData[property]}`);
                    } else {
                        const formattedProp = property.toUpperCase().replace(/\s+/g, '');
                        const queueData = d.data.nodeData['queueData'];
                        if (queueData && jobAttributes.includes(formattedProp)) {
                            let str = `${property}: `;
                            for (let i = 0; i < queueData.length; i++) {
                                const comma = i === queueData.length - 1 ? '' : ', ';
                                str = str.concat(queueData[i][formattedProp] + comma);
                            }
                            displayAttributes.push(str);
                        }
                    }
                    count += 1;
                }
                if (count > 25) break;
            }

            return displayAttributes;
        }

        // This is the current depth in tree
        const viewDepth = root.children[0].depth;

        // This gives the starting position for a string of text
        // based on its length so that it is centered in the rect
        const textPosition = (text) => {
            const widths = [width / 24, width / 6, width / 8, width / 4];
            const characterSize = 3.2;
            return widths[viewDepth - 1] - text.length * characterSize;
        }

        // This adds text to the node based on the depth level
        // and the checkboxes the user checks off.
        node.append("text")
            .classed('rectGroup', true)
            .attr('transform', 'translate(0, 5)')
            .selectAll("tspan")
            .data(d => {
                const additions = viewDepth < 4 ? ['Matching', 'Nodes:', formatNum(d.value)] : [];
                return [d.data.name, ...additions, ...displayFields(d)];
            })
            .join("tspan")
            .attr('x', (d, i) => {
                const numHeaders = viewDepth < 4 ? 3 : 0;
                return i <= numHeaders ? textPosition(d) : 0;
            })
            .attr('dy', (d, i) => i === 0 || i >= 2 ? '1.0em' : '3.0em')
            .attr("font-size", `12px`)
            .attr("fill-opacity", 0.7)
            .attr("font-weight", "bold")
            .attr('fill', (d, i) => {
                const numHeaders = viewDepth < 4 ? 2 : 0;
                return i === 0 ? 'black' : i <= numHeaders ? 'midnightblue' : 'black';
            })
            .text(d => d);

        // If the depth is 4, draw the graph with the random data
        if (viewDepth === 4 && showGraph) {
            const xAxis = scaleLinear()
                .domain([0, max(dt.time)])
                .range([0, width / 6]);

            const yAxis = scaleLinear()
                .domain([0, 20])
                .range([height / 6, 0]);

            node
                .append('g')
                .classed('rectGroup', false)
                .attr('transform', d => {

                    x.domain([d.parent.x0, d.parent.x1]);
                    y.domain([d.parent.y0, d.parent.y1]);

                    let xVal = x(d.x0) + width / 6;
                    let yVal = y(d.y0) + height / 2.2;

                    return `translate(${xVal},${yVal})`;
                })
                .call(axisBottom(xAxis));

            const nodeLine = node
                .append('g')
                .classed('rectGroup', false)
                .attr('transform', d => {
                    x.domain([d.parent.x0, d.parent.x1]);
                    y.domain([d.parent.y0, d.parent.y1]);

                    let xVal = x(d.x0) + width / 6;
                    let yVal = y(d.y0) + height / 2.2 - height / 6;

                    return `translate(${xVal},${yVal})`;
                })
                .append('path')
                .datum((d, i) => {
                    if (i === 0) return dt.valueA;
                    if (i === 1) return dt.valueB;
                    if (i === 2) return dt.valueC;
                    if (i === 3) return dt.valueD;
                })
                .attr("d", line()
                    .x((d, i) => xAxis(i))
                    .y(d => yAxis(d)))
                .attr("stroke", "crimson")
                .style("stroke-width", 2)
                .style("fill", "none");

            // console.log(`this is the nodeline: ${nodeLine[0]}`);
            // for (const prop in nodeLine) {
            //     console.log(`property: ${prop} value: ${nodeLine[prop]}`)
            // }

            node
                .append('g')
                .classed('rectGroup', false)
                .attr('transform', d => {
                    x.domain([d.parent.x0, d.parent.x1]);
                    y.domain([d.parent.y0, d.parent.y1]);

                    let xVal = x(d.x0) + width / 6;
                    let yVal = y(d.y0) + height / 2.2 - height / 6;

                    return `translate(${xVal},${yVal})`;
                })
                .call(axisLeft(yAxis));

            const optionsGroup = ["CPU Usage", "Memory Usage"];

            select("#div-graph")
                .append("select")
                .attr('id', 'select-btn')
                .selectAll('myOptions')
                .data(optionsGroup)
                .enter()
                .append("option")
                .text(d => d)
                .attr('value', d => d);

            select('#select-btn')
                .on("change", () => update());

            // A function that update the chart
            function update() {
                // Give these new data to update line
                const multiArray = [];
                for (let j = 0; j < 4; j++) {
                    const arr = [];
                    multiArray.push(arr);
                    for (let i = 0; i < 10; i++) {
                        arr.push(Math.round(Math.random() * 17) + 1);
                    }
                }

                nodeLine
                    .datum((d, i) => multiArray[i])
                    .transition()
                    .duration(1000)
                    .attr("d", line()
                        .x((d, i) => xAxis(i))
                        .y(d => yAxis(d))
                    )
                    .attr("stroke", "crimson")
                    .style("stroke-width", 2)
                    .style("fill", "none");
            }
        }

        // ----------
        group.call(position, root);
    }

    // Draw the correct positions of the tiles on the svg.
    function position(group, root) {
        group
            .selectAll("g")
            .selectAll('.rectGroup')
            .attr("transform", d => {
                let xCoord = x(d.x0);
                let yCoord = y(d.y0);

                return d === root ? `translate(0,0)` : `translate(${xCoord},${yCoord})`;
            });

        group.selectAll('g')
            .select("rect")
            .attr("width", d => d === root ? width : x(d.x1) - x(d.x0))
            .attr("height", d => d === root ? 30 : y(d.y1) - y(d.y0))
    }

    // When zooming in, draw the new nodes on top, and fade them in.
    function zoomin(d) {
        const group0 = group.attr("pointer-events", "none");
        const group1 = group = svg.append("g").call(render, d);

        x.domain([d.x0, d.x1]);
        y.domain([d.y0, d.y1]);

        svg.transition()
            .duration(transitionSpeed)
            .call(t => group0.transition(t)
                .remove()
                .call(position, d.parent))
            .call(t => group1.transition(t)
                .attrTween("opacity", () => interpolate(0, 1))
                .call(position, d));
    }

    // When zooming out, draw the old nodes on top, and fade them out.
    function zoomout(d) {
        const group0 = group.attr("pointer-events", "none");
        const group1 = group = svg.insert("g", "*").call(render, d.parent);

        x.domain([d.parent.x0, d.parent.x1]);
        y.domain([d.parent.y0, d.parent.y1]);

        svg.transition()
            .duration(transitionSpeed)
            .call(t => group0.transition(t)
                .remove()
                .attrTween("opacity", () => interpolate(1, 0))
                .call(position, d))
            .call(t => group1.transition(t)
                .call(position, d.parent));
    }
}

/**
 * This tiling function divides up the members of the tree into equally spaced tiles
 * @param parent
 * @param width
 * @param height
 */
const equallySpacedTiling = (parent, width, height) => {
    let rows;
    let columns;

    // Cabinet view
    if (parent.children.length === 68) {
        rows = 6;
        columns = 12;
    }
    // Chassis view
    else if (parent.children.length === 3) {
        rows = 1;
        columns = 3;
    } else if (parent.children.length === 16) {
        rows = 4;
        columns = 4;
    } else if (parent.children.length === 4) {
        rows = 2;
        columns = 2;
    }

    let rowWidth = height / rows;
    let columnWidth = width / columns;

    let rowIndex = 0;
    let columnIndex = 0;

    for (const child of parent.children) {

        child.x0 = columnIndex * columnWidth;
        child.x1 = (columnIndex + 1) * columnWidth;

        child.y0 = (rows - rowIndex - 1) * rowWidth;
        child.y1 = (rows - rowIndex) * rowWidth;

        columnIndex += 1;
        if (columnIndex >= columns) {
            columnIndex = 0;
            rowIndex += 1;
        }
    }
}

const nodeOptions = [
    'State',
    'Partitions',
    'Active Features',
    'Available Features',
    'CPUAlloc',
    'CPUTot',
    'CPULoad',
    'RealMemory',
    'AllocMem',
    'FreeMem',
    'NodeName',
    'Arch',
    'CoresPerSocket',
];

const jobOptions = [
    'USER',
    'ACCOUNT',
    'JOB ID'
];

const nodeDisplayAttributes = [
    'NodeName',
    'Arch',
    'CoresPerSocket',
    'CPUAlloc',
    'CPUTot',
    'CPULoad',
    'AvailableFeatures',
    'ActiveFeatures',
    'Gres',
    'Version',
    'RealMemory',
    'AllocMem',
    'FreeMem',
    'Sockets',
    'Boards',
    'State',
    'ThreadsPerCore',
    'TmpDisk',
    'Weight',
    'Owner',
    'MCS_label',
    'Partitions',
    'BootTime',
    'SlurmdStartTime',
    'CfgTRES',
    'AllocTRES',
    'CapWatts',
    'CurrentWatts',
    'AveWatts',
    'ExtSensorsJoules',
    'ExtSensorsWatts',
    'ExtSensorsTemp',
    'Reason',
    'Job ID',
    'Account',
    'User',
    'Display Graph',
];
