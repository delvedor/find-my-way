'use strict'

// The router keeps the first four parameter values of a lookup in locals and
// spills any further ones into an array. These tests exercise routes that
// cross that boundary, including when backtracking has to discard values.

const { test } = require('node:test')
const FindMyWay = require('../')

test('route with more than four parameters', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/:a/:b/:c/:d/:e/:f', () => {})

  t.assert.deepEqual(findMyWay.find('GET', '/1/2/3/4/5/6').params, {
    a: '1', b: '2', c: '3', d: '4', e: '5', f: '6'
  })
})

test('route with more than four parameters and a wildcard', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/:a/:b/:c/:d/:e/*', () => {})

  t.assert.deepEqual(findMyWay.find('GET', '/1/2/3/4/5/six/seven').params, {
    a: '1', b: '2', c: '3', d: '4', e: '5', '*': 'six/seven'
  })
})

test('multi-parametric regex node with more than four captures', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/:a/:b/:c/:d(\\d+)-:e(\\d+)-:f(\\d+)', () => {})

  t.assert.deepEqual(findMyWay.find('GET', '/1/2/3/4-5-6').params, {
    a: '1', b: '2', c: '3', d: '4', e: '5', f: '6'
  })
})

test('backtracking discards parameter values past the fourth', t => {
  t.plan(2)
  const findMyWay = FindMyWay()

  // The first route is tried first and collects six parameters before its
  // regex fails on the last segment; the second route must then see a
  // params object built only from its own five values.
  findMyWay.on('GET', '/:a/:b/:c/:d/:e/:f(\\d+)', () => {})
  findMyWay.on('GET', '/:a/:b/:c/:d/:e/*', () => {})

  t.assert.deepEqual(findMyWay.find('GET', '/1/2/3/4/5/6').params, {
    a: '1', b: '2', c: '3', d: '4', e: '5', f: '6'
  })
  t.assert.deepEqual(findMyWay.find('GET', '/1/2/3/4/5/six').params, {
    a: '1', b: '2', c: '3', d: '4', e: '5', '*': 'six'
  })
})

test('parameter names that need quoting in generated code', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/:it\'s/:back\\slash', () => {})

  t.assert.deepEqual(findMyWay.find('GET', '/a/b').params, {
    "it's": 'a',
    'back\\slash': 'b'
  })
})
