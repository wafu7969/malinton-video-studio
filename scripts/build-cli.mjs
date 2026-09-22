import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { build } from 'vite'

/**
 * Second build pass. `vite build` (driven by npm scripts) produces the library
 * bundle in dist/; this script then bundles the host shell and copies the
 * static assets the CLI serves.
 */

const ROOT = resolve(import.meta.dirname, '..')
const DIST = join(ROOT, 'dist')

async function main() {
  if (!existsSync(DIST)) {
    throw new Error('dist/ missing — run `vite build` first (npm run build does this)')
  }

  // 1) host shell: bundle boot.jsx + its deps into a single ES module
  await build({
    root: ROOT,
    configFile: false,
    logLevel: 'warn',
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
      outDir: join(DIST, 'host-build'),
      emptyOutDir: true,
      minify: 'esbuild',
      lib: {
        entry: join(ROOT, 'host/boot.jsx'),
        formats: ['es'],
        fileName: () => 'boot.js',
      },
      rollupOptions: {
        output: { inlineDynamicImports: true },
      },
    },
  })

  // 2) flatten it next to index.js so the CLI can serve /__studio/asset/*
  const bootSrc = join(DIST, 'host-build', 'boot.js')
  const { readFile } = await import('node:fs/promises')
  await writeFile(join(DIST, 'boot.js'), await readFile(bootSrc, 'utf8'))
  await rm(join(DIST, 'host-build'), { recursive: true, force: true })

  // 3) host shell html
  await cp(join(ROOT, 'host/index.html'), join(DIST, 'host.html'))

  // 4) normalise the stylesheet name so the CLI can serve a stable url
  const { readdir, rename } = await import('node:fs/promises')
  const cssEntry = (await readdir(DIST)).find((f) => f.endsWith('.css'))
  if (cssEntry && cssEntry !== 'style.css') {
    await rename(join(DIST, cssEntry), join(DIST, 'style.css'))
  }
  await rm(join(DIST, 'assets'), { recursive: true, force: true })

  process.stdout.write('  ✓ host shell built → dist/host.html, dist/boot.js, dist/style.css\n')
}

main().catch((error) => {
  process.stderr.write(`build-cli failed: ${error?.stack ?? error}\n`)
  process.exit(1)
})
