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

var API_KEY,
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
        var settings;
        try {
            console.info(result);
        }
        catch(e) { console.error("updateSettings:result " + e.message); }
        try {
            if (isDefined(result)) {
                settings = Client.validate(result);
            }

            for (key in settings) {
                Config[key] = settings[key];
            }

            if (typeof(settings.API_ENDPOINT) != 'undefined') {
                API_ENDPOINT = settings.API_ENDPOINT;
                Config.API_ENDPOINT = settings.API_ENDPOINT;
            }

            if (typeof(settings.API_KEY) != 'undefined') {
                API_KEY = settings.API_KEY;
                Config.API_KEY = settings.API_KEY;
            }

            console.log(JSON.stringify(Config));
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

            console.log("[data = JSON.parse(result)] " + data);

            if (! isObject(data)) {
                console.log("[Client.validate() ... isObject(data)] " + JSON.stringify(data));
                throw "Host did not return a JSON object";
            }
        }
        catch(e) {
            throw "[Client.validate() ... catch(e)] " + e.message;
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
                if (Client.hasValidApiKey()) {
                    Client.processSelection();
                }
                else {
                    Client.alert('You must have a valid API_KEY to use this extension');
                }
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
            "&api_token=" + Config.API_KEY +
            "&decimal=1";
    };

    /**
     * Send the SVG path data to Astui.
     * @param {CSXSEvent} event  The SVG-formatted path data.
     */
    Client.sendPathPointToAstui = function(csxsEvent) {

        var $svg,
            $path,
            thePayload;

        console.log(typeof(csxsEvent));
        console.log(csxsEvent);

        if (isString(csxsEvent)) {
            csxsEvent = JSON.parse(csxsEvent);
        }

        try {
            if (svgPathData = csxsEvent.data) {

                $svg = removeEmptyNodes(
                    $.parseXML(svgPathData.svg)
                );

                $("path", $svg).each(function(i) {

                    $path = $(this);

                    thePayload = Client.formatAstuiPayload(
                        $("path", $svg).attr("d"),
                        $("#tolerance").val()
                    );

                    $.ajax({
                        method  : "POST",
                        url     : Config.API_ENDPOINT,
                        data    : thePayload,
                        async   : false,
                        headers : {
                            "Content-Type"  : "application/x-www-form-urlencoded",
                            "Cache-Control" : "no-cache",
                            "Accept"        : "application/json, text/plain, */*"
                        }
                    })
                    .done(function(result) {

                        $path.attr('d', result.path);
                        // $path.attr('fill', '#FFAA00');

                        Client.updatePathDataCallback($svg, {
                            uuid : csxsEvent.data.uuid,
                            file : csxsEvent.data.file,
                            path : result.path,
                        });
                    })
                    .fail(function(result) {
                        Client.write( Config.COMMON_LOG, "[Client.sendPathPointToAstui] " + result, true );
                        console.error( "[Client.sendPathPointToAstui] " + result );
                        throw new Error("[Client.sendPathPointToAstui] " + result);
                    });
                });
            }
        }
        catch(e) {
            console.error(e);
            throw new Error(e);
        }
    };

    /**
     * Update the path data for the selected item.
     * @param result
     */
    Client.updatePathDataCallback = function($svg, newPathData) {

        Client.write(
            newPathData.file.replace(".svg", "-2.svg"),
            xmlToString($svg),
            true,
            'SVG '
        );

        var fileData = {
            uuid : newPathData.uuid,
            file : newPathData.file.replace(".svg", "-2.svg")
        };

        csInterface.evalScript( "Host.updatePathData('" + JSON.stringify(fileData) + "')", Client.info );
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
        try {
            if (isDefined(result)) {
                console.log("Client.readHandler data : " + result);
            }
            else {
                throw new Error("Client.readHandler result is undefined");
            }
        }
        catch (e) {
            console.error("Client.readHandler : " + e.message );
            throw new Error(e);
        }
        return true;
    };

    /**
     * Pass-thru function to Host to write a file.
     * @param txt
     * @param filePath
     */
    Client.write = function(filePath, txt, replace, type) {
        if (typeof(type) == 'undefined') {
            type = 'TEXT';
        }
        var replace = replace ? replace : false ;

        // Replace newline chars to avoid 'unterminated string literal' error.
        txt = trimNewLines(txt);

        csInterface.evalScript(
            "Host.write('" + filePath + "', '" + txt + "', '" + replace +  "', '" + type + "')",
            Client.writeHandler
        );
    };

    /**
     * Callback handler for Host.write() pass-thru.
     * @param result
     */
    Client.writeHandler = function(result) {
        try {
            if (typeof(result) != 'undefined') {
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
        Menu.add('enterLicenseKey', 'Enter License Token', true, false, false);
        Menu.divider();
        Menu.add('getLicenseKey', 'Get a License Token', true, false, false);
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
                csInterface.evalScript('Host.showAlert("Not yet implemented")', Client.info);
                break;

            case "aboutAstuteGraphics":
                csInterface.evalScript('Host.openUrl("astutegraphics.com")');
                break;
            case 'enterLicenseKey':
                csInterface.evalScript(
                    'Host.saveApiToken()',
                    Client.validateLicenseKey
                );
                break;

            default:
                break;
        }
    };

    /**
     * Validate the user input and save API_KEY to settings file.
     * @param result
     */
    Client.validateLicenseKey = function(result) {
        var configJson, settingsFile;

        console.log("Client.validateLicenseKey : result -> " + result);

        try {
            // // Client.getSettings();
            // if (API_KEY = Client.validate(result).value) {
            //     settingsFile = Config.DOCUMENTS + '/' + Config.APP_NAME + '/settings.json';
            //     Config.API_KEY = API_KEY;
            //     console.log("New Config : " + JSON.stringify(Config));
            //     Client.write(settingsFile, JSON.stringify(Config), true, 'JSON');
            // }
            Client.getSettings();
        }
        catch(e) {
            console.error("[Client.validateLicenseKey] : " + e.message);
        }
    };

    /**
     * Retrieve the stored API_KEY.
     * @returns {Object|*}
     */
    Client.getStoredLicenseKey = function() {
        try {
            configJson = JSON.parse(Client.read(
                Config.DOCUMENTS + '/' + Config.APP_NAME + '/settings.json'
            ));
            return configJson.API_KEY;
        }
        catch(e) { console.error(e); }
        return null;
    };

    /**
     * Does the user have a stored API_KEY?
     * @returns {boolean}
     */
    Client.hasValidApiKey = function() {
        return (! isEmpty(Client.getStoredLicenseKey() ));
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