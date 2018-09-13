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

#include "Logger.jsx"
#include "JSON.jsx"
#include "Utils.jsx"
#include "Configuration.jsx";
#include "FileSystem.jsx";
#include "MenuCommand.jsx";
#include "Exporter.jsx";
// #include "SmartRemovePoint.jsx";

var API_ENDPOINT = "https://agtechapi.astute.graphics/path/clean";
var MY_API_KEY   = "MLeT6kPZWZgOqHGXXo5lF3LjS6MOUP7Tsc7AUlCWLHfvlpcr92xuxM6Gq63I";

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
 * Run the script using the Module patter.
 */
var Host = (function(Config) {

    /**
     * The local scope logger object.
     * @type {Logger}
     */
    var _logger   = new Logger(Config.get('APP_NAME'), Config.get('LOGFOLDER'));
    var _exporter = new Exporter();

    /**
     * Private, local function.
     */
    function _privateMethod(someData) {

        // Write to the Host's logger output.
        Host.logger.info(someData);

        // Do something cool.
        return JSON.stringify({
            "value": "The Host received the message : '" + someData + "'"
        });
    };

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

        if (typeof(app) == 'undefined') {
            errorMessage = 'App is not defined';
        }
        else if (typeof(app.documents) == 'undefined') {
            errorMessage = 'App.documents is not defined';
        }
        else if (app.documents.length == 0) {
            errorMessage = 'No open documents';
        }

        var doc = app.activeDocument;

        if (typeof(doc.selection) == 'undefined') {
            errorMessage = 'doc.selection is not defined';
        }
        else if (doc.selection.length == 0) {
            errorMessage = 'Nothing selected';
        }

        if (typeof(errorMessage) == 'string') {
            alert(errorMessage);
            throw errorMessage;
        }

        return doc.selection[0];
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

    /**
     * Private method for processing the selected SVG path.
     * @param accuracy
     * @returns {*}
     * @private
     */
    function _processSelection(accuracy) {

        var ts,
            doc,
            exporter,
            selection,
            fileName,
            result;

        ts = (new Date()).getTime();

        doc = app.activeDocument;

        try {
            selection = _verifySelection();

            Utils.dump({"selection": selection});

            fileName = "~/Downloads/astui-for-illustrator/astui-test-" + ts + ".svg";

            _exporter.selectionToSVG(doc.selection, fileName);

            result = Utils.read_file(fileName);

        }
        catch(e) {
            result = {value: e.message};
            _logger.error(e.message);
        }

        return JSON.stringify({svg: result});
    };

    /**
     * NOTE: This is not working. Copies SVG of selection to clipboard
     * but pastes the object even if the textRange is selected.
     */
    function copyPasteSelection() {
        menuCommand = _doMenuCommand("kCopyCommandStr", true);
        Utils.logger(menuCommand.result);

        result = menuCommand.result;

        var doc = app.activeDocument;

        var newLayer = doc.layers.add();
        newLayer.name = "SVG_Code";

        var textBox = newLayer.textFrames.areaText(
            newLayer.pathItems.rectangle( 500, 100, 400, 100 )
        );
        textBox.paragraphs.add("@PLACEHOLDER@");
        try {
            // doc.selection = null;
            app.executeMenuCommand("deselectall");
            textBox.selected = true;
            textBox.textRange.select(true);

            // _doMenuCommand("kPasteCommandStr", true);
        }
        catch(e) {
            _logger.error(e.message);
        }

        // txtBox.contents = this.exportSettings.toXML().toXMLString();

        // this.smartExportPrefs.printable = false;
        // this.smartExportPrefs.visible = false;
    };

    /**
     * Get settings JSON from file.
     * @returns {*}
     * @private
     */
    function _getSettings() {
        var Settings = JSON.stringify(Utils.read_json_file(
            "~/Documents/astui-for-illustrator/settings.json"
        )) ;
        _logger.info(Settings);
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
         * Public function.
         * @returns {*}
         */
        publicMethod: function(someData) {
            return _privateMethod(someData);
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
         * @param body
         * @param accuracy
         * @returns {*}
         */
        processSelection: function(accuracy) {
            return _processSelection(accuracy);
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