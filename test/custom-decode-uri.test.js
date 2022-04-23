'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('decodeUriParameters wrong setup', t => {
  t.plan(1)

  try {
    FindMyWay({
      decodeUriParameters: 'not a function'
    })
  } catch (error) {
    t.equal(error.message, 'decodeUriParameters must be a function')
  }
})

test('decodeUriParameters called when needed 1', t => {
  t.plan(2)

  const findMyWay = FindMyWay({
    decodeUriParameters: (stringToDecode) => {
      t.fail('the function is not called')
    }
  })

  findMyWay.on('GET', '/foo bar', { encode: true }, () => {})
  findMyWay.on('GET', '/:foo/bar', () => {})

  t.ok(findMyWay.find('GET', '/foo%20bar').handler)
  t.ok(findMyWay.find('GET', '/ci@o/bar').handler)
})

test('decodeUriParameters called when needed 2', t => {
  t.plan(11)

  const results = [
    'ci%40o',
    'foo%23bar',
    '%F0%9F%8D%8C',
    '%23%F0%9F%8D%8C'
  ]
  const findMyWay = FindMyWay({
    decodeUriParameters: (stringToDecode) => {
      t.equal(stringToDecode, results.shift(), `decoding ${stringToDecode}`)
      return 'crazy'
    }
  })

  const notCrazy = () => {}
  const paramHandler = () => {}

  findMyWay.on('GET', '/foo bar', { encode: true }, notCrazy)
  findMyWay.on('GET', '/foo#bar', notCrazy)
  findMyWay.on('GET', '/:param/bar', paramHandler)
  findMyWay.on('GET', '/:param', paramHandler)

  t.equal(findMyWay.find('GET', '/foo%20bar').handler, notCrazy)
  t.equal(findMyWay.find('GET', '/ci%40o/bar').handler, paramHandler)
  t.equal(findMyWay.find('GET', '/foo%23bar').handler, paramHandler)

  const bananaRoute = findMyWay.find('GET', '/%F0%9F%8D%8C')
  t.equal(bananaRoute.handler, paramHandler)
  t.same(bananaRoute.params, { param: 'crazy' })

  const crazyRoute = findMyWay.find('GET', '/%23%F0%9F%8D%8C')
  t.equal(crazyRoute.handler, paramHandler)
  t.same(crazyRoute.params, { param: 'crazy' })
})
