'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('handler should have the store object', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test', (req, res, params, store) => {
    t.is(store.hello, 'world')
  }, { hello: 'world' })

  findMyWay.lookup({ method: 'GET', url: '/test' }, null)
})

test('find a store object', t => {
  t.plan(1)
  const findMyWay = FindMyWay()
  const fn = () => {}

  findMyWay.on('GET', '/test', fn, { hello: 'world' })

  t.deepEqual(findMyWay.find('GET', '/test'), {
    handler: fn,
    params: {},
    store: { hello: 'world' }
  })
})
