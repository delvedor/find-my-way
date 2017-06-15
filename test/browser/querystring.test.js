'use strict'

require('./location')
const t = require('tap')
const test = t.test
const FindMyWay = require('../../browser')

test('should sanitize the url - query', t => {
  t.plan(2)
  const findMyWay = FindMyWay()

  findMyWay.on('/test', (route) => {
    t.is(route.query.hello, 'world')
    t.ok('inside the handler')
  })

  findMyWay.lookup('/test?hello=world')
})

test('should sanitize the url - hash', t => {
  t.plan(2)
  const findMyWay = FindMyWay()

  findMyWay.on('/test', (route) => {
    t.is(route.hash.hello, 'world')
    t.ok('inside the handler')
  })

  findMyWay.lookup('/test#hello=world')
})
