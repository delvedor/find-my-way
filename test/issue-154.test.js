'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('..')
const noop = () => {}

test('Should throw when not sending a string', t => {
  t.plan(2)

  const findMyWay = FindMyWay()

  t.throws(() => {
    findMyWay.on('GET', '/t1', { version: undefined }, noop)
  })
  t.throws(() => {
    findMyWay.on('GET', '/t2', { version: null }, noop)
  })
})
