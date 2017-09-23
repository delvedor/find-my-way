'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('Parametric route with fixed suffix', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/a/:param-bar', (req, res, params) => {
    t.equal(params.param, 'foo')
  })

  findMyWay.lookup({ method: 'GET', url: '/a/foo-bar' }, null)
})

test('Parametric route with regexp and fixed suffix / 1', t => {
  t.plan(4)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.ok('route not matched')
    }
  })

  findMyWay.on('GET', '/a/:param(^\\w{3})bar', (req, res, params) => {
    t.fail('regex match')
  })

  findMyWay.lookup({ method: 'GET', url: '/a/$mebar' }, null)
  findMyWay.lookup({ method: 'GET', url: '/a/foolol' }, null)
  findMyWay.lookup({ method: 'GET', url: '/a/foobaz' }, null)
  findMyWay.lookup({ method: 'GET', url: '/a/foolbar' }, null)
})

test('Parametric route with regexp and fixed suffix / 2', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/a/:param(^\\w{3})bar', (req, res, params) => {
    t.equal(params.param, 'foo')
  })

  findMyWay.lookup({ method: 'GET', url: '/a/foobar' }, null)
})

test('Parametric route with regexp and fixed suffix / 3', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/a/:param(^\\w{3}-\\w{3})foo', (req, res, params) => {
    t.equal(params.param, 'abc-def')
  })

  findMyWay.lookup({ method: 'GET', url: '/a/abc-deffoo' }, null)
})

test('Multi parametric route / 1', t => {
  t.plan(2)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/a/:p1-:p2', (req, res, params) => {
    t.equal(params.p1, 'foo')
    t.equal(params.p2, 'bar')
  })

  findMyWay.lookup({ method: 'GET', url: '/a/foo-bar' }, null)
})

test('Multi parametric route / 2', t => {
  t.plan(2)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/a/:p1-:p2', (req, res, params) => {
    t.equal(params.p1, 'foo')
    t.equal(params.p2, 'bar-baz')
  })

  findMyWay.lookup({ method: 'GET', url: '/a/foo-bar-baz' }, null)
})

test('Multi parametric route / 3', t => {
  t.plan(2)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/a/:p_1-:$p', (req, res, params) => {
    t.equal(params.p_1, 'foo')
    t.equal(params.$p, 'bar')
  })

  findMyWay.lookup({ method: 'GET', url: '/a/foo-bar' }, null)
})

test('Multi parametric route / 4', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.pass('Everything good')
    }
  })

  findMyWay.on('GET', '/a/:p1-:p2', (req, res, params) => {
    t.fail('Should not match this route')
  })

  findMyWay.lookup({ method: 'GET', url: '/a/foo' }, null)
})

test('Multi parametric route with regexp / 1', t => {
  t.plan(2)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/at/:hour(^\\d+)h:minute(^\\d+)m', (req, res, params) => {
    t.equal(params.hour, '0')
    t.equal(params.minute, '42')
  })

  findMyWay.lookup({ method: 'GET', url: '/at/0h42m' }, null)
})

test('Multi parametric route with fixed suffix', t => {
  t.plan(2)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/a/:p1-:p2-baz', (req, res, params) => {
    t.equal(params.p1, 'foo')
    t.equal(params.p2, 'bar')
  })

  findMyWay.lookup({ method: 'GET', url: '/a/foo-bar-baz' }, null)
})

test('Multi parametric route with regexp and fixed suffix', t => {
  t.plan(2)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/a/:p1(^\\w+)-:p2(^\\w+)-kuux', (req, res, params) => {
    t.equal(params.p1, 'foo')
    t.equal(params.p2, 'barbaz')
  })

  findMyWay.lookup({ method: 'GET', url: '/a/foo-barbaz-kuux' }, null)
})

test('Multi parametric route with wildcard', t => {
  t.plan(2)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/a/:p1-:p2/*', (req, res, params) => {
    t.equal(params.p1, 'foo')
    t.equal(params.p2, 'bar')
  })

  findMyWay.lookup({ method: 'GET', url: '/a/foo-bar/baz' }, null)
})

test('Nested multi parametric route', t => {
  t.plan(3)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/a/:p1-:p2/b/:p3', (req, res, params) => {
    t.equal(params.p1, 'foo')
    t.equal(params.p2, 'bar')
    t.equal(params.p3, 'baz')
  })

  findMyWay.lookup({ method: 'GET', url: '/a/foo-bar/b/baz' }, null)
})

test('Nested multi parametric route with regexp / 1', t => {
  t.plan(3)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/a/:p1(^\\w{3})-:p2(^\\d+)/b/:p3', (req, res, params) => {
    t.equal(params.p1, 'foo')
    t.equal(params.p2, '42')
    t.equal(params.p3, 'bar')
  })

  findMyWay.lookup({ method: 'GET', url: '/a/foo-42/b/bar' }, null)
})

test('Nested multi parametric route with regexp / 2', t => {
  t.plan(3)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/a/:p1(^\\w{3})-:p2/b/:p3', (req, res, params) => {
    t.equal(params.p1, 'foo')
    t.equal(params.p2, '42')
    t.equal(params.p3, 'bar')
  })

  findMyWay.lookup({ method: 'GET', url: '/a/foo-42/b/bar' }, null)
})
