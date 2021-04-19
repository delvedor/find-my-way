'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('..')
const alpha = () => { }
const beta = () => { }
const gamma = () => { }
const delta = () => { }

test('Should return null if no Not Acceptable handler is registered and requested media type is not acceptable', t => {
  t.plan(2)

  const findMyWay = FindMyWay({
    defaultRoute: alpha
  })

  findMyWay.on('GET', '/', { constraints: { negotiationGet: 'application/json' } }, beta)
  findMyWay.on('GET', '/', { constraints: { negotiationGet: 'application/xml' } }, gamma)

  t.notOk(findMyWay.find('GET', '/', {}))
  t.notOk(findMyWay.find('GET', '/', { negotiationGet: 'image/png' }))
})

test('Should return Not Acceptable handler returned if registered and requested media type is not acceptable', t => {
  t.plan(1)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/', { constraints: { negotiationGet: '406' } }, beta)
  findMyWay.on('GET', '/', { constraints: { negotiationGet: 'application/xml' } }, gamma)

  t.strictEqual(findMyWay.find('GET', '/', { negotiationGet: 'image/png' }).handler, beta)
})

test('Should return exact matching handler', t => {
  t.plan(2)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/', { constraints: { negotiationGet: 'image/png' } }, beta)
  findMyWay.on('GET', '/', { constraints: { negotiationGet: 'image/jpeg' } }, gamma)

  t.strictEqual(findMyWay.find('GET', '/', { negotiationGet: 'image/png' }).handler, beta)
  t.strictEqual(findMyWay.find('GET', '/', { negotiationGet: 'image/jpeg' }).handler, gamma)
})

test('Should return first registered handler if multiple match', t => {
  t.plan(1)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/', { constraints: { negotiationGet: 'image/png' } }, beta)
  findMyWay.on('GET', '/', { constraints: { negotiationGet: 'image/jpeg' } }, gamma)

  t.strictEqual(findMyWay.find('GET', '/', { negotiationGet: 'image/*' }).handler, beta)
})

test('Route should support multiple constraints', t => {
  t.plan(1)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/', { constraints: { negotiationGet: 'text/plain', version: '1.0.0' } }, alpha)
  findMyWay.on('GET', '/', { constraints: { negotiationGet: 'text/plain', version: '2.0.0', host: 'example.com' } }, beta)
  findMyWay.on('GET', '/', { constraints: { negotiationGet: 'text/plain', version: '2.0.0', host: 'test.de' } }, gamma)
  findMyWay.on('GET', '/', { constraints: { negotiationGet: 'text/plain', version: '2.0.0', host: 'wow.org' } }, delta)

  t.strictEqual(findMyWay.find('GET', '/', { negotiationGet: 'text/*', version: '2.0.x', host: 'test.de' }).handler, gamma)
})

test('Client accepts any media type if no Accept header is provided', t => {
  t.plan(1)

  const findMyWay = FindMyWay({
    defaultRoute (req, res) {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/', { constraints: { negotiationGet: 'application/json' } }, (req, res) => {
    t.pass()
  })

  findMyWay.lookup({
    method: 'GET',
    url: '/',
    headers: {}
  })
})
