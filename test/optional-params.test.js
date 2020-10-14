'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('Test route with optional parameter', t => {
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
