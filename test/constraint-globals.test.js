'use strict'

// The constraint matcher is compiled with new Function, whose body is sloppy
// mode: an undeclared variable there silently becomes a global. This test
// lives in its own file so the global snapshot is not polluted by other tests.

const { test } = require('node:test')
const FindMyWay = require('..')

test('Constrained lookups do not leak globals', t => {
  t.plan(2)

  const findMyWay = FindMyWay()
  const versioned = () => {}

  findMyWay.on('GET', '/', { constraints: { version: '1.2.0' } }, versioned)
  findMyWay.on('GET', '/', { constraints: { host: 'fastify.io' } }, () => {})

  const globalsBefore = Object.keys(globalThis)
  t.assert.equal(findMyWay.find('GET', '/', { version: '1.x', host: 'fastify.io' }).handler, versioned)
  t.assert.deepEqual(Object.keys(globalThis), globalsBefore)
})
