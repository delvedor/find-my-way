'use strict'

const t = require('tap')
const test = t.test
const http = require('http')
const request = require('request')
const FindMyWay = require('../')

test('basic router with http server', t => {
  t.plan(7)
  const findMyWay = FindMyWay()
  findMyWay.on('GET', '/test', (req, res, params) => {
    t.ok(req)
    t.ok(res)
    t.ok(params)
    res.end(JSON.stringify({ hello: 'world' }))
  })

  const server = http.createServer((req, res) => {
    findMyWay.lookup(req, res)
  })

  server.listen(0, err => {
    t.error(err)
    server.unref()

    request({
      method: 'GET',
      uri: 'http://localhost:' + server.address().port + '/test'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('router with params with http server', t => {
  t.plan(7)
  const findMyWay = FindMyWay()
  findMyWay.on('GET', '/test/:id', (req, res, params) => {
    t.ok(req)
    t.ok(res)
    t.is(params.id, 'hello')
    res.end(JSON.stringify({ hello: 'world' }))
  })

  const server = http.createServer((req, res) => {
    findMyWay.lookup(req, res)
  })

  server.listen(0, err => {
    t.error(err)
    server.unref()

    request({
      method: 'GET',
      uri: 'http://localhost:' + server.address().port + '/test/hello'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.deepEqual(JSON.parse(body), { hello: 'world' })
    })
  })
})

test('default route', t => {
  t.plan(3)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      res.statusCode = 404
      res.end()
    }
  })

  const server = http.createServer((req, res) => {
    findMyWay.lookup(req, res)
  })

  server.listen(0, err => {
    t.error(err)
    server.unref()

    request({
      method: 'GET',
      uri: 'http://localhost:' + server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
    })
  })
})

test('default route is updated correctly', t => {
  t.plan(3)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      res.statusCode = 404
      res.end()
    }
  })

  findMyWay.setDefaultRoute((req, res) => {
    res.statusCode = 200
    res.end()
  })

  const server = http.createServer((req, res) => {
    findMyWay.lookup(req, res)
  })

  server.listen(0, err => {
    t.error(err)
    server.unref()

    request({
      method: 'GET',
      uri: 'http://localhost:' + server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
    })
  })
})

test('automatic default route', t => {
  t.plan(3)
  const findMyWay = FindMyWay()

  const server = http.createServer((req, res) => {
    findMyWay.lookup(req, res)
  })

  server.listen(0, err => {
    t.error(err)
    server.unref()

    request({
      method: 'GET',
      uri: 'http://localhost:' + server.address().port
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
    })
  })
})

test('maps two routes when trailing slash should be trimmed', t => {
  t.plan(25)
  const findMyWay = FindMyWay({
    ignoreTrailingSlash: true
  })

  findMyWay.on('GET', '/test/', (req, res, params) => {
    t.ok(req)
    t.ok(res)
    t.ok(params)
    res.end('test')
  })

  findMyWay.on('GET', '/othertest', (req, res, params) => {
    t.ok(req)
    t.ok(res)
    t.ok(params)
    res.end('othertest')
  })

  const server = http.createServer((req, res) => {
    findMyWay.lookup(req, res)
  })

  server.listen(0, err => {
    t.error(err)
    server.unref()

    const baseURL = 'http://localhost:' + server.address().port

    request({
      method: 'GET',
      uri: baseURL + '/test/'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(body, 'test')
    })

    request({
      method: 'GET',
      uri: baseURL + '/test'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(body, 'test')
    })

    request({
      method: 'GET',
      uri: baseURL + '/othertest'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(body, 'othertest')
    })

    request({
      method: 'GET',
      uri: baseURL + '/othertest/'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(body, 'othertest')
    })
  })
})

test('does not trim trailing slash when ignoreTrailingSlash is false', t => {
  t.plan(9)
  const findMyWay = FindMyWay({
    ignoreTrailingSlash: false
  })

  findMyWay.on('GET', '/test/', (req, res, params) => {
    t.ok(req)
    t.ok(res)
    t.ok(params)
    res.end('test')
  })

  const server = http.createServer((req, res) => {
    findMyWay.lookup(req, res)
  })

  server.listen(0, err => {
    t.error(err)
    server.unref()

    const baseURL = 'http://localhost:' + server.address().port

    request({
      method: 'GET',
      uri: baseURL + '/test/'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(body, 'test')
    })

    request({
      method: 'GET',
      uri: baseURL + '/test'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
    })
  })
})

test('does not map // when ignoreTrailingSlash is true', t => {
  t.plan(9)
  const findMyWay = FindMyWay({
    ignoreTrailingSlash: false
  })

  findMyWay.on('GET', '/', (req, res, params) => {
    t.ok(req)
    t.ok(res)
    t.ok(params)
    res.end('test')
  })

  const server = http.createServer((req, res) => {
    findMyWay.lookup(req, res)
  })

  server.listen(0, err => {
    t.error(err)
    server.unref()

    const baseURL = 'http://localhost:' + server.address().port

    request({
      method: 'GET',
      uri: baseURL + '/'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
      t.strictEqual(body, 'test')
    })

    request({
      method: 'GET',
      uri: baseURL + '//'
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
    })
  })
})

test('versioned routes', t => {
  t.plan(5)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test', { version: '1.2.3' }, (req, res, params) => {
    res.end('ok')
  })

  const server = http.createServer((req, res) => {
    findMyWay.lookup(req, res)
  })

  server.listen(0, err => {
    t.error(err)
    server.unref()

    request({
      method: 'GET',
      uri: 'http://localhost:' + server.address().port + '/test',
      headers: { 'Accept-Version': '1.x' }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 200)
    })

    request({
      method: 'GET',
      uri: 'http://localhost:' + server.address().port + '/test',
      headers: { 'Accept-Version': '2.x' }
    }, (err, response, body) => {
      t.error(err)
      t.strictEqual(response.statusCode, 404)
    })
  })
})
