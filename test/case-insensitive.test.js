'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('case insensitive static routes of level 1', t => {
  t.plan(1)

  const findMyWay = FindMyWay({
    caseSensitive: false,
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/woo', (req, res, params) => {
    t.pass('we should be here')
  })

  findMyWay.lookup({ method: 'GET', url: '/WOO', headers: {} }, null)
})

test('case insensitive static routes of level 2', t => {
  t.plan(1)

  const findMyWay = FindMyWay({
    caseSensitive: false,
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/foo/woo', (req, res, params) => {
    t.pass('we should be here')
  })

  findMyWay.lookup({ method: 'GET', url: '/FoO/WOO', headers: {} }, null)
})

test('case insensitive static routes of level 3', t => {
  t.plan(1)

  const findMyWay = FindMyWay({
    caseSensitive: false,
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/foo/bar/woo', (req, res, params) => {
    t.pass('we should be here')
  })

  findMyWay.lookup({ method: 'GET', url: '/Foo/bAR/WoO', headers: {} }, null)
})

test('parametric case insensitive', t => {
  t.plan(1)

  const findMyWay = FindMyWay({
    caseSensitive: false,
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/foo/:param', (req, res, params) => {
    t.equal(params.param, 'bAR')
  })

  findMyWay.lookup({ method: 'GET', url: '/Foo/bAR', headers: {} }, null)
})

test('parametric case insensitive with a static part', t => {
  t.plan(1)

  const findMyWay = FindMyWay({
    caseSensitive: false,
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/foo/my-:param', (req, res, params) => {
    t.equal(params.param, 'bAR')
  })

  findMyWay.lookup({ method: 'GET', url: '/Foo/MY-bAR', headers: {} }, null)
})

test('parametric case insensitive with capital letter', t => {
  t.plan(1)

  const findMyWay = FindMyWay({
    caseSensitive: false,
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/foo/:Param', (req, res, params) => {
    t.equal(params.Param, 'bAR')
  })

  findMyWay.lookup({ method: 'GET', url: '/Foo/bAR', headers: {} }, null)
})

test('case insensitive with capital letter in static path with param', t => {
  t.plan(1)

  const findMyWay = FindMyWay({
    caseSensitive: false,
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/Foo/bar/:param', (req, res, params) => {
    t.equal(params.param, 'baZ')
  })

  findMyWay.lookup({ method: 'GET', url: '/foo/bar/baZ', headers: {} }, null)
})

test('case insensitive with multiple paths containing capital letter in static path with param', t => {
  /*
   * This is a reproduction of the issue documented at
   * https://github.com/delvedor/find-my-way/issues/96.
   */
  t.plan(2)

  const findMyWay = FindMyWay({
    caseSensitive: false,
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/Foo/bar/:param', (req, res, params) => {
    t.equal(params.param, 'baZ')
  })

  findMyWay.on('GET', '/Foo/baz/:param', (req, res, params) => {
    t.equal(params.param, 'baR')
  })

  findMyWay.lookup({ method: 'GET', url: '/foo/bar/baZ', headers: {} }, null)
  findMyWay.lookup({ method: 'GET', url: '/foo/baz/baR', headers: {} }, null)
})

test('case insensitive with multiple mixed-case params within same slash couple', t => {
  t.plan(2)

  const findMyWay = FindMyWay({
    caseSensitive: false,
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/foo/:param1-:param2', (req, res, params) => {
    t.equal(params.param1, 'My')
    t.equal(params.param2, 'bAR')
  })

  findMyWay.lookup({ method: 'GET', url: '/FOO/My-bAR', headers: {} }, null)
})

test('case insensitive with multiple mixed-case params', t => {
  t.plan(2)

  const findMyWay = FindMyWay({
    caseSensitive: false,
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/foo/:param1/:param2', (req, res, params) => {
    t.equal(params.param1, 'My')
    t.equal(params.param2, 'bAR')
  })

  findMyWay.lookup({ method: 'GET', url: '/FOO/My/bAR', headers: {} }, null)
})

test('case insensitive with wildcard', t => {
  t.plan(1)

  const findMyWay = FindMyWay({
    caseSensitive: false,
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/foo/*', (req, res, params) => {
    t.equal(params['*'], 'baR')
  })

  findMyWay.lookup({ method: 'GET', url: '/FOO/baR', headers: {} }, null)
})
