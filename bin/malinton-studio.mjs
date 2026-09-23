#!/usr/bin/env node
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, statSync } from 'node:fs'
import { extname, join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const PKG_ROOT = resolve(HERE, '..')
const DIST = join(PKG_ROOT, 'dist')

const MANIFEST_CANDIDATES = [
  'malinton.studio.json',
  'studio.config.json',
  'studio.json',
]

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.vtt': 'text/vtt; charset=utf-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

/* -------------------------------------------------------------------------- */
/* args                                                                        */
/* -------------------------------------------------------------------------- */

function parseArgs(argv) {
  const opts = {
    root: process.cwd(),
    port: 3000,
    host: 'localhost',
    open: true,
    manifest: undefined,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    const next = () => argv[++i]
    switch (arg) {
      case '--root':
      case '-r':
        opts.root = next()
        break
      case '--port':
      case '-p':
        opts.port = Number(next())
        break
      case '--host':
        opts.host = next()
        break
      case '--manifest':
      case '-m':
        opts.manifest = next()
        break
      case '--no-open':
        opts.open = false
        break
      case '--help':
      case '-h':
        opts.help = true
        break
      default:
        if (!arg.startsWith('-')) opts.root = arg
        break
    }
  }
  return opts
}

function printHelp() {
  process.stdout.write(`
  malinton-studio — preview a scene-based composition in the browser

  Usage
    $ malinton-studio [root] [options]

  Options
    -r, --root <dir>       Project root to serve          (default: cwd)
    -m, --manifest <file>  Manifest path, relative to root
    -p, --port <number>    Port to listen on             (default: 3000)
        --host <host>      Host to bind                  (default: localhost)
        --no-open          Do not open the browser
    -h, --help             Show this message

  The manifest is discovered automatically from:
    ${MANIFEST_CANDIDATES.join(', ')}

  Docs: https://github.com/malinton/malinton-video-studio
`)
}

/* -------------------------------------------------------------------------- */
/* helpers                                                                     */
/* -------------------------------------------------------------------------- */

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(body)
}

/**
 * Resolve a url path inside `root`, refusing to escape it.
 * The leading `/` is stripped before joining, which also makes relative
 * inputs (used for the dist asset route) behave correctly.
 */
function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0].split('#')[0])
  const relative = decoded.replace(/^[/\\]+/, '')
  const target = resolve(root, relative)
  const rootWithSep = root.endsWith(sep) ? root : root + sep
  if (target !== root && !target.startsWith(rootWithSep)) return null
  return target
}

function findManifest(root, explicit) {
  if (explicit) {
    const p = resolve(root, explicit)
    return existsSync(p) ? p : null
  }
  for (const name of MANIFEST_CANDIDATES) {
    const p = join(root, name)
    if (existsSync(p)) return p
  }
  return null
}

/** Minimal static file handler. Returns true when it wrote a response. */
async function serveFile(res, filePath) {
  let stat
  try {
    stat = statSync(filePath)
  } catch {
    return false
  }
  if (stat.isDirectory()) return false
  const body = await readFile(filePath)
  send(res, 200, body, MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream')
  return true
}

/* -------------------------------------------------------------------------- */
/* server                                                                      */
/* -------------------------------------------------------------------------- */

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  if (opts.help) return printHelp()

  const root = resolve(opts.root)

  if (!existsSync(root)) {
    process.stderr.write(`\n  ✖ 项目根目录不存在: ${root}\n\n`)
    process.exit(1)
  }

  if (!existsSync(join(DIST, 'index.js'))) {
    process.stderr.write(
      '\n  ✖ 未找到构建产物 dist/index.js\n' +
        '    开发时请先运行 npm run build，或使用 npm run dev 进行调试。\n\n',
    )
    process.exit(1)
  }

  const manifestPath = findManifest(root, opts.manifest)

  const server = createServer(async (req, res) => {
    const url = req.url ?? '/'

    try {
      // 1) manifest — always re-read so edits show up on refresh
      if (url.startsWith('/__studio/manifest')) {
        if (!manifestPath) {
          return send(
            res,
            404,
            JSON.stringify({ error: 'no manifest found', searched: MANIFEST_CANDIDATES }),
            'application/json; charset=utf-8',
          )
        }
        const body = await readFile(manifestPath, 'utf8')
        return send(res, 200, body, 'application/json; charset=utf-8')
      }

      // 2) studio runtime assets, straight out of dist/
      if (url.startsWith('/__studio/asset/')) {
        const rel = url.slice('/__studio/asset/'.length)
        const filePath = safeJoin(DIST, rel)
        if (filePath && (await serveFile(res, filePath))) return
        return send(res, 404, 'asset not found')
      }

      // 3) the host shell
      if (url === '/' || url.startsWith('/index.html')) {
        const shell = await readFile(join(DIST, 'host.html'), 'utf8')
        return send(res, 200, shell, MIME['.html'])
      }

      // 4) everything else is a project file (composition source, media, ...)
      const target = safeJoin(root, url)
      if (target && (await serveFile(res, target))) return

      send(res, 404, `not found: ${url}`)
    } catch (error) {
      send(res, 500, `studio error: ${error?.message ?? error}`)
    }
  })

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      process.stderr.write(
        `\n  ✖ 端口 ${opts.port} 已被占用，请用 --port 指定其他端口。\n\n`,
      )
      process.exit(1)
    }
    throw error
  })

  server.listen(opts.port, opts.host, async () => {
    const url = `http://${opts.host}:${opts.port}`
    const lines = [
      '',
      '  Malinton Video Studio',
      `  ➜  Local:    ${url}`,
      `  ➜  Root:     ${root}`,
      `  ➜  Manifest: ${manifestPath ?? '未找到（可通过 --manifest 指定）'}`,
      '',
    ]
    process.stdout.write(lines.join('\n') + '\n')

    if (opts.open) {
      try {
        const { default: open } = await import('open')
        await open(url)
      } catch {
        /* opening the browser is best-effort */
      }
    }
  })

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      server.close(() => process.exit(0))
    })
  }
}

main().catch((error) => {
  process.stderr.write(`\n  ✖ ${error?.stack ?? error}\n\n`)
  process.exit(1)
})
