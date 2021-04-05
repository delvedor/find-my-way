'use strict'

const http = require('http')
const t = require('tap')
const test = t.test
const FindMyWay = require('../')

t.test('should support shorthand', t => {
  t.plan(http.METHODS.length)

  for (var i in http.METHODS) {
    const m = http.METHODS[i]
    const methodName = m.toLowerCase()

    t.test('`.' + methodName + '`', t => {
      t.plan(1)
      const findMyWay = FindMyWay()

      findMyWay[methodName]('/test', () => {
        t.ok('inside the handler')
      })

      findMyWay.lookup({ method: m, url: '/test', headers: {} }, null)
    })
  }
})

test('should support `.all` shorthand', t => {
  t.plan(11)
  const findMyWay = FindMyWay()

  findMyWay.all('/test', () => {
    t.ok('inside the handler')
  })

  findMyWay.lookup({ method: 'GET', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'DELETE', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'HEAD', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'PATCH', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'POST', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'PUT', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'OPTIONS', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'TRACE', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'CONNECT', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'COPY', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'SUBSCRIBE', url: '/test', headers: {} }, null)
})

test('should support `.all` shorthand with non-standard http methods', t => {
  t.plan(13)
  const findMyWay = FindMyWay({ httpMethods: [].concat(http.METHODS, ['NONSTANDARDMETHOD']) })

  t.deepEquals(findMyWay.httpMethods.slice().sort(), [
    ...http.METHODS,
    'NONSTANDARDMETHOD'
  ].sort())

  findMyWay.all('/test', () => {
    t.ok('inside the handler')
  })

  findMyWay.lookup({ method: 'NONSTANDARDMETHOD', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'GET', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'DELETE', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'HEAD', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'PATCH', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'POST', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'PUT', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'OPTIONS', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'TRACE', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'CONNECT', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'COPY', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'SUBSCRIBE', url: '/test', headers: {} }, null)
})

test('should support built-in shorthands when using mixed custom methods', t => {
  t.plan(4)
  const findMyWay = FindMyWay({ httpMethods: ['GET', 'NONSTANDARDMETHOD'] })

  t.ok(findMyWay.httpMethods.indexOf('POST') < 0)

  // shorthand should throw because it's not amongst our list of httpMethods
  t.throws(() => {
    findMyWay.post('/test', () => {})
  })

  findMyWay.on('NONSTANDARDMETHOD', '/test', () => {
    t.ok('inside the NONSTANDARDMETHOD handler')
  })

  // should not throw because we registered a GET
  findMyWay.get('/test', () => {
    t.ok('inside the GET handler')
  })

  findMyWay.lookup({ method: 'NONSTANDARDMETHOD', url: '/test', headers: {} }, null)
  findMyWay.lookup({ method: 'GET', url: '/test', headers: {} }, null)
})
