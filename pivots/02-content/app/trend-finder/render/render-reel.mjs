// node render/render-reel.mjs <job.json> | --ensure-browser | --bundle <cacheDir>
// job = { input: ReelInput (urls are file names in mediaDir), mediaDir, out, cacheDir }
import { createHash } from 'node:crypto'
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.REMOTION_PORT) || 8872
const TYPES = { '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg' }

// One line for the backend to show: paths are scrubbed (they name folders on this machine) and it is capped.
function fail(message) {
  const line = String(message).split('\n')[0].replace(/(?:\/[\w.@~+-]+){2,}/g, '<path>').slice(0, 200)
  process.stderr.write(`${line}\n`)
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
  for (const f of filesUnder(path.join(APP, 'public/fonts'))) h.update(path.relative(APP, f)).update(readFileSync(f))
  h.update(readFileSync(path.join(APP, 'package-lock.json')))
  return h.digest('hex').slice(0, 16)
}

function alive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (err) {
    return err.code === 'EPERM'
  }
}

// Removes the bundles of older sources and the temp folders of dead builds. Only direct children of the cache
// root are touched, never the current key, and a failure here never fails the render.
function pruneCache(root, keep) {
  try {
    for (const name of readdirSync(root)) {
      if (name === keep) continue
      const tmp = /^.+\.tmp-(\d+)$/.exec(name)
      if (tmp && (Number(tmp[1]) === process.pid || alive(Number(tmp[1])))) continue // a build in progress
      rmSync(path.join(root, name), { recursive: true, force: true })
    }
  } catch {
    /* a prune failure must not fail the render */
  }
}

// Bundles once per source hash. The bundle is built in a temp folder and renamed into place, so a pre-warm
// running next to a render never serves a half-written bundle.
async function ensureBundle(cacheDir) {
  const serveUrl = path.join(path.resolve(cacheDir), bundleKey())
  if (existsSync(path.join(serveUrl, 'index.html'))) return serveUrl
  mkdirSync(path.dirname(serveUrl), { recursive: true })
  const tmp = `${serveUrl}.tmp-${process.pid}`
  const { bundle } = await import('@remotion/bundler')
  try {
    await bundle({ entryPoint: path.join(APP, 'src/remotion/index.ts'), publicDir: path.join(APP, 'public'), outDir: tmp })
  } catch (err) {
    rmSync(tmp, { recursive: true, force: true }) // a failed bundle leaves no half-written folder
    throw err
  }
  try {
    renameSync(tmp, serveUrl)
  } catch (err) {
    rmSync(tmp, { recursive: true, force: true }) // another process finished first (the target is not empty)
    if (!existsSync(path.join(serveUrl, 'index.html'))) throw err
  }
  pruneCache(path.dirname(serveUrl), path.basename(serveUrl))
  return serveUrl
}

// Serves mediaDir only, with Range support. Returns { server, base }.
function serveMedia(mediaDir) {
  const root = path.resolve(mediaDir)
  const server = http.createServer((req, res) => {
    let rel
    try {
      rel = decodeURIComponent((req.url || '/').split('?')[0])
    } catch {
      return void res.writeHead(400).end()
    }
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
  if (arg === '--bundle') {
    if (!process.argv[3]) fail('Usage: render-reel.mjs --bundle <cacheDir>')
    await ensureBundle(process.argv[3])
    return
  }
  const job = JSON.parse(readFileSync(arg, 'utf8'))
  const { input, mediaDir, out, cacheDir } = job
  if (!input || !mediaDir || !out || !cacheDir) fail('The job needs input, mediaDir, out and cacheDir.')
  await ensureBrowser()

  const serveUrl = await ensureBundle(cacheDir)

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
