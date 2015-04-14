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

This is work in progress. Eager loading of files is known not to work,
as well as loading `require`d files.

### Credits

This is a fork of https://github.com/othree/tern-coffee. The main
difference is that we use Mozilla's `source-map` package to parse the
source map.
