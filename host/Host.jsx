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
    DOCUMENTS        : Folder.myDocuments +  '',
    LOGFOLDER        : Folder.myDocuments + '/astui-for-illustrator/logs',
    API_KEY          : 'YOUR_API_KEY',
    API_ENDPOINT     : 'ASTUI_API_ENDPIONT',
    COMMON_LOG       : Folder.myDocuments + '/astui-for-illustrator/logs/common.log',
    DEBUG            : true
};

#include "Logger.jsx";

/**
 * The global logger.
 * The logger class needs to be created before any other classes that use the logger.
 */
var logger = new Logger(Config.APP_NAME, Config.LOGFOLDER);

logger.clear();
logger.info(logger.dateFormat());

// Include other classes and methods.

#include "JSON.jsx";
#include "Helpers.jsx";
#include "Utils.jsx";
#include "Configuration.jsx";
#include "FileSystem.jsx";
#include "MenuCommand.jsx";
#include "Exporter.jsx";

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
 * @type {{
 *      ExternalObjectIsLoadedLib: boolean,
 *      SETTINGS_FILE_PATH: string
 * }}
 * @private
 */
var _GLOBALS = {

    /**
     * Whether or not the ExternalObjectLib is loaded
     * @type {boolean}
     */
    ExternalObjectLib : false,

    /**
     * The settings file path.
     * @type {string}
     */
    SETTINGS_FILE_PATH : Folder.myDocuments + "/astui-for-illustrator/settings.json",

    /**
     * The selected items.
     * @type {array}
     */
    selected : [],

    /**
     * The selected pathItems.
     * @type {array}
     */
    pathItems : []
};

/**
 * The global document object.
 */
var doc = app.activeDocument;

Utils.DEBUG = true;
Utils.dump({name: 'CONFIG',   value: Utils.inspect(Config, '') });
Utils.dump({name: '_GLOBALS', value: Utils.inspect(_GLOBALS, '') });

var counter = 0;

/**
 * Run the script using the Module patter.
 */
var Host = (function(Config, logger) {

    _getSettings();

    /**
     * The local scope logger object.
     * @type {Logger}
     */
    var _logger = logger;

    /**
     * The exporter class.
     * @type {Exporter}
     * @private
     */
    var _exporter = new Exporter(
        pack(Config.DOCUMENTS, Config.APP_NAME, '/')
    );

    /**
     * Prompt user for API_KEY.
     * @returns {string}
     */
    function _saveApiToken() {

        var userInput, wasSaved;

        try {
            userInput = prompt('Please enter your Astute Graphics API Token', Config.API_KEY);

            if (typeof(userInput) != 'undefined' && Utils.trim(userInput) != '') {
                Config.API_KEY = Utils.trim(userInput);
                wasSaved = Utils.write(
                    _GLOBALS.SETTINGS_FILE_PATH,
                    JSON.stringify(Config),
                    true, 'JSON'
                );
                if (! wasSaved) {
                    throw "Save API Token failed : " + e.message;
                }
            }
        }
        catch(e) {
            throw "Save API Token failed : " + e.message;
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
        if (isTrue(_GLOBALS.ExternalObjectLib)) {
            Utils.logger("[lib:PlugPlugExternalObject] already loaded");
            return true;
        }
        try {
            if (new ExternalObject("lib:\PlugPlugExternalObject")) {
                Utils.logger("[lib:PlugPlugExternalObject] loaded");
                ExternalObjectIsLoadedLib = true;
                return ExternalObjectIsLoadedLib;
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
            thisItem,
            pathItems,
            errorMessage,
            theCustomEvent;

        try {
            if (_verifySelection()) {

                pathItems = _getSelectedPathItems();

                Utils.logger("Number of PathItems : " + pathItems.length);

                for (var i = 0; i < pathItems.length; i++) {

                    thisItem = pathItems[i];

                    // If there is no typename, ignore it.
                    if (! isDefined(thisItem.typename)) continue;

                    // Ignore member functions.
                    if (isFunction( thisItem ) ) continue;

                    Utils.logger("\n\n");
                    Utils.logger("+ -------------------------------------------------- +");
                    Utils.logger("|    START : thisItem                                |");
                    Utils.logger("+ -------------------------------------------------- +");
                    Utils.dump(thisItem);
                    Utils.logger("+ -------------------------------------------------- +");
                    Utils.logger("|    END : pathData                                  |");
                    Utils.logger("+ -------------------------------------------------- +");
                    Utils.logger("\n\n");

                    // Ignore unsupported typenames.
                    if (! isSupported(getTypename(thisItem))) {
                        Utils.logger("Unsupported type - `" + getTypename(thisItem) + "`");
                        continue;
                    }

                    if (isPathItem(thisItem)) {

                        if (! _loadExternalObject() ) {
                            return 'ExternalObjectLib was not loaded';
                        }

                        uuid = thisItem.note;

                        Utils.logger( 'thisItem.note (UUID) = ' + uuid );

                        selection = _selectByUUID(uuid);

                        Utils.logger("\n\n");
                        Utils.logger("+ -------------------------------------------------- +");
                        Utils.logger("|    START : _selectByUUID                           |");
                        Utils.logger("+ -------------------------------------------------- +");
                        Utils.dump(selection);
                        Utils.logger("+ -------------------------------------------------- +");
                        Utils.logger("|    END : _selectByUUID                             |");
                        Utils.logger("+ -------------------------------------------------- +");
                        Utils.logger("\n\n");

                        theCustomEvent = _getNewCSEvent(
                            callbackEventType,
                            JSON.stringify({
                                uuid: uuid,
                                svg: _processPathItem(selection, uuid),
                                file: Config.LOGFOLDER + '/' + uuid + '.svg'
                            })
                        );
                        Utils.logger('theCustomEvent: ' + JSON.stringify(theCustomEvent));
                        theCustomEvent.dispatch();
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
            Utils.logger("Error : " + errorMessage);
        }
        return errorMessage || "Host.processSelection completed";
    };

    /**
     * Select a PageItem by UUID stored in note field.
     * @param uuid
     * @private
     */
    function _selectByUUID(uuid) {
        var doc = app.activeDocument;
        for (var i = 0; i < doc.pathItems.length; i++) {
            thisItem = doc.pathItems[i];
            if (strcmp(thisItem.note, uuid)) {
                _deselectAll();
                thisItem.selected = true;
                return doc.selection;
            }
        }
        return false;
    }

    /**
     * Store all of the selected pathItems in the _GLOBALS array.
     * @returns {array}
     * @private
     */
    function _getSelectedPathItems() {

        var uuid,
            pathItems = doc.pathItems;

        _GLOBALS.selected  = [];
        _GLOBALS.pathItems = [];

        for (var i=0; i<pathItems.length; i++) {
            uuid = pathItems[i].note;
            pathItems[i].note = Utils.uuid();
            if (pathItems[i].selected) {
                _GLOBALS.selected.push(pathItems[i]);
                _GLOBALS.pathItems[uuid] = pathItems[i];
            }
        }
        return _GLOBALS.selected;
    }

    /**
     * Deselect all page items.
     * @private
     */
    function _deselectAll() {
        for (var i = 0; i<app.activeDocument.pageItems.length; i++) {
            app.activeDocument.pageItems[i].selected = false;
        }
    }

    /**
     * Process a selected PathItem.
     * @param thePathItem
     * @param uuid
     * @returns {string}
     * @private
     */
    function _processPathItem(selection, uuid) {
        var svgData;

        try {
            svgFile = _exporter.selectionToSVG(selection, pack(Config.LOGFOLDER, uuid + ".svg", '/'));

            if (! isObject(svgFile)) {
                throw new Error("Could not export selection to SVG");
            }
            svgData = Utils.read(svgFile);

            if (! svgData) {
                throw new Error("Could not read exported SVG file");
            }
        }
        catch(e) {
            Utils.logger(e.message);
            throw new Error(e);
        }
        return svgData;
    }

    /**
     * Calls Astui to move points to tangents.
     * @private
     */
    function _moveToTangents() {
        var errorMessage = "Host.moveToTangents() is not yet implemented";
        Utils.logger(errorMessage);
        throw new Error(errorMessage);
    }

    /**
     * Create a new CSXSEvent.
     * @param   {string}    eventType
     * @param   {*}         data
     * @returns {CSXSEvent}
     * @private
     */
    function _getNewCSEvent(type, data) {
        Utils.logger("Create new CSXSEvent(" + type + ", " + data + ")");
        var event  = new CSXSEvent();
        event.type = type;
        event.data = data;
        return event;
    }

    /**
     * Get the first selected PathItem.
     * @returns {*}
     * @private
     */
    function _getFirstSelectedPathItem() {
        var pathItems = doc.pathItems;

        for (var i=0; i<pathItems.length; i++) {
            if (pathItems[i].selected) {
                return pathItems[i];
            }
        }
        return false;
    }

    /**
     * Update the PathItem with modified points data from Astui.
     * @param pathData
     */
    function _updatePathData(pathData) {

        counter = counter + 1;

        Utils.logger("\n\n");
        Utils.logger("+ -------------------------------------------------- +");
        Utils.logger("|    START : Host._updatePathData(pathData) " + counter);
        Utils.logger("+ -------------------------------------------------- +");
        Utils.logger("|    START : pathData                                |");
        Utils.logger("+ -------------------------------------------------- +");
        Utils.dump(pathData);
        Utils.logger("+ -------------------------------------------------- +");
        Utils.logger("|    END : pathData                                  |");
        Utils.logger("+ -------------------------------------------------- +");

        var f,
            doc,
            thePlacedPathItem,
            pathDataObject,
            thePlacedGroupItem;

        doc = app.activeDocument;

        try {

            Utils.logger("_updatePathData(pathData)[pathData] " + pathData);

            pathDataObject = JSON.parse(pathData);

            // Make sure we were able to parse the JSON response.
            if ( ! isObject(pathDataObject)) {
                throw new Error("Could not parse pathData");
            }

            var theItem = _getPathItemByUUID(pathDataObject.uuid);

            Utils.logger("\n\n");
            Utils.logger("+ -------------------------------------------------- +");
            Utils.logger("|    START : thisItem " + counter);
            Utils.logger("+ -------------------------------------------------- +");
            Utils.dump(theItem);
            Utils.logger("+ -------------------------------------------------- +");
            Utils.logger("|    END : thisItem  " + counter);
            Utils.logger("+ -------------------------------------------------- +");
            Utils.logger("\n\n");

            if (! isDefined(theItem)) {
                throw new Error("theItem is not defined");
            }
            else if ( ! isDefined(pathDataObject.file)) {
                throw new Error("pathDataObject.file is not defined");
            }

            f = new File(pathDataObject.file);

            if ( ! f.exists) {
                throw new Error(f.path + " does not exist");
            }

            thePlacedGroupItem = doc.groupItems.createFromFile(f);

            if ( ! isDefined(thePlacedGroupItem)) {
                throw new Error("Could not import the updated SVG object");
            }

            Utils.logger("\n\n");
            Utils.logger("+ -------------------------------------------------- +");
            Utils.logger("|    START : thePlacedGroupItem " + counter);
            Utils.logger("+ -------------------------------------------------- +");
            Utils.dump(thePlacedGroupItem);
            Utils.logger("+ -------------------------------------------------- +");
            Utils.logger("|    END : thePlacedGroupItem " + counter);
            Utils.logger("+ -------------------------------------------------- +");
            Utils.logger("\n\n");

            Utils.logger("+ -------------------------------------------------- +");
            Utils.logger("|    START : thePlacedGroupItem.pathItems.length ");
            Utils.logger("+ -------------------------------------------------- +");
            try {
                Utils.dump("thePlacedGroupItem.pathItems.length : " + thePlacedGroupItem.pathItems.length);
                Utils.dump("thePlacedGroupItem.compoundPathItems.length : " + thePlacedGroupItem.compoundPathItems.length);
                Utils.dump("thePlacedGroupItem.compoundPathItems[0].pathItems.length : " + thePlacedGroupItem.compoundPathItems[0].pathItems.length);
            }
            catch(e) {
                Utils.dump("thePlacedGroupItem.pathItems.length : " + e.message);
            }
            Utils.logger("+ -------------------------------------------------- +");
            Utils.logger("|    END : thePlacedGroupItem.pathItems.length ");
            Utils.logger("+ -------------------------------------------------- +");
            Utils.logger("\n\n");

            if (! isDefined(thePlacedGroupItem.pathItems)
                || isDefined(thePlacedGroupItem.pathItems[0])) {

                throw new Error("thePlacedGroupItem.pathItems is not defined");
            }
            
            thePlacedPathItem = thePlacedGroupItem.pathItems[0];

            // if (isDefined(thePlacedGroupItem.pathItems)) {
            //     thePlacedPathItem = thePlacedGroupItem.pathItems[0];
            // }
            // else {
            //     thePlacedPathItem = _getFirstSelectedPathItem();
            // }

            Utils.logger("+ -------------------------------------------------- +");
            Utils.logger("|    START : thePlacedPathItem " + counter);
            Utils.logger("+ -------------------------------------------------- +");
            Utils.dump(thePlacedPathItem);
            Utils.logger("+ -------------------------------------------------- +");
            Utils.logger("|    END : thePlacedPathItem " + counter);
            Utils.logger("+ -------------------------------------------------- +");
            Utils.logger("\n\n");

            try {
                thePlacedPathItem.position = theItem.position;
            }
            catch(e) {
                Utils.logger("Could not set PathItem position - " + e.message);
            }

            Utils.logger("\n\n");
            Utils.logger("+ -------------------------------------------------- +");
            Utils.logger("|    START : copyPathPoints " + counter);
            Utils.logger("+ -------------------------------------------------- +");
            Utils.logger("Set PathItem PathPoints");
            copyPathPoints(theItem, thePlacedPathItem);
            Utils.logger("+ -------------------------------------------------- +");
            Utils.logger("|    END : copyPathPoints " + counter);
            Utils.logger("+ -------------------------------------------------- +");
            Utils.logger("\n\n");

            Utils.logger("[Cleanup]  - Remove placed item " + counter);
            thePlacedPathItem.remove();

            Utils.logger("[Cleanup] - Remove item note " + counter);
            theItem.note = '';
        }
        catch(e) {
            Utils.logger("_updatePathData(pathData) Error : " + e.message);
            throw new Error(e);
        }

        return "Host.updatePathData completed without errors";
    };

    /**
     * Select a PathItem by the UUID string in the name.
     * @param uuid
     * @returns {*}
     * @private
     */
    function _getPathItemByUUID(uuid) {

        var pathItems = app.activeDocument.pathItems;

        for (var i = 0; i < pathItems.length; i++) {

            if (! isPathItem(pathItems[i])) continue;
            if (uuid != pathItems[i].note)  continue;

            Utils.logger("Host._getPathItemByUUID() : " + pathItems[i].note);
            return pathItems[i];
        }
        return false;
    };

    /**
     * Get settings JSON from file.
     * @returns {*}
     * @private
     */
    function _getSettings() {
        var Settings = Utils.read_json(
            _GLOBALS.SETTINGS_FILE_PATH
        );
        Config.API_ENDPOINT = Settings.API_ENDPOINT;
        Config.API_KEY      = Settings.API_KEY;
        Config.COMMON_LOG   = Settings.COMMON_LOG;
        Config.DEBUG        = Settings.DEBUG;
        Utils.DEBUG         = Settings.DEBUG;
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
        try {
            Utils.write_exec(
                Folder.temp + '/' + now() + '-shortcut.url',
                '[InternetShortcut]' + '\r' + 'URL=' + encodeURI(address) + '\r'
            );
        }
        catch(e) {
            prompt("Visit " + address + " for more information.", address);
        }
    };

    /**
     * Private init method.
     * @private
     */
    function _init() {
        var errorMessage;
        try {
            Utils.rmdir(Config.LOGFOLDER, "*.svg");
            Utils.rmdir(Config.LOGFOLDER, "*.log");
        }
        catch(e) {
            errorMessage = "Could not clear the log folder - " + e.message;
            Utils.logger(errorMessage);
            throw new Error(errorMessage);
        }
        return "Host._init() completed without errors";
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
         * Call private _callToApi method.
         * @param   {string}    callbackEventType The name of the custom CSXS event to trigger.
         * @returns {*}
         */
        moveToTangents: function(callbackEventType) {
            return _moveToTangents(callbackEventType);
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
        alert: function(message) {
            alert(message);
        },

        /**
         * Get settings JSON
         * @returns {*}
         */
        getSettings: function() {
            return _getSettings();
        },

        /**
         * Show a dump of an object.
         * @param   {*} what
         * @param   {string} label
         * @returns {boolean}
         */
        dump: function(what, label) {

            Utils.logger("\n\n");
            Utils.logger("+ -------------------------------------------------- +");
            Utils.logger("|    START : " + label );
            Utils.logger("+ -------------------------------------------------- +");

            try {
                Utils.dump(what);
            }
            catch(e) {
                Utils.dump(e.message);
            }

            Utils.logger("+ -------------------------------------------------- +");
            Utils.logger("|    END : " + label );
            Utils.logger("+ -------------------------------------------------- +");
            Utils.logger("\n\n");

            return true;
        },

        /**
         * Public interface to _init method.
         */
        init: function() {
            return _init();
        }
    }

})(Config, logger);