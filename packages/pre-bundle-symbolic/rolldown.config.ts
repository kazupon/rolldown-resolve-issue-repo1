import { defineConfig } from 'rolldown'
import nodePath from 'node:path'
import fs from 'node:fs'

// @ts-ignore
import { findSymlinks, replaceSymlink } from './build-utils.js'

const files: Record<string, string> = {}
const resolveIdMapping: Record<string, string> = {}

const createSvelteAlias = () => {
  const sveltePackageJson = fs.readFileSync('node_modules/svelte/package.json', 'utf-8');
  const svelteExports = JSON.parse(sveltePackageJson).exports;
  return Object.keys(svelteExports).reduce((alias, key) => {
    const entry = svelteExports[key];
    const path = key === '.' ? 'svelte' : `svelte/${key.replace(/^\.\//, '')}`;
    if (entry.browser) {
      alias[path] = nodePath.join(import.meta.dirname, 'node_modules/svelte', entry.browser);
    } else if (entry.default) {
      alias[path] = nodePath.join(import.meta.dirname, 'node_modules/svelte', entry.default);
    } else if (typeof entry === 'string') {
      alias[path] = nodePath.join(import.meta.dirname, 'node_modules/svelte', entry);
    }
    return alias;
  }, {} as Record<string, string>);
};

const svelteAlias = createSvelteAlias();
const svelteAliasKeys = Object.keys(svelteAlias);

const cwd = process.cwd()
console.log('cwd', cwd);
const symlinks = findSymlinks(`${cwd}/node_modules`);

export default [
    defineConfig({
        input: './src/index.ts',
        output: [
          {
            file: './dist/build-with-rollup.js',
            format: 'esm',
          },
        ],
        treeshake: false,
        plugins: [
            {
                name: `module-pre-bundle-with-json-stringify`,
                async resolveId(source, importer) {
                  console.log('resolveId', source, importer);

                  if (source.endsWith('.ts')) {
                    return null
                  }

                  //const resolved = svelteAliasKeys.includes(source)
                  //  ? svelteAlias[source]
                  //  : await this.resolve(source, importer, { skipSelf: true })
                  let resolved = null;
                  if (svelteAliasKeys.includes(source)) {
                    resolved = svelteAlias[source];
                    console.log('resolved with svelteAlias', resolved, source, importer);
                  } else {
                    resolved = await this.resolve(source, importer, { skipSelf: true });
                    console.log('resolved with this.resolved', resolved, source, importer);
                  }
        
                  if (resolved != null) {
                    const normalizedPath =
                      typeof resolved === 'string'
                        ? resolved
                        : nodePath.relative(cwd, replaceSymlink(symlinks, resolved.id));
                    console.log('normalizedPath', normalizedPath);
                    resolveIdMapping[source] = normalizedPath;
                    return normalizedPath
                  }

                  return null
                },

                transform(code, id) {
                  const p = nodePath.relative(cwd, id);
                  if (!p.startsWith('src')) {
                    files[nodePath.relative(cwd, id)] = code
                  }
                  return null
                },

                generateBundle(_, bundle) {
                  for (const file of Object.values(bundle)) {
                    if (file.type === 'chunk' && file.name === 'index') {
                      file.code = `export default ${JSON.stringify({ files, resolveIdMapping })};`
                    }
                  }
                },
            },
        ],
    })
]