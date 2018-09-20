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
var Config = new Configuration({
    APP_NAME         : 'astui-for-illustrator',
    USER             : $.getenv('USER'),
    HOME             : $.getenv('HOME'),
    DOCUMENTS        : Folder.myDocuments,
    LOGFOLDER        : '~/Downloads/astui-for-illustrator'
});

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
var __GLOBALS = {};

/**
 * Run the script using the Module patter.
 */
var Host = (function(Config) {

    /**
     * The local scope logger object.
     * @type {Logger}
     */
    var _logger   = new Logger(Config.get('APP_NAME'), Config.get('LOGFOLDER'), LogLevel.INFO);
    var _exporter = new Exporter();

    /**
     *
     * @returns {string}
     */
    function _userPrompt() {
        var userInput = prompt('Please enter your Astute Graphics API key', '');
        while (userInput.replace(/^\s+|\s+$/gm,'') == '' && count < 3) {
            count++;
            userInput = prompt('Please enter your Astute Graphics API key', '');
        }
        return JSON.stringify({value: userInput});
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
            throw errorMessage;
        }

        return doc.selection;
    };

    /*
        1. verify the selection
        2. export the selection to SVG
        3. Read SVG
        4. Return SVG to Client
        5. Send SVG to ASTUI
        6. Retrieve response from ASTUI
        7. Send updated SVG to Host.
        8. Write updated SVG to temp file
        9. Update selection with modified SVG.
        10. Update UI with result message.
     */

    function _loadExternalObject() {
        try {
            if (new ExternalObject("lib:\PlugPlugExternalObject")) {
                _logger.info("[new ExternalObject(\"lib:\\PlugPlugExternalObject\")]");
                return true;
            }
        }
        catch (e) {
            _logger.info("[_loadExternalObject() ... catch(e)] " + e.message);
            throw e;
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

                    _logger.info("[DEBUG] " + typeof(thisItem) + "." + thisItem.typename);

                    if (isPathItem(thisItem)) {

                        _logger.info("[isPathItem(thisItem)]");

                        if ( _loadExternalObject() ) {
                            thisItem.name += " : " + uuid;
                            filepath = Config.LOGFOLDER + "/" + uuid + ".svg";
                            theCustomEvent = _getNewCSEvent(
                                callbackEventType,
                                JSON.stringify({ uuid: uuid, svg: _processPathItem(thisItem, uuid), file: filepath })
                            );
                            Utils.dump(theCustomEvent);
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

        // return JSON.stringify({svg: svgData, error: errorMessage, filepath: filepath});
        return errorMessage || "Host.processSelection completed";
    };

    function _processPathItem(thePathItem, uuid) {
        filepath = Config.LOGFOLDER + "/" + uuid + ".svg";
        if (svgFile = _exporter.selectionToSVG(selection, filepath)) {
            if (isObject(svgFile)) {
                return Utils.read(svgFile);
            }
            else {
                "Could not read SVG file";
            }
        }
        else {
            errrorMessage = "Could save selection to SVG";
        }
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
            uuid,
            theItem,
            wasWritten,
            errorMessage,
            thePlacedItem,
            pathDataObject;

        doc = app.activeDocument;

        try {
            Utils.dump(JSON.parse(pathData));
            if (pathDataObject = JSON.parse(pathData)) {

                theItem = _getPathItemByUUID(pathDataObject.uuid);

                if (isDefined(theItem)) {
                    if (isDefined(pathDataObject.file)) {
                        f = new File(pathDataObject.file);
                        if (f.exists) {
                            if (thePlacedItem = doc.groupItems.createFromFile(f)) {
                                for (var prop in thePlacedItem.pathItems[0]) {
                                    try {
                                        if (isDefined(theItem[prop])) {
                                            Utils.dump("Set theItem." + prop + " to " + thePlacedItem.pathItems[0][prop]);
                                            theItem[prop] = thePlacedItem.pathItems[0][prop];
                                        }
                                    }
                                    catch(e) {
                                        Utils.dump(e.message);
                                    }
                                }
                                thePlacedItem.remove();
                                theItem.name = theItem.name.replace(" : " + pathDataObject.uuid);
                            }
                        }
                    }
                    else {
                        Utils.logger("Was not written");
                    }
                }
                else {
                    throw new Error("[isDefined(theItem)] false");
                }
            }
            else {
                Utils.logger("Could not parse pathData");
                errorMessage = "Could not parse pathData";
            }
        }
        catch(e) {
            // Utils.dump(e.message);
            errorMessage = e.message;
            throw new Error(e);
        }

        return errorMessage || "Host.updatePathData completed";
    };

    function _getPathItemByUUID(uuid) {
        var thisItem,
            thePathItem = null;
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
        var Settings = JSON.stringify(Utils.read_json(
            Config.DOCUMENTS + "/" + Config.APP_NAME + "/settings.json"
        )) ;
        Config.update(Settings);
        return Settings;
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
         * @returns {string}
         */
        userPrompt: function() {
            return _userPrompt();
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