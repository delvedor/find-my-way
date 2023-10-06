'use strict'

const t = require('tap')
const test = t.test
const rfdc = require('rfdc')({ proto: true })
const FindMyWay = require('..')

function equalRouters (t, router1, router2) {
  t.strictSame(router1._opts, router2._opts)
  t.same(router1.routes, router2.routes)
  t.same(router1.trees, router2.trees)

  t.strictSame(
    router1.constrainer.strategies,
    router2.constrainer.strategies
  )
  t.strictSame(
    router1.constrainer.strategiesInUse,
    router2.constrainer.strategiesInUse
  )
  t.strictSame(
    router1.constrainer.asyncStrategiesInUse,
    router2.constrainer.asyncStrategiesInUse
  )
}

test('findRoute returns null if there is no routes', t => {
  t.plan(7)

  const findMyWay = FindMyWay()
  const fundMyWayClone = rfdc(findMyWay)

  const route = findMyWay.findRoute('GET', '/example')
  t.equal(route, null)

  equalRouters(t, findMyWay, fundMyWayClone)
})

test('findRoute returns handler and store for a static route', t => {
  t.plan(8)

  const findMyWay = FindMyWay()

  const handler = () => {}
  const store = { hello: 'world' }
  findMyWay.on('GET', '/example', handler, store)

  const fundMyWayClone = rfdc(findMyWay)

  const route = findMyWay.findRoute('GET', '/example')
  t.equal(route.handler, handler)
  t.equal(route.store, store)

  equalRouters(t, findMyWay, fundMyWayClone)
})

test('findRoute returns null for a static route', t => {
  t.plan(7)

  const findMyWay = FindMyWay()

  const handler = () => {}
  findMyWay.on('GET', '/example', handler)

  const fundMyWayClone = rfdc(findMyWay)

  const route = findMyWay.findRoute('GET', '/example1')
  t.equal(route, null)

  equalRouters(t, findMyWay, fundMyWayClone)
})

test('findRoute returns handler for a parametric route', t => {
  t.plan(7)

  const findMyWay = FindMyWay()

  const handler = () => {}
  findMyWay.on('GET', '/:param', handler)

  const fundMyWayClone = rfdc(findMyWay)

  const route = findMyWay.findRoute('GET', '/:param')
  t.equal(route.handler, handler)

  equalRouters(t, findMyWay, fundMyWayClone)
})

test('findRoute returns null for a parametric route', t => {
  t.plan(7)

  const findMyWay = FindMyWay()

  const handler = () => {}
  findMyWay.on('GET', '/foo/:param', handler)

  const fundMyWayClone = rfdc(findMyWay)

  const route = findMyWay.findRoute('GET', '/bar/:param')
  t.equal(route, null)

  equalRouters(t, findMyWay, fundMyWayClone)
})

test('findRoute returns handler for a parametric route with static suffix', t => {
  t.plan(7)

  const findMyWay = FindMyWay()

  const handler = () => {}
  findMyWay.on('GET', '/:param-static', handler)

  const fundMyWayClone = rfdc(findMyWay)

  const route = findMyWay.findRoute('GET', '/:param-static')
  t.equal(route.handler, handler)

  equalRouters(t, findMyWay, fundMyWayClone)
})

test('findRoute returns null for a parametric route with static suffix', t => {
  t.plan(7)

  const findMyWay = FindMyWay()
  findMyWay.on('GET', '/:param-static1', () => {})

  const fundMyWayClone = rfdc(findMyWay)

  const route = findMyWay.findRoute('GET', '/:param-static2')
  t.equal(route, null)

  equalRouters(t, findMyWay, fundMyWayClone)
})

test('findRoute returns handler even if a param name different', t => {
  t.plan(7)

  const findMyWay = FindMyWay()

  const handler = () => {}
  findMyWay.on('GET', '/:param1', handler)

  const fundMyWayClone = rfdc(findMyWay)

  const route = findMyWay.findRoute('GET', '/:param2')
  t.equal(route.handler, handler)

  equalRouters(t, findMyWay, fundMyWayClone)
})

test('findRoute returns handler for a multi-parametric route', t => {
  t.plan(7)

  const findMyWay = FindMyWay()

  const handler = () => {}
  findMyWay.on('GET', '/:param1-:param2', handler)

  const fundMyWayClone = rfdc(findMyWay)

  const route = findMyWay.findRoute('GET', '/:param1-:param2')
  t.equal(route.handler, handler)

  equalRouters(t, findMyWay, fundMyWayClone)
})

test('findRoute returns null for a multi-parametric route', t => {
  t.plan(7)

  const findMyWay = FindMyWay()
  findMyWay.on('GET', '/foo/:param1-:param2/bar1', () => {})

  const fundMyWayClone = rfdc(findMyWay)

  const route = findMyWay.findRoute('GET', '/foo/:param1-:param2/bar2')
  t.equal(route, null)

  equalRouters(t, findMyWay, fundMyWayClone)
})

test('findRoute returns handler for a regexp route', t => {
  t.plan(7)

  const findMyWay = FindMyWay()

  const handler = () => {}
  findMyWay.on('GET', '/:param(^\\d+$)', handler)

  const fundMyWayClone = rfdc(findMyWay)

  const route = findMyWay.findRoute('GET', '/:param(^\\d+$)')
  t.equal(route.handler, handler)

  equalRouters(t, findMyWay, fundMyWayClone)
})

test('findRoute returns null for a regexp route', t => {
  t.plan(7)

  const findMyWay = FindMyWay()
  findMyWay.on('GET', '/:file(^\\S+).png', () => {})

  const fundMyWayClone = rfdc(findMyWay)

  const route = findMyWay.findRoute('GET', '/:file(^\\D+).png')
  t.equal(route, null)

  equalRouters(t, findMyWay, fundMyWayClone)
})

test('findRoute returns handler for a wildcard route', t => {
  t.plan(7)

  const findMyWay = FindMyWay()

  const handler = () => {}
  findMyWay.on('GET', '/example/*', handler)

  const fundMyWayClone = rfdc(findMyWay)

  const route = findMyWay.findRoute('GET', '/example/*')
  t.equal(route.handler, handler)

  equalRouters(t, findMyWay, fundMyWayClone)
})

test('findRoute returns null for a wildcard route', t => {
  t.plan(7)

  const findMyWay = FindMyWay()
  findMyWay.on('GET', '/foo1/*', () => {})

  const fundMyWayClone = rfdc(findMyWay)

  const route = findMyWay.findRoute('GET', '/foo2/*')
  t.equal(route, null)

  equalRouters(t, findMyWay, fundMyWayClone)
})

test('findRoute returns handler for a constrained route', t => {
  t.plan(9)

  const findMyWay = FindMyWay()

  const handler = () => {}
  findMyWay.on('GET', '/example', { constraints: { version: '1.0.0' } }, handler)

  const fundMyWayClone = rfdc(findMyWay)

  {
    const route = findMyWay.findRoute('GET', '/example')
    t.equal(route, null)
  }

  {
    const route = findMyWay.findRoute('GET', '/example', { version: '1.0.0' })
    t.equal(route.handler, handler)
  }

  {
    const route = findMyWay.findRoute('GET', '/example', { version: '2.0.0' })
    t.equal(route, null)
  }

  equalRouters(t, findMyWay, fundMyWayClone)
})
