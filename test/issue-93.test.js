'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')
const noop = () => {}

test('Should keep semver store when split node', t => {
  t.plan(4)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/t1', { constraints: { version: '1.0.0' } }, noop)
  findMyWay.on('GET', '/t2', { constraints: { version: '2.1.0' } }, noop)

  t.ok(findMyWay.find('GET', '/t1', { version: '1.0.0' }))
  t.ok(findMyWay.find('GET', '/t2', { version: '2.x' }))
  t.notOk(findMyWay.find('GET', '/t1', { version: '2.x' }))
  t.notOk(findMyWay.find('GET', '/t2', { version: '1.0.0' }))
})
