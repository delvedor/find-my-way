'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('If the prefixLen is higher than the pathLen we should not save the wildcard child', t => {
  t.plan(3)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.get('/static/*', () => {})

  t.deepEqual(findMyWay.find('GET', '/static/', {}).params, { '*': '' })
  t.deepEqual(findMyWay.find('GET', '/static/hello', {}).params, { '*': 'hello' })
  t.deepEqual(findMyWay.find('GET', '/static', {}), null)
})

test('If the prefixLen is higher than the pathLen we should not save the wildcard child (mixed routes)', t => {
  t.plan(3)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.get('/static/*', () => {})
  findMyWay.get('/simple', () => {})
  findMyWay.get('/simple/:bar', () => {})
  findMyWay.get('/hello', () => {})

  t.deepEqual(findMyWay.find('GET', '/static/', {}).params, { '*': '' })
  t.deepEqual(findMyWay.find('GET', '/static/hello', {}).params, { '*': 'hello' })
  t.deepEqual(findMyWay.find('GET', '/static', {}), null)
})

test('If the prefixLen is higher than the pathLen we should not save the wildcard child (with a root wildcard)', t => {
  t.plan(3)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.get('*', () => {})
  findMyWay.get('/static/*', () => {})
  findMyWay.get('/simple', () => {})
  findMyWay.get('/simple/:bar', () => {})
  findMyWay.get('/hello', () => {})

  t.deepEqual(findMyWay.find('GET', '/static/', {}).params, { '*': '' })
  t.deepEqual(findMyWay.find('GET', '/static/hello', {}).params, { '*': 'hello' })
  t.deepEqual(findMyWay.find('GET', '/static', {}).params, { '*': '/static' })
})

test('If the prefixLen is higher than the pathLen we should not save the wildcard child (404)', t => {
  t.plan(4)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.get('/static/*', () => {})
  findMyWay.get('/simple', () => {})
  findMyWay.get('/simple/:bar', () => {})
  findMyWay.get('/hello', () => {})

  t.deepEqual(findMyWay.find('GET', '/stati', {}), null)
  t.deepEqual(findMyWay.find('GET', '/staticc', {}), null)
  t.deepEqual(findMyWay.find('GET', '/stati/hello', {}), null)
  t.deepEqual(findMyWay.find('GET', '/staticc/hello', {}), null)
})
