'use strict'

const {test} = require('tap')
const FindMyWay = require('../')
const noop = () => {}

test('issue-63', (t) => {
  t.plan(1)
  const findMyWay = FindMyWay()

  find.on('GET', '/foo/:id(a', noop)
})
