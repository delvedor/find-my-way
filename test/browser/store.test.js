'use strict'

require('./location')
const t = require('tap')
const test = t.test
const FindMyWay = require('../../browser')

test('handler should have the store object', t => {
  t.plan(1)
  const findMyWay = FindMyWay()

  findMyWay.on('/test', (route, store) => {
    t.is(store.hello, 'world')
  }, { hello: 'world' })

  findMyWay.lookup('/test')
})

test('find a store object', t => {
  t.plan(1)
  const findMyWay = FindMyWay()
  const fn = () => {}

  findMyWay.on('/test', fn, { hello: 'world' })

  t.deepEqual(findMyWay.find('/test'), {
    handler: fn,
    params: {},
    store: { hello: 'world' }
  })
})

test('update the store', t => {
  t.plan(2)
  const findMyWay = FindMyWay()
  var bool = false

  findMyWay.on('/test', (route, store) => {
    if (!bool) {
      t.is(store.hello, 'world')
      store.hello = 'hello'
      bool = true
      findMyWay.lookup('/test')
    } else {
      t.is(store.hello, 'hello')
    }
  }, { hello: 'world' })

  findMyWay.lookup('/test')
})
