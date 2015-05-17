Tern for CoffeeScript
=====================

Compiles CoffeeScript to JavaScript with a source map, feeds the
JavaScript to Tern, then maps the results back to CoffeeScript source.

### How to install

Copy or symlink the file `coffee.js` to your Tern's plugins directory.

When Tern is installed from npm globally, this should work:

```
cp coffee.js /usr/local/lib/node_modules/tern/plugin/
```

### Limitations

CoffeeScript's source mappings seem to map columns inaccurately. This
renders type and references queries unusable.

### Credits

This is a fork of https://github.com/othree/tern-coffee. The main
difference is that we use Mozilla's `source-map` package to consume
CoffeeScript's source map.
