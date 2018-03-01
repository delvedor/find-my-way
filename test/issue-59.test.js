'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')
const noop = () => {}

test('single-character prefix', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/b/', noop)
  findMyWay.on('GET', '/b/bulk', noop)

  t.equal(findMyWay.find('GET', '/bulk'), null)
})

test('multi-character prefix', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/bu/', noop)
  findMyWay.on('GET', '/bu/bulk', noop)

  t.equal(findMyWay.find('GET', '/bulk'), null)
})
