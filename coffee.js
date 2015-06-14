var tern = require('tern');
var coffee = require('coffee-script');
var SourceMapConsumer = require('source-map').SourceMapConsumer;


var compile = function (fileName, text) {
    try {
        var compiled = coffee.compile(text, {
            bare: true,
            sourceMap: true,
            header: false,

            sourceFiles: [ fileName ]
        });
    } catch (e) {
        return;
    }

    var map = JSON.parse(compiled.v3SourceMap);

    compiled.sourceMapConsumer = new SourceMapConsumer(map);
    compiled.source = text;
    compiled.name = fileName;

    return compiled;
};

var toLineCol = function (offset, text) {
    var prevText = text.slice(0, offset);
    var lines = prevText.split('\n');
    var line = lines.length;
    var column = lines[line - 1].length;
    return {
        line: line,
        column: column
    };
};

var toOffset = function (lineCol, text) {
    var offset = 0;
    var lines = text.split('\n');

    for (var i = 0; i < lineCol.line - 1; i++) {
        offset += lines[i].length + 1;
    }

    offset += lineCol.column + 1;

    return offset;
};

var getSourcePosition = function (offset, compiled) {
    var lineCol = toLineCol(offset, compiled.js);
    var origLineCol = compiled.sourceMapConsumer.originalPositionFor({
        line: lineCol.line,
        column: lineCol.column
    });
    var origOffset = toOffset(origLineCol, compiled.source);

    return origOffset;
};

var getGeneratedPosition = function (offset, compiled) {
    var coffeeLineCol = toLineCol(offset, compiled.source);
    var jsLineCol = compiled.sourceMapConsumer.generatedPositionFor({
        source: compiled.name,
        line: coffeeLineCol.line,
        column: coffeeLineCol.column
    });

    var genOffset = toOffset(jsLineCol, compiled.js);

    return genOffset;
};

var isCoffee = function (fileName) {
    return /\.coffee$/.test(fileName);
};

var initServer = function (server) {
    return server._coffee = {};
};


tern.registerPlugin('coffee', function (server) {
    // Overwrite options.getFile
    var origGetFile = server.options.getFile;

    server.options.getFile = function (name, callback) {
        return origGetFile.call(this, name, function (err, data) {
            if (err || !isCoffee(name)) {
                return callback(err, data);
            }

            var compiled = compile(name, data);

            if (compiled) {
                server._coffee[name] = compiled;

                callback(null, compiled.js);
            } else {
                callback('Cannot compile CoffeeScript');
            }
        });
    };

    // Overwrite request
    var origRequest = server.request;

    server.request = function (doc, callback) {
        var doRequest = function (err) {
            if (err) {
                callback(err);
            } else {
                origRequest.call(server, doc, function (err, data) {
                    if (!err) {
                        var compiled = doc.query && server._coffee[doc.query.file];

                        [ 'refs', 'changes' ].forEach(function (type) {
                            if (data[type]) {
                                data[type].forEach(function (ref) {
                                    var span = ref.end - ref.start;
                                    ref.start = getSourcePosition(ref.start, compiled) - 1;
                                    ref.end = ref.start + span;
                                });
                            }
                        });
                    }

                    callback(err, data);
                });
            }
        };

        if (doc.files) {
            doc.files.forEach(function (file) {
                if (isCoffee(file.name)) {
                    var compiled = compile(file.name, file.text);

                    if (compiled) {
                        server._coffee[file.name] = compiled;

                        file.text = compiled.js;
                    }
                }
            });
        }

        if (doc.query && isCoffee(doc.query.file) && doc.query.end != null) {
            server.options.getFile(doc.query.file, function (err, data) {
                if (err) {
                    doRequest(err);
                } else {
                    var compiled = server._coffee[doc.query.file];
                    doc.query.end = getGeneratedPosition(doc.query.end, compiled);
                    doRequest();
                }
            });
        } else {
            doRequest();
        }
    };

    // Init
    initServer(server);

    server.on('reset', function () {
        initServer(server);
    });

    return {};
});
