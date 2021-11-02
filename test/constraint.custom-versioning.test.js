'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('..')
const noop = () => { }

const customVersioning = {
  name: 'version',
  // storage factory
  storage: function () {
    let versions = {}
    return {
      get: (version) => { return versions[version] || null },
      set: (version, store) => { versions[version] = store },
      del: (version) => { delete versions[version] },
      empty: () => { versions = {} }
    }
  },
  deriveConstraint: (req, ctx) => {
    return req.headers.accept
  }
}

test('A route could support multiple versions (find) / 1', t => {
  t.plan(5)

  const findMyWay = FindMyWay({ constraints: { version: customVersioning } })

  findMyWay.on('GET', '/', { constraints: { version: 'application/vnd.example.api+json;version=2' } }, noop)
  findMyWay.on('GET', '/', { constraints: { version: 'application/vnd.example.api+json;version=3' } }, noop)

  t.ok(findMyWay.find('GET', '/', { version: 'application/vnd.example.api+json;version=2' }))
  t.ok(findMyWay.find('GET', '/', { version: 'application/vnd.example.api+json;version=3' }))
  t.notOk(findMyWay.find('GET', '/', { version: 'application/vnd.example.api+json;version=4' }))
  t.notOk(findMyWay.find('GET', '/', { version: 'application/vnd.example.api+json;version=5' }))
  t.notOk(findMyWay.find('GET', '/', { version: 'application/vnd.example.api+json;version=6' }))
})

test('Overriding default strategies uses the custom deriveConstraint function', t => {
  t.plan(2)

  const findMyWay = FindMyWay({ constraints: { version: customVersioning } })

  findMyWay.on('GET', '/', { constraints: { version: 'application/vnd.example.api+json;version=2' } }, (req, res, params) => {
    t.equal(req.headers.accept, 'application/vnd.example.api+json;version=2')
  })

  findMyWay.on('GET', '/', { constraints: { version: 'application/vnd.example.api+json;version=3' } }, (req, res, params) => {
    t.equal(req.headers.accept, 'application/vnd.example.api+json;version=3')
  })

  findMyWay.lookup({
    method: 'GET',
    url: '/',
    headers: { accept: 'application/vnd.example.api+json;version=2' }
  })
  findMyWay.lookup({
    method: 'GET',
    url: '/',
    headers: { accept: 'application/vnd.example.api+json;version=3' }
  })
})
