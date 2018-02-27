'use strict'

const t = require('tap')
const factory = require('../')

t.test('issue-63', (t) => {
  t.plan(1)
  const fmw = factory()

  fmw.on('GET', '/foo/:id(a', function () {})
})
