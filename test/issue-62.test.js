'use strict'

const t = require('tap')
const factory = require('../')

const noop = function () {}

t.test('multi-character prefix', (t) => {
  t.plan(2)

  const fmw = factory()

  fmw.on('GET', '/foo/:id(([a-f0-9]{3},?)+)', noop)

  t.notOk(fmw.find('GET', '/foo/qwerty'), null)
  t.ok(fmw.find('GET', '/foo/bac,1ea'))
})
