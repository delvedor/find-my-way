'use strict'

const { test } = require('node:test')
const FindMyWay = require('../')

test('issue-240: .find matching', (t) => {
  t.plan(14)

  const findMyWay = FindMyWay({ ignoreDuplicateSlashes: true })

  const fixedPath = function staticPath () {}
  const varPath = function parameterPath () {}
  findMyWay.on('GET', '/a/b', fixedPath)
  findMyWay.on('GET', '/a/:pam/c', varPath)

  t.assert.equal(findMyWay.find('GET', '/a/b').handler, fixedPath)
  t.assert.equal(findMyWay.find('GET', '/a//b').handler, fixedPath)
  t.assert.equal(findMyWay.find('GET', '/a/b/c').handler, varPath)
  t.assert.equal(findMyWay.find('GET', '/a//b/c').handler, varPath)
  t.assert.equal(findMyWay.find('GET', '/a///b/c').handler, varPath)
  t.assert.equal(findMyWay.find('GET', '/a//b//c').handler, varPath)
  t.assert.equal(findMyWay.find('GET', '/a///b///c').handler, varPath)
  t.assert.equal(findMyWay.find('GET', '/a/foo/c').handler, varPath)
  t.assert.equal(findMyWay.find('GET', '/a//foo/c').handler, varPath)
  t.assert.equal(findMyWay.find('GET', '/a///foo/c').handler, varPath)
  t.assert.equal(findMyWay.find('GET', '/a//foo//c').handler, varPath)
  t.assert.equal(findMyWay.find('GET', '/a///foo///c').handler, varPath)
  t.assert.ok(!findMyWay.find('GET', '/a/c'))
  t.assert.ok(!findMyWay.find('GET', '/a//c'))
})

test('ignoreDuplicateSlashes does not alter the querystring', (t) => {
  t.plan(4)

  const findMyWay = FindMyWay({ ignoreDuplicateSlashes: true })
  const handler = () => {}
  findMyWay.on('GET', '/a/b', handler)

  const short = findMyWay.find('GET', '//a//b?u=//x')
  t.assert.equal(short.handler, handler)
  t.assert.deepEqual(short.searchParams, { u: '//x' })

  const long = findMyWay.find('GET', '/a//b?resource=https://example.com//api')
  t.assert.equal(long.handler, handler)
  t.assert.deepEqual(long.searchParams, { resource: 'https://example.com//api' })
})
