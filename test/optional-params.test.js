'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('Test route with optional parameter', (t) => {
  t.plan(2)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/a/:param/b/:optional?', (req, res, params) => {
    if (params.optional) {
      t.equal(params.optional, 'foo')
    } else {
      t.equal(params.optional, undefined)
    }
  })

  findMyWay.lookup({ method: 'GET', url: '/a/foo-bar/b', headers: {} }, null)
  findMyWay.lookup({ method: 'GET', url: '/a/foo-bar/b/foo', headers: {} }, null)
})

test('Test for duplicate route with optional param', (t) => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/foo/:bar?', (req, res, params) => {})

  try {
    findMyWay.on('GET', '/foo', (req, res, params) => {})
    t.fail('method is already declared for route with optional param')
  } catch (e) {
    t.is(e.message, 'Method \'GET\' already declared for route \'/foo\'')
  }
})

test('Test for param with ? not at the end', (t) => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  try {
    findMyWay.on('GET', '/foo/:bar?/baz', (req, res, params) => {})
    t.fail('Optional Param in the middle of the path is not allowed')
  } catch (e) {
    t.is(e.message, 'Optional Parameter needs to be the last parameter of the path')
  }
})

test('Multi parametric route with optional param', (t) => {
  t.plan(2)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/a/:p1-:p2?', (req, res, params) => {
    if (params.p1 && params.p2) {
      t.equal(params.p1, 'foo')
      t.equal(params.p2, 'bar-baz')
    }
  })

  findMyWay.lookup({ method: 'GET', url: '/a/foo-bar-baz', headers: {} }, null)
  // findMyWay.lookup({ method: 'GET', url: '/a/foo', headers: {} }, null)
  findMyWay.lookup({ method: 'GET', url: '/a', headers: {} }, null)
})

test('derigister a route with optional param', (t) => {
  t.plan(4)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/a/:param/b/:optional?', (req, res, params) => {})

  t.ok(findMyWay.find('GET', '/a/:param/b'))
  t.ok(findMyWay.find('GET', '/a/:param/b/:optional'))

  findMyWay.off('GET', '/a/:param/b/:optional?')

  t.notOk(findMyWay.find('GET', '/a/:param/b'))
  t.notOk(findMyWay.find('GET', '/a/:param/b/:optional'))
})