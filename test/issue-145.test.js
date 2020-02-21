'use strict'

const t = require('tap')
const FindMyWay = require('../')

const noop = function () {}

t.test('issue-145', (t) => {
  t.plan(4)

  const findMyWay = FindMyWay({ ignoreTrailingSlash: true })

  findMyWay.on('GET', '/a/b', noop)
  findMyWay.on('GET', '/a/:pam/c', noop)

  console.log(findMyWay.prettyPrint())

  t.ok(findMyWay.find('GET', '/a/b'))
  t.ok(findMyWay.find('GET', '/a/b/c'))
  t.ok(findMyWay.find('GET', '/a/foo/c'))
  t.notOk(findMyWay.find('GET', '/a/c'))
})
