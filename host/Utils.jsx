/**
 * @author    Scott Lewis <scott@atomiclotus.net>
 * @license   The MIT License (MIT)
 * @copyright 2017 Scott Lewis
 * @url       https://githubt.com/iconifyit
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * Our base object.
 * @type {{}}
 */
var Utils = new Object();

/**
 * Enable/disabled debug logging.
 * @type {boolean}
 */
Utils.DEBUG = true;

/**
 * The log folder location.
 * @type {string}
 */
Utils.LOGFOLDER = Folder.myDocuments + '/astui-for-illustrator/logs';

/**
 * Add the logger.
 * @type {Logger}
 * @private
 */
Utils._logger = logger || new Logger($.fileName, Utils.LOGFOLDER);

/**
 * Turn off displaying alerts.
 */
Utils.displayAlertsOff = function() {
    userInteractionLevel = UserInteractionLevel.DONTDISPLAYALERTS;
};

/**
 * Turn on displaying alerts.
 */
Utils.displayAlertsOn = function() {
    try {
        userInteractionLevel = UserInteractionLevel.DISPLAYALERTS;
    }
    catch(e) {/* Exit Gracefully */}
}

/**
 * Get a value from an object or array.
 * @param   {object|array}    subject
 * @param   {string}          key
 * @param   {*}               dfault
 * @returns {*}
 */
Utils.get = function(subject, key, dfault) {
    var value = dfault;
    if (subject.hasOwnProperty(key)) {
        value = subject[key];
    }
    return value;
};

/**
 * Extends {Object} target with properties from {Object} source.
 * No new properties are added to the object meaning only properties that
 * exist in both source and target will be updated.
 * @param target
 * @param source
 * @returns {*}
 */
Utils.update = function(target, source) {
  for (key in source) {
      if (target.hasOwnProperty(key)) {
          target[key] = source[key];
      }
  }
  return target;
};

/**
 * Extends {Object} target with properties from {Object} source.
 * Any values that are already set will not be updated. New properities
 * will be added to the object.
 * @param target
 * @param source
 * @returns {*}
 */
Utils.extend = function(target, source) {
    for (key in source) {
        if (target.get(key, false)) {
            continue;
        }
        target[key] = source[key];
    }
    return target;
};

/**
 * Open a file dialog.
 * @param   {File} file           The file object
 * @param   {String} title        The dialog title
 * @param   {String} file_filter  The file filter pattern
 * @returns {*}
 */
Utils.chooseFile = function(oFile, title, file_filter) {
    if (! oFile instanceof File) var oFile = new File();
    if (! title) var title  = LANG.CHOOSE_FILE;
    if (! filter) var filter = "*";
    return oFile.openDlg(
        title,
        file_filter,
        false
   );
};

/**
 * Gets the screen dimensions and bounds.
 * @returns {{left: *, top: *, right: *, bottom: *}}
 */
Utils.getScreenSize = function() {
    var screen;

    for (i=0; i<$.screens.length; i++) {
        if ($.screens[i].primary == true) {
            screen = $.screens[i];
            screen.width = screen.right - screen.left;
            screen.height = screen.bottom - screen.top;
        }
    }
    return screen;
};

/**
 * Create a new dialog, centered on screen.
 * @param type
 * @param width
 * @param height
 * @param title
 * @returns {window}
 */
Utils.window = function(type, title, width, height) {
    var dialog = new Window(
        type, title,
        [0, 0, width, height]
   );
    dialog.center();
    return dialog;
};

/**
 * Saves the file in AI format.
 * @param {document} doc            The document object to save
 * @param {string}   path           The file destination path
 * @param {int}      compatibility  The Adobe Illustrator format (version)
 * @return void
 */
Utils.saveFileAsAi = function(doc, path, compatibility) {
    if (app.documents.length > 0) {
        var theDoc  = new File(path);
        var options = new IllustratorSaveOptions();
        if (typeof(compatibility) == 'undefined') {
            compatibility = Compatibility.ILLUSTRATOR19;
        }
        options.compatibility = compatibility;
        options.flattenOutput = OutputFlattening.PRESERVEAPPEARANCE;
        options.pdfCompatible = true;
        doc.saveAs(theDoc, options);
    }
};

/**
 *
 * @param {string}  str
 * @returns {XML|string|void}
 */
Utils.trim = function(str) {
    return str.replace(/^\s+|\s+$/g, '');
};

/**
 * Logging for this script.
 * @param {string} message      The logging text
 * @return void
 * @deprecated
 */
Utils.logger = function(message) {
    // if (! Utils.DEBUG) return;
    Utils._logger.info(message);
};

/**
 * @deprecated Use `Utils.write` instead.
 * Writes text to a file.
 * @param {string}  path        The file path
 * @param {string}  txt         The text to write
 * @param {bool}    replace     Replace the file
 * @return void
 */
Utils.write_file = function(path, txt, replace) {
    return Utils.write(path, txt, replace);
};

/**
 * Writes text to a file.
 * @param {string}  path        The file path
 * @param {string}  txt         The text to write
 * @param {bool}    replace     Replace the file
 * @return void
 */
Utils.write = function(path, txt, replace, type) {
    if (typeof(type) == "undefined") {
        type = "TEXT";
    }
    try {
        var file = new File(path);
        if (replace && file.exists) {
            file.remove();
            file = new File(path);
        }
        file.open("e", type, "????");
        file.seek(0,2);
        $.os.search(/windows/i)  != -1 ? file.lineFeed = 'windows'  : file.lineFeed = 'macintosh';
        file.writeln(txt);
        file.close();
    }
    catch(ex) {
        try {
            file.close();
        }
        catch(ex) {
            throw ex.message;
        }
    }
    return true;
}

/**
 * Writes a file and calls a callback.
 * @param   {string}    path        The file path
 * @param   {string}    txt         The text to write
 * @param   {function}  callback    The callback to execute.
 * @returns {*}                     The result of the callback.
 */
Utils.write_and_call = function(path, txt, callback, type) {
    if (typeof(type) == "undefined") {
        type = "TEXT";
    }
    try {
        var file = new File(path);
        if (file.exists) {
            file.remove();
            file = new File(path);
        }
        file.open("e", type, "????");
        file.seek(0,2);
        $.os.search(/windows/i)  != -1 ? file.lineFeed = 'windows'  : file.lineFeed = 'macintosh';
        file.writeln(txt);
        file.close();
        return callback.call(this, file);
    }
    catch(ex) {
        try {
            file.close();
        }
        catch(ex) {
            Utils.logger(ex.message);
            throw ex.message;
        }
    }
    return true;
};

/**
 * Write to a file and execute the file (for a web shortcut for instance).
 * @param filePath
 * @param theText
 */
Utils.write_exec = function(filePath, theText) {
    try {
        var _file = new File(filePath);
        _file.open( 'w' );
        _file.write( theText );
        _file.close();
        _file.execute();
    }
    catch(e) {
        try {
            _file.close();
        }
        catch(e) {
            /* This will likely fail but just in case, clean up after ourselves and move on. */
        }
        Utils.dump("[Utils.write_exec()] " + e.message);
        throw new Error(e.message);
    }
    return true;
};

/**
 *
 * @param {string}  path
 * @param {object}  json
 * @param {bool}    replace
 */
Utils.write_json_file = function(path, json, replace) {
    try {
        Utils.write_file(path, Utils.objectToString(json), replace);
    }
    catch(ex) {
        Utils.logger(ex, $.line, $.fileName);
    }
};

/**
 * @deprecated
 * Reads the contents of a file.
 * @param   {string|File}  theFile
 * @returns {string}
 */
Utils.read_file = function(theFile) {
    return Utils.read(theFile);
};

/**
 * Reads the contents of a file.
 * @param   theFile
 * @returns {string}
 */
Utils.read = function(theFile) {
    var content = "";

    if (typeof(theFile) != 'object') {
        theFile = new File(theFile);
    }

    if (theFile) {

        try {
            if (theFile.alias) {
                while (theFile.alias) {
                    theFile = theFile.resolve().openDlg(
                        LANG.CHOOSE_FILE,
                        "",
                        false
                   );
                }
            }
        }
        catch(ex) {
            dialog.presetsMsgBox.text = ex.message;
        }

        try {
            theFile.open('r', undefined, undefined);
            if (theFile !== '') {
                content = theFile.read();
                theFile.close();
            }
        }
        catch(ex) {

            try { theFile.close(); }catch(ex){};
            Utils.logger(ex, $.line, $.fileName);
        }
    }
    return content;
};

/**
 * Reads a JSON file.
 * @param   {string}  theFile The file path to the JSON file.
 * @returns {JSON}
 */
Utils.read_json = function(theFile) {
    var result,
        contents;

    try {
        if (contents = Utils.read_file(theFile)) {
            result = JSON.parse(contents);
            if (typeof(result) != 'object') {
                result = null;
            }
        }
    }
    catch(ex) {
        Utils.logger(ex, $.line, $.fileName);
        throw ex.message;
    }
    return result;
}

/**
 * Test if a file exists.
 * @param theFilePath
 * @returns {*}
 */
Utils.isFile = function(theFilePath) {
    try {
        return (new File(theFilePath)).exists;
    }
    catch(e) {
        return false;
    }
};

/**
 * Test if a folder exists.
 * @param theFolderPath
 * @returns {*}
 */
Utils.isFolder = function(theFolderPath) {
    try {
        return (new Folder(theFolderPath)).exists;
    }
    catch(e) {
        return false;
    }
};

/**
 * Remove the contents of a directory by file type.
 * This method does NOT delete the directory, only the contents.
 * @param {string} dirPath  The directory to clear.
 * @param {string} pattern  The file pattern to match
 *
 */
Utils.rmdir = function(dirPath, pattern) {
    var count = 0;
    try {
        var files = new Folder(dirPath).getFiles(pattern);
        if (files.length) {
            for (var i=0; i<files.length; i++) {
                (new File(files[i])).remove();
                count++;
            }
        }
    }
    catch(e) {
        throw "Utils.remove(" + dirPath + ", " + pattern + ") - Error : " + e.message;
    }
    return count + " files were removed";
};

/**
 * @deprecated
 * @param {string}  filepath
 * @returns {*}
 */
Utils.read_json_file = function(filepath) {
    return Utils.read_json(filepath);
};

/**
 * Replace Mac's tilde home alias with full path.
 * @param {string}      path    The path to de-mac.
 * @returns {string}
 */
Utils.expand_path = function(path, root_path) {
    return path.replace('~/', root_path);
};

/**
 * Get saved configuration JSON.
 * @param {String}  config_file     Path to the config file.
 * @returns {{}}
 */
Utils.get_config = function(config_file) {
    var configFile = new File(config_file);
    var config = {};
    try {
        if (configFile.exists) {
            config = JSON.parse(Utils.read_file(configFile));
        }
    }
    catch(e) {
        logger.error($.localize(e.message));
    }
    return config;
};

/**
 *
 * @param {string}  filepath
 * @param {bool}    mustconfirm
 */
Utils.deleteFile = function(filepath, mustconfirm) {
    try {
        if (mustconfirm && ! confirm(LANG.CONFIRM_DELETE_PRESET)) {
            return;
        }
        new File(filepath).remove();
    }
    catch(ex) {
        Utils.logger($.line + ' - ' + $.fileName + ' - ' + $.error);
    }
};

/**
 * Initialize a folder.
 * @param {string}  path
 */
Utils.folder = function(path) {
    var theFolder = new Folder(path);
    if (! theFolder.exists) {
        theFolder.create();
    }
    return theFolder;
};

/**
 * Get all files in sub-folders.
 * @param   {string}  srcFolder
 * @returns {Array}
 */
Utils.getFilesInSubfolders = function(srcFolder) {

    var allFiles, theFolders, svgFileList;

    if (! srcFolder instanceof Folder) return;

    allFiles    = srcFolder.getFiles();
    theFolders  = [];
    svgFileList = [];

    for (var x=0; x < allFiles.length; x++) {
        if (allFiles[x] instanceof Folder) {
            theFolders.push(allFiles[x]);
        }
    }

    if (theFolders.length == 0) {
        svgFileList = srcFolder.getFiles(/\.svg$/i);
    }
    else {
        for (var x=0; x < theFolders.length; x++) {
            fileList = theFolders[x].getFiles(/\.svg$/i);
            for (var n = 0; n<fileList.length; n++) {
                svgFileList.push(fileList[n]);
            }
        }
    }
    return svgFileList;
};

/**
 * Get the basename of a file path.
 * @param path
 * @returns {*}
 */
Utils.basename = function(path) {
    var basename = null;
    try {
        basename = path.split('/').pop();
    }
    catch(e) {
        Utils.logger($.line + ' - ' + $.fileName + ' - ' + $.error);
    }
    return basename;
};

/**
 * Format the date in YYYY-MM-DD format
 * @param {string}  date  The date in timestring format
 * @return {string} date string in YYYY-MM-DD format (2015-10-06)
 */
Utils.dateFormat = function(date) {
    var d = new Date(date),
        month = '' + (d.getMonth() + 1),
        day = '' + d.getDate(),
        year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
};

/**
 * Stringify an object.
 * @param   {object}  obj
 * @returns {string}
 */
Utils.objectToString = function(obj) {
    var items = [];
    for (key in obj) {
        var value = obj[key];
        if (typeof(value) == "array") {
            for (var i=0; i<value.length; i++) {
                value[i] = '"' + value[i] + '"';
            }
            value = '[' + value.join(',') + ']';
        }
        else if (typeof(value) == 'object') {
            value = objectToString(value);
        }
        items.push('"' + key + '": "' + value + '"');
    }
    return "{" + items.join(',') + "}";
};

/**
 * Align objects to nearest pixel.
 * @param {array}   sel     Selection array
 */
Utils.alignToNearestPixel = function(sel) {

    try {
        if (typeof sel != "object") {
            Utils.logger($.line + ' - ' + $.fileName + ' - ' + LANG.NO_SELECTION);
        }
        else {
            for (i = 0 ; i < sel.length; i++) {
                sel[i].left = Math.round(sel[i].left);
                sel[i].top = Math.round(sel[i].top);
            }
            redraw();
        }
    }
    catch(ex) {
        Utils.logger($.line + ' - ' + $.fileName + ' - ' + $.error);
    }
};

/**
 * Cleans up the filename/artboardname.
 * @param   {String}    name    The name to filter and reformat.
 * @returns  {String}            The cleaned up name.
 */
Utils.filterName = function(name) {
    return decodeURIComponent(name).replace(' ', '-');
}

/**
 * Test if all parents are visible & unlocked.
 * @param {object} item
 * @returns {boolean}
 */
Utils.isVisibleAndUnlocked = function(item) {
    return ! Utils.anyParentLocked(item) && ! Utils.anyParentHidden(item);
};

/**
 * Derived from P. J. Onori's Iconic SVG Exporter.jsx
 * @param {object} item
 * @returns {boolean}
 */
Utils.anyParentLocked = function(item) {
    while (item.parent) {
        if (item.parent.locked) {
            return true;
        }
        item = item.parent;
    }
    return false;
};

/**
 * Derived from P. J. Onori's Iconic SVG Exporter.jsx
 * @param {object} item
 * @returns {boolean}
 */
Utils.anyParentHidden = function(item) {
    while (item.parent) {
        if (item.parent.hidden) {
            return true;
        }
        item = item.parent;
    }
    return false;
};

/**
 * Groups selected items.
 * @returns void
 */
Utils.groupSelection = function() {
    try {
        app.executeMenuCommand('group');
    }
    catch(e) {
        alert(localize({en_US: "Items could not be grouped (line: %1, file: %2)"}, $.line, $.fileName));
    }
};

/**
 * Display a new progress bar.
 * @param maxvalue
 * @returns {*}
 */
Utils.showProgressBar = function(maxvalue) {

    var top, right, bottom, left;

    if (bounds = Utils.getScreenSize()) {
        left = Math.abs(Math.ceil((bounds.width/2) - (450/2)));
        top = Math.abs(Math.ceil((bounds.height/2) - (100/2)));
    }

    var progress = new Window("palette", 'Progress', [left, top, left + 450, top + 120]);
    progress.pnl = progress.add("panel", [10, 10, 440, 100], 'Progress');
    progress.pnl.progBar = progress.pnl.add("progressbar", [20, 45, 410, 60], 0, maxvalue);
    progress.pnl.progBarLabel = progress.pnl.add("statictext", [20, 20, 320, 35], "0 of " + maxvalue);

    progress.show();

    Utils.progress = progress;
};

/**
 * Hides and destroys the progress bar.
 */
Utils.hideProgressBar = function() {
    Utils.progress.hide();
    Utils.progress = null;
}

/**
 * Updates the progress bar.
 * @param progress
 * @returns {*}
 */
Utils.updateProgress = function(message) {
    Utils.progress.pnl.progBar.value++;
    var val = Utils.progress.pnl.progBar.value;
    var max = Utils.progress.pnl.progBar.maxvalue;
    Utils.progress.pnl.progBarLabel.text = val + ' of ' + max + ' - ' + message;
    $.sleep(10);
    Utils.progress.update();
};

/**
 * Updates the progress bar.
 * @param progress
 * @returns {*}
 */
Utils.updateProgressMessage = function(message) {
    var val = Utils.progress.pnl.progBar.value;
    var max = Utils.progress.pnl.progBar.maxvalue;
    Utils.progress.pnl.progBarLabel.text = val + ' of ' + max + ' - ' + message;
    $.sleep(10);
    Utils.progress.update();
};

/**
 * Alias for localize function.
 * @param str
 * @param vars
 * @returns {*}
 */
Utils.i18n = function(str, vars) {
    return localize({en_US: str}, vars);
};

/**
 * Converts a string, array, or object to dash-separated string.
 * @param   {string|array|object}   subject    A string, array, or object to convert to a slug.
 * @returns {string}                           The cleaned up name.
 */
Utils.slugger = function(subject) {
    if (typeof(subject) == "array") {
        return subject.join('-');
    }
    else if (typeof(subject) == "object") {
        var bits = [];
        for (key in subject) {
            if (typeof(subject[key]) != "string") continue;
            bits.push(subject[key].toLowerCase());
        }
        return bits.join('-');
    }
    else if (typeof(subject) == "string") {
        return decodeURIComponent(subject).replace(' ', '-');
    }
    return subject;
};

/**
 * Gets the artboard index of the current selection. This is a brute-force approach
 * and not the ideal solution but it's the best we can currently do.
 * @author  carlos canto 09/28/2013
 * @see     http://forums.adobe.com/message/5721205?tstart=0#5721205
 * @param   {GroupItem}     The selection for which see want the artboard.
 * @returns {integer}       Returns the index of the artboard.
 */
Utils.getArtboardOfGroupItem = function(groupItem) {

    var index = -1;
    var doc   = app.activeDocument;

    // Loop through each artboard.
    for(i=0; i<doc.artboards.length; i++) {

        // Activate each artboard.
        doc.artboards.setActiveArtboardIndex(i);

        // Select all items on the artboard.
        doc.selectObjectsOnActiveArtboard();

        // Test our original selection to see if it is now selected.
        index = doc.artboards.getActiveArtboardIndex();

        if (groupItem.selected) {
            return doc.artboards.getActiveArtboardIndex();
        }

        // We didn't find our object, keep going.
        doc.selection = null;
    }

    return index;
};

/**
 * Get the index of an artboard by its name.
 * @param {string} name
 * @returns {number}
 */
Utils.getArtboardIndexByName = function(name) {
    var doc = app.activeDocument;
    if (artboard = doc.artboards.getByName(name)) {
        for (i = 0; i < doc.artboards.length; i++) {
            if (doc.artboards[i] == artboard) {
                return i;
            }
        }
    }
    return -1;
};

/**
 * Get the artboard index using the name of the items on the artboard.
 * @param itemName
 * @returns {number}
 */
Utils.getArtboardIndexItemByName = function(itemName) {

    var index = -1;
    var doc   = app.activeDocument;

    // Loop through each artboard.
    for(i = 0; i < doc.artboards.length; i++) {

        // Activate each artboard.
        doc.artboards.setActiveArtboardIndex(i);

        // Select all items on the artboard.
        doc.selectObjectsOnActiveArtboard();

        logger.info("Checking artboard " + i + " for item " + itemName);

        if (doc.selection.length) {
            logger.info("Selected items on artboard " + i);
            if (typeof(doc.selection.name) != "undefined") {
                logger.info("Found named selection on artboard " + i);
                if (doc.selection.name.toUpperCase() == itemName.toUpperCase()) {
                    logger.info("Found item " + itemName + " on artboard " + i);
                    return doc.artboards.getActiveArtboardIndex();
                }
            }
        }

        // We didn't find our object, keep going.
        doc.selection = null;
    }

    return index;
}

/**
 * Set active artboard by name.
 * @param {string} name
 */
Utils.setActiveArtboardByName = function(name) {
    var doc = app.activeDocument;
    doc.artboards.setActiveArtboardIndex(Utils.getArtboardIndexByName(name));
};

/**
 * Get a unique universal identifier.
 * RFC4122 version 4 compliant.
 * @returns {string}
 */
Utils.generateUUID = function() {
    var d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
        d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
};

/**
 * Shortcut for Utils.generateUUID()
 * @param   {integer}   len The length of the UUID
 * @returns {string}
 */
Utils.uuid = function(len) {
    var len = len ? len : -1 ;
    var uuid = Utils.generateUUID();
    if (len != -1) {
        uuid = uuid.substr(0, len);
    }
    return uuid;
};

/**
 * @experimental
 * Rename artboard groupItems by artboard name
 */
Utils.renameGroupItemsByArtboardNames = function() {
    var doc = app.activeDocument;
    for (i = 0; i < doc.artboards.length; i++) {
        doc.artboards.setActiveArtboardIndex(i);
        var ab = doc.artboards[doc.artboards.getActiveArtboardIndex()];
        doc.selectObjectsOnActiveArtboard();
        app.executeMenuCommand('group');
        selection.name = ab.name.indexOf("Artboard ") != -1 ? "Group " + i : ab.name;
    }
};

/**
 * Opens a folder in the Finder. If `thePath` is not defined,
 * the active document in Illustrator will be used. If no documents
 * are open, it will error out.
 * @param {string} thePath
 */
Utils.showInFinder = function(thePath) {
    if (typeof(thePath) == 'undefined' && app.documents.length > 0) {
        thePath = app.activeDocument.path;
    }
    try {
        new Folder(thePath).execute();
    }
    catch(e) {
        alert(e);
    }
};

function indent(levels) {
    var indent = "";
    for (var i=0; i<levels; i++) {
        indent += "  ";
    }
    return indent;
}

/**
 * Dump an object to the log.
 * @param what
 */
Utils.dump = function(what, lvl, prefix) {

    if (typeof(prefix) == 'undefined') prefix = "";
    if (typeof(lvl) ==  'undefined') lvl = 0;

    Utils.logger(indent(lvl) + (prefix ? prefix : "Object") + " => {{");
    try {
        if (typeof(what) == 'string') {
            Utils.logger(indent(lvl * 2) + what);
            return;
        }
        for (key in what) {
            if (key == 'parent') {
                Utils.logger((lvl == 0 ? indent(1) : indent(lvl * 2)) + key + " => [object]");
                continue;
            }
            else if (typeof(what[key]) == 'function') {
                Utils.logger(indent(lvl * 2) + key + " => function(){}");
                continue;
            }
            else if (typeof(what[key]) == 'object') {
                Utils.dump(what[key], lvl+1, key);
            }
            Utils.logger((lvl == 0 ? indent(1) : indent(lvl * 2)) + key + " => " + what[key]);
        }
    }
    catch(e) {
        Utils.logger(e.message);
    }
    Utils.logger(indent(lvl) + "}} // end " + (prefix ? prefix : ""));
};

/**
 * Recursively reflect the properties of an object.
 * @param {object}  obj
 * @param {string}  stack
 */
Utils.inspect = function(obj, stack) {
    try {
        for (var property in obj) {
            if ('property' == 'parent') {
                Utils.logger(stack + (stack == '' ? '' : '.') + property + ' => [object]');
                continue;
            }
            if (typeof obj[property] == 'function') {
                Utils.logger(stack + (stack == '' ? '' : '.') + property + ' => function(){}');
                continue;
            }
            if (typeof obj[property] == 'object') {
                Utils.inspect(obj[property], stack + '.' + property);
            }
            Utils.logger(stack + (stack == '' ? '' : '.') + property);
        }
    }
    catch(e) {
        Utils.logger("Utils.reflect error - " + e.message);
    }
    return stack;
};