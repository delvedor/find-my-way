'use strict'

require('./location')
const t = require('tap')
const test = t.test
const FindMyWay = require('../../browser')

test('the router is an object with methods', t => {
  t.plan(3)

  const findMyWay = FindMyWay()

  t.is(typeof findMyWay.on, 'function')
  t.is(typeof findMyWay.lookup, 'function')
  t.is(typeof findMyWay.find, 'function')
})

test('register a route', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('/test', () => {
    t.ok('inside the handler')
  })

  findMyWay.lookup('/test')
})

test('default route', t => {
  t.plan(2)

  const findMyWay = FindMyWay({
    defaultRoute: (path) => {
      t.is(path, '/test')
      t.ok('inside the default route')
    }
  })

  findMyWay.lookup('/test')
})

test('parametric route', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('/test/:id', (route) => {
    t.is(route.params.id, 'hello')
  })

  findMyWay.lookup('/test/hello')
})

test('multiple parametric route', t => {
  t.plan(2)
  const findMyWay = FindMyWay()

  findMyWay.on('/test/:id', (route) => {
    t.is(route.params.id, 'hello')
  })

  findMyWay.on('/other-test/:id', (route) => {
    t.is(route.params.id, 'world')
  })

  findMyWay.lookup('/test/hello')
  findMyWay.lookup('/other-test/world')
})

test('multiple parametric route with the same prefix', t => {
  t.plan(2)
  const findMyWay = FindMyWay()

  findMyWay.on('/test/:id', (route) => {
    t.is(route.params.id, 'hello')
  })

  findMyWay.on('/test/:id/world', (route) => {
    t.is(route.params.id, 'world')
  })

  findMyWay.lookup('/test/hello')
  findMyWay.lookup('/test/world/world')
})

test('nested parametric route', t => {
  t.plan(2)
  const findMyWay = FindMyWay()

  findMyWay.on('/test/:hello/test/:world', (route) => {
    t.is(route.params.hello, 'hello')
    t.is(route.params.world, 'world')
  })

  findMyWay.lookup('/test/hello/test/world')
})

test('nested parametric route with same prefix', t => {
  t.plan(3)
  const findMyWay = FindMyWay()

  findMyWay.on('/test', (route) => {
    t.ok('inside route')
  })

  findMyWay.on('/test/:hello/test/:world', (route) => {
    t.is(route.params.hello, 'hello')
    t.is(route.params.world, 'world')
  })

  findMyWay.lookup('/test')
  findMyWay.lookup('/test/hello/test/world')
})

test('long route', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('/abc/def/ghi/lmn/opq/rst/uvz', (route) => {
    t.ok('inside long path')
  })

  findMyWay.lookup('/abc/def/ghi/lmn/opq/rst/uvz')
})

test('long parametric route', t => {
  t.plan(3)
  const findMyWay = FindMyWay()

  findMyWay.on('/abc/:def/ghi/:lmn/opq/:rst/uvz', (route) => {
    t.is(route.params.def, 'def')
    t.is(route.params.lmn, 'lmn')
    t.is(route.params.rst, 'rst')
  })

  findMyWay.lookup('/abc/def/ghi/lmn/opq/rst/uvz')
})

test('long parametric route with common prefix', t => {
  t.plan(9)
  const findMyWay = FindMyWay()

  findMyWay.on('/', (route) => {
    throw new Error('I shoul not be here')
  })

  findMyWay.on('/abc', (route) => {
    throw new Error('I shoul not be here')
  })

  findMyWay.on('/abc/:def', (route) => {
    t.is(route.params.def, 'def')
  })

  findMyWay.on('/abc/:def/ghi/:lmn', (route) => {
    t.is(route.params.def, 'def')
    t.is(route.params.lmn, 'lmn')
  })

  findMyWay.on('/abc/:def/ghi/:lmn/opq/:rst', (route) => {
    t.is(route.params.def, 'def')
    t.is(route.params.lmn, 'lmn')
    t.is(route.params.rst, 'rst')
  })

  findMyWay.on('/abc/:def/ghi/:lmn/opq/:rst/uvz', (route) => {
    t.is(route.params.def, 'def')
    t.is(route.params.lmn, 'lmn')
    t.is(route.params.rst, 'rst')
  })

  findMyWay.lookup('/abc/def')
  findMyWay.lookup('/abc/def/ghi/lmn')
  findMyWay.lookup('/abc/def/ghi/lmn/opq/rst')
  findMyWay.lookup('/abc/def/ghi/lmn/opq/rst/uvz')
})

test('wildcard', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('/test/*', (route) => {
    t.is(route.params['*'], 'hello')
  })

  findMyWay.lookup('/test/hello')
})

test('find should return the route', t => {
  t.plan(1)
  const findMyWay = FindMyWay()
  const fn = () => {}

  findMyWay.on('/test', fn)

  t.deepEqual(
    findMyWay.find('/test'),
    {
      handler: fn,
      params: {},
      store: null
    }
  )
})

test('find should return the route with params', t => {
  t.plan(1)
  const findMyWay = FindMyWay()
  const fn = () => {}

  findMyWay.on('/test/:id', fn)

  t.deepEqual(
    findMyWay.find('/test/hello'),
    {
      handler: fn,
      params: { id: 'hello' },
      store: null
    }
  )
})

test('find should return a null handler if the route does not exist', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  t.deepEqual(
    findMyWay.find('/test'),
    null
  )
})

test('should decode the uri - parametric', t => {
  t.plan(1)
  const findMyWay = FindMyWay()
  const fn = () => {}

  findMyWay.on('/test/:id', fn)

  t.deepEqual(
    findMyWay.find('/test/he%2Fllo'),
    {
      handler: fn,
      params: { id: 'he/llo' },
      store: null
    }
  )
})

test('should decode the uri - wildcard', t => {
  t.plan(1)
  const findMyWay = FindMyWay()
  const fn = () => {}

  findMyWay.on('/test/*', fn)

  t.deepEqual(
    findMyWay.find('/test/he%2Fllo'),
    {
      handler: fn,
      params: { '*': 'he/llo' },
      store: null
    }
  )
})

test('safe decodeURIComponent', t => {
  t.plan(1)
  const findMyWay = FindMyWay()
  const fn = () => {}

  findMyWay.on('/test/:id', fn)

  t.deepEqual(
    findMyWay.find('/test/hel%"Flo'),
    null
  )
})

test('safe decodeURIComponent - nested route', t => {
  t.plan(1)
  const findMyWay = FindMyWay()
  const fn = () => {}

  findMyWay.on('/test/hello/world/:id/blah', fn)

  t.deepEqual(
    findMyWay.find('/test/hello/world/hel%"Flo/blah'),
    null
  )
})

test('safe decodeURIComponent - wildcard', t => {
  t.plan(1)
  const findMyWay = FindMyWay()
  const fn = () => {}

  findMyWay.on('/test/*', fn)

  t.deepEqual(
    findMyWay.find('/test/hel%"Flo'),
    null
  )
})
