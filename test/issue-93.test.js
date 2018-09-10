'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')
const noop = () => {}

test('Should keep semver store when split node', t => {
  t.plan(1)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/t1', { version: '0.1.0' }, noop)
  findMyWay.on('GET', '/t2', { version: '0.1.0' }, noop)

  t.ok(findMyWay.find('GET', '/t1', '0.1.0'))
})
