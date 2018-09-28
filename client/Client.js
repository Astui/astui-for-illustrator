/**
 * @author    Scott Lewis <scott@atomiclotus.net>
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

/**
 * Flyout Menu items.
 * @type {{
 *    GET_TOKEN: string,
 *    ABOUT_PAGE: string,
 *    HOME_PAGE: string,
 *    SHOP_PLUGINS: string,
 *    ENTER_TOKEN: string
 * }}
 */
var MENU_ITEMS = {
    GET_TOKEN    : "getApiToken",
    ABOUT_PAGE   : "aboutAstuteGraphics",
    HOME_PAGE    : "astuteGraphicsHome",
    SHOP_PLUGINS : "shopAstuteGraphics",
    ENTER_TOKEN  : "enterApiToken"
};

/**
 * Possible Astui Ajax status codes.
 * @type {{
 *     "404": string,
 *     "401": string,
 *     "403": string,
 *     "418": string,
 *     "429": string,
 *     "500": string,
 *     "503": string
 * }}
 */
var HTTP_CODES = {
    200 : "Astui says: Success!",
    404 : "Astui says: Bad Reqeust - Astui did not recognize the request.",
    401 : "Astui says: Unauthorized - Make sure your API Token is correct.",
    402 : "Astui says: A subscriptions is required to perform that action",
    403 : "Astui says: Forbidden - You are not allowed to do that.",
    418 : "Astui says: I'm a teapot (short and stout).",
    429 : "Astui says: Too many requests - Slow down. You're requesting too many paths.",
    500 : "Astui says: Internal Server Error - We had a problem on the server. Please try again later.",
    503 : "Astui says: Service Unavailable - We are temporarily offline for maintenance. Please try again later."
};

$(function() {

    var csInterface = new CSInterface();

    csInterface.evalScript('Host.initSettingsFile()');

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

        console.log(result);

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

            console.log("Settings loaded without errors");
        }
        catch(e) {
            throw "[Client.updateSettings] " + e.message;
        }
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

        var $buttonSRP = $("#button-srp");
        var $buttonMTT = $("#button-mtt");
        var $range     = $("#tolerance");
        var $rangeval  = $("#tolerance-value");

        $rangeval.text($range.val());

        try {

            $range.change(function(event) {
                console.log("Tolerance : " + $range.val());
                $rangeval.text($range.val());
                $range.blur();
            });

            $buttonSRP.mouseup(function(evt) {
                evt.preventDefault();
                Client.getSettings();
                if (isFalse(Config.API_KEY)) {
                    Client.alert('An API Token is required to use this extension.');
                    return;
                }
                Client.smartRemovePoints();
                $buttonSRP.blur();
            });

            $buttonMTT.mouseup(function(evt) {
                evt.preventDefault();
                Client.getSettings();
                if (isFalse(Config.API_KEY)) {
                    Client.alert('An API Token is required to use this extension.');
                    return;
                }
                Client.moveToTangents();
                $buttonMTT.blur();
            });

            Client.initFlyoutMenu();
        }
        catch(e) { throw "[Client.init] " + e.message; }
    };

    /**
     * Create Astui Smart Remove Point data payload string.
     * @param   {string}    svgPathData
     * @param   {integer}   accuracy
     * @returns {string}
     */
    Client.formatSmartRemovePayload = function(svgPathData, accuracy ) {
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
            thePayload,
            endPointName;

        Client.dump("Client.sendPathPointToAstui started", "Client.sendPathPointToAstui");

        console.log("csxsEvent:type " + typeof(csxsEvent));
        console.log(csxsEvent);

        Client.dump(typeof(csxsEvent), "csxsEvent:type");
        Client.dump(csxsEvent, "csxsEvent");

        if (isString(csxsEvent)) {
            csxsEvent = JSON.parse(csxsEvent);
        }

        endPointName = 'ssr';
        if (csxsEvent.type == 'moveToTangents') {
            endPointName = 'tangencies';
        }

        Client.dump(endPointName, "endPointName");

        try {
            if (svgPathData = csxsEvent.data) {

                Client.dump("Start svgPathData", "svgPathData");
                Client.dump(svgPathData, "svgPathData");

                thePayload = Client.formatSmartRemovePayload(
                    svgPathData.svg,
                    $("#tolerance").val()
                );

                if (csxsEvent.type == 'moveToTangents') {
                    thePayload = pack(thePayload, 'angle=45', '&');
                }

                console.log("The PayLoad");
                console.log(thePayload);
                console.log("End The PayLoad");

                Client.dump(thePayload, "thePayload");
                Client.dump("Client.sendPathPointToAstui make ajax call", "Make Ajax Call");

                $.ajax({
                    method  : "POST",
                    url     : pack(Config.API_ENDPOINT, endPointName, '/'),
                    data    : thePayload,
                    async   : false,
                    headers : {
                        "Content-Type"  : "application/x-www-form-urlencoded",
                        "Cache-Control" : "no-cache",
                        "Accept"        : "application/json, text/plain, */*"
                    },
                    statusCode: {
                        200: function() {
                            console.log(HTTP_CODES[200]);
                            Client.dump(HTTP_CODES[404], "Astui XHR Status");
                        },
                        404: function() {
                            Client.alert(HTTP_CODES[404]);
                        },
                        401: function() {
                            Client.alert(HTTP_CODES[401]);
                        },
                        402: function() {
                            Client.alert(HTTP_CODES[402]);
                        },
                        403: function() {
                            Client.alert(HTTP_CODES[403]);
                        },
                        418: function() {
                            Client.alert(HTTP_CODES[418]);
                        },
                        429: function() {
                            Client.alert(HTTP_CODES[429]);
                        },
                        500: function() {
                            Client.alert(HTTP_CODES[500]);
                        },
                        503: function() {
                            Client.alert(HTTP_CODES[503]);
                        }
                    }
                })
                .done(function(result) {
                    Client.updatePathDataCallback({
                        uuid : csxsEvent.data.uuid,
                        path : result.path,
                    });
                })
                .fail(function(result) {
                    throw new Error("[Client.sendPathPointToAstui] " + result);
                });
            }
            else {
                Client.dump("svgPathData is not defined", "svgPathData ERROR");
                throw new Error("svgPathData is not defined");
            }
        }
        catch(e) {
            Client.dump(e.message, "Client.sendPathPointToAstui Error");
            throw new Error(e);
        }
    };

    /**
     * Update the path data for the selected item.
     * @param result
     */
    Client.updatePathDataCallback = function(newPathData) {
        newPathData = JSON.stringify(newPathData);
        csInterface.evalScript( 'Host.updatePathData(\'' + newPathData + '\')');
    };

    /**
     * Call Host.processSelection().
     * @param tolerance
     */
    Client.smartRemovePoints = function() {
        csInterface.addEventListener( 'smartRemovePoint', Client.sendPathPointToAstui );
        Client.dump("Host.processSelection(smartRemovePoints) started", "Client.smartRemovePoints");
        csInterface.evalScript( 'Host.processSelection("smartRemovePoint")');
    };

    /**
     * Call Host.processSelection().
     * @param tolerance
     */
    Client.moveToTangents = function() {
        csInterface.addEventListener( 'moveToTangents', Client.sendPathPointToAstui );
        Client.dump("Host.processSelection(moveToTangents) started", "Client.moveToTangents");
        csInterface.evalScript( 'Host.processSelection("moveToTangents")');
    };

    /**
     * Call the csInterface to open session.
     * @param filePath
     */
    Client.alert = function(message) {
        csInterface.evalScript('Host.alert("' + message + '")');
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
            console.error( "Client.readHandler : " + e.message );
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
        if (! isDefined(type)) {
            type = 'TEXT';
        }
        var replace = replace ? replace : false ;

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
     * Passthrough function to call Utils.dump in the Host.
     * @param {string} message
     */
    Client.dump = function(message, label) {
        if (! isDefined(label)) label = "Client.dump";
        csInterface.evalScript('Host.dump("' + message + '", "' + label + '")');
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
        Menu.add( MENU_ITEMS.ENTER_TOKEN,  'Enter Astui API Token',             true, false, false );
        Menu.add( MENU_ITEMS.GET_TOKEN,    'Get Astui API Token',               true, false, false );
        Menu.divider();
        Menu.add( MENU_ITEMS.ABOUT_PAGE,   'About the Astui Service',           true, false, false );
        Menu.add( MENU_ITEMS.SHOP_PLUGINS, 'Discover More Illustrator Plugins', true, false, false );
        Menu.setHandler( Client.flyoutMenuClickedHandler );
        Menu.build();
    };

    /**
     * Flyout menu click handler.
     * @param event
     */
    Client.flyoutMenuClickedHandler = function(event) {
        switch (event.data.menuId) {
            case MENU_ITEMS.GET_TOKEN :
                Client.openUrl('https://astui.tech');
                break;

            case MENU_ITEMS.ABOUT_PAGE :
                Client.openUrl( 'https://astui.tech' );
                break;

            case MENU_ITEMS.SHOP_PLUGINS :
                Client.openUrl( 'https://astutegraphics.com' );
                break;

            case MENU_ITEMS.ENTER_TOKEN :
                csInterface.evalScript('Host.saveApiToken()', Client.validateLicenseKey);
                break;

            default:
                break;
        }
    };

    /**
     * Interface to Host to open a web page in the default browser.
     * @param address
     */
    Client.openUrl = function(address) {
        csInterface.evalScript('Host.openUrl("' + address + '")');
    };

    /**
     * Validate the user input and save API_KEY to settings file.
     * @param result
     */
    Client.validateLicenseKey = function(result) {
        try {
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

    // Run now

    Client.getSettings();
    Client.init();
});