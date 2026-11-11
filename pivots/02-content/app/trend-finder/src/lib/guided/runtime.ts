import type { GuidedRuntime, PreparedData, PreparedFactory } from './contracts'

const installed = new WeakMap<Window, GuidedRuntime>()
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const currentWindow = () => typeof window === 'undefined' ? undefined : window

function scopedStorage(native: Storage, prefix: string): Storage {
  let memory: Map<string, string> | null = null
  const keys = (): string[] => memory ? [...memory.keys()] : Array.from({ length: native.length }, (_, i) => native.key(i)).filter((key): key is string => key !== null && key.startsWith(prefix)).map(key => key.slice(prefix.length))
  const methods = {
    getItem(key: string) {
      if (arguments.length < 1) throw new TypeError('getItem requires a key.')
      return memory ? memory.get(String(key)) ?? null : native.getItem(prefix + String(key))
    },
    setItem(key: string, value: string) {
      if (arguments.length < 2) throw new TypeError('setItem requires a key and value.')
      if (memory) { memory.set(String(key), String(value)); return }
      try { native.setItem(prefix + String(key), String(value)) }
      catch (error) {
        if (!(error instanceof DOMException) || error.name !== 'QuotaExceededError') throw error
        // Keep existing drafts intact when repeated demo resets exhaust browser storage.
        memory = new Map(keys().map(key => [key, native.getItem(prefix + key)!]))
        memory.set(String(key), String(value))
      }
    },
    removeItem(key: string) {
      if (arguments.length < 1) throw new TypeError('removeItem requires a key.')
      if (memory) memory.delete(String(key))
      else native.removeItem(prefix + String(key))
    },
    clear: () => { for (const key of keys()) methods.removeItem(key) },
    key(index: number) {
      if (arguments.length < 1) throw new TypeError('key requires an index.')
      return keys()[Number(index) >>> 0] ?? null
    },
  }
  const target = Object.create(Object.getPrototypeOf(native))
  return new Proxy(target, {
    get: (_, key) => {
      if (key === 'length') return keys().length
      if (typeof key === 'string' && Object.prototype.hasOwnProperty.call(methods, key)) return methods[key as keyof typeof methods]
      if (typeof key === 'string') return methods.getItem(key) ?? Reflect.get(target, key)
      if (key === Symbol.toStringTag) return 'Storage'
      return Reflect.get(target, key)
    },
    set: (_, key, value) => {
      if (typeof key !== 'string' || key === 'length') return false
      methods.setItem(key, value)
      return true
    },
    deleteProperty: (_, key) => { if (typeof key === 'string') methods.removeItem(key); return true },
    ownKeys: keys,
    has: (_, key) => typeof key === 'string' && (key === 'length' || Object.prototype.hasOwnProperty.call(methods, key) || methods.getItem(key) !== null) || Reflect.has(target, key),
    getOwnPropertyDescriptor: (_, key) => typeof key === 'string' && methods.getItem(key) !== null
      ? { configurable: true, enumerable: true, writable: true, value: methods.getItem(key) } : undefined,
    defineProperty: (_, key, descriptor) => {
      if (typeof key !== 'string' || descriptor.get || descriptor.set || !descriptor.configurable) return false
      methods.setItem(key, descriptor.value)
      return true
    },
  }) as Storage
}

function seed(data: PreparedData, local: Storage, session: Storage) {
  for (const [store, values] of [[local, data.bootstrap.local], [session, data.bootstrap.session]] as const) {
    for (const [key, value] of Object.entries(values)) if (store.getItem(key) === null) store.setItem(key, JSON.stringify(value))
  }
}
const snapshot = (store: Storage) => Array.from({ length: store.length }, (_, i) => store.key(i)!).map(key => [key, store.getItem(key)!] as const)

function preparedRequest(data: PreparedData, request: Request): Promise<Response> {
  return new Promise((resolve, reject) => {
    const aborted = () => { reject(new DOMException('The request was aborted.', 'AbortError')) }
    if (request.signal.aborted) { aborted(); return }
    request.signal.addEventListener('abort', aborted, { once: true })
    Promise.resolve().then(() => {
      if (request.signal.aborted) throw new DOMException('The request was aborted.', 'AbortError')
      return data.request(request)
    }).then(resolve, reject).finally(() => request.signal.removeEventListener('abort', aborted))
  })
}

export function installGuidedRuntime(makePrepared: PreparedFactory, win: Window = window, namespace = ''): GuidedRuntime | null {
  const url = new URL(win.location.href)
  if (!url.searchParams.has('guided')) return null
  if (url.searchParams.getAll('guided').length !== 1 || url.searchParams.get('guided') !== 'tofu') throw new Error('Unknown guided demo mode.')
  const existing = installed.get(win)
  if (existing) return existing
  const token = url.searchParams.get('guideSession')
  const navigation = win.performance?.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  const sessionId = navigation?.type !== 'reload' && token && uuid.test(token) ? token : win.crypto.randomUUID()
  const prefix = `remake:guided:${namespace}${sessionId}:`
  const names = ['localStorage', 'sessionStorage', 'fetch'] as const
  const descriptors = names.map(name => [name, Object.getOwnPropertyDescriptor(win, name)] as const)
  const nativeLocal = win.localStorage, nativeSession = win.sessionStorage, nativeFetch = win.fetch
  const bridgeReady = new Map<string, Promise<void>>()
  const local = scopedStorage(nativeLocal, prefix), session = scopedStorage(nativeSession, prefix)
  const localBefore = snapshot(local), sessionBefore = snapshot(session)
  const originalUrl = win.location.href, historyState = win.history.state
  const restore = () => {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(win, name, descriptor)
      else Reflect.deleteProperty(win, name)
    }
    installed.delete(win)
  }
  let data: PreparedData | undefined
  try {
    for (const [name, store] of [['localStorage', local], ['sessionStorage', session]] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(win, name)
      Object.defineProperty(win, name, { configurable: true, enumerable: descriptor?.enumerable ?? true, get: () => store })
    }
    const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = input instanceof Request ? new Request(input, init) : new Request(new URL(String(input), win.location.href), init)
      if (request.signal.aborted) throw new DOMException('The request was aborted.', 'AbortError')
      const target = new URL(request.url)
      if (target.origin !== url.origin) throw new Error('Remote fetch is unavailable in the prepared guided demo.')
      const pathname = decodeURIComponent(target.pathname)
      const editor = /^\/api\/ideas\/(guided-tofu-ai|guided-tofu-shoot)\/(edit(?:\/sources|\/export)?|cut(?:\/file)?)$/.exec(target.pathname)
      if (editor) {
        const route = editor[1] === 'guided-tofu-ai' ? 'ai' : 'shoot'
        const action = editor[2]
        const methods = action === 'edit' ? ['GET', 'PUT'] : action === 'edit/export' ? ['POST'] : ['GET']
        const params = [...target.searchParams.entries()]
        const queryOK = params.length === 0 || params.length === 1 && (action === 'cut' && params[0][0] === 'shots' && params[0][1] === '6' || action === 'cut/file' && params[0][0] === 'download' && params[0][1] === '1')
        if (target.username || target.password || !methods.includes(request.method) || !queryOK) return new Response(JSON.stringify({ error: 'Unsupported local editor request.' }), { status: 422, headers: { 'content-type': 'application/json' } })
        const fullEditor = url.searchParams.get('cut') === 'full21' && win.document?.querySelector('meta[name="guided-editor-full"]')
        const base = `${fullEditor ? '/api/guided/full/sessions' : '/api/guided/sessions'}/${sessionId}/${route}`
        if (!bridgeReady.has(route)) {
          const ready = nativeFetch.call(win, new URL(base, url.origin), { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }).then(async response => {
            if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || 'The local editor is unavailable.')
          }).catch(error => { bridgeReady.delete(route); throw error })
          bridgeReady.set(route, ready)
        }
        await new Promise<void>((resolve, reject) => {
          const aborted = () => reject(new DOMException('The request was aborted.', 'AbortError'))
          if (request.signal.aborted) { aborted(); return }
          request.signal.addEventListener('abort', aborted, { once: true })
          bridgeReady.get(route)!.then(resolve, reject).finally(() => request.signal.removeEventListener('abort', aborted))
        })
        if (request.signal.aborted) throw new DOMException('The request was aborted.', 'AbortError')
        const forwarded = new URL(`${base}/${action}`, url.origin)
        if (action === 'cut/file') forwarded.search = target.search
        // A cloned Request body becomes a streaming upload in Chromium, which requires HTTP/2.
        // The loopback server uses HTTP/1, so forward the bounded editor JSON as bytes instead.
        const body = request.body === null ? undefined : await request.arrayBuffer()
        if (request.signal.aborted) throw new DOMException('The request was aborted.', 'AbortError')
        return nativeFetch.call(win, new Request(forwarded, { method: request.method, headers: request.headers, body, signal: request.signal, credentials: request.credentials, cache: request.cache, redirect: request.redirect }))
      }
      if (pathname === '/api' || pathname.startsWith('/api/')) {
        if (!data) throw new Error('Prepared guided runtime is not ready.')
        return preparedRequest(data, request)
      }
      return nativeFetch.call(win, request)
    }
    Object.defineProperty(win, 'fetch', { configurable: true, enumerable: descriptors[2][1]?.enumerable ?? true, writable: true, value: fetch })
    data = makePrepared(local, session)
    seed(data, local, session)
    const prepared = data
    const runtime: GuidedRuntime = { sessionId, prefix, local, session, data: prepared,
      reset: () => { startGuidedDemo(win) },
      exit: () => { restore(); win.location.assign(new URL('/', url.origin).href) },
    }
    url.searchParams.set('guideSession', sessionId)
    win.history.replaceState(historyState, '', url.href)
    installed.set(win, runtime)
    return runtime
  } catch (error) {
    restore()
    local.clear(); session.clear()
    for (const [key, value] of localBefore) local.setItem(key, value)
    for (const [key, value] of sessionBefore) session.setItem(key, value)
    if (win.location.href !== originalUrl) win.history.replaceState(historyState, '', originalUrl)
    throw error
  }
}

export function getGuidedRuntime(win: Window | undefined = currentWindow()): GuidedRuntime | null {
  return win ? installed.get(win) ?? null : null
}

export function startGuidedDemo(win: Window = window): void {
  const url = new URL('/', win.location.origin)
  url.searchParams.set('guided', 'tofu')
  if (new URL(win.location.href).searchParams.get('cut') === 'full21') url.searchParams.set('cut', 'full21')
  url.searchParams.set('guideSession', win.crypto.randomUUID())
  win.location.assign(url.href)
}
