'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('case insensitive static routes of level 1', t => {
  t.plan(1)

  const findMyWay = FindMyWay({
    caseSensitive: false,
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/woo', (req, res, params) => {
    t.pass('we should be here')
  })

  findMyWay.lookup({ method: 'GET', url: '/WOO', headers: {} }, null)
})

test('case insensitive static routes of level 3', t => {
  t.plan(1)

  const findMyWay = FindMyWay({
    caseSensitive: false,
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/foo/bar/woo', (req, res, params) => {
    t.pass('we should be here')
  })

  findMyWay.lookup({ method: 'GET', url: '/Foo/bAR/WoO', headers: {} }, null)
})

test('parametric case insensitive', t => {
  t.plan(1)

  const findMyWay = FindMyWay({
    caseSensitive: false,
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/foo/:param', (req, res, params) => {
    t.equal(params.param, 'bar')
  })

  findMyWay.lookup({ method: 'GET', url: '/Foo/bAR', headers: {} }, null)
})
