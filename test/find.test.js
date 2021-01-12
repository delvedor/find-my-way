'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('..')

test('find calls can pass no constraints', t => {
  t.plan(3)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/a', () => {})
  findMyWay.on('GET', '/a/b', () => {})

  t.ok(findMyWay.find('GET', '/a', undefined))
  t.ok(findMyWay.find('GET', '/a/b', undefined))
  t.notOk(findMyWay.find('GET', '/a/b/c', undefined))
})
