# rolldown-resolve-issue-repo1

This repository reproduces the problem of the path of the id returned by `PluginContext.resolve` is incorrect.


# reproduction steps

```sh
pnpm install
pnpm run repro:rollup # `PluginContext.resolve` works correctly 
pnpm run repro:rolldown # `PluginContext.resolve` does not work correctly
```
