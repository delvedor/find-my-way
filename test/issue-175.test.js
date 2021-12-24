'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('..')

test('double colon is replaced with single colon, no parameters', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: () => t.fail('should not be default route')
  })

  function handler (req, res, params) {
    t.same(params, {})
  }

  findMyWay.on('GET', '/name::customVerb', handler)

  findMyWay.lookup({ method: 'GET', url: '/name:customVerb' }, null)
})

test('exactly one match for static route with colon', t => {
  t.plan(2)
  const findMyWay = FindMyWay()

  function handler () {}
  findMyWay.on('GET', '/name::customVerb', handler)

  t.equal(findMyWay.find('GET', '/name:customVerb').handler, handler)
  t.equal(findMyWay.find('GET', '/name:test'), null)
})

test('double colon is replaced with single colon, no parameters, same parent node name', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: () => t.fail('should not be default route')
  })

  findMyWay.on('GET', '/name', () => {
    t.fail('should not be parent route')
  })

  findMyWay.on('GET', '/name::customVerb', (req, res, params) => {
    t.same(params, {})
  })

  findMyWay.lookup({ method: 'GET', url: '/name:customVerb', headers: {} }, null)
})

test('double colon is replaced with single colon, default route, same parent node name', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: () => t.ok('should be default route')
  })

  findMyWay.on('GET', '/name', () => {
    t.fail('should not be parent route')
  })

  findMyWay.on('GET', '/name::customVerb', () => {
    t.fail('should not be child route')
  })

  findMyWay.lookup({ method: 'GET', url: '/name:wrongCustomVerb', headers: {} }, null)
})

test('double colon is replaced with single colon, with parameters', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: () => t.fail('should not be default route')
  })

  findMyWay.on('GET', '/name1::customVerb1/:param1/name2::customVerb2:param2', (req, res, params) => {
    t.same(params, {
      param1: 'value1',
      param2: 'value2'
    })
  })

  findMyWay.lookup({ method: 'GET', url: '/name1:customVerb1/value1/name2:customVerb2value2', headers: {} }, null)
})
