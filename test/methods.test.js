'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('the router is an object with methods', t => {
  t.plan(2)

  const findMyWay = FindMyWay()

  t.is(typeof findMyWay.on, 'function')
  t.is(typeof findMyWay.lookup, 'function')
})

test('register a routre', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test', () => {
    t.ok('inside the handler')
  })

  findMyWay.lookup('GET', '/test')
})

test('default route', t => {
  t.plan(1)

  const findMyWay = FindMyWay({
    defaultRoute: () => {
      t.ok('inside the default route')
    }
  })

  findMyWay.lookup('GET', '/test')
})

test('async handler', t => {
  t.plan(1)

  const findMyWay = FindMyWay({
    async: true
  })

  findMyWay.on('GET', '/test', (req, res, params) => {
    t.ok('inside async handler')
  })

  findMyWay.lookup('GET', '/test')
})

test('parametric route', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test/:id', (req, res, params) => {
    t.is(params.id, 'hello')
  })

  findMyWay.lookup('GET', '/test/hello')
})

test('multiple parametric route', t => {
  t.plan(2)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test/:id', (req, res, params) => {
    t.is(params.id, 'hello')
  })

  findMyWay.on('GET', '/other-test/:id', (req, res, params) => {
    t.is(params.id, 'world')
  })

  findMyWay.lookup('GET', '/test/hello')
  findMyWay.lookup('GET', '/other-test/world')
})

test('multiple parametric route with the same prefix', t => {
  t.plan(2)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test/:id', (req, res, params) => {
    t.is(params.id, 'hello')
  })

  findMyWay.on('GET', '/test/:id/world', (req, res, params) => {
    t.is(params.id, 'world')
  })

  findMyWay.lookup('GET', '/test/hello')
  findMyWay.lookup('GET', '/test/world/world')
})

test('nested parametric route', t => {
  t.plan(2)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test/:hello/test/:world', (req, res, params) => {
    t.is(params.hello, 'hello')
    t.is(params.world, 'world')
  })

  findMyWay.lookup('GET', '/test/hello/test/world')
})

test('wildcard', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test/*', (req, res, params) => {
    t.is(params['*'], 'hello')
  })

  findMyWay.lookup('GET', '/test/hello')
})

test('find should return the route', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test', { hello: 'world' })

  t.deepEqual(findMyWay.find('GET', '/test'), { handler: { hello: 'world' }, params: {} })
})

test('find should return the route with params', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test/:id', { hello: 'world' })

  t.deepEqual(findMyWay.find('GET', '/test/hello'), { handler: { hello: 'world' }, params: { id: 'hello' } })
})

test('find should return a null handler if the route does not exist', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  t.deepEqual(findMyWay.find('GET', '/test'), { handler: null, params: [] })
})
