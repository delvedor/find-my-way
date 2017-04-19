'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('Method should be a string', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  try {
    findMyWay.on(0, '/test', () => {})
  } catch (e) {
    t.is(e.message, 'Method should be a string')
  }
})

test('Path should be a string', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  try {
    findMyWay.on('GET', 0, () => {})
  } catch (e) {
    t.is(e.message, 'Path should be a string')
  }
})

test('Handler should be a function', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  try {
    findMyWay.on('GET', '/test', 0)
  } catch (e) {
    t.is(e.message, 'Handler should be a function')
  }
})

test('Method is not an http method.', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  try {
    findMyWay.on('GETT', '/test', () => {})
  } catch (e) {
    t.is(e.message, 'Method \'GETT\' is not an http method.')
  }
})

test('The default route must be a function', t => {
  t.plan(1)
  try {
    FindMyWay({
      defaultRoute: '/404'
    })
  } catch (e) {
    t.is(e.message, 'The default route must be a function')
  }
})

test('Method already declared', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test', () => {})
  try {
    findMyWay.on('GET', '/test', () => {})
  } catch (e) {
    t.is(e.message, `Method 'GET' already declared for route 'test'`)
  }
})

test('Method already declared nested route', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test', () => {})
  findMyWay.on('GET', '/test/hello', () => {})
  findMyWay.on('GET', '/test/world', () => {})

  try {
    findMyWay.on('GET', '/test/hello', () => {})
  } catch (e) {
    t.is(e.message, `Method 'GET' already declared for route 'hello'`)
  }
})
