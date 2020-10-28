'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('..')
const alpha = () => { }
const beta = () => { }
const gamma = () => { }

test('A route supports multiple host constraints', t => {
  t.plan(4)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/', {}, alpha)
  findMyWay.on('GET', '/', { constraints: { host: 'fastify.io' } }, beta)
  findMyWay.on('GET', '/', { constraints: { host: 'example.com' } }, gamma)

  t.strictEqual(findMyWay.find('GET', '/', {}).handler, alpha)
  t.strictEqual(findMyWay.find('GET', '/', { host: 'something-else.io' }).handler, alpha)
  t.strictEqual(findMyWay.find('GET', '/', { host: 'fastify.io' }).handler, beta)
  t.strictEqual(findMyWay.find('GET', '/', { host: 'example.com' }).handler, gamma)
})

test('A route supports wildcard host constraints', t => {
  t.plan(4)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/', { constraints: { host: 'fastify.io' } }, beta)
  findMyWay.on('GET', '/', { constraints: { host: /.*\.fastify\.io/ } }, gamma)

  t.strictEqual(findMyWay.find('GET', '/', { host: 'fastify.io' }).handler, beta)
  t.strictEqual(findMyWay.find('GET', '/', { host: 'foo.fastify.io' }).handler, gamma)
  t.strictEqual(findMyWay.find('GET', '/', { host: 'bar.fastify.io' }).handler, gamma)
  t.notOk(findMyWay.find('GET', '/', { host: 'example.com' }))
})

test('A route could support multiple host constraints while versioned', t => {
  t.plan(6)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/', { constraints: { host: 'fastify.io', version: '1.1.0' } }, beta)
  findMyWay.on('GET', '/', { constraints: { host: 'fastify.io', version: '2.1.0' } }, gamma)

  t.strictEqual(findMyWay.find('GET', '/', { host: 'fastify.io', version: '1.x' }).handler, beta)
  t.strictEqual(findMyWay.find('GET', '/', { host: 'fastify.io', version: '1.1.x' }).handler, beta)
  t.strictEqual(findMyWay.find('GET', '/', { host: 'fastify.io', version: '2.x' }).handler, gamma)
  t.strictEqual(findMyWay.find('GET', '/', { host: 'fastify.io', version: '2.1.x' }).handler, gamma)
  t.notOk(findMyWay.find('GET', '/', { host: 'fastify.io', version: '3.x' }))
  t.notOk(findMyWay.find('GET', '/', { host: 'something-else.io', version: '1.x' }))
})
