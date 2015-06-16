Tern for CoffeeScript
=====================

[![NPM version](https://img.shields.io/npm/v/tern-coffee-source-map.svg)](https://www.npmjs.org/package/tern-coffee-source-map)

Compiles CoffeeScript to JavaScript with a source map, feeds the
JavaScript to Tern, then maps the results back to CoffeeScript source.

### Installation

Install from NPM:

```
npm install- g tern-coffee-source-map`
```

You'll also need to add the plugin to your
[`.tern-project` file](http://ternjs.net/doc/manual.html#configuration):

```
{
    "plugins": {
        "coffee": {}
    }
}
```

### Limitations

This plugin doesn't work nearly as good as Tern for JavaScript, but is
somewhat helpful.

### Credits

This is a fork of https://github.com/othree/tern-coffee. The main
difference is that we use Mozilla's `source-map` package to consume
CoffeeScript's source map.
