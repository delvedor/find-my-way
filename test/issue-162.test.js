'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

// NOTE: test/querystring.test.js validates if findMyWay.lookup() also supports
// query,hash,semicolon querystring format; This does the same tests for findMyWay.find().
//
test('#find handles query separated by ?', t => {
  t.plan(2)
  const findMyWay = FindMyWay()
  const responder = (req, res, params) => {
    t.ok('find?query ok')
  }

  findMyWay.on('GET', '/test', responder)

  const found = findMyWay.find('GET', '/test?hello=world')
  t.type(found, 'object')
  found.handler(responder, found.params, found.store)
})

test('#find handles query separated by #', t => {
  t.plan(2)
  const findMyWay = FindMyWay()
  const responder = (req, res, params) => {
    t.ok('find#hash ok')
  }

  findMyWay.on('GET', '/test', responder)

  const found = findMyWay.find('GET', '/test#hello')
  t.type(found, 'object')
  found.handler(responder, found.params, found.store)
})

test('#find handles query separated by ;', t => {
  t.plan(2)
  const findMyWay = FindMyWay()
  const responder = (req, res, params) => {
    t.ok('#find;semicolon ok')
  }

  findMyWay.on('GET', '/test', responder)

  const found = findMyWay.find('GET', '/test;jsessionid=123456')
  t.type(found, 'object')
  found.handler(responder, found.params, found.store)
})
