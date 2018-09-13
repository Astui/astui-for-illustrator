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
var Exporter = function() {};


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
            if ( prop == "colorMode") {
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

    var document;

    document = app.documents.addDocument(
        Exporter.prototype.colorMode(colorMode),
        this.documentPreset({
            "width": width,
            "height": height,
            "colorMode": colorMode
        })
    );

    app.coordinateSystem = CoordinateSystem.ARTBOARDCOORDINATESYSTEM;
    document.isNew = true;

    return document;
};

/*
 * Export selection to SVG - export_selection_as_SVG
 * (Adapted from Layers to SVG 0.1 - layers_export.jsx, by Anton Ball)
 *
 * @author Rhys van der Waerden
 */
/**
 * Export a selection to SVG.
 * @param {selection} selection The app.activeDocument.selection object.
 * @param {string}    filePath  The file path to save the document to.
 */
Exporter.prototype.selectionToSVG = function(selection, filePath) {

    /**
     * Local variables.
     * @type {boolean}
     * @type {ExportOptionsSVG}
     */
    var doc,
        ignoreHidden     = true,
        svgExportOptions = (function() {
            var options = new ExportOptionsSVG();
                options.fontSubsetting    = SVGFontSubsetting.GLYPHSUSED;
                options.embedRasterImages = false;
                options.fontType          = SVGFontType.OUTLINEFONT;
            return options;
        }());

    /**
     * Duplicates the objects and add them to a document.
     * @param objects
     * @param destinationDocument
     */
    var copyObjectsToDoc = function(objects, destinationDocument) {
        for (var i = 0; i < objects.length; i++) {
            objects[i].duplicate(
                destinationDocument.activeLayer,
                ElementPlacement.PLACEATEND
            );
        }
    };

    /**
     * Selects all PageItems in the doc.
     * @param doc
     */
    var selectAll = function(doc) {
        var pageItems = doc.pageItems,
            numPageItems = doc.pageItems.length;
        for (var i = 0; i < numPageItems; i += 1) {
            pageItems[i].selected = true;
        }
    };

    if (selection.length > 0) {

        // Create temporary document and copy all selected objects.

        doc = this.createDocument(1024, 1024, DocumentColorSpace.RGB);

        copyObjectsToDoc(selection, doc);

        doc.artboards[0].artboardRect = doc.visibleBounds;
        app.redraw();

        selectAll(doc);

        // Resize the artboard to the object
        doc.fitArtboardToSelectedArt(0);
        doc.exportFile(new File(filePath), ExportType.SVG, svgExportOptions);

        // Remove everything
        doc.activeLayer.pageItems.removeAll();
        doc.close(SaveOptions.DONOTSAVECHANGES);
    }
};
