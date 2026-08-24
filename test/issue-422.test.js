'use strict'

const { test } = require('node:test')
const assert = require('node:assert')
const FindMyWay = require('../')

test('parametric route /:id should not match /', (t) => {
  let defaultRouteCalled = false
  const router = FindMyWay({
    defaultRoute: (req, res) => {
      defaultRouteCalled = true
    }
  })

  router.on('GET', '/:id', (req, res, params) => {
    console.log('Params:', params)
  })

  router.lookup({ method: 'GET', url: '/' }, {})
  assert.strictEqual(defaultRouteCalled, true, 'defaultRoute should be called')
})
