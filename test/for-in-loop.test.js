'use strict'

/* eslint no-extend-native: off */

const { test } = require('node:test')

// Something could extend the Array prototype
Array.prototype.test = null
test('for-in-loop', t => {
  t.assert.doesNotThrow(() => {
    require('../')
  })
})

test('ignore inherited constraint keys', t => {
  const findMyWay = require('../')()
  const constraints = Object.create({ tap: true })

  t.assert.doesNotThrow(() => {
    findMyWay.on('GET', '/test', { constraints }, () => {})
  })
})

test('handles Object.prototype extensions gracefully', t => {
  Object.prototype.tap = function (fn) { fn(this); return this }

  const findMyWay = require('../')()

  t.assert.doesNotThrow(() => {
    findMyWay.on('GET', '/test', () => {})
    findMyWay.on('GET', '/test-version', { constraints: { version: '1.0.0' } }, () => {})
  })

  t.assert.throws(() => {
    findMyWay.on('GET', '/test-invalid', { constraints: { tap: 'invalid' } }, () => {})
  }, /No strategy registered for constraint key tap/)

  delete Object.prototype.tap
})
