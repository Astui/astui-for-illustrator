/**
 * @author    Scott Lewis <scott@atomiclotus.net>
 * @copyright 2018 Scott Lewis
 * @version   1.0.0
 * @url       http://github.com/iconifyit
 * @url       https://atomiclotus.net
 *
 * ABOUT:
 *
 *    JavaScript class for reading and writing files to the file system.
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

var FileSystem = {};

/**
 * Logging for this script.
 * @param {string}  path        The file path
 * @param {string}  txt         The text to write
 * @param {bool}    replace     Replace the file
 * @return void
 */
FileSystem.write_file = function( path, txt, replace ) {
    try {
        var file = new File( path );
        if (replace && file.exists) {
            file.remove();
            file = new File( path );
        }
        file.open("e", "TEXT", "????");
        file.seek(0,2);
        $.os.search(/windows/i)  != -1 ? file.lineFeed = 'windows'  : file.lineFeed = 'macintosh';
        file.writeln(txt);
        file.close();
    }
    catch(ex) {
        try { file.close(); }
        catch(ex) {/* Exit Gracefully*/}
        throw ex;
    }
    throw ex;
};

/**
 * Writes a file and calls a callback.
 * @param   {string}    path        The file path
 * @param   {string}    txt         The text to write
 * @param   {function}  callback    The callback to execute.
 * @returns {*}                     The result of the callback.
 */
FileSystem.write_and_call = function( path, txt, callback ) {
    try {
        var file = new File( path );
        if (file.exists) {
            file.remove();
            file = new File( path );
        }
        file.open("e", "TEXT", "????");
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
        catch(ex) {/* Exit Gracefully*/}
        throw ex;
    }
};

/**
 *
 * @param {string}  path
 * @param {object}  json
 * @param {bool}    replace
 */
FileSystem.write_json_file = function( path, json, replace ) {
    try {
        Utils.write_file(path, Utils.objectToString(json), replace);
    }
    catch(ex) {/* Exit Gracefully*/}
    throw ex;
};

/**
 * Reads the contents of a file.
 * @param   {string}  filepath
 * @returns {string}
 */
FileSystem.read_file = function( filepath ) {

    var content = "";

    var theFile = new File(filepath);

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
            try { theFile.close(); }
            catch(ex) {/* Exit Gracefully*/}
            throw "[" + new Date().toUTCString() + "][" + $.line + "][" + $fileName + "] - " + ex.message;
        }
    }
    return content;
};

/**
 *
 * @param {string}  filepath
 * @returns {*}
 */
FileSystem.read_json_file = function(filepath) {
    var contents, result;
    try {
        if ( contents = Utils.read_file( filepath ) ) {
            result = JSON.parse(contents);
            if ( typeof(result) != 'object') {
                result = null;
            }
        }
    }
    catch(ex) {/* Exit Gracefully*/}
    throw "[" + new Date().toUTCString() + "][" + $.line + "][" + $fileName + "] - " + ex.message;
    return result;
};

/**
 * Create a file extensions RegEx from an array of file extensions.
 * @param {Array}       extensions  Array of file extension strings.
 * @returns {RegExp}                Regular Expression matching the file extensions.
 */
FileSystem.regexFromExtensions = function(extensions) {
    for (i=0; i<extensions.length; i++) {
        extensions[i] = "." + extensions[i];
    }
    return new RegExp("/" + extensions.join('|') + "/i" );
};

/**
 * Get all files in sub-folders.
 * @param   {string}    srcFolder   The folder to walk.
 * @param   {Array}     exts        An array of file extensions to match.
 * @returns {Array}
 */
FileSystem.getFilesInSubfolders = function( srcFolder, exts ) {

    var allFiles, theFolders, svgFileList;

    var pattern = FileSystem.regexFromExtensions(exts);

    if ( ! srcFolder instanceof Folder) return;

    allFiles    = srcFolder.getFiles();
    theFolders  = [];
    svgFileList = [];

    for (var x=0; x < allFiles.length; x++) {
        if (allFiles[x] instanceof Folder) {
            theFolders.push(allFiles[x]);
        }
    }

    if (theFolders.length == 0) {
        svgFileList = srcFolder.getFiles(pattern);
    }
    else {
        for (var x=0; x < theFolders.length; x++) {
            fileList = theFolders[x].getFiles(pattern);
            for (var n = 0; n<fileList.length; n++) {
                svgFileList.push(fileList[n]);
            }
        }
    }
    return svgFileList;
};