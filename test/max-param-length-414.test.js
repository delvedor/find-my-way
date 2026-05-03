'use strict'

const { test } = require('node:test')
const FindMyWay = require('../')

test('should return limit exceeded instead of null when param exceeds param length', t => {
  t.plan(2)
  const findMyWay = FindMyWay({})

  findMyWay.on('GET', '/user/:id', (req, res, params) => {})

  const shortParam = findMyWay.find('GET', '/user/sai')
  const longParam = findMyWay.find('GET', '/user/' + 'a'.repeat(101))

  t.assert.ok(shortParam, 'Short parameter should match the route')
  t.assert.ok(longParam instanceof Error, 'Long parameter should return an error')
})
