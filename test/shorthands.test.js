'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('should support `.get` shorthand', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.get('/test', () => {
    t.ok('inside the handler')
  })

  findMyWay.lookup({ method: 'GET', url: '/test' }, null)
})

test('should support `.delete` shorthand', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.delete('/test', () => {
    t.ok('inside the handler')
  })

  findMyWay.lookup({ method: 'DELETE', url: '/test' }, null)
})

test('should support `.head` shorthand', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.head('/test', () => {
    t.ok('inside the handler')
  })

  findMyWay.lookup({ method: 'HEAD', url: '/test' }, null)
})

test('should support `.patch` shorthand', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.patch('/test', () => {
    t.ok('inside the handler')
  })

  findMyWay.lookup({ method: 'PATCH', url: '/test' }, null)
})

test('should support `.post` shorthand', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.post('/test', () => {
    t.ok('inside the handler')
  })

  findMyWay.lookup({ method: 'POST', url: '/test' }, null)
})

test('should support `.put` shorthand', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.put('/test', () => {
    t.ok('inside the handler')
  })

  findMyWay.lookup({ method: 'PUT', url: '/test' }, null)
})

test('should support `.options` shorthand', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.options('/test', () => {
    t.ok('inside the handler')
  })

  findMyWay.lookup({ method: 'OPTIONS', url: '/test' }, null)
})

test('should support `.trace` shorthand', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.trace('/test', () => {
    t.ok('inside the handler')
  })

  findMyWay.lookup({ method: 'TRACE', url: '/test' }, null)
})

test('should support `.connect` shorthand', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.connect('/test', () => {
    t.ok('inside the handler')
  })

  findMyWay.lookup({ method: 'CONNECT', url: '/test' }, null)
})
