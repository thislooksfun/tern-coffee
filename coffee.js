var tern = require('tern');
var coffee = require('coffee-script');
var SourceMapConsumer = require('source-map').SourceMapConsumer;


var toLineCol = function (offset, lines) {
    var position = {
        line: 1,
        column: 0
    };
    var len = lines.length;
    var sumOffset = 0;
    for (var i = 0; i < len; i++) {
        var lineLen = lines[i].length + 1;
        if (sumOffset + lineLen > offset) {
            position.line = i + 1;
            position.column = offset - sumOffset;
            break;
        }
        sumOffset += lineLen;
    }
    return position;
};

var toOffset = function (position, lines) {
    var offset = 0;
    for (var i = 0; i < position.line; i++) {
        offset += lines[i].length;
    }
    offset += position.column;
    return offset;
};

var setOriginalPositions = function (ast, compiled) {
    var smc = compiled.smc;
    var jsLines = compiled.js.split('\n');
    var sourceLines = compiled.source.split('\n');

    ast.body.forEach(function (node) {
        node.start = toOffset(
            smc.originalPositionFor(toLineCol(node.start, jsLines)),
            sourceLines
        );
        node.end = toOffset(
            smc.originalPositionFor(toLineCol(node.end, jsLines)),
            sourceLines
        );
    });
};

var getCompiledPosition = function (offset, compiled) {
    var position = toLineCol(offset, compiled.source.split('\n'));
    var jsPosition = compiled.smc.generatedPositionFor({
        source: compiled.name,
        line: position.line,
        column: position.column
    });
    return toOffset(jsPosition, compiled.js.split('\n'));
};

var modifyQuery = function (query, compiled) {
    query.end = getCompiledPosition(query.end, compiled);
};

var compile = function (source) {
    return coffee.compile(source, {
        bare: true,
        sourceMap: true
    });
};

var saveCompiled = function (server, name, source) {
    var answer = compile(source);
    var sourceMap = JSON.parse(answer.v3SourceMap);
    sourceMap.sources = [ name ];
    return server._coffee.files[name] = {
        name: name,
        source: source,
        js: answer.js,
        smc: new SourceMapConsumer(sourceMap)
    };
};

var isCoffee = function (fileName) {
    return /\.coffee$/.test(fileName);
};

var initServer = function (server) {
    return server._coffee = {
        files: {}
    };
};


tern.registerPlugin('coffee', function (server) {
    // Overwrite options.getFile
    server.options.getFile = (function (getFile) {
        return function (name, callback) {
            getFile.call(this, name, function (error, data) {
                if (!error && isCoffee(name)) {
                    callback(null, saveCompiled(server, name, data).js);
                } else {
                    callback(error, data);
                }
            });
        };
    }(server.options.getFile));


    // Overwrite request
    server.request = (function (request) {
        return function (doc, callback) {
            if (isCoffee(doc.query.file)) {
                return request.call(server, doc, callback);
            }

            if (doc.files) {
                // TODO
            }

            server.options.getFile(doc.query.file, function () {
                var compiled = server._coffee.files[doc.query.file];
                modifyQuery(doc.query, compiled);
                request.call(server, doc, callback);
            });
        };
    }(server.request));


    initServer(server);

    server.on('reset', function () {
        initServer(server);
    });

    return {
        passes: {
            postInfer: function (ast) {
                var compiled = server._coffee.files[server._coffee.currentFile];
                if (compiled) {
                    setOriginalPositions(ast, compiled);
                }
            }
        }
    };
});
