'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')
const noop = () => {}

const customVersioning = {
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
  deriveVersion: (req, ctx) => {
    return req.headers['accept']
  }
}

test('A route could support multiple versions (find) / 1', t => {
  t.plan(5)

  const findMyWay = FindMyWay({ versioning: customVersioning })

  findMyWay.on('GET', '/', { version: 'application/vnd.example.api+json;version=2' }, noop)
  findMyWay.on('GET', '/', { version: 'application/vnd.example.api+json;version=3' }, noop)

  t.ok(findMyWay.find('GET', '/', 'application/vnd.example.api+json;version=2'))
  t.ok(findMyWay.find('GET', '/', 'application/vnd.example.api+json;version=3'))
  t.notOk(findMyWay.find('GET', '/', 'application/vnd.example.api+json;version=4'))
  t.notOk(findMyWay.find('GET', '/', 'application/vnd.example.api+json;version=5'))
  t.notOk(findMyWay.find('GET', '/', 'application/vnd.example.api+json;version=6'))
})
