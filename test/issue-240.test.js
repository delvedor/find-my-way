'use strict'

const t = require('tap')
const FindMyWay = require('../')
const removeDuplicateSlashes = require('../lib/duplicate-slashes')

t.test('issue-240: removeDuplicateSlashes', (t) => {
  t.plan(13)

  t.equal(removeDuplicateSlashes('abcdef'), 'abcdef')
  t.equal(removeDuplicateSlashes('/abcdef'), '/abcdef')
  t.equal(removeDuplicateSlashes('/abcdef/'), '/abcdef/')
  t.equal(removeDuplicateSlashes('/ab/cd/ef/'), '/ab/cd/ef/')
  t.equal(removeDuplicateSlashes('//abcdef'), '/abcdef')
  t.equal(removeDuplicateSlashes('///abcdef'), '/abcdef')
  t.equal(removeDuplicateSlashes('////abcdef'), '/abcdef')
  t.equal(removeDuplicateSlashes('/abcdef//'), '/abcdef/')
  t.equal(removeDuplicateSlashes('/abcdef///'), '/abcdef/')
  t.equal(removeDuplicateSlashes('/abcdef////'), '/abcdef/')
  t.equal(removeDuplicateSlashes('/a//b'), '/a/b')
  t.equal(removeDuplicateSlashes('/ab//cd/////ef/'), '/ab/cd/ef/')
  t.equal(removeDuplicateSlashes('/ab//cd/////ef///'), '/ab/cd/ef/')
})

t.test('issue-240: .find matching', (t) => {
  t.plan(14)

  const findMyWay = FindMyWay({ ignoreDuplicateSlashes: true })

  const fixedPath = function staticPath () {}
  const varPath = function parameterPath () {}
  findMyWay.on('GET', '/a/b', fixedPath)
  findMyWay.on('GET', '/a/:pam/c', varPath)

  t.equal(findMyWay.find('GET', '/a/b').handler, fixedPath)
  t.equal(findMyWay.find('GET', '/a//b').handler, fixedPath)
  t.equal(findMyWay.find('GET', '/a/b/c').handler, varPath)
  t.equal(findMyWay.find('GET', '/a//b/c').handler, varPath)
  t.equal(findMyWay.find('GET', '/a///b/c').handler, varPath)
  t.equal(findMyWay.find('GET', '/a//b//c').handler, varPath)
  t.equal(findMyWay.find('GET', '/a///b///c').handler, varPath)
  t.equal(findMyWay.find('GET', '/a/foo/c').handler, varPath)
  t.equal(findMyWay.find('GET', '/a//foo/c').handler, varPath)
  t.equal(findMyWay.find('GET', '/a///foo/c').handler, varPath)
  t.equal(findMyWay.find('GET', '/a//foo//c').handler, varPath)
  t.equal(findMyWay.find('GET', '/a///foo///c').handler, varPath)
  t.notOk(findMyWay.find('GET', '/a/c'))
  t.notOk(findMyWay.find('GET', '/a//c'))
})
