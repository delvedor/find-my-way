'use strict'

const { test } = require('node:test')
const FindMyWay = require('../')

test('should return null when maxParamLength is exceeded (current behavior)', t => {
  t.plan(1)
  const findMyWay = FindMyWay({ maxParamLength: 5 })
  findMyWay.on('GET', '/test/:param', () => 'param')
  
  const handle = findMyWay.find('GET', '/test/123456')
  t.assert.equal(handle, null)
})

test('should still match other routes if one parametric route exceeds maxParamLength (static)', t => {
  t.plan(2)
  const findMyWay = FindMyWay({ maxParamLength: 5 })
  findMyWay.on('GET', '/test/:param', () => 'param')
  findMyWay.on('GET', '/test/special', () => 'special')
  
  const handle = findMyWay.find('GET', '/test/special')
  t.assert.ok(handle)
  t.assert.equal(handle.handler(), 'special')
})

test('should fail to match any route if the only candidate exceeds maxParamLength', t => {
  t.plan(1)
  const findMyWay = FindMyWay({ maxParamLength: 5 })
  findMyWay.on('GET', '/test/:param', () => 'param')
  
  const handle = findMyWay.find('GET', '/test/123456789')
  t.assert.equal(handle, null)
})

test('should match wildcard if parametric exceeds maxParamLength', t => {
  t.plan(2)
  const findMyWay = FindMyWay({ maxParamLength: 5 })
  findMyWay.on('GET', '/test/:param', () => 'param')
  findMyWay.on('GET', '/test/*', () => 'wildcard')
  
  const handle = findMyWay.find('GET', '/test/123456789')
  t.assert.ok(handle)
  t.assert.equal(handle.handler(), 'wildcard')
})

test('should return custom onMaxParamLength handler if provided and no other route matches', t => {
  t.plan(2)
  const findMyWay = FindMyWay({ 
    maxParamLength: 5,
    onMaxParamLength: (path, req, res) => 'custom error'
  })
  findMyWay.on('GET', '/test/:param', () => 'param')
  
  const handle = findMyWay.find('GET', '/test/123456')
  t.assert.ok(handle)
  t.assert.equal(handle.handler(), 'custom error')
})
