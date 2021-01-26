'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')
const noop = () => {}

test('Defining static route after parametric - 1', t => {
  t.plan(3)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/static', noop)
  findMyWay.on('GET', '/:param', noop)

  t.ok(findMyWay.find('GET', '/static'))
  t.ok(findMyWay.find('GET', '/para'))
  t.ok(findMyWay.find('GET', '/s'))
})

test('Defining static route after parametric - 2', t => {
  t.plan(3)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/:param', noop)
  findMyWay.on('GET', '/static', noop)

  t.ok(findMyWay.find('GET', '/static'))
  t.ok(findMyWay.find('GET', '/para'))
  t.ok(findMyWay.find('GET', '/s'))
})

test('Defining static route after parametric - 3', t => {
  t.plan(4)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/:param', noop)
  findMyWay.on('GET', '/static', noop)
  findMyWay.on('GET', '/other', noop)

  t.ok(findMyWay.find('GET', '/static'))
  t.ok(findMyWay.find('GET', '/para'))
  t.ok(findMyWay.find('GET', '/s'))
  t.ok(findMyWay.find('GET', '/o'))
})

test('Defining static route after parametric - 4', t => {
  t.plan(4)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/static', noop)
  findMyWay.on('GET', '/other', noop)
  findMyWay.on('GET', '/:param', noop)

  t.ok(findMyWay.find('GET', '/static'))
  t.ok(findMyWay.find('GET', '/para'))
  t.ok(findMyWay.find('GET', '/s'))
  t.ok(findMyWay.find('GET', '/o'))
})

test('Defining static route after parametric - 5', t => {
  t.plan(4)
  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/static', noop)
  findMyWay.on('GET', '/:param', noop)
  findMyWay.on('GET', '/other', noop)

  t.ok(findMyWay.find('GET', '/static'))
  t.ok(findMyWay.find('GET', '/para'))
  t.ok(findMyWay.find('GET', '/s'))
  t.ok(findMyWay.find('GET', '/o'))
})

test('Should produce the same tree - 1', t => {
  t.plan(1)
  const findMyWay1 = FindMyWay()
  const findMyWay2 = FindMyWay()

  findMyWay1.on('GET', '/static', noop)
  findMyWay1.on('GET', '/:param', noop)

  findMyWay2.on('GET', '/:param', noop)
  findMyWay2.on('GET', '/static', noop)

  t.deepEqual(findMyWay1.tree, findMyWay2.tree)
})

test('Should produce the same tree - 2', t => {
  t.plan(3)
  const findMyWay1 = FindMyWay()
  const findMyWay2 = FindMyWay()
  const findMyWay3 = FindMyWay()

  findMyWay1.on('GET', '/:param', noop)
  findMyWay1.on('GET', '/static', noop)
  findMyWay1.on('GET', '/other', noop)

  findMyWay2.on('GET', '/static', noop)
  findMyWay2.on('GET', '/:param', noop)
  findMyWay2.on('GET', '/other', noop)

  findMyWay3.on('GET', '/static', noop)
  findMyWay3.on('GET', '/other', noop)
  findMyWay3.on('GET', '/:param', noop)

  t.deepEqual(findMyWay1.tree, findMyWay2.tree)
  t.deepEqual(findMyWay2.tree, findMyWay3.tree)
  t.deepEqual(findMyWay1.tree, findMyWay3.tree)
})
