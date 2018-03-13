'use strict'

const t = require('tap')
const factory = require('../')

const noop = function () {}

t.test('issue-62', (t) => {
  t.plan(2)

  const fmw = factory()

  fmw.on('GET', '/foo/:id(([a-f0-9]{3},?)+)', noop)

  t.notOk(fmw.find('GET', '/foo/qwerty'))
  t.ok(fmw.find('GET', '/foo/bac,1ea'))
})

t.test('issue-62 - escape chars', (t) => {
  const fmw = factory()

  t.plan(2)

  fmw.get('/foo/:param(\\([a-f0-9]{3}\\))', noop)

  t.notOk(fmw.find('GET', '/foo/abc'))
  t.ok(fmw.find('GET', '/foo/(abc)'))
})
