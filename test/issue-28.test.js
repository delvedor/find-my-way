'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('wildcard (more complex test)', t => {
  t.plan(3)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('we should not be here, the url is: ' + req.url)
    }
  })

  findMyWay.on('GET', '/test/*', (req, res, params) => {
    switch (params['*']) {
      case 'hello':
        t.ok('correct parameter')
        break
      case 'hello/world':
        t.ok('correct parameter')
        break
      case '':
        t.ok('correct parameter')
        break
      default:
        t.fail('wrong parameter: ' + params['*'])
    }
  })

  findMyWay.lookup(
    { method: 'GET', url: '/test/hello' },
    null
  )

  findMyWay.lookup(
    { method: 'GET', url: '/test/hello/world' },
    null
  )

  findMyWay.lookup(
    { method: 'GET', url: '/test/' },
    null
  )
})

test('Wildcard inside a node with a static route but different method', t => {
  t.plan(2)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('we should not be here, the url is: ' + req.url)
    }
  })

  findMyWay.on('GET', '/test/hello', (req, res, params) => {
    t.is(req.method, 'GET')
  })

  findMyWay.on('OPTIONS', '/*', (req, res, params) => {
    t.is(req.method, 'OPTIONS')
  })

  findMyWay.lookup(
    { method: 'GET', url: '/test/hello' },
    null
  )

  findMyWay.lookup(
    { method: 'OPTIONS', url: '/test/hello' },
    null
  )
})

test('Wildcard inside a node with a static route but different method (more complex case)', t => {
  t.plan(5)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      if (req.url === '/test/helloo' && req.method === 'GET') {
        t.ok('Everything fine')
      } else {
        t.fail('we should not be here, the url is: ' + req.url)
      }
    }
  })

  findMyWay.on('GET', '/test/hello', (req, res, params) => {
    t.is(req.method, 'GET')
  })

  findMyWay.on('OPTIONS', '/*', (req, res, params) => {
    t.is(req.method, 'OPTIONS')
  })

  findMyWay.lookup(
    { method: 'GET', url: '/test/hello' },
    null
  )

  findMyWay.lookup(
    { method: 'GET', url: '/test/helloo' },
    null
  )

  findMyWay.lookup(
    { method: 'OPTIONS', url: '/test/' },
    null
  )

  findMyWay.lookup(
    { method: 'OPTIONS', url: '/test' },
    null
  )

  findMyWay.lookup(
    { method: 'OPTIONS', url: '/test/helloo' },
    null
  )
})
