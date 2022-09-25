'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('..')

const customHeaderConstraint = {
  name: 'requestedBy',
  storage: function () {
    const requestedBys = {}
    return {
      get: (requestedBy) => { return requestedBys[requestedBy] || null },
      set: (requestedBy, store) => { requestedBys[requestedBy] = store }
    }
  },
  deriveConstraint: (req, ctx, done) => {
    done(req.headers['user-agent'])
  }
}

test('Custom constraint strategies can set mustMatchWhenDerived flag to true which prevents matches to unconstrained routes when a constraint is derived and there are no other routes', t => {
  t.plan(1)

  const router = FindMyWay({ constraints: { requestedBy: customHeaderConstraint } })
  router.on('GET', '/', { constraints: { requestedBy: 'node' } }, () => 'asyncHandler')

  router.lookup({ method: 'GET', url: '/', headers: { 'user-agent': 'node' } }, null, null, (result) => {
    t.equal(result, 'asyncHandler')
  })
})
