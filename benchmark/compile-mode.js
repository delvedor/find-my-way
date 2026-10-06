'use strict'

// Compares the tree-walking lookup with the compiled lookup (compile: true)
// scenario by scenario. Every scenario runs in a fresh worker so the two
// modes never share JIT state.
//
//   node benchmark/compile-mode.js [filter] [--rounds N] [--iters N]

const { Worker, isMainThread, workerData, parentPort } = require('node:worker_threads')

function apiRoutes () {
  const routes = []
  for (const r of ['users', 'posts', 'comments', 'orders', 'products', 'invoices', 'teams', 'projects']) {
    routes.push(
      { method: 'GET', url: `/api/v1/${r}` },
      { method: 'POST', url: `/api/v1/${r}` },
      { method: 'GET', url: `/api/v1/${r}/:id` },
      { method: 'PUT', url: `/api/v1/${r}/:id` },
      { method: 'DELETE', url: `/api/v1/${r}/:id` },
      { method: 'GET', url: `/api/v1/${r}/:id/history` }
    )
  }
  routes.push(
    { method: 'GET', url: '/api/v1/users/:id/posts/:postId' },
    { method: 'GET', url: '/api/v1/search/:index(^[a-z]+$)' },
    { method: 'GET', url: '/health' },
    { method: 'GET', url: '/metrics' },
    { method: 'GET', url: '/static/*' },
    { method: 'GET', url: '/' }
  )
  return routes
}

const constrainedRoutes = [
  { method: 'GET', url: '/static', opts: { constraints: { version: '1.2.0' } } },
  { method: 'GET', url: '/static', opts: { constraints: { version: '2.0.0', host: 'example.com' } } },
  { method: 'GET', url: '/static', opts: { constraints: { version: '2.0.0', host: 'fastify.io' } } }
]

const benchmarks = [
  { name: 'root "/"', setupURLs: [{ method: 'GET', url: '/' }], arguments: [{ method: 'GET', url: '/' }] },
  { name: 'short static', setupURLs: [{ method: 'GET', url: '/static' }], arguments: [{ method: 'GET', url: '/static' }] },
  { name: 'long static', setupURLs: [{ method: 'GET', url: '/static/static/static/static/static' }], arguments: [{ method: 'GET', url: '/static/static/static/static/static' }] },
  {
    name: 'long static (common prefix)',
    setupURLs: ['/static', '/static/static', '/static/static/static', '/static/static/static/static', '/static/static/static/static/static'].map(url => ({ method: 'GET', url })),
    arguments: [{ method: 'GET', url: '/static/static/static/static/static' }]
  },
  { name: 'short parametric', setupURLs: [{ method: 'GET', url: '/:param' }], arguments: [{ method: 'GET', url: '/param1' }] },
  { name: 'long parametric', setupURLs: [{ method: 'GET', url: '/:param' }], arguments: [{ method: 'GET', url: '/longParamParamParamParamParamParam' }] },
  { name: 'short parametric (encoded unoptimized)', setupURLs: [{ method: 'GET', url: '/:param' }], arguments: [{ method: 'GET', url: '/param%2B' }] },
  { name: 'short parametric (encoded optimized)', setupURLs: [{ method: 'GET', url: '/:param' }], arguments: [{ method: 'GET', url: '/param%20' }] },
  { name: 'two short params', setupURLs: [{ method: 'GET', url: '/:param1/:param2' }], arguments: [{ method: 'GET', url: '/param1/param2' }] },
  { name: 'multi-parametric two short params', setupURLs: [{ method: 'GET', url: '/:param1-:param2' }], arguments: [{ method: 'GET', url: '/param1-param2' }] },
  { name: 'multi-parametric two regex params', setupURLs: [{ method: 'GET', url: '/:param1([a-z]*)1:param2([a-z]*)2' }], arguments: [{ method: 'GET', url: '/param1param2' }] },
  { name: 'long static + parametric', setupURLs: [{ method: 'GET', url: '/static/:param1/static/:param2/static' }], arguments: [{ method: 'GET', url: '/static/param1/static/param2/static' }] },
  { name: 'short wildcard', setupURLs: [{ method: 'GET', url: '/*' }], arguments: [{ method: 'GET', url: '/static' }] },
  { name: 'long wildcard', setupURLs: [{ method: 'GET', url: '/*' }], arguments: [{ method: 'GET', url: '/static/static/static/static/static' }] },
  { name: 'root on constrained router', setupURLs: [{ method: 'GET', url: '/' }, ...constrainedRoutes], arguments: [{ method: 'GET', url: '/', headers: { host: 'fastify.io' } }] },
  { name: 'short static unconstrained route', setupURLs: [{ method: 'GET', url: '/static', opts: {} }, ...constrainedRoutes.slice(1)], arguments: [{ method: 'GET', url: '/static', headers: {} }] },
  { name: 'short static versioned route', setupURLs: constrainedRoutes, arguments: [{ method: 'GET', url: '/static', headers: { 'accept-version': '1.x', host: 'fastify.io' } }] },
  { name: 'short static constrained (version & host)', setupURLs: constrainedRoutes, arguments: [{ method: 'GET', url: '/static', headers: { 'accept-version': '2.x', host: 'fastify.io' } }] },
  { name: 'api: GET /api/v1/users/:id', setupURLs: apiRoutes(), arguments: [{ method: 'GET', url: '/api/v1/users/42' }] },
  { name: 'api: GET /api/v1/users/:id (uuid)', setupURLs: apiRoutes(), arguments: [{ method: 'GET', url: '/api/v1/users/9b2e4c1a-5f3d-4e8b-9a7c-1d2e3f4a5b6c' }] },
  { name: 'api: GET /api/v1/users/:id?qs', setupURLs: apiRoutes(), arguments: [{ method: 'GET', url: '/api/v1/users/42?fields=name,email&page=2' }] },
  { name: 'api: GET /api/v1/invoices', setupURLs: apiRoutes(), arguments: [{ method: 'GET', url: '/api/v1/invoices' }] },
  { name: 'api: PUT /api/v1/projects/:id', setupURLs: apiRoutes(), arguments: [{ method: 'PUT', url: '/api/v1/projects/7' }] },
  { name: 'api: GET nested two params', setupURLs: apiRoutes(), arguments: [{ method: 'GET', url: '/api/v1/users/42/posts/1001' }] },
  { name: 'api: GET /health', setupURLs: apiRoutes(), arguments: [{ method: 'GET', url: '/health' }] },
  { name: 'api: GET /static/* wildcard', setupURLs: apiRoutes(), arguments: [{ method: 'GET', url: '/static/js/app.min.js' }] },
  { name: 'api: GET long wildcard', setupURLs: apiRoutes(), arguments: [{ method: 'GET', url: '/static/js/vendor/some-library/dist/library.min.js' }] },
  { name: 'api: encoded param (slow path)', setupURLs: apiRoutes(), arguments: [{ method: 'GET', url: '/api/v1/users/john%20doe' }] },
  { name: 'api: 404', setupURLs: apiRoutes(), arguments: [{ method: 'GET', url: '/api/v2/nothing/here' }] },
  {
    name: 'api: mixed 8 urls',
    setupURLs: apiRoutes(),
    arguments: [
      { method: 'GET', url: '/api/v1/users/42' }, { method: 'GET', url: '/api/v1/invoices' },
      { method: 'POST', url: '/api/v1/orders' }, { method: 'GET', url: '/api/v1/users/42/posts/1001' },
      { method: 'GET', url: '/health' }, { method: 'DELETE', url: '/api/v1/teams/9' },
      { method: 'GET', url: '/api/v1/products/3/history' }, { method: 'GET', url: '/static/css/a.css' }
    ]
  }
]

if (!isMainThread) {
  const { benchmark, compile, rounds, iters } = workerData
  const FindMyWay = require('..')
  const router = FindMyWay({ compile, defaultRoute: () => false })
  for (const { method, url, opts } of benchmark.setupURLs) {
    if (opts !== undefined) router.on(method, url, opts, () => true)
    else router.on(method, url, () => true)
  }
  const reqs = benchmark.arguments.map(a => ({ method: a.method, url: a.url, headers: a.headers || {} }))
  const res = {}
  const n = reqs.length
  for (let i = 0; i < 200000; i++) router.lookup(reqs[i % n], res)
  const samples = []
  for (let r = 0; r < rounds; r++) {
    const start = process.hrtime.bigint()
    for (let i = 0; i < iters; i++) router.lookup(reqs[i % n], res)
    samples.push(Number(process.hrtime.bigint() - start) / iters)
  }
  samples.sort((a, b) => a - b)
  parentPort.postMessage({ median: samples[Math.floor(samples.length / 2)] })
} else {
  const args = process.argv.slice(2)
  let rounds = 15
  let iters = 1000000
  let filter = null
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--rounds') rounds = Number(args[++i])
    else if (args[i] === '--iters') iters = Number(args[++i])
    else filter = args[i]
  }

  const run = (benchmark, compile) => new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { workerData: { benchmark, compile, rounds, iters } })
    let result
    worker.on('message', message => { result = message })
    worker.on('error', reject)
    worker.on('exit', code => code === 0 ? resolve(result) : reject(new Error(`worker exited with code ${code}`)))
  })

  ;(async () => {
    const selected = benchmarks.filter(b => filter === null || b.name.includes(filter))
    const width = Math.max(...selected.map(b => b.name.length))
    console.log(`${'scenario'.padEnd(width)}  ${'walk ns'.padStart(8)}  ${'compiled'.padStart(8)}  speedup`)
    const ratios = []
    for (const benchmark of selected) {
      const walk = await run(benchmark, false)
      const compiled = await run(benchmark, true)
      const ratio = walk.median / compiled.median
      ratios.push(ratio)
      console.log(`${benchmark.name.padEnd(width)}  ${walk.median.toFixed(1).padStart(8)}  ${compiled.median.toFixed(1).padStart(8)}  ${ratio.toFixed(2)}x`)
    }
    const geomean = Math.exp(ratios.reduce((sum, ratio) => sum + Math.log(ratio), 0) / ratios.length)
    console.log(`geomean speedup: ${geomean.toFixed(2)}x`)
  })()
}
