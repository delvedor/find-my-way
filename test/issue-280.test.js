'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('Wildcard route match when regexp routes', (t) => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/:a(a)', () => {})
  findMyWay.on('GET', '/*', () => {})

  t.ok(findMyWay.find('GET', '/b', {}))
})
