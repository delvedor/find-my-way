'use strict'

const assert = require('assert')
const t = require('tap')
const test = t.test
const FindMyWay = require('..')

const customVersioning = {
  name: 'version',
  // storage factory
  storage: function () {
    let versions = []
    return {
      get: (version) => {
        assert(typeof version === 'number')
        return versions[version] || null
      },
      set: (version, store) => {
        assert(typeof version === 'number')
        versions[version] = store
      },
      del: (version) => {
        assert(typeof version === 'number')
        versions[version] = null
      },
      empty: () => {
        versions = []
      }
    }
  },
  deriveConstraint: (req, ctx) => {
    return Number(req.headers['accept-version'])
  }
}

test('Custome deriveConstraint can return non-string versions', (t) => {
  t.plan(2)

  const findMyWay = FindMyWay({ constraints: { version: customVersioning } })

  findMyWay.on('GET', '/', { constraints: { version: 42 } }, (req, res, params) => {
    t.strictEqual(req.headers['accept-version'], '42')
  })

  findMyWay.on('GET', '/', { constraints: { version: 43 } }, (req, res, params) => {
    t.strictEqual(req.headers['accept-version'], '43')
  })

  findMyWay.lookup({
    method: 'GET',
    url: '/',
    headers: { 'accept-version': '42' }
  })
  findMyWay.lookup({
    method: 'GET',
    url: '/',
    headers: { 'accept-version': '43' }
  })
})
