'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')
const noop = () => {}

test('A route could support multiple versions (find) / 1', t => {
  t.plan(7)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/', { version: '1.2.3' }, noop)
  findMyWay.on('GET', '/', { version: '3.2.0' }, noop)

  t.ok(findMyWay.find('GET', '/', '1.x'))
  t.ok(findMyWay.find('GET', '/', '1.2.3'))
  t.ok(findMyWay.find('GET', '/', '3.x'))
  t.ok(findMyWay.find('GET', '/', '3.2.0'))
  t.notOk(findMyWay.find('GET', '/', '2.x'))
  t.notOk(findMyWay.find('GET', '/', '2.3.4'))
  t.notOk(findMyWay.find('GET', '/', '3.2.1'))
})

test('A route could support multiple versions (find) / 2', t => {
  t.plan(7)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test', { version: '1.2.3' }, noop)
  findMyWay.on('GET', '/test', { version: '3.2.0' }, noop)

  t.ok(findMyWay.find('GET', '/test', '1.x'))
  t.ok(findMyWay.find('GET', '/test', '1.2.3'))
  t.ok(findMyWay.find('GET', '/test', '3.x'))
  t.ok(findMyWay.find('GET', '/test', '3.2.0'))
  t.notOk(findMyWay.find('GET', '/test', '2.x'))
  t.notOk(findMyWay.find('GET', '/test', '2.3.4'))
  t.notOk(findMyWay.find('GET', '/test', '3.2.1'))
})

test('A route could support multiple versions (find) / 3', t => {
  t.plan(10)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test/:id/hello', { version: '1.2.3' }, noop)
  findMyWay.on('GET', '/test/:id/hello', { version: '3.2.0' }, noop)
  findMyWay.on('GET', '/test/name/hello', { version: '4.0.0' }, noop)

  t.ok(findMyWay.find('GET', '/test/1234/hello', '1.x'))
  t.ok(findMyWay.find('GET', '/test/1234/hello', '1.2.3'))
  t.ok(findMyWay.find('GET', '/test/1234/hello', '3.x'))
  t.ok(findMyWay.find('GET', '/test/1234/hello', '3.2.0'))
  t.ok(findMyWay.find('GET', '/test/name/hello', '4.x'))
  t.ok(findMyWay.find('GET', '/test/name/hello', '3.x'))
  t.notOk(findMyWay.find('GET', '/test/1234/hello', '2.x'))
  t.notOk(findMyWay.find('GET', '/test/1234/hello', '2.3.4'))
  t.notOk(findMyWay.find('GET', '/test/1234/hello', '3.2.1'))
  t.notOk(findMyWay.find('GET', '/test/1234/hello', '4.x'))
})

test('A route could support multiple versions (find) / 4', t => {
  t.plan(8)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test/*', { version: '1.2.3' }, noop)
  findMyWay.on('GET', '/test/hello', { version: '3.2.0' }, noop)

  t.ok(findMyWay.find('GET', '/test/1234/hello', '1.x'))
  t.ok(findMyWay.find('GET', '/test/1234/hello', '1.2.3'))
  t.ok(findMyWay.find('GET', '/test/hello', '3.x'))
  t.ok(findMyWay.find('GET', '/test/hello', '3.2.0'))
  t.notOk(findMyWay.find('GET', '/test/1234/hello', '3.2.0'))
  t.notOk(findMyWay.find('GET', '/test/1234/hello', '3.x'))
  t.notOk(findMyWay.find('GET', '/test/1234/hello', '2.x'))
  t.notOk(findMyWay.find('GET', '/test/hello', '2.x'))
})

test('A route could support multiple versions (find) / 5', t => {
  t.plan(1)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/', { version: '1.2.3' }, () => false)
  findMyWay.on('GET', '/', { version: '3.2.0' }, () => true)

  t.ok(findMyWay.find('GET', '/', '*').handler())
})

test('Find with a version but without versioned routes', t => {
  t.plan(1)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/', noop)

  t.notOk(findMyWay.find('GET', '/', '1.x'))
})

test('A route could support multiple versions (lookup)', t => {
  t.plan(7)

  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      const versions = ['2.x', '2.3.4', '3.2.1']
      t.ok(versions.indexOf(req.headers['accept-version']) > -1)
    }
  })

  findMyWay.on('GET', '/', { version: '1.2.3' }, (req, res) => {
    const versions = ['1.x', '1.2.3']
    t.ok(versions.indexOf(req.headers['accept-version']) > -1)
  })

  findMyWay.on('GET', '/', { version: '3.2.0' }, (req, res) => {
    const versions = ['3.x', '3.2.0']
    t.ok(versions.indexOf(req.headers['accept-version']) > -1)
  })

  findMyWay.lookup({
    method: 'GET',
    url: '/',
    headers: { 'accept-version': '1.x' }
  }, null)

  findMyWay.lookup({
    method: 'GET',
    url: '/',
    headers: { 'accept-version': '1.2.3' }
  }, null)

  findMyWay.lookup({
    method: 'GET',
    url: '/',
    headers: { 'accept-version': '3.x' }
  }, null)

  findMyWay.lookup({
    method: 'GET',
    url: '/',
    headers: { 'accept-version': '3.2.0' }
  }, null)

  findMyWay.lookup({
    method: 'GET',
    url: '/',
    headers: { 'accept-version': '2.x' }
  }, null)

  findMyWay.lookup({
    method: 'GET',
    url: '/',
    headers: { 'accept-version': '2.3.4' }
  }, null)

  findMyWay.lookup({
    method: 'GET',
    url: '/',
    headers: { 'accept-version': '3.2.1' }
  }, null)
})

test('It should always choose the highest version of a route', t => {
  t.plan(3)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/', { version: '2.3.0' }, (req, res) => {
    t.fail('We should not be here')
  })

  findMyWay.on('GET', '/', { version: '2.4.0' }, (req, res) => {
    t.pass('Yeah!')
  })

  findMyWay.on('GET', '/', { version: '3.3.0' }, (req, res) => {
    t.pass('Yeah!')
  })

  findMyWay.on('GET', '/', { version: '3.2.0' }, (req, res) => {
    t.fail('We should not be here')
  })

  findMyWay.on('GET', '/', { version: '3.2.2' }, (req, res) => {
    t.fail('We should not be here')
  })

  findMyWay.on('GET', '/', { version: '4.4.0' }, (req, res) => {
    t.fail('We should not be here')
  })

  findMyWay.on('GET', '/', { version: '4.3.2' }, (req, res) => {
    t.pass('Yeah!')
  })

  findMyWay.lookup({
    method: 'GET',
    url: '/',
    headers: { 'accept-version': '2.x' }
  }, null)

  findMyWay.lookup({
    method: 'GET',
    url: '/',
    headers: { 'accept-version': '3.x' }
  }, null)

  findMyWay.lookup({
    method: 'GET',
    url: '/',
    headers: { 'accept-version': '4.3.x' }
  }, null)
})

test('Declare the same route with and without version', t => {
  t.plan(2)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/', noop)
  findMyWay.on('GET', '/', { version: '1.2.0' }, noop)

  t.ok(findMyWay.find('GET', '/', '1.x'))
  t.ok(findMyWay.find('GET', '/'))
})

test('It should throw if you declare multiple times the same route', t => {
  t.plan(1)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/', { version: '1.2.3' }, noop)

  try {
    findMyWay.on('GET', '/', { version: '1.2.3' }, noop)
    t.fail('It should throw')
  } catch (err) {
    t.is(err.message, 'Method \'GET\' already declared for route \'/\' version \'1.2.3\'')
  }
})

test('Disable versioning', t => {
  t.plan(2)

  const findMyWay = FindMyWay({
    versioning: false,
    defaultRoute: (req, res) => {
      t.fail('We should not be here')
    }
  })

  try {
    findMyWay.on('GET', '/', { version: '1.2.3' }, (req, res) => {
      t.fail('We should not be here')
    })
  } catch (err) {
    t.is(err.message, 'Route versioning is disabled')
  }

  findMyWay.on('GET', '/', (req, res) => {
    t.pass('called')
  })

  findMyWay.lookup({
    method: 'GET',
    url: '/',
    headers: { 'accept-version': '1.x' }
  }, null)
})
