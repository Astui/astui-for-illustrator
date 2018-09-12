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
    var _logger = new Logger(Config.get('APP_NAME'), Config.get('LOGFOLDER'));

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
     * Public object.
     */
    return {
        logger: _logger,
        /**
         * Public function.
         * @returns {*}
         */
        publicMethod: function(someData) {
            return _privateMethod(someData);
        },

        userPrompt: function() {
            return _userPrompt();
        }
    }

    // The closure takes the Configuration object as its argument.
})(Config);