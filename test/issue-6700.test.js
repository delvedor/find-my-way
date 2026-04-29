'use strict'

const { test } = require('node:test')
const FindMyWay = require('../')

test('regex param route should not match an empty trailing segment', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: () => {
      t.assert.ok('route not matched')
    }
  })

  findMyWay.on('GET', '/users/:userId(^\\d+)', () => {
    t.assert.fail('regex route matched')
  })

  findMyWay.lookup({ method: 'GET', url: '/users/', headers: {} }, null)
})

test('find should return null for regex param route with an empty trailing segment', t => {
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/users/:userId(^\\d+)', () => {})

  t.assert.equal(findMyWay.find('GET', '/users/'), null)
})
