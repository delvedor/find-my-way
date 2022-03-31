'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('Multi-parametric tricky path', t => {
  t.plan(6)
  const findMyWay = FindMyWay({
    defaultRoute: () => t.fail('Should not be defaultRoute')
  })

  findMyWay.on('GET', '/:param1-static-:param2', () => {})

  t.same(
    findMyWay.find('GET', '/param1-static-param2', {}).params,
    { param1: 'param1', param2: 'param2' }
  )
  t.same(
    findMyWay.find('GET', '/param1.1-param1.2-static-param2.1-param2.2', {}).params,
    { param1: 'param1.1-param1.2', param2: 'param2.1-param2.2' }
  )
  t.same(
    findMyWay.find('GET', '/param1-1-param1-2-static-param2-1-param2-2', {}).params,
    { param1: 'param1-1-param1-2', param2: 'param2-1-param2-2' }
  )
  t.same(
    findMyWay.find('GET', '/static-static-static', {}).params,
    { param1: 'static', param2: 'static' }
  )
  t.same(
    findMyWay.find('GET', '/static-static-static-static', {}).params,
    { param1: 'static', param2: 'static-static' }
  )
  t.same(
    findMyWay.find('GET', '/static-static1-static-static', {}).params,
    { param1: 'static-static1', param2: 'static' }
  )
})
