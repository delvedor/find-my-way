'use strict'

const { test } = require('node:test')
const FindMyWay = require('..')
const { sanitizeRawUrl } = require('../lib/compiler')
const { safeDecodeURI } = require('../lib/url-sanitizer')

// Registers the same routes on a tree-walking router and a compiling one,
// and checks every url gives the same result from both, through find() and,
// for urls without derived constraints, through lookup(), which runs its own
// generated function.
function assertSameResults (t, routes, urls, opts = {}) {
  const walking = FindMyWay(opts)
  // the suite may run with the compiled-lookup preload
  walking.find = FindMyWay.prototype.find
  walking.lookup = FindMyWay.prototype.lookup
  const compiling = FindMyWay(opts)
  for (const route of routes) {
    const [method, path, routeOpts] = Array.isArray(route) ? route : ['GET', route]
    // Called without arguments by normalize(), with them by lookup().
    const handler = (req, res, params, store, searchParams) => req === undefined
      ? path
      : { path, params: { ...params }, searchParams: { ...searchParams } }
    if (routeOpts) {
      walking.on(method, path, routeOpts, handler)
      compiling.on(method, path, routeOpts, handler)
    } else {
      walking.on(method, path, handler)
      compiling.on(method, path, handler)
    }
  }
  compiling.compile()
  for (const url of urls) {
    const [method, path, constraints] = Array.isArray(url) ? url : ['GET', url]
    const expected = walking.find(method, path, constraints)
    const actual = compiling.find(method, path, constraints)
    t.assert.deepStrictEqual(normalize(actual), normalize(expected), `${method} ${path}`)
    if (constraints === undefined) {
      t.assert.deepStrictEqual(lookup(compiling, method, path), lookup(walking, method, path), `lookup ${method} ${path}`)
    }
  }
  return compiling
}

function lookup (router, method, url) {
  const res = { end () {} }
  const result = router.lookup({ method, url, headers: {} }, res)
  return { result, statusCode: res.statusCode }
}

// The onBadUrl and onMaxParamLength handlers are fresh closures on every
// call, so handlers are compared by what they return.
function normalize (result) {
  if (result === null) return null
  return { handler: result.handler(), params: result.params, store: result.store, searchParams: result.searchParams }
}

test('compile() compiles every method tree and switches find() and lookup() to the compiled versions', t => {
  t.plan(8)
  const router = FindMyWay()
  router.find = FindMyWay.prototype.find // the suite may run with the compiled-lookup preload
  router.on('GET', '/a', () => 'a')
  router.on('POST', '/a', () => 'post a')
  t.assert.strictEqual(router.find('GET', '/a').handler(), 'a')
  t.assert.strictEqual(router._compiledGET, null)

  t.assert.strictEqual(router.compile(), router)
  t.assert.strictEqual(router.find, FindMyWay.prototype._findCompiled)
  t.assert.strictEqual(router.lookup, FindMyWay.prototype._lookupCompiled)
  t.assert.strictEqual(typeof router._compiledGET.find, 'function')
  t.assert.strictEqual(typeof router._compiledGET.lookup, 'function')
  t.assert.strictEqual(typeof router._compiledTrees.POST.find, 'function')
})

test('compiled lookup matches the tree walk on static, parametric and wildcard routes', t => {
  const routes = [
    '/', '/static', '/static/static', '/static/static/static',
    '/users', '/users/:id', '/users/:id/posts', '/users/:id/posts/:postId',
    '/files/*', '/products/:id(\\d+)', '/products/:slug', '/h5/:city-:poi/hotels-c:cityId-r:poiId',
    '/dates/:year-:month-:day', '/opt/:a?', '/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z',
    '/aa', '/ab', '/ac', '/ad/:x', '/ae/*'
  ]
  const urls = [
    '/', '/static', '/static/static', '/static/static/static', '/static/stati', '/static/static/static/static',
    '/users', '/users/42', '/users/42/posts', '/users/42/posts/7', '/users/42/posts/7/extra', '/users/',
    '/files/a/b/c.txt', '/files/', '/products/123', '/products/abc', '/products/12a',
    '/h5/city-poi/hotels-cC1-rP1', '/h5/city-poi/hotels-cC1-aP1', '/dates/2024-01-31', '/dates/2024-01',
    '/opt', '/opt/x', '/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z', '/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y',
    '/aa', '/ab', '/ac', '/ad', '/ad/1', '/ae', '/ae/', '/ae/x/y', '/nope', '/users?x=1', '/users/42?a=1&b=2', '/users/42#frag', '/users/42?q=%20',
    '/?x=1', '/static?', '/files/a/b?c=d', '/products/123?x', 'users', 'http://localhost/users/42?x=1', '//users'
  ]
  const compiling = assertSameResults(t, routes, urls)
  t.assert.ok(compiling._compiledGET !== null)
})

test('compiled lookup falls back to the sanitized path for percent-encoded urls', t => {
  const routes = ['/static', '/users/:id', '/files/*', '/a%b', '/sp ace']
  const urls = [
    '/st%61tic', '/users/john%20doe', '/users/a%2Fb', '/users/a%2fb', '/files/x%2Fy%20z', '/a%25b', '/sp%20ace',
    '/%', '/users/%E0%A4%A', '/users/%zz', '/static%', '/static/%', '/users/42?x=%20'
  ]
  assertSameResults(t, routes, urls)
  assertSameResults(t, routes, urls, { onBadUrl: (path) => path })
})

test('compiled lookup decodes percent-encoded params in place like the tree walk', t => {
  const routes = ['/static', '/users/me', '/users/:id', '/users/:id/posts/:postId', '/files/*', '/n/:id(^\\d+$)', '/v1/:x']
  const urls = [
    // decoded in place
    '/users/john%20doe', '/users/a%2Fb', '/users/a%2fb', '/users/a%3Fb?x=1', '/users/%25', '/users/%2525', '/users/%25zz',
    '/users/J%C3%BCrgen', '/users/%c3%bc', '/users/%E2%82%AC', '/users/%F0%9F%98%80', '/users/%22q%22',
    '/users/john%20doe/posts/hello%2Fworld?page=2', '/files/a%20b/c%2Fd%20e', '/files/%F0%9F%98%80?x', '/n/%31%32',
    // escapes past the chars the scanners check one by one
    '/users/abcdefghijklmnop%20q', '/users/abcdefghijklmnop%20q/posts/abcdefghijklmnop%2F?x', '/files/abcdefghijklmnopq/r%20s',
    // escapes of chars used by static parts go through the sanitized path
    '/users/m%65', '/users/%6De', '/users/%6de', '/st%61tic', '/us%65rs/me', '/v%31/x', '/users/%6De/posts/1',
    '/users/abcdefghijklmnop%6De', '/abcdefghijklmnop/%73tatic',
    // malformed escapes
    '/users/%', '/users/%2', '/users/%zz', '/users/%C3', '/users/%C3%28', '/users/%C1%81', '/users/%ED%A0%80',
    '/users/%F4%90%80%80', '/users/%E2%82%AC%', '/files/%E2%82', '/static%', '/static%zz',
    // no match
    '/nope%20here', '/users/a%20b/nope', '/nope?x=%20', '/nope?x=%zz', '/n/%41', '/n/%41/x', '/nope%2Fhere'
  ]
  const compiling = assertSameResults(t, routes, urls)
  t.assert.ok(compiling._compiledGET.find.source.includes('decodeSegment('), 'the raw matcher decodes params')
  assertSameResults(t, routes, urls, { onBadUrl: (path) => path })
  assertSameResults(t, routes, urls, { useSemicolonDelimiter: true })
  assertSameResults(t, routes, urls, { maxParamLength: 3, onMaxParamLength: (path) => path })
  assertSameResults(t, routes, ['/users/a;b', '/users/a%3Bb;c', '/files/a%20b;c?d'], { useSemicolonDelimiter: true })
})

test('compiled lookup matches non-ASCII static parts sent percent-encoded', t => {
  // '/\uD83D*' makes the tree split a static part between the two halves of
  // a surrogate pair, with a wildcard after the first one.
  const routes = ['/über-uns', '/café/:id', '/😀', '/😃', '/\uD83D*', '/a/:p', '/b/ü/:p']
  const urls = [
    '/%C3%BCber-uns', '/%c3%bcber-uns', '/%C3%BCber-uns?x=1', '/caf%C3%A9/1', '/caf%C3%A9/%C3%A9', '/caf%C3%A9/%C3',
    '/%F0%9F%98%80', '/%F0%9F%98%83', '/%F0%9F%98%81', '/%C3%BC', '/a/%C3%BC', '/a/%F0%9F%98%81', '/b/%C3%BC/%C3%BC'
  ]
  assertSameResults(t, routes, urls)
  assertSameResults(t, routes, urls, { onBadUrl: (path) => path })
})

test('compiled lookup matches the tree walk on randomly percent-encoded urls', t => {
  const routes = [
    '/', '/me', '/users', '/users/me', '/users/:id', '/users/:id/posts/:postId', '/users/:id/x-y', '/:a/:b/c',
    '/files/*', '/n/:id(^\\d+$)', '/d/:a-:b', '/v1/:x/v2', '/a.b/:x', '/über/:x', '/:x/me/*'
  ]
  const values = ['me', 'users', 'x-y', 'a.b', 'v1', 'c', '42', 'a b', 'ü', '😀', 'a/b', 'a?b', '%', 'é#', 'abcdefghijklmnop me']
  // A seeded generator keeps the urls the same on every run.
  let seed = 42
  const random = (n) => {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0
    return (seed >>> 8) % n
  }
  const encode = (text) => {
    let result = ''
    for (const char of text) {
      const kind = random(4)
      if (kind === 0) {
        // every UTF-8 byte as an escape, unreserved chars included
        for (const byte of Buffer.from(char)) result += '%' + byte.toString(16).padStart(2, '0')
      } else if (kind === 1 || char.charCodeAt(0) > 127) {
        result += encodeURIComponent(char)
      } else {
        result += char
      }
    }
    return result
  }
  const urls = []
  for (let i = 0; i < 2000; i++) {
    const route = routes[random(routes.length)]
    const path = route.replace(/:\w+(\([^)]*\))?(-:\w+)?|\*/g, () => values[random(values.length)])
    const suffix = ['', '', '?q=%20', '#f', '%', '%C3', '/'][random(7)]
    urls.push(encode(path) + suffix)
  }
  assertSameResults(t, routes, urls)
  assertSameResults(t, routes, urls, { onBadUrl: (path) => path, maxParamLength: 4, onMaxParamLength: (path) => path })
})

test('sanitizeRawUrl splits and decodes urls exactly like safeDecodeURI', t => {
  const hex = (byte) => '%' + byte.toString(16).padStart(2, '0')
  // Continuation bytes on the edges of the ranges UTF-8 allows after each lead byte.
  const edges = [0x00, 0x2f, 0x7f, 0x80, 0x8f, 0x90, 0x9f, 0xa0, 0xbf, 0xc0, 0xff]
  const escapes = []
  for (let lead = 0; lead < 0x100; lead++) {
    escapes.push(hex(lead), hex(lead).toUpperCase())
    for (const b of edges) {
      escapes.push(hex(lead) + hex(b))
      if (lead < 0xe0) continue
      for (const c of edges) {
        escapes.push(hex(lead) + hex(b) + hex(c))
        if (lead < 0xf0) continue
        for (const d of edges) escapes.push(hex(lead) + hex(b) + hex(c) + hex(d))
      }
    }
  }
  const urls = ['/%', '/%2', '/a%zz', '/a%25%2F%3b?x', '/a;b%20?c', '/a#b%', '/%2525', '/a/%C3%BC/%F0%9F%98%80']
  for (const escape of escapes) urls.push(`/a/${escape}`, `/${escape}b?q=${escape}`)

  const mismatches = []
  for (const useSemicolonDelimiter of [false, true]) {
    for (const url of urls) {
      let expected
      try {
        expected = safeDecodeURI(url, useSemicolonDelimiter)
      } catch {
        expected = null
      }
      const actual = sanitizeRawUrl(url, useSemicolonDelimiter)
      if (JSON.stringify(actual) !== JSON.stringify(expected)) mismatches.push(url)
    }
  }
  t.assert.deepStrictEqual(mismatches, [])
})

test('compiled lookup honours the router options', t => {
  const routes = ['/Static', '/users/:id', '/files/*', '/foo/bar']
  const urls = ['/static', '/STATIC', '/users/42/', '/users/42//', '/foo//bar', '/foo/bar/', '/files/a//b/', '/users/42;jsessionid=1', '/users/42;x?y=1']
  for (const opts of [
    { caseSensitive: false },
    { ignoreTrailingSlash: true },
    { ignoreDuplicateSlashes: true },
    { useSemicolonDelimiter: true },
    { caseSensitive: false, ignoreTrailingSlash: true, ignoreDuplicateSlashes: true, useSemicolonDelimiter: true }
  ]) {
    assertSameResults(t, routes, urls, opts)
  }
})

test('compiled lookup enforces maxParamLength and calls onMaxParamLength', t => {
  const routes = ['/users/:id', '/users/:id/posts/:postId', '/items/:id(\\d+)', '/items/:slug', '/all/*']
  const long = 'x'.repeat(101)
  const urls = [`/users/${long}`, `/users/${'x'.repeat(100)}`, `/users/1/posts/${long}`, `/items/${'1'.repeat(101)}`, `/items/${long}`, `/all/${long}`]
  assertSameResults(t, routes, urls)
  const compiling = assertSameResults(t, routes, urls, { onMaxParamLength: (path) => `too long: ${path}` })
  t.assert.strictEqual(compiling.find('GET', `/users/${long}?x=1`).handler(), `too long: /users/${long}`)
  assertSameResults(t, routes, urls, { maxParamLength: 5 })
})

test('compiled lookup matches constrained routes', t => {
  const routes = [
    ['GET', '/', {}],
    ['GET', '/static', { constraints: { version: '1.2.0' } }],
    ['GET', '/static', { constraints: { version: '2.0.0', host: 'example.com' } }],
    ['GET', '/static', { constraints: { version: '2.0.0', host: 'fastify.io' } }],
    ['GET', '/mixed', {}],
    ['GET', '/mixed', { constraints: { host: 'fastify.io' } }],
    ['GET', '/p/:a/:b/:c/:d/:e/:f', {}],
    ['GET', '/p/:a1/:b1/:c1/:d1/:e1/:f1', { constraints: { host: 'fastify.io' } }]
  ]
  const urls = [
    ['GET', '/', { host: 'fastify.io' }],
    ['GET', '/static', { version: '1.x', host: 'fastify.io' }],
    ['GET', '/static', { version: '2.x', host: 'fastify.io' }],
    ['GET', '/static', { version: '2.x', host: 'example.com' }],
    ['GET', '/static', { version: '3.x' }],
    ['GET', '/static', {}],
    ['GET', '/mixed', {}],
    ['GET', '/mixed', { host: 'fastify.io' }],
    ['GET', '/mixed', { host: 'other.io' }],
    ['GET', '/p/1/2/3/4/5/6', {}],
    ['GET', '/p/1/2/3/4/5/6', { host: 'fastify.io' }],
    ['GET', '/p/1/2/3/4/5/6?q=1', { host: 'fastify.io' }]
  ]
  assertSameResults(t, routes, urls)
})

test('compiled lookup is rebuilt when routes change', t => {
  const router = FindMyWay()
  router.on('GET', '/a', () => 'a')
  router.compile()
  t.assert.strictEqual(router.find('GET', '/a').handler(), 'a')
  t.assert.strictEqual(router.find('GET', '/b'), null)

  router.on('GET', '/b', () => 'b')
  t.assert.strictEqual(router.find('GET', '/b').handler(), 'b')

  router.on('POST', '/b', () => 'post b')
  t.assert.strictEqual(router.find('POST', '/b').handler(), 'post b')
  t.assert.strictEqual(router.find('PUT', '/b'), null)

  router.off('GET', '/a')
  t.assert.strictEqual(router.find('GET', '/a'), null)
  t.assert.strictEqual(router.find('GET', '/b').handler(), 'b')

  router.reset()
  t.assert.strictEqual(router.find('GET', '/b'), null)
  t.assert.strictEqual(router.find('POST', '/b'), null)

  router.on('GET', '*', () => 'all')
  t.assert.strictEqual(router.find('GET', '/anything/at/all').handler(), 'all')
  t.assert.strictEqual(router.find('GET', '/anything/at/all').params['*'], '/anything/at/all')
})

test('lookup uses the compiled matcher', t => {
  t.plan(3)
  const router = FindMyWay({ defaultRoute: (req, res) => { res.statusCode = 404 } })
  router.on('GET', '/users/:id', (req, res, params, store, searchParams) => {
    t.assert.deepStrictEqual({ ...params }, { id: '42' })
    t.assert.deepStrictEqual({ ...searchParams }, { x: '1' })
  })
  router.compile()
  router.lookup({ method: 'GET', url: '/users/42?x=1', headers: {} }, {})
  const res = {}
  router.lookup({ method: 'GET', url: '/nope', headers: {} }, res)
  t.assert.strictEqual(res.statusCode, 404)
})

test('large route tables are split into several generated functions', t => {
  const routes = []
  const urls = []
  for (let i = 0; i < 300; i++) {
    routes.push(`/api/res${i}`, `/api/res${i}/:id`, `/api/res${i}/:id/sub/:subId`, `/api/res${i}/static/*`)
    urls.push(`/api/res${i}`, `/api/res${i}/${i}`, `/api/res${i}/${i}/sub/${i * 7}?page=2`, `/api/res${i}/static/a/b`, `/api/res${i}/${i}/nope`)
  }
  const compiling = assertSameResults(t, routes, urls)
  const source = compiling._compiledGET.find.source
  t.assert.ok(source.includes('function subtree_'), 'the tree was split into subtree functions')
  const longest = Math.max(...source.split(/^function |^return function /m).map(fn => fn.split('\n').length))
  t.assert.ok(longest < 1000, `the longest generated function has ${longest} lines`)
})

test('regex params with nested capture groups behave like the tree walk', t => {
  assertSameResults(t, ['/n/:id((a)|b)/:rest', '/m/:id((?:a)|b)'], ['/n/a/x', '/n/b/x', '/m/a', '/m/b', '/m/c'])
})

test('compiled lookup calls the handler directly and keeps its return value and context', t => {
  t.plan(10)
  const router = FindMyWay({ defaultRoute: (req, res) => { res.statusCode = 404; return 'default' } })
  router.on('GET', '/null', () => null)
  router.on('GET', '/users/:id', function (req, res, params, store, searchParams) {
    t.assert.deepStrictEqual({ ...params }, { id: '42' })
    t.assert.deepStrictEqual({ ...searchParams }, { page: '2' })
    // Without a context the handler is called as a method of its handle
    // object, exactly as Router#callHandler does.
    return this !== undefined && this.name === 'ctx' ? 'ctx' : 'no context'
  }, { kind: 'store' })
  router.compile()
  t.assert.strictEqual(typeof router._compiledGET.lookup, 'function')

  const req = (url) => ({ method: 'GET', url, headers: {} })
  // A handler returning null must not be mistaken for a missing route.
  t.assert.strictEqual(router.lookup(req('/null'), {}), null)
  t.assert.strictEqual(router.lookup(req('/users/42?page=2'), {}), 'no context')
  t.assert.strictEqual(router.lookup(req('/users/42?page=2'), {}, { name: 'ctx' }), 'ctx')

  const res = {}
  t.assert.strictEqual(router.lookup(req('/nope'), res), 'default')
  t.assert.strictEqual(res.statusCode, 404)
})

test('compiled lookup handles percent-encoded urls and unknown methods', t => {
  t.plan(4)
  const router = FindMyWay({ defaultRoute: () => 'default', onBadUrl: (path) => `bad ${path}` })
  router.on('GET', '/users/:id', (req, res, params) => params.id)
  router.compile()
  const req = (method, url) => ({ method, url, headers: {} })
  t.assert.strictEqual(router.lookup(req('GET', '/users/john%20doe'), {}), 'john doe')
  t.assert.strictEqual(router.lookup(req('GET', '/us%65rs/1'), {}), '1')
  t.assert.strictEqual(router.lookup(req('GET', '/users/%'), {}), 'bad /users/%')
  t.assert.strictEqual(router.lookup(req('DELETE', '/users/1'), {}), 'default')
})

test('compiled lookup with a done callback still derives constraints asynchronously', (t, done) => {
  t.plan(3)
  const router = FindMyWay({
    constraints: {
      secret: {
        name: 'secret',
        storage () {
          const store = new Map()
          return { get: (key) => store.get(key) || null, set: (key, value) => store.set(key, value) }
        },
        deriveConstraint (req, ctx, cb) {
          setImmediate(() => cb(null, req.headers['x-secret']))
        }
      }
    }
  })
  router.on('GET', '/a', { constraints: { secret: 'alpha' } }, () => 'alpha')
  router.on('GET', '/a', { constraints: { secret: 'beta' } }, () => 'beta')
  router.compile()
  router.lookup({ method: 'GET', url: '/a', headers: { 'x-secret': 'beta' } }, {}, (err, result) => {
    t.assert.ifError(err)
    t.assert.strictEqual(result, 'beta')
    t.assert.strictEqual(router.lookup, FindMyWay.prototype._lookupCompiled)
    done()
  })
})

test('static leaves on an all-static path are matched by whole-string comparison', t => {
  const routes = ['/static', '/a/b', '/a/b/c', '/x/*', '/users/:id', '/users/:id/posts']
  const urls = ['/static', '/static?x=1', '/static#f', '/stati', '/statics', '/a/b', '/a/b/c', '/a/b?q', '/a/b/', '/x/', '/x/y', '/users/1', '/users/1/posts', '/users/1/posts?x=1']
  const compiling = assertSameResults(t, routes, urls)
  const source = compiling._compiledGET.find.source
  t.assert.ok(source.includes('path === "/static"'), 'leaf without children uses whole-string comparison')
  t.assert.ok(source.includes('path === "/a/b/c"'), 'nested leaf without children uses whole-string comparison')
  t.assert.ok(!source.includes('path === "/a/b"'), 'a leaf with children keeps the prefix chain')
  t.assert.ok(!source.includes('path === "/users/'), 'nothing after a parameter uses whole-string comparison')
})

test('onMaxParamLength is reported from a split subtree function', t => {
  t.plan(3)
  const router = FindMyWay({ onMaxParamLength: (path) => `too long: ${path}` })
  for (let i = 0; i < 300; i++) {
    router.on('GET', `/api/res${i}/:id`, () => 'ok')
  }
  router.compile()
  t.assert.ok(router._compiledGET.find.source.includes('function subtree_'))
  const url = `/api/res150/${'x'.repeat(101)}`
  t.assert.strictEqual(router.find('GET', url).handler(), `too long: ${url}`)
  // The generated code must not leak its locals into the global scope.
  t.assert.strictEqual(globalThis.maxParamLengthExceeded, undefined)
})

test('placeholders used while generating code cannot collide with route paths', t => {
  t.plan(3)
  const router = FindMyWay()
  router.on('GET', '/p/aaaaaaaaaa@POS@/x', () => 'long')
  router.on('GET', '/p/@RETRY@', () => 'retry')
  router.on('GET', '/p/q', () => 'q')
  router.compile()
  t.assert.strictEqual(router.find('GET', '/p/aaaaaaaaaa@POS@/x').handler(), 'long')
  t.assert.strictEqual(router.find('GET', '/p/@RETRY@').handler(), 'retry')
  t.assert.strictEqual(router.find('GET', '/p/q').handler(), 'q')
})
