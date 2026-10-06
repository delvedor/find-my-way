'use strict'

const { test } = require('node:test')
const FindMyWay = require('..')

// Registers the same routes on a tree-walking router and a compiling one,
// and checks every url gives the same result from both.
function assertSameResults (t, routes, urls, opts = {}) {
  const walking = FindMyWay(opts)
  walking.find = FindMyWay.prototype.find // the suite may run with FIND_MY_WAY_COMPILE=1
  const compiling = FindMyWay(opts)
  for (const route of routes) {
    const [method, path, routeOpts] = Array.isArray(route) ? route : ['GET', route]
    const handler = () => path
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
  }
  return compiling
}

// The onBadUrl and onMaxParamLength handlers are fresh closures on every
// call, so handlers are compared by what they return.
function normalize (result) {
  if (result === null) return null
  return { handler: result.handler(), params: result.params, store: result.store, searchParams: result.searchParams }
}

test('compile() compiles every method tree and switches find() to the compiled lookup', t => {
  t.plan(6)
  const router = FindMyWay()
  router.find = FindMyWay.prototype.find // the suite may run with FIND_MY_WAY_COMPILE=1
  router.on('GET', '/a', () => 'a')
  router.on('POST', '/a', () => 'post a')
  t.assert.strictEqual(router.find('GET', '/a').handler(), 'a')
  t.assert.strictEqual(router._compiledGET, null)

  t.assert.strictEqual(router.compile(), router)
  t.assert.strictEqual(router.find, FindMyWay.prototype._findCompiled)
  t.assert.strictEqual(typeof router._compiledGET, 'function')
  t.assert.strictEqual(typeof router._compiledTrees.POST, 'function')
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
  const source = compiling._compiledGET.source
  t.assert.ok(source.includes('function subtree_'), 'the tree was split into subtree functions')
  const longest = Math.max(...source.split(/^function |^return function /m).map(fn => fn.split('\n').length))
  t.assert.ok(longest < 1000, `the longest generated function has ${longest} lines`)
})

test('regex params with nested capture groups behave like the tree walk', t => {
  assertSameResults(t, ['/n/:id((a)|b)/:rest', '/m/:id((?:a)|b)'], ['/n/a/x', '/n/b/x', '/m/a', '/m/b', '/m/c'])
})
