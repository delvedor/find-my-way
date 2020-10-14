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

  findMyWay.on('GET', '/foo/:bar?/baz', (req, res, params) => {
    // since we only support optional params at the end of the path, 'bar?' is our param name
    t.equal(params['bar?'], 'a')
  })

  findMyWay.lookup({ method: 'GET', url: '/foo/a/baz', headers: {} }, null)
})
