/**
 * @author    Astute Graphics <info@astutegraphics.com>
 * @copyright 2018 Astute Graphics
 * @version   1.0.0
 * @url       https://astutegraphics.com
 * @url       https://atomiclotus.net
 *
 * ABOUT:
 *
 *    Helper functions for general use.
 *
 * CREDITS:
 *
 *   This extension is based on the CEP Boilerplate extension by Scott Lewis
 *   at Atomic Lotus, LLC.
 *
 * NO WARRANTIES:
 *
 *   You are free to use, modify, and distribute this script as you see fit.
 *   No credit is required but would be greatly appreciated.
 *
 *   THIS SCRIPT IS OFFERED AS-IS WITHOUT ANY WARRANTY OR GUARANTEES OF ANY KIND.
 *   YOU USE THIS SCRIPT COMPLETELY AT YOUR OWN RISK AND UNDER NO CIRCUMSTANCES WILL
 *   THE DEVELOPER AND/OR DISTRIBUTOR OF THIS SCRIPT BE HELD LIABLE FOR DAMAGES OF
 *   ANY KIND INCLUDING LOSS OF DATA OR DAMAGE TO HARDWARE OR SOFTWARE. IF YOU DO
 *   NOT AGREE TO THESE TERMS, DO NOT USE THIS SCRIPT.
 */

/**
 * Test if this class supports the Ai Object type. Before you can use
 * this method, define an array in the global scope named `supportedTypes`.
 * The underscore indicates the array is meant to be private.
 * @param   {string}    theType
 * @returns {boolean}
 * @private
 */
function isSupported(theType) {
    if (! isDefined(supportedTypes)) {
        throw "You must create a global array named `supportedTypes` with the supported type names";
    }
    return supportedTypes.indexOf(theType.toLowerCase()) >= 0;
}

/**
 * Check the type of an object.
 * @param   {*}         theItem
 * @param   {string}    theType
 * @returns {boolean}
 * @private
 */
function isType(theItem, theType) {
    return strcmp(typeof(theItem), theType);
}

/**
 * Check the typename of an AI Object.
 * @param   {*}         theItem
 * @param   {string}    theTypename
 * @returns {boolean}
 * @private
 */
function isTypename(theItem, theTypename) {
    if (strcmp(theItem.typename, 'undefined')) return false;
    return strcmp(theItem.typename, theTypename);
}

/**
 * Is theItem an object?
 * @param   {*} theItem
 * @returns {*}
 * @private
 */
function isObject(theItem) {
    return isType(theItem, 'object');
}

/**
 * Is theItem a function?
 * @param   {*}         theItem
 * @returns {boolean}
 * @private
 */
function isFunction(theItem) {
    return isType(theItem, 'function');
}

/**
 * Is theItem a string?
 * @param   {*}         theItem
 * @returns {boolean}
 */
function isString(theItem) {
    return isType(theItem, 'string');
}

/**
 * Is theItem a number?
 * @param   {*}         theItem
 * @returns {boolean}
 */
function isNumber(theItem) {
    return ! isNaN(theItem);
}

/**
 * Is theString an error (Starts with the word 'Error')?
 * @param   {string}    theString
 * @returns {boolean}
 */
function isErrorString(theString) {
    return theString.substr(0, 5).toLowerCase() == 'error';
}

/**
 * Is theItem a GroupItem?
 * @param   {*}         theItem
 * @returns {boolean}
 * @private
 */
function isGroupItem(theItem) {
    return isTypename(theItem, 'GroupItem');
}

/**
 * Is theItem a PathItem?
 * @param   {*}         theItem
 * @returns {boolean}
 * @private
 */
function isPathItem(theItem) {
    return isTypename(theItem, 'PathItem');
}

/**
 * Is theItem a CompoundPathItem?
 * @param   {GroupItem} theItem
 * @returns {boolean}
 * @private
 */
function isCompoundPathItem(theItem) {
    return isTypename(theItem, 'CompoundPathItem');
}

/**
 * Test if a value is defined.
 * @param   {string}    property
 * @returns {boolean}
 * @private
 */
function isDefined(property) {
    return ! isType(property, 'undefined');
}

/**
 * Get the current timestamp.
 * @returns {number}
 * @private
 */
function now() {
    return (new Date()).getTime();
}

/**
 * Case-insensitive string comparison.
 * @param   {string}  aText
 * @param   {string}  bText
 * @returns {boolean}
 */
function strcmp(aText, bText) {
    return aText.toLowerCase() == bText.toLowerCase();
}

/**
 * Trap function execution in a try/catch block.
 * @param   {function}    func
 * @returns {*}
 */
function trap(func, customError) {
    try {
        return func();
    }
    catch(e){
        return customError || e.message ;
    }
}

/**
 * Test of a variable is completely empty.
 * @param   {*}         data
 * @returns {boolean}
 */
function isEmpty(data) {
    if (typeof(data) == 'number' || typeof(data) == 'boolean') {
        return false;
    }
    if (typeof(data) == 'undefined' || data === null) {
        return true;
    }
    if (typeof(data.length) != 'undefined') {
        return data.length == 0;
    }
    var count = 0;
    for (var i in data) {
        if (data.hasOwnProperty(i)) count ++;
    }
    return count == 0;
}

/**
 * Set the PathPoints in an AI PathItem from SVG path value.
 * @param {PathItem}    path
 * @param {string}      svg
 *
 * @author Malcolm McLean <malcolm@astutegraphics.co.uk>
 */
function setPathItemFromSVG(path, svg)
{
    var i;
    var pp;
    var pointArray = svgToPathPointArray(svg);

    while(path.pathPoints.length > 1)
    {
        path.pathPoints[0].remove();
    }
    path.pathPoints[0].anchor = pointArray[0].anchor;
    path.pathPoints[0].leftDirection = pointArray[0].leftDirection;
    path.pathPoints[0].rightDirection = pointArray[0].rightDirection;

    for(i=1;i<pointArray.length;i++)
    {
        pp = path.pathPoints.add();
        pp.anchor = pointArray[i].anchor;
        pp.leftDirection = pointArray[i].leftDirection;
        pp.rightDirection = pointArray[i].rightDirection;
        pp.pointType = PointType.CORNER;
    }
}

/**
 * Converts SVG Path value to cubic bezier points.
 * @param   {string}    svg
 * @returns {Array}
 *
 * @author Malcolm McLean <malcolm@astutegraphics.co.uk>
 */
function svgToPathPointArray(svg)
{
    var result = [];
    var splits = svg.split("C");
    var i;
    var point = {};
    var start = splits[0].slice(1, splits[0].length);
    var starts = start.split(",");
    if(starts.length != 2)
    {
        return [];
    }
    point.anchor = [parseFloat(starts[0]), parseFloat(starts[1])];
    result.push(point);
    point = {};
    for(i=1; i < splits.length;i++)
    {
        point = {};
        segs = splits[i].split(",");
        if(segs.length != 6)
        {
            return [];
        }
        result[i-1].rightDirection = [parseFloat(segs[0]), parseFloat(segs[1])];
        point.leftDirection = [parseFloat(segs[2]), parseFloat(segs[3])];
        point.anchor = [parseFloat(segs[4]), parseFloat(segs[5])];
        result.push(point);
    }
    if(svg.indexOf("Z"))
    {
        result[0].leftDirection = point.leftDirection;
        point = {};
        if(result.length > 1)
        {
            result.pop();
        }
    }
    for(i=0;i<result.length;i++)
    {
        result[i].anchor[0] *= 0.5;
        result[i].anchor[1] *= 0.5;
        result[i].leftDirection[0] *= 0.5;
        result[i].leftDirection[1] *= 0.5;
        result[i].rightDirection[0] *= 0.5;
        result[i].rightDirection[1] *= 0.5;
    }
    return result;

}

/**
 * Converts AI PathItem PathPoints to SVG path value.
 * @param   {PathItem}  path
 * @returns {*}
 *
 * @author Malcolm McLean <malcolm@astutegraphics.co.uk>
 */
function pathItemToSVG(path)
{
    var i;
    var answer = "";
    var ppa;
    var ppb;

    if(path.pathPoints.length == 0)
        return "";


    answer = "M" + path.pathPoints[0].anchor[0].toFixed(2) + "," + path.pathPoints[0].anchor[1].toFixed(2);


    for(i=0;i<path.pathPoints.length-1;i++)
    {
        ppa = path.pathPoints[i];
        ppb = path.pathPoints[i+1];
        answer += "C";
        answer += ppa.rightDirection[0].toFixed(2);
        answer += ",";
        answer += ppa.rightDirection[1].toFixed(2);
        answer += ",";
        answer += ppb.leftDirection[0].toFixed(2);
        answer += ",";
        answer += ppb.leftDirection[1].toFixed(2);
        answer += ",";
        answer += ppb.anchor[0].toFixed(2);
        answer += ",";
        answer += ppb.anchor[1].toFixed(2);
    }

    if(path.closed)
    {
        ppa = path.pathPoints[path.pathPoints.length-1];
        ppb = path.pathPoints[0];
        answer += "C";
        answer += ppa.rightDirection[0].toFixed(2);
        answer += ",";
        answer += ppa.rightDirection[1].toFixed(2);
        answer += ",";
        answer += ppb.leftDirection[0].toFixed(2);
        answer += ",";
        answer += ppb.leftDirection[1].toFixed(2);
        answer += ",";
        answer += ppb.anchor[0].toFixed(2);
        answer += ",";
        answer += ppb.anchor[1].toFixed(2);
        answer += "Z";
    }

    return answer;
}