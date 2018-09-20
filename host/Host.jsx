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

/**
 * Declare the target app.
 */
#target illustrator

$.localize = true;

#include "Logger.jsx";
#include "JSON.jsx";
#include "Helpers.jsx";
#include "Utils.jsx";
#include "Configuration.jsx";
#include "FileSystem.jsx";
#include "MenuCommand.jsx";
#include "Exporter.jsx";

/**
 * @type {{
 *      APP_NAME: string,
  *     USER: *,
  *     HOME: *,
  *     DOCUMENTS: *
  * }}
 */
var Config = {
    APP_NAME         : 'astui-for-illustrator',
    USER             : $.getenv('USER'),
    HOME             : $.getenv('HOME'),
    DOCUMENTS        : Folder.myDocuments +  "",
    LOGFOLDER        : '~/Downloads/astui-for-illustrator',
    API_KEY          : 'YOUR_API_KEY',
    API_ENDPOINT     : 'ASTUI_API_ENDPIONT',
    COMMON_LOG       : '~/Downloads/astui-for-illustrator/common.log'
};

/**
 * Supported Ai Object types for this script.
 * @type {string[]}
 */
var supportedTypes = [
    "groupitem",
    "pageitem",
    "compoundpathitem",
    "pathitem"
];

/**
 * Used for temporary storage of objects.
 * @type {{}}
 */
var _GLOBALS = {
    /**
     * The settings file path.
     * @type {string}
     */
    SETTINGS_FILE_PATH : Folder.myDocuments + "/astui-for-illustrator/settings.json"
};

Utils.dump({name: 'CONFIG',   value: Utils.inspect(Config) });
Utils.dump({name: '_GLOBALS', value: Utils.inspect(_GLOBALS) });

/**
 * Run the script using the Module patter.
 */
var Host = (function(Config) {

    /**
     * The local scope logger object.
     * @type {Logger}
     */
    var _logger   = new Logger(Config.APP_NAME, Config.LOGFOLDER, LogLevel.INFO);
    var _exporter = new Exporter();

    /**
     * Prompt user for API_KEY.
     * @returns {string}
     */
    function _saveApiToken() {

        var userInput;

        Utils.dump( "[_saveApiToken(defaultAnswer)] : START" );

        userInput = prompt('Please enter your Astute Graphics API Token', Config.API_KEY);

        if (typeof(userInput) != 'undefined' && Utils.trim(userInput) != '') {
            Utils.dump( "[_saveApiToken() : userInput : " + userInput  );

            Utils.dump( "[_saveApiToken() : save : " + userInput  );
            Config.API_KEY = Utils.trim(userInput);
            var wasSaved = Utils.write(
                _GLOBALS.SETTINGS_FILE_PATH,
                JSON.stringify(Config),
                true, 'JSON'
            );
            Utils.dump( "[_saveApiToken() : wasSaved : " + wasSaved  );
        }

        return JSON.stringify({value: userInput || '' });
    };

    /**
     * Verify the selection.
     * @returns {*}
     * @private
     */
    function _verifySelection() {

        var errorMessage;

        if (! isDefined(app)) {
            errorMessage = 'App is not defined';
        }
        else if (! isDefined(app.documents)) {
            errorMessage = 'App.documents is not defined';
        }
        else if (app.documents.length == 0) {
            errorMessage = 'No open documents';
        }

        var doc = app.activeDocument;

        if (! isDefined(doc.selection)) {
            errorMessage = 'doc.selection is not defined';
        }
        else if (doc.selection.length == 0) {
            errorMessage = 'Nothing selected';
        }

        if (isString(errorMessage)) {
            alert(errorMessage);
            throw new Error(errorMessage);
        }

        return doc.selection;
    };

    /**
     * Load external object library.
     * @returns {boolean}
     * @private
     */
    function _loadExternalObject() {
        try {
            if (new ExternalObject("lib:\PlugPlugExternalObject")) {
                return true;
            }
        }
        catch (e) {
            throw new Error(e);
        }
    }

    /**
     * Private method for processing the selected SVG path.
     * @param   {string}    callbackEventType
     * @returns {*}
     * @private
     */
    function _processSelection(callbackEventType) {

        var uuid,
            filepath,
            errorMessage,
            theCustomEvent;

        uuid = Utils.uuid();

        try {
            if (selection = _verifySelection()) {

                for (var iter in selection) {

                    var thisItem = selection[iter];

                    // Ignore member functions.
                    if (isFunction( thisItem ) ) continue;

                    // Ignore unsupported typenames.
                    if (! isSupported(thisItem.typename)) {
                        _logger.info("Unsupported type - `" + thisItem.typename + "`");
                        continue;
                    }

                    if (isPathItem(thisItem)) {

                        _logger.info("[isPathItem(thisItem)]");

                        if ( _loadExternalObject() ) {
                            thisItem.name += " : " + uuid;
                            filepath = Config.LOGFOLDER + "/" + uuid + ".svg";
                            theCustomEvent = _getNewCSEvent(
                                callbackEventType,
                                JSON.stringify({ uuid: uuid, svg: _processPathItem(thisItem, uuid), file: filepath })
                            );
                            theCustomEvent.dispatch();
                        }
                    }
                    else if (isCompoundPathItem(thisItem)) {
                        // TODO: Not yet implemented
                        _logger.error("isCompoundPathItem is not yet implemented");
                    }
                    else {
                        continue;
                    }
                }
            }
            else {
                errorMessage = "Could not verify selection object";
            }
        }
        catch(e) {
            errorMessage = e.message;
            _logger.error(errorMessage);
        }
        return errorMessage || "Host.processSelection completed";
    };

    /**
     * Process a selected PathItem.
     * @param thePathItem
     * @param uuid
     * @returns {string}
     * @private
     */
    function _processPathItem(thePathItem, uuid) {
        var svgData;
        try {
            filepath = Config.LOGFOLDER + "/" + uuid + ".svg";
            if (svgFile = _exporter.selectionToSVG(selection, filepath)) {
                if (isObject(svgFile)) {
                    svgData = Utils.read(svgFile);
                }
                else {
                    throw new Error("Could not read SVG file");
                }
            }
            else {
                throw new Error("Could save selection to SVG");
            }
        }
        catch(e) {
            throw new Error(e);
        }
        return svgData;
    }

    /**
     * Create a new CSXSEvent.
     * @param   {string}    eventType
     * @param   {*}         data
     * @returns {CSXSEvent}
     * @private
     */
    function _getNewCSEvent(type, data) {
        var event  = new CSXSEvent();
        event.type = type;
        event.data = data;
        return event;
    }

    /**
     * Update the PathItem with modified points data from Astui.
     * @param pathData
     */
    function _updatePathData(pathData) {

        var f,
            doc,
            theItem,
            errorMessage,
            thePlacedItem,
            pathDataObject;

        doc = app.activeDocument;

        try {
            if (pathDataObject = JSON.parse(pathData)) {

                theItem = _getPathItemByUUID(pathDataObject.uuid);

                if (isDefined(theItem)) {
                    if (isDefined(pathDataObject.file)) {
                        f = new File(pathDataObject.file);
                        if (f.exists) {
                            if (thePlacedItem = doc.groupItems.createFromFile(f)) {

                                thePlacedPathItem = thePlacedItem.pathItems[0];

                                Utils.dump("Set PathItem position");
                                thePlacedPathItem.position = theItem.position;

                                for (var prop in thePlacedPathItem) {
                                    try {
                                        Utils.dump("Set PathItem." + prop);
                                        theItem[prop] = thePlacedPathItem[prop];
                                    }
                                    catch(e) {
                                        Utils.dump(e.message);
                                    }
                                }

                                Utils.dump("Set PathItem PathPoints");
                                copyPathPoints(theItem, thePlacedPathItem);

                                thePlacedItem.remove();
                                theItem.name = theItem.name.replace(" : " + pathDataObject.uuid);
                            }
                            else {
                                throw new Error("Could not import the updated SVG object");
                            }
                        }
                        else {
                            throw new Error(f.path + " does not exist");
                        }
                    }
                    else {
                        throw new Error("pathObject.file is not defined");
                    }
                }
                else {
                    throw new Error("theItem is not defined");
                }
            }
            else {
                throw new Error("Could not parse pathData");
            }
        }
        catch(e) {
            throw new Error(e);
        }

        return "Host.updatePathData completed";
    };

    /**
     * Select a PathItem by the UUID string in the name.
     * @param uuid
     * @returns {*}
     * @private
     */
    function _getPathItemByUUID(uuid) {

        var thisItem,
            thePathItem;

        if (selection = _verifySelection()) {

            for (var iter in selection) {

                var thisItem = selection[iter];

                if (isPathItem(thisItem)) {
                    if (uuid = _getUuidFromName(thisItem.name)) {
                        return thisItem;
                    }
                }
                else if (isCompoundPathItem(thisItem)) {
                    // TODO: Not yet implemented
                    _logger.error("isCompoundPathItem is not yet implemented");
                }
                else {
                    continue;
                }
            }
        }
        return thePathItem;
    };

    /**
     * Get the UUID from the item name.
     * @param   {string}    itemName
     * @returns {string|null}
     * @private
     */
    function _getUuidFromName(itemName) {
        if (itemName.split(":").length > 1) {
            return itemName.split(":").pop();
        }
        return null;
    }

    /**
     * Get settings JSON from file.
     * @returns {*}
     * @private
     */
    function _getSettings() {
        var Settings = Utils.read_json(
            _GLOBALS.SETTINGS_FILE_PATH
        );
        Utils.dump({name: "SETTINGS", object: Settings, file: _GLOBALS.SETTINGS_FILE_PATH });
        Config.API_ENDPOINT = Settings.API_ENDPOINT;
        Config.API_KEY      = Settings.API_KEY;
        Config.COMMON_LOG   = Settings.COMMON_LOG;
        Settings.DOCUMENTS  = Config.DOCUMENTS;
        Settings.APP_NAME   = Config.APP_NAME;
        return JSON.stringify(Settings);
    };

    /**
     * Execute a Menu Command.
     * @returns {MenuCommand}
     * @private
     */
    function _doMenuCommand(kCommandStr) {
        return new MenuCommand(kCommandStr, true);
    };

    /**
     * Creates a web shortcut then opens it in the default browser.
     * @param address
     * @private
     */
    function _openURL( address ) {

        var f = File( Folder.temp + '/aiOpenURL.url' );

        f.open( 'w' );
        f.write( '[InternetShortcut]' + '\r' + 'URL=' + address + '\r' );
        f.close();
        f.execute();
    };

    /**
     * Public object.
     */
    return {

        /**
         * The logger class.
         */
        logger: _logger,

        /**
         * The exporter class.
         */
        exporter : _exporter,

        /**
         * Host interface to Utils.read()
         * @param   {string} filePath Path of the file to read.
         * @returns {JSON}
         */
        read: function(filePath) {
            var result = { content: "" };
            try {
                result.content = Utils.read(filePath);
            }
            catch(e) {
                result.content = e.message;
            }
            return JSON.stringify(result);
        },

        /**
         * Host interface to Utils.write()
         * @param filePath
         * @param txt
         * @param replace
         * @returns {*}
         */
        write: function(filePath, txt, replace, type) {
            if (! isDefined(replace)) replace = true;

            var result = { result: "" };
            try {
                result.result = Utils.write(filePath, txt, replace, type || "TEXT");
            }
            catch(e) {
                result.result = e.message;
            }
            return JSON.stringify(result);
        },

        /**
         * Open a web url in the default browser.
         * @param url
         */
        openUrl: function(url) {
            _openURL(url);
        },

        /**
         * Execute a Menu Command.
         * @param kCommandStr
         * @returns {MenuCommand}
         */
        doMenuCommand: function(kCommandStr) {
            return _doMenuCommand(kCommandStr);
        },

        /**
         * Call private _callToApi method.
         * @param   {string}    callbackEventType The name of the custom CSXS event to trigger.
         * @returns {*}
         */
        processSelection: function(callbackEventType) {
            return _processSelection(callbackEventType);
        },

        /**
         * Call private method to update path data for selected path.
         * @param thePathData
         * @returns {string}
         */
        updatePathData : function(thePathData) {
            return _updatePathData(thePathData);
        },

        /**
         * Prompt user for input.
         * @param   {string}    defaultAnswer
         * @returns {string}
         */
        saveApiToken: function(defaultAnswer) {
            return _saveApiToken(defaultAnswer || '');
        },

        /**
         * Show an alert.
         * @param message
         */
        showAlert: function(message) {
            alert(message);
        },

        /**
         * Get settings JSON
         * @returns {*}
         */
        getSettings: function() {
            return _getSettings();
        }
    }

    // The closure takes the Configuration object as its argument.
})(Config);