'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('route with matching regex', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: () => {
      t.fail('route not matched')
    }
  })

  findMyWay.on('GET', '/test/:id(^\\d+$)', () => {
    t.ok('regex match')
  })

  findMyWay.lookup({ method: 'GET', url: '/test/12' }, null)
})

test('route without matching regex', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: () => {
      t.ok('route not matched')
    }
  })

  findMyWay.on('GET', '/test/:id(^\\d+$)', () => {
    t.fail('regex match')
  })

  findMyWay.lookup({ method: 'GET', url: '/test/test' }, null)
})

test('nested route with matching regex', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: () => {
      t.fail('route not matched')
    }
  })

  findMyWay.on('GET', '/test/:id(^\\d+$)/hello', () => {
    t.ok('regex match')
  })

  findMyWay.lookup({ method: 'GET', url: '/test/12/hello' }, null)
})

test('mixed nested route with matching regex', t => {
  t.plan(2)
  const findMyWay = FindMyWay({
    defaultRoute: () => {
      t.fail('route not matched')
    }
  })

  findMyWay.on('GET', '/test/:id(^\\d+$)/hello/:world', (req, res, params) => {
    t.is(params.id, '12')
    t.is(params.world, 'world')
  })

  findMyWay.lookup({ method: 'GET', url: '/test/12/hello/world' }, null)
})

test('mixed nested route with double matching regex', t => {
  t.plan(2)
  const findMyWay = FindMyWay({
    defaultRoute: () => {
      t.fail('route not matched')
    }
  })

  findMyWay.on('GET', '/test/:id(^\\d+$)/hello/:world(^\\d+$)', (req, res, params) => {
    t.is(params.id, '12')
    t.is(params.world, '15')
  })

  findMyWay.lookup({ method: 'GET', url: '/test/12/hello/15' }, null)
})

test('mixed nested route without double matching regex', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: () => {
      t.ok('route not matched')
    }
  })

  findMyWay.on('GET', '/test/:id(^\\d+$)/hello/:world(^\\d+$)', (req, res, params) => {
    t.fail('route mathed')
  })

  findMyWay.lookup({ method: 'GET', url: '/test/12/hello/test' }, null)
})

test('route with an extension regex', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: () => {
      t.fail('route not matched')
    }
  })

  findMyWay.on('GET', '/test/:file(^\\d+).png', () => {
    t.ok('regex match')
  })

  findMyWay.lookup({ method: 'GET', url: '/test/12.png' }, null)
})

test('route with an extension regex - no match', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: () => {
      t.ok('route not matched')
    }
  })

  findMyWay.on('GET', '/test/:file(^\\d+).png', () => {
    t.fail('regex match')
  })

  findMyWay.lookup({ method: 'GET', url: '/test/aa.png' }, null)
})
