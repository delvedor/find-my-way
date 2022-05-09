'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('should sanitize the url - query', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test', (req, res, params) => {
    t.ok('inside the handler')
  })

  findMyWay.lookup({ method: 'GET', url: '/test?hello=world', headers: {} }, null)
})

test('should sanitize the url - hash', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test', (req, res, params) => {
    t.ok('inside the handler')
  })

  findMyWay.lookup({ method: 'GET', url: '/test#hello', headers: {} }, null)
})

test('handles path and query separated by ;', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test', (req, res, params) => {
    t.ok('inside the handler')
  })

  findMyWay.lookup({ method: 'GET', url: '/test;jsessionid=123456', headers: {} }, null)
})

test('wildcard node with querystring', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/*', (req, res, params) => {
    t.same(params, { '*': 'test' })
  })

  findMyWay.lookup({ method: 'GET', url: '/test;jsessionid=123456', headers: {} }, null)
})

test('parametric node with querystring', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/:param', (req, res, params) => {
    t.same(params, { param: 'test' })
  })

  findMyWay.lookup({ method: 'GET', url: '/test;jsessionid=123456', headers: {} }, null)
})
