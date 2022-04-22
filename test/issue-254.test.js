'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('..')

test('Constraints should not be overrided when multiple router is created', t => {
  t.plan(1)

  let count = 0

  const constraint = {
    name: 'secret',
    storage: function () {
      let secrets = {}
      return {
        get: (secret) => { return secrets[secret] || null },
        set: (secret, store) => { secrets[secret] = store },
        del: (secret) => { delete secrets[secret] },
        empty: () => { secrets = {} }
      }
    },
    deriveConstraint: (req, ctx) => {
      return req.headers['x-secret']
    },
    validate () { return true }
  }

  const router1 = FindMyWay({ constraints: { secret: constraint } })
  FindMyWay()

  router1.on('GET', '/', { constraints: { secret: 'alpha' } }, () => {})
  count++

  router1.find('GET', '/', { constraints: { secret: 'alpha' } })
  count++

  t.equal(count, 2, 'constraints is not overrided')
})
