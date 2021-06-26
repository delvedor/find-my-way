'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('..')

test('double colon is replaced with single colon, no parameters', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: () => t.fail('should not be default route')
  })

  function handler (req, res, params) {
    t.same(params, {})
  }

  findMyWay.on('GET', '/name::customVerb', handler)

  findMyWay.lookup({ method: 'GET', url: '/name:customVerb' }, null)
})

test('exactly one match for static route with colon', t => {
  t.plan(2)
  const findMyWay = FindMyWay()

  function handler () {}
  findMyWay.on('GET', '/name::customVerb', handler)

  t.equal(findMyWay.find('GET', '/name:customVerb').handler, handler)
  t.equal(findMyWay.find('GET', '/name:test'), null)
})
