'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')
const noop = () => {}

test('issue-60', t => {
  t.test('static / 1', t => {
    t.plan(1)
    const findMyWay = FindMyWay()

    findMyWay.on('GET', '/bb/', noop)
    findMyWay.on('GET', '/bb/bulk', noop)

    t.equal(findMyWay.find('GET', '/bulk'), null)
  })

  t.test('static / 2', t => {
    t.plan(1)
    const findMyWay = FindMyWay()

    findMyWay.on('GET', '/bb/ff/', noop)
    findMyWay.on('GET', '/bb/ff/bulk', noop)

    t.equal(findMyWay.find('GET', '/bulk'), null)
  })

  t.test('static / 3', t => {
    t.plan(1)
    const findMyWay = FindMyWay()

    findMyWay.on('GET', '/bb/ff/', noop)
    findMyWay.on('GET', '/bb/ff/bulk', noop)
    findMyWay.on('GET', '/bb/ff/gg/bulk', noop)
    findMyWay.on('GET', '/bb/ff/bulk/bulk', noop)

    t.equal(findMyWay.find('GET', '/bulk'), null)
  })

  t.test('with parameter / 1', t => {
    t.plan(1)
    const findMyWay = FindMyWay()

    findMyWay.on('GET', '/:foo/', noop)
    findMyWay.on('GET', '/:foo/bulk', noop)

    t.equal(findMyWay.find('GET', '/bulk'), null)
  })

  t.test('with parameter / 2', t => {
    t.plan(1)
    const findMyWay = FindMyWay()

    findMyWay.on('GET', '/bb/', noop)
    findMyWay.on('GET', '/bb/:foo', noop)

    t.equal(findMyWay.find('GET', '/bulk'), null)
  })

  t.test('with parameter / 3', t => {
    t.plan(1)
    const findMyWay = FindMyWay()

    findMyWay.on('GET', '/bb/ff/', noop)
    findMyWay.on('GET', '/bb/ff/:foo', noop)

    t.equal(findMyWay.find('GET', '/bulk'), null)
  })

  t.test('with parameter / 4', t => {
    t.plan(1)
    const findMyWay = FindMyWay()

    findMyWay.on('GET', '/bb/:foo/', noop)
    findMyWay.on('GET', '/bb/:foo/bulk', noop)

    t.equal(findMyWay.find('GET', '/bulk'), null)
  })

  t.test('wildcard / 1', t => {
    t.plan(1)
    const findMyWay = FindMyWay()

    findMyWay.on('GET', '/bb/', noop)
    findMyWay.on('GET', '/bb/*', noop)

    t.equal(findMyWay.find('GET', '/bulk'), null)
  })

  t.end()
})
