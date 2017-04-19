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

  findMyWay.lookup({ method: 'GET', url: '/test?hello=world' }, null)
})

test('should sanitize the url - hash', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test', (req, res, params) => {
    t.ok('inside the handler')
  })

  findMyWay.lookup({ method: 'GET', url: '/test#hello' }, null)
})
