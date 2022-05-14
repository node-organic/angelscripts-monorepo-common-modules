# angelscripts-monorepo-common-modules

An angel commands aiding in management of common modules of organic monorepos following stem skeleton 2.1 structure.

These handy commands just executes the given arbitrary commands towards `<repoRoot>/cells/node_modules/<moduleName>` directories. 

## setup

```
$ npm i angelscripts-monorepo-common-modules --save-dev
```

## commands

### execute command to single common module

```
$ npx angel cmodule {module-name} -- {command}
```

### execute command to all common modules

```
$ npx angel cmodules -- {command}
```

### list available common modules

```
$ npx angel cmodules
```

### list available common modules (as json)

```
$ npx angel cmodules.json
```

## example

```
$ npx angel repo cmodule lib -- npm install
$ npx angel repo cmodules -- rm -f package-lock.json && npm i
```

## Notes(todo)

1) any output (stdout & stderr) is piped and **doesn't support input (stdin)**.
2) uses exec with limited output buffer size, ie **it is not suitable for long running processes**
