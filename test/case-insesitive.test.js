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
    console.log('baz')
    t.equal(params.param, 'baz')
  })

  findMyWay.lookup({ method: 'GET', url: '/Foo/bar/baz', headers: {} }, null)
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
    t.equal(params.param, 'baz')
  })

  findMyWay.on('GET', '/Foo/baz/:param', (req, res, params) => {
    t.equal(params.param, 'bar')
  })

  findMyWay.lookup({ method: 'GET', url: '/Foo/bar/baz', headers: {} }, null)
  findMyWay.lookup({ method: 'GET', url: '/Foo/baz/bar', headers: {} }, null)
})

test('case insensitive matching should preserve param case', t => {
  /*
   * This is a reproduction of the issue documented at
   * https://github.com/delvedor/find-my-way/issues/98.
   */
  t.plan(1)

  const findMyWay = FindMyWay({
    caseSensitive: false,
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/foo/:param', (req, res, params) => {
    t.equal(params.param, 'bAz')
  })

  findMyWay.lookup({ method: 'GET', url: '/FOO/bAz', headers: {} }, null)
})
