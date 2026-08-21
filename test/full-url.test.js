'use strict'

const { test } = require('node:test')
const http = require('node:http')
const FindMyWay = require('../')

test('full-url', t => {
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.assert.fail('Should not be defaultRoute')
    }
  })

  const rootHandler = () => {}
  const adminHandler = () => {}

  findMyWay.on('GET', '/', rootHandler)
  findMyWay.on('GET', '/admin', adminHandler)

  findMyWay.on('GET', '/a', (req, res) => {
    res.end('{"message":"hello world"}')
  })

  findMyWay.on('GET', '/a/:id', (req, res) => {
    res.end('{"message":"hello world"}')
  })

  t.assert.deepEqual(findMyWay.find('GET', 'http://localhost/a', { host: 'localhost' }), findMyWay.find('GET', '/a', { host: 'localhost' }))
  t.assert.deepEqual(findMyWay.find('GET', 'http://localhost:8080/a', { host: 'localhost' }), findMyWay.find('GET', '/a', { host: 'localhost' }))
  t.assert.deepEqual(findMyWay.find('GET', 'http://123.123.123.123/a', {}), findMyWay.find('GET', '/a', {}))
  t.assert.deepEqual(findMyWay.find('GET', 'https://localhost/a', { host: 'localhost' }), findMyWay.find('GET', '/a', { host: 'localhost' }))

  t.assert.deepEqual(findMyWay.find('GET', 'http://localhost/a/100', { host: 'localhost' }), findMyWay.find('GET', '/a/100', { host: 'localhost' }))
  t.assert.deepEqual(findMyWay.find('GET', 'http://localhost:8080/a/100', { host: 'localhost' }), findMyWay.find('GET', '/a/100', { host: 'localhost' }))
  t.assert.deepEqual(findMyWay.find('GET', 'http://123.123.123.123/a/100', {}), findMyWay.find('GET', '/a/100', {}))
  t.assert.deepEqual(findMyWay.find('GET', 'https://localhost/a/100', { host: 'localhost' }), findMyWay.find('GET', '/a/100', { host: 'localhost' }))

  for (const url of [
    'http://localhost?next=/admin',
    'https://localhost?next=/admin',
    'HTTP://localhost?next=/admin'
  ]) {
    const match = findMyWay.find('GET', url, { host: 'localhost' })
    t.assert.equal(match.handler, rootHandler)
    t.assert.notEqual(match.handler, adminHandler)
    t.assert.deepEqual(match.searchParams, { next: '/admin' })
  }

  t.assert.deepEqual(
    findMyWay.find('GET', 'http://localhost?next=//admin/settings&return=/', { host: 'localhost' }),
    findMyWay.find('GET', '/?next=//admin/settings&return=/', { host: 'localhost' })
  )
  t.assert.deepEqual(
    findMyWay.find('GET', 'http://localhost/?next=/admin', { host: 'localhost' }),
    findMyWay.find('GET', '/?next=/admin', { host: 'localhost' })
  )
  t.assert.deepEqual(
    findMyWay.find('GET', 'http://localhost', { host: 'localhost' }),
    findMyWay.find('GET', '/', { host: 'localhost' })
  )
})

test('lookup preserves the query of an absolute-form target with an empty path', t => {
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/', (req, res, params, store, searchParams) => searchParams)
  findMyWay.on('GET', '/admin', () => {
    t.assert.fail('query data must not select the admin route')
  })

  const searchParams = findMyWay.lookup({
    method: 'GET',
    url: 'http://example.test?next=/admin',
    headers: { host: 'example.test' }
  }, null)

  t.assert.deepEqual(searchParams, { next: '/admin' })
})

test('an HTTP server routes an absolute-form target with an empty path to root', async t => {
  const findMyWay = FindMyWay()
  const requestTarget = 'http://example.test?next=/admin'

  findMyWay.on('GET', '/', (req, res, params, store, searchParams) => {
    t.assert.equal(req.url, requestTarget)
    res.end(JSON.stringify({ route: 'root', searchParams }))
  })
  findMyWay.on('GET', '/admin', (req, res) => {
    res.end(JSON.stringify({ route: 'admin' }))
  })

  const server = http.createServer((req, res) => findMyWay.lookup(req, res))
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  t.after(() => new Promise(resolve => server.close(resolve)))

  const response = await new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port: server.address().port,
      path: requestTarget,
      headers: { host: 'example.test' }
    }, res => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', chunk => { body += chunk })
      res.on('end', () => resolve({ statusCode: res.statusCode, body }))
    })
    req.on('error', reject)
    req.end()
  })

  t.assert.equal(response.statusCode, 200)
  t.assert.deepEqual(JSON.parse(response.body), {
    route: 'root',
    searchParams: { next: '/admin' }
  })
})

test('invalid HTTP absolute-form targets use the bad URL handler', t => {
  let badUrl
  const findMyWay = FindMyWay({
    onBadUrl: url => {
      badUrl = url
    }
  })

  findMyWay.on('GET', '/admin', () => {
    t.assert.fail('an invalid absolute-form target must not select the admin route')
  })

  for (const url of [
    'http:///admin',
    'http://localhost#next=/admin',
    'http://localhost:invalid/admin'
  ]) {
    const match = findMyWay.find('GET', url)
    findMyWay.callHandler(match, null, null)
    t.assert.equal(badUrl, url)
  }
})
