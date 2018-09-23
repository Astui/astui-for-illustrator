/**
 * @author    Astute Graphics <info@astutegraphics.com>
 * @copyright 2018 Astute Graphics
 * @version   1.0.0
 * @url       https://astutegraphics.com
 * @url       https://atomiclotus.net
 *
 * ABOUT:
 *
 *    Class for exporting selected items to SVG document so the SVG data can
 *    be extracted and sent to Astui.
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
var Exporter = function(){};

/**
 * Not implemented error string.
 * @type {string}
 * @private
 */
Exporter.prototype._notImplemented = "Not yet implemented";

/**
 * Attach a logger class.
 * @type {Logger}
 */
Exporter.prototype.logger = new Logger( "exporter", "~/Downloads/astui-for-illustrator/", LogLevel.INFO);

/**
 * Get the preset colorMode.
 * @param colorMode
 * @returns {*}
 */
Exporter.prototype.colorMode = function(colorMode) {
    var presetColorMode;
    try {
        presetColorMode = DocumentColorSpace[colorMode.toUpperCase()];
    }
    catch(e) {
        presetColorMode = DocumentColorSpace.RGB;
    }
    return presetColorMode;
};

/**
 * Create document preset object.
 * @param options
 * @returns {DocumentPreset}
 */
Exporter.prototype.documentPreset = function(options) {

    var documentPreset = new DocumentPreset();

    for (prop in options) {
        if (documentPreset.hasOwnProperty(prop)) {
            if (prop == "colorMode") {
                options[prop] = Exporter.prototype.colorMode(options[prop]);
            }
            documentPreset[prop] = options[prop];
        }
    }
    return documentPreset;
};

/**
 * Create a new temporary document to export the selected items.
 * @param width
 * @param height
 * @param colorMode
 * @returns {*}
 */
Exporter.prototype.createDocument = function(width, height, colorMode) {

    var doc;

    try {
        doc = app.documents.addDocument(
            Exporter.prototype.colorMode(colorMode),
            this.documentPreset({
                "width"     : width,
                "height"    : height,
                "colorMode" : colorMode
            })
        );

        app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;
        doc.isNew = true;
    }
    catch(e) {
        this.logger.error("[" + $.fileName + "][" + $.line + "] - e.message : " + e.message);
        this.logger.error("[" + $.fileName + "][" + $.line + "] - width : "     + width);
        this.logger.error("[" + $.fileName + "][" + $.line + "] - height : "    + height);
        this.logger.error("[" + $.fileName + "][" + $.line + "] - colorMode : " + colorMode);
        throw "Exporter.createDocument() failed - " + e.message;
    }

    return doc;
};

/**
 * Duplicates the objects and add them to a document.
 * @param objects
 * @param destinationDocument
 */
Exporter.prototype.copyObjectsToDoc = function(objects, destinationDocument) {
    try {
        for (var i = 0; i < objects.length; i++) {
            objects[i].duplicate(
                destinationDocument.activeLayer,
                ElementPlacement.PLACEATEND
            );
        }
    }
    catch(e) {
        this.logger.error("[" + $.fileName + "][" + $.line + "] - e.message : " + e.message);
        this.logger.error("[" + $.fileName + "][" + $.line + "] - objects : " + objects);
        this.logger.error("[" + $.fileName + "][" + $.line + "] - destinationDocument : " + destinationDocument);
        throw "Exporter.copyObjectsToDoc() failed - " + e.message;
    }
    return true;
};

/**
 * Selects all PageItems in the doc.
 * @param doc
 */
Exporter.prototype.selectAll = function(doc) {
    var pageItems = doc.pageItems,
        numPageItems = doc.pageItems.length;
    for (var i = 0; i < numPageItems; i += 1) {
        pageItems[i].selected = true;
    }
};

/**
 * Get SVG export options.
 * @returns {ExportOptionsSVG}
 */
Exporter.prototype.svgExportOptions = function() {
    var options = new ExportOptionsSVG();
    options.fontSubsetting    = SVGFontSubsetting.GLYPHSUSED;
    options.embedRasterImages = false;
    options.fontType          = SVGFontType.OUTLINEFONT;
    return options;
};

/**
 * Export the file.
 * @param filePath
 * @param exportType
 * @param exportOptions
 * @returns {File}
 */
Exporter.prototype.exportFile = function(selection, filepath, exportType, exportOptions) {

    var doc,
        targetFile,
        ignoreHidden = true;

    if (selection.length == 0) {
        throw "[" + $.fileName + "][" + $.line + "] - Nothing is selected.";
    }

    try {
        targetFile = new File(filepath);
    }
    catch(e) {
        throw "[" + $.fileName + "][" + $.line + "] - Target file not created - " + e.message ;
    }

    doc = this.createDocument(1024, 1024, DocumentColorSpace.RGB);

    if ( this.copyObjectsToDoc(selection, doc) ) {
        doc.artboards[0].artboardRect = doc.visibleBounds;
        app.redraw();

        this.selectAll(doc);

        // Resize the artboard to the object
        doc.fitArtboardToSelectedArt(0);
        doc.exportFile(targetFile, exportType, exportOptions);

        // Remove everything
        doc.activeLayer.pageItems.removeAll();
        doc.close(SaveOptions.DONOTSAVECHANGES);
    }
    else {
        this.logger.error("[" + $.fileName + "][" + $.line + "] - SVG export failed - " + e.message);
        this.logger.error("[" + $.fileName + "][" + $.line + "] - svgExportOptions : "  + svgExportOptions);
        this.logger.error("[" + $.fileName + "][" + $.line + "] - filepath : "          + filepath);
        this.logger.error("[" + $.fileName + "][" + $.line + "] - selection : "         + selection);
        this.logger.error("[" + $.fileName + "][" + $.line + "] - targetFile : "        + targetFile);
        throw "Exporter.exportFile() failed - " + e.message;
    }

    return targetFile;
};


/**
 * Export a selection to SVG.
 * @param {selection} selection The app.activeDocument.selection object.
 * @param {string}    filePath  The file path to save the document to.
 *
 * Export selection to SVG - export_selection_as_SVG
 * (Adapted from Layers to SVG 0.1 - layers_export.jsx, by Anton Ball)
 * @author  Rhys van der Waerden
 * @url     https://gist.github.com/SebCorbin/4af974231068ed4ab457
 */
Exporter.prototype.selectionToSVG = function(selection, filepath) {

    /**
     * Local variables.
     * @type {boolean}
     * @type {ExportOptionsSVG}
     */
    var targetFile,
        svgExportOptions,
        ignoreHidden = true;

    try {
        svgExportOptions = this.svgExportOptions();
        targetFile = this.exportFile(
            selection,
            filepath,
            ExportType.SVG,
            svgExportOptions
        );
    }
    catch(e) {
        this.logger.error("[" + $.fileName + "][" + $.line + "] - SVG export failed - " + e.message );
        this.logger.error("[" + $.fileName + "][" + $.line + "] - svgExportOptions : "  + svgExportOptions );
        this.logger.error("[" + $.fileName + "][" + $.line + "] - filepath : "          + filepath );
        this.logger.error("[" + $.fileName + "][" + $.line + "] - selection : "         + selection);
        this.logger.error("[" + $.fileName + "][" + $.line + "] - targetFile : "        + targetFile);
        throw "Exporter.selectionToSVG() failed  - " + e.message ;
    }

    return targetFile;
};


/**
 * Export selection to PNG.
 * @param selection
 * @param filePath
 * @returns {File}
 */
Exporter.prototype.selectionToPNG = function(selection, filePath) {
    throw this._notImplemented;
};

/**
 * Export selection to JPG.
 * @param selection
 * @param filePath
 * @returns {File}
 */
Exporter.prototype.selectionToJPG = function(selection, filePath) {
    throw this._notImplemented;
};

/**
 * Export layer to SVG.
 * @param selection
 * @param filePath
 */
Exporter.prototype.layerToSVG = function(layer, filePath) {
    throw this._notImplemented;
};

/**
 * Export artboard to SVG.
 * @param artboard
 * @param filePath
 */
Exporter.prototype.artboardToSVG = function(artboard, filePath) {
    throw this._notImplemented;
};

/**
 * Export selection to PDF.
 * @param selection
 * @param filePath
 * @returns {File}
 */
Exporter.prototype.selectionToPDF = function(selection, filePath) {
    throw this._notImplemented;
};