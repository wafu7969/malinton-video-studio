#!/usr/bin/env node
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { existsSync, statSync } from 'node:fs'
import { extname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = fileURLToPath(new URL('.', import.meta.url))
const PKG_ROOT = resolve(HERE, '..')
const DIST = join(PKG_ROOT, 'dist')

/** Names probed in `--root` when `--manifest` is not given. */
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

  The manifest is a JSON file describing scenes, subtitles, audio and the
  preview source. When --manifest is omitted it is discovered in the root as:
    ${MANIFEST_CANDIDATES.join(', ')}

  Docs: https://github.com/wafu7969/malinton-video-studio
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

/**
 * Locate the manifest. An explicit `--manifest` must exist, since silently
 * falling back to discovery would hide a typo in the flag.
 */
function findManifest(root, explicit) {
  if (explicit) {
    const target = resolve(root, String(explicit).replace(/^[/\\]+/, ''))
    return existsSync(target) ? target : null
  }
  for (const name of MANIFEST_CANDIDATES) {
    const target = join(root, name)
    if (existsSync(target)) return target
  }
  return null
}

/**
 * Parse a single-range `Range: bytes=` header against a known size.
 * Returns null for anything we do not serve as a partial response — a
 * multi-range request, a malformed one, or a unit we do not speak.
 */
function parseRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(header).trim())
  if (!match) return null
  const [, rawStart, rawEnd] = match
  if (rawStart === '' && rawEnd === '') return null

  let start
  let end
  if (rawStart === '') {
    // `bytes=-500` — the last 500 bytes.
    const suffix = Number(rawEnd)
    if (!Number.isFinite(suffix) || suffix <= 0) return null
    start = Math.max(0, size - suffix)
    end = size - 1
  } else {
    start = Number(rawStart)
    end = rawEnd === '' ? size - 1 : Number(rawEnd)
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null
    if (start > end || start >= size) return null
    end = Math.min(end, size - 1)
  }
  return { start, end }
}

/**
 * Minimal static file handler. Returns true when it wrote a response.
 *
 * Range support is not optional here: `<audio>` / `<video>` only allow
 * seeking once they know the resource is seekable, and a browser decides that
 * from whether the server answers a `Range` request with `206` +
 * `Content-Range`. Answering `200` with the whole file leaves
 * `audio.seekable` empty, and every `currentTime` assignment is then clamped
 * back to zero — the audio plays but can never be positioned.
 */
async function serveFile(res, filePath, rangeHeader) {
  let stat
  try {
    stat = statSync(filePath)
  } catch {
    return false
  }
  if (stat.isDirectory()) return false

  const type = MIME[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
  const size = stat.size

  if (!rangeHeader) {
    const body = await readFile(filePath)
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': size,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(body)
    return true
  }

  const range = parseRange(rangeHeader, size)
  if (!range) {
    res.writeHead(416, {
      'Content-Range': `bytes */${size}`,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
    })
    res.end()
    return true
  }

  const { start, end } = range
  const body = await readFile(filePath)
  res.writeHead(206, {
    'Content-Type': type,
    'Content-Length': end - start + 1,
    'Content-Range': `bytes ${start}-${end}/${size}`,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(body.subarray(start, end + 1))
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

  if (!manifestPath) {
    const hint = opts.manifest
      ? `找不到清单文件: ${opts.manifest}\n    解析为: ${resolve(root, String(opts.manifest).replace(/^[/\\]+/, ''))}`
      : `在项目根目录下未找到清单文件\n    已查找: ${MANIFEST_CANDIDATES.join(', ')}\n    可以用 --manifest 指定路径`
    process.stderr.write(`\n  ✖ ${hint}\n\n`)
    process.exit(1)
  }

  const relativeManifest = relative(root, manifestPath).split(sep).join('/')

  const server = createServer(async (req, res) => {
    const url = req.url ?? '/'
    const range = req.headers.range

    try {
      // 1) manifest — re-read on every request so edits show up on refresh
      if (url.startsWith('/__studio/manifest')) {
        const body = await readFile(manifestPath, 'utf8')
        return send(res, 200, body, 'application/json; charset=utf-8')
      }

      // 2) studio runtime assets, straight out of dist/
      if (url.startsWith('/__studio/asset/')) {
        const rel = url.slice('/__studio/asset/'.length)
        const filePath = safeJoin(DIST, rel)
        if (filePath && (await serveFile(res, filePath, range))) return
        return send(res, 404, 'asset not found')
      }

      // 3) the host shell
      if (url === '/' || url.startsWith('/index.html')) {
        const shell = await readFile(join(DIST, 'host.html'), 'utf8')
        return send(res, 200, shell, MIME['.html'])
      }

      // 4) everything else is a project file (composition source, media, ...)
      const target = safeJoin(root, url)
      if (target && (await serveFile(res, target, range))) return

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
      `  ➜  Manifest: ${relativeManifest}`,
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
