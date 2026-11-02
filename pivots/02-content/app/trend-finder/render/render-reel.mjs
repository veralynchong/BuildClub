// node render/render-reel.mjs <job.json>   or   node render/render-reel.mjs --ensure-browser
// job = { input: ReelInput (urls are file names in mediaDir), mediaDir, out, cacheDir }
import { createHash } from 'node:crypto'
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.REMOTION_PORT) || 8872
const TYPES = { '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg' }

function fail(message) {
  process.stderr.write(`${String(message).split('\n')[0]}\n`)
  process.exit(1)
}

function filesUnder(dir) {
  const out = []
  for (const name of readdirSync(dir).sort()) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) out.push(...filesUnder(p))
    else out.push(p)
  }
  return out
}

function bundleKey() {
  const h = createHash('sha256')
  for (const dir of ['src/remotion', 'src/lib/editor'])
    for (const f of filesUnder(path.join(APP, dir))) h.update(path.relative(APP, f)).update(readFileSync(f))
  h.update(readFileSync(path.join(APP, 'package-lock.json')))
  return h.digest('hex').slice(0, 16)
}

// Serves mediaDir only, with Range support. Returns { server, base }.
function serveMedia(mediaDir) {
  const root = path.resolve(mediaDir)
  const server = http.createServer((req, res) => {
    const rel = decodeURIComponent((req.url || '/').split('?')[0])
    if (rel.split('/').includes('..')) return void res.writeHead(403).end()
    const file = path.join(root, rel)
    if (!file.startsWith(root + path.sep) || !existsSync(file) || !statSync(file).isFile()) return void res.writeHead(404).end()
    const size = statSync(file).size
    const headers = { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Access-Control-Allow-Origin': '*' }
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '')
    if (m && (m[1] || m[2])) {
      let start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]))
      let end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1
      if (start > end || start >= size) return void res.writeHead(416, { 'Content-Range': `bytes */${size}` }).end()
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 })
      createReadStream(file, { start, end }).pipe(res)
    } else {
      res.writeHead(200, { ...headers, 'Content-Length': size })
      createReadStream(file).pipe(res)
    }
  })
  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve({ server, base: `http://127.0.0.1:${server.address().port}` }))
  })
}

async function main() {
  const arg = process.argv[2]
  if (!arg) fail('Usage: render-reel.mjs <job.json> | --ensure-browser')
  const { ensureBrowser, renderMedia, selectComposition } = await import('@remotion/renderer')
  if (arg === '--ensure-browser') {
    await ensureBrowser()
    return
  }
  const job = JSON.parse(readFileSync(arg, 'utf8'))
  const { input, mediaDir, out, cacheDir } = job
  if (!input || !mediaDir || !out || !cacheDir) fail('The job needs input, mediaDir, out and cacheDir.')
  await ensureBrowser()

  const serveUrl = path.join(path.resolve(cacheDir), bundleKey())
  if (!existsSync(path.join(serveUrl, 'index.html'))) {
    const { bundle } = await import('@remotion/bundler')
    await bundle({ entryPoint: path.join(APP, 'src/remotion/index.ts'), publicDir: path.join(APP, 'public'), outDir: serveUrl })
  }

  const { server, base } = await serveMedia(mediaDir)
  try {
    const urls = Object.fromEntries(Object.entries(input.urls || {}).map(([k, name]) => [k, `${base}/${encodeURIComponent(name)}`]))
    // fontUrl stays empty: Reel resolves the bundled font with staticFile.
    const inputProps = { ...input, urls, fontUrl: '' }
    const composition = await selectComposition({ serveUrl, id: 'Reel', inputProps, port: PORT })
    let last = -1
    await renderMedia({
      composition, serveUrl, inputProps, port: PORT,
      codec: 'h264', audioCodec: 'aac', enforceAudioTrack: true, pixelFormat: 'yuv420p',
      outputLocation: path.resolve(out),
      onProgress: ({ progress }) => {
        const p = Math.round(progress * 100) / 100
        if (p !== last) {
          last = p
          process.stdout.write(`progress ${p}\n`)
        }
      },
    })
  } finally {
    server.close()
  }
}

main().then(() => process.exit(0), (err) => fail(err && err.message ? err.message : err))
