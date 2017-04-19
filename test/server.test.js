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
