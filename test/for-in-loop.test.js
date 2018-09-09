/* eslint-disable */
'use strict'

const t = require('tap')
const test = t.test

test('should not throw', t => {
  t.plan(1)
  // Something could extend the Array prototype
  Array.prototype.test = null
  t.doesNotThrow(require('../'))
})
