import { defineConfig } from 'rolldown'
import path from 'node:path'

const files: Record<string, string> = {}
const resolveIdMapping: Record<string, string> = {}

const cwd = process.cwd()

export default [
    defineConfig({
        input: './src/index.ts',
        output: [
          {
            file: './dist/build-with-rolldown.js',
            format: 'esm',
          },
        ],
        treeshake: false,
        plugins: [
            {
                name: `module-pre-bundle-with-json`,
                async resolveId(source, importer) {
                  const resolved = await this.resolve(source, importer, { skipSelf: true })
        
                  if (resolved != null) {
                    const normalizedPath = typeof resolved === 'string'
                        ? resolved : resolved.id
                    resolveIdMapping[source] = normalizedPath
                    return normalizedPath
                  }
                  return null
                },

                transform(code, id) {
                  const p = path.relative(cwd, id);
                  if (!p.startsWith('src')) {
                    files[path.relative(cwd, id)] = code
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