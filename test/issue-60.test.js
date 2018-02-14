'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')
const noop = () => {}

test('issue-60', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/bb/', noop)
  findMyWay.on('GET', '/bb/bulk', noop)

  t.equal(findMyWay.find('GET', '/bulk'), null)
})
