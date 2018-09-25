/**
 * @author    Astute Graphics <info@astutegraphics.com>
 * @copyright 2018 Astute Graphics
 * @version   1.0.0
 * @url       https://astutegraphics.com
 * @url       https://atomiclotus.net
 *
 * ABOUT:
 *
 *    Implements the Astui API from Astute Graphics as an Illustrator extension.
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

window.Client = window.Client || {};

var MY_API_KEY,
    API_ENDPOINT;

var Config = window.Config || {};

$(function() {

    var csInterface = new CSInterface();

    // Ugly workaround to keep track of "checked" and "enabled" statuses

    var checkableMenuItem_isChecked = true;
    var targetMenuItem_isEnabled    = true;

    /**
     * Get stored settings from Host.
     */
    Client.getSettings = function() {
        csInterface.evalScript("Host.getSettings()", Client.updateSettings);
    };

    /**
     * Update local settings values.
     * @param result
     */
    Client.updateSettings = function(result) {
        console.info(result);
        try {
            if (isDefined(result)) {
                data = Client.validate(result);
            }

            for (key in data) {
                Config[key] = data[key];
            }

            if (typeof(data.API_ENDPOINT) != 'undefined') {
                API_ENDPOINT = data.API_ENDPOINT;
                Config.API_ENDPOINT = data.API_ENDPOINT;
            }

            if (typeof(data.API_KEY) != 'undefined') {
                MY_API_KEY = data.API_KEY;
                Config.MY_API_KEY = data.API_KEY;
            }
        }
        catch(e) {
            throw "[Client.updateSettings] " + e.message;
        }
    };

    /**
     * Eval a script to run in the JSX host app.
     * @param theScript
     */
    Client.eval = function(theScript) {
        csInterface.evalScript(theScript);
    };

    /**
     * Method to validate the data returned from a JSX callback
     * to make sure it is in the expected format. All results are
     * returned as a string. I recommend using stringified JSON
     * as a common format between Host and Client.
     * @param   {string}    result       The result returned from csInterface call.
     * @returns {Object}
     */
    Client.validate = function(result) {
        var data;

        console.info("[Client.validate(result)] " + result);

        try {
            if (! isString(result)) {
                console.log("[Client.validate() ... isString(result)] " + result);
                throw "Host returned an unknown data type : " + typeof(result);
            }

            if (isErrorString(result)) {
                console.log("[Client.validate() ... isErrorString(result)] " + result);
                throw "[isErrorString] " + result;
            }

            data = JSON.parse(result);

            console.log("[data = JSON.parse(result)] " + result);
            console.log("[typeof(isDefined)] " + typeof(isDefined));

            if (! isObject(data)) {
                console.log("[Client.validate() ... isObject(data)] " + JSON.stringify(data));
                throw "Host did not return a JSON object";
            }
        }
        catch(e) {
            throw "[Client.validate() ... catch(e)] " + e;
        }
        return data;
    };

    /**
     * Enabled a disabled element.
     * @param $o
     */
    Client.enable = function(subject) {
        $select(subject).removeAttr('disabled');
    };

    /**
     * Disable an eneabled element.
     * @param $o
     */
    Client.disable = function(subject) {
        $select(subject).attr('disabled', '');
    };

    /**
     * Initialize the HTML UI.
     */
    Client.init = function() {

        var $message   = $("#message");
        var $button    = $("#button");
        var $range     = $("#tolerance");
        var $rangeval  = $("#tolerance-value");
        var data       = null;

        $rangeval.text($range.val());

        try {

            $range.change(function(event) {
                console.log("Tolerance : " + $range.val());
                $rangeval.text($range.val());
                $range.blur();
            });

            $button.mouseup(function(evt) {
                evt.preventDefault();
                console.log("Client.processSelection");
                Client.processSelection();
                $button.blur();
            });

            Client.initFlyoutMenu();
        }
        catch(e) { throw "[Client.init] " + e.message; }
    };

    /**
     * Create Astui data payload string.
     * @param   {string}    svgPathData
     * @param   {integer}   accuracy
     * @returns {string}
     */
    Client.formatAstuiPayload = function(svgPathData, accuracy ) {
        return "path="    + svgPathData +
            "&tolerance="  + accuracy +
            "&api_token=" + Config.MY_API_KEY +
            "&decimal=1";
    };

    /**
     * Send the SVG path data to Astui.
     * @param {CSXSEvent} event  The SVG-formatted path data.
     */
    Client.sendPathPointToAstui = function(csxsEvent) {

        console.log(typeof(csxsEvent));
        console.log(csxsEvent);

        if (isString(csxsEvent)) {
            csxsEvent = JSON.parse(csxsEvent);
        }

        try {
            if (svgPathData = csxsEvent.data.path) {

                var uuid = csxsEvent.data.uuid;

                // { uuid: Utils.uuid(), path: pathItemToSVG(thisItem) }

                console.log("Client.sendPathPointToAstui called with data (" + svgPathData + ")");
                console.log("[astui.payload] " + Client.formatAstuiPayload(svgPathData, $("#tolerance").val()) );

                $.ajax({
                    method  : "POST",
                    url     : Config.API_ENDPOINT,
                    data    : Client.formatAstuiPayload(svgPathData, $("#tolerance").val()),
                    headers : {
                        "Content-Type"  : "application/x-www-form-urlencoded",
                        "Cache-Control" : "no-cache",
                        "Accept"        : "application/json, text/plain, */*"
                    }
                })
                .done(function(result) {
                    console.log( " ========== Done ========== " );
                    console.log( JSON.stringify(result) );
                    console.log(result);
                    Client.updatePathDataCallback(JSON.stringify({
                        uuid: csxsEvent.data.uuid,
                        path: result.path
                    }));
                })
                .fail(function(result) {
                    Client.write( Config.COMMON_LOG, "[Client.sendPathPointToAstui] " + result, true );
                });
            }
        }
        catch(e) {
            console.error(e);
        }
    };

    /**
     * Update the path data for the selected item.
     * @param result
     */
    Client.updatePathDataCallback = function(newPathData) {
        Client.info("[Client.updatePathDataCallback] " + newPathData);
        console.log("[Client.updatePathDataCallback] " + newPathData);
        console.log(newPathData);
        csInterface.evalScript( "Host.updatePathData('" + newPathData + "')", Client.info );
    };

    /**
     * Call Host.processSelection().
     * @param tolerance
     */
    Client.processSelection = function() {
        csInterface.addEventListener( 'processPathPoint', Client.sendPathPointToAstui );
        csInterface.evalScript( 'Host.processSelection("processPathPoint")', Client.info );
    };

    /**
     * Call the csInterface to open session.
     * @param filePath
     */
    Client.alert = function(message) {
        csInterface.evalScript('Host.showAlert("' + message + '")');
    };

    /**
     * Pass-thru function to Host to read a file.
     * @param filePath
     */
    Client.read = function(filePath) {
        csInterface.evalScript("Host.read('" + filePath + "')", Client.readHandler);
    };

    /**
     * Callback handler for Host.read() pass-thru.
     * @param result
     */
    Client.readHandler = function(result) {
        console.log("Client.readHandler result : " + result);
        return;
        try {
            if (typeof(result) != 'undefined') {
                // data = Client.validate(result).content;
                console.log("Client.readHandler data : " + result);
            }
            else {
                console.log("Client.readHandler result is undefined");
            }
        }
        catch (e) {
            console.error("Client.readHandler : " + e.message );
        }
    };

    /**
     * Pass-thru function to Host to write a file.
     * @param txt
     * @param filePath
     */
    Client.write = function(filePath, txt, replace) {
        var replace = replace ? replace : false ;
        csInterface.evalScript(
            "Host.write('" + filePath + "', '" + txt + "', '" + replace +  "')",
            Client.writeHandler
        );
    };

    /**
     * Callback handler for Host.write() pass-thru.
     * @param result
     */
    Client.writeHandler = function(result) {
        console.log("Client.writeHandler result : " + result);
        return;
        try {
            if (typeof(result) != 'undefined') {
                // data = Client.validate(result).result;
                console.log("Client.writeHandler data : " + result);
            }
            else {
                console.log("Client.writeHandler result is undefined");
            }
        }
        catch(e) {
            console.error("Client.writeHandler : " + e.message);
        }
    };

    /**
     * Send error message to log via CSInterface.
     * @param message
     */
    Client.error = function(message) {
        Client.log(message, 'error');
    };

    /**
     * Send info message to log via CSInterface.
     * @param message
     */
    Client.info = function(message) {
        Client.log(message, 'info');
    };

    /**
     * Send success message to log via CSInterface.
     * @param message
     */
    Client.success = function(message) {
        Client.log(message, 'success');
    };

    /**
     * Send warning message to log via CSInterface.
     * @param message
     */
    Client.warn = function(message) {
        Client.log(message, 'warn');
    };

    /**
     * Log a message to the client console and the host logger.
     * @param message
     */
    Client.log = function(message, type) {
        if (typeof(console[type]) == 'function') {
            console[type](message);
        }
        csInterface.evalScript('csxLogger("' + message + '", "' + type + '")')
    };

    /**
     * Flyout menu builder.
     */
    Client.initFlyoutMenu = function() {
        var Menu = new FlyoutMenu();
        Menu.add('enterLicenseKey', 'Enter License Key', true, false, false);
        Menu.divider();
        Menu.add('getLicenseKey', 'Get a License key', true, false, false);
        Menu.add('aboutAstuteGraphics', 'About Astute Graphics', true, false, false);
        Menu.setHandler(Client.flyoutMenuClickedHandler);
        Menu.build();
    };

    /**
     * Flyout menu click handler.
     * @param event
     */
    Client.flyoutMenuClickedHandler = function(event) {

        // the event's "data" attribute is an object, which contains "menuId" and "menuName"

        switch (event.data.menuId) {
            case "getLicenseKey":
                //@TODO: Redirect to get license key.
                break;

            case "aboutAstuteGraphics":
                //@TODO: Open Astute Graphics in default browser.
                break;

            default:
                break;
        }

        if (event.data.menuId == 'enterLicenseKey') {
            csInterface.evalScript('Host.userPrompt()', Client.validateLicenseKey);
        }
    };

    /**
     * Validate the user input.
     * @param result
     */
    Client.validateLicenseKey = function(result) {
        if (data = Client.validate(result)) {
            Client.showMessage('You entered license key : ' + data);
        }
    };

    /**
     * Test if a value is empty.
     * @param {*} data
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
     * Coerce any type of selector to the object it references, returned as a jQuery object.
     * @param subject
     * @returns {*}
     */
    function $select(subject) {
        var $o = subject;
        if (typeof(subject) != 'object') {
            $o = $(subject);
        }
        return $o;
    }

    /**
     * Case-insensitive string comparison.
     * @param aText
     * @param bText
     * @returns {boolean}
     */
    function strcmp(aText, bText) {
        return aText.toLowerCase() == bText.toLowerCase();
    }

    // Run now

    Client.getSettings();
    Client.init();
});