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
    if (req.headers['user-agent'] === 'wrong') {
      done(new Error('wrong user-agent'))
      return
    }

    done(null, req.headers['user-agent'])
  }
}

test('should derive async constraint', t => {
  t.plan(2)

  const router = FindMyWay({ constraints: { requestedBy: customHeaderConstraint } })
  router.on('GET', '/', { constraints: { requestedBy: 'node' } }, () => 'asyncHandler')

  router.lookup(
    {
      method: 'GET',
      url: '/',
      headers: {
        'user-agent': 'node'
      }
    },
    null,
    (err, result) => {
      t.equal(err, null)
      t.equal(result, 'asyncHandler')
    }
  )
})

test('lookup should return an error from deriveConstraint', t => {
  t.plan(2)

  const router = FindMyWay({ constraints: { requestedBy: customHeaderConstraint } })
  router.on('GET', '/', { constraints: { requestedBy: 'node' } }, () => 'asyncHandler')

  router.lookup(
    {
      method: 'GET',
      url: '/',
      headers: {
        'user-agent': 'wrong'
      }
    },
    null,
    (err, result) => {
      t.same(err, new Error('wrong user-agent'))
      t.equal(result, undefined)
    }
  )
})

test('should derive sync and async constraints', t => {
  t.plan(4)

  const router = FindMyWay({ constraints: { requestedBy: customHeaderConstraint } })
  router.on('GET', '/', { constraints: { version: '1.0.0', requestedBy: 'node' } }, () => 'asyncHandlerV1')
  router.on('GET', '/', { constraints: { version: '2.0.0', requestedBy: 'node' } }, () => 'asyncHandlerV2')

  router.lookup(
    {
      method: 'GET',
      url: '/',
      headers: {
        'user-agent': 'node',
        'accept-version': '1.0.0'
      }
    },
    null,
    (err, result) => {
      t.equal(err, null)
      t.equal(result, 'asyncHandlerV1')
    }
  )

  router.lookup(
    {
      method: 'GET',
      url: '/',
      headers: {
        'user-agent': 'node',
        'accept-version': '2.0.0'
      }
    },
    null,
    (err, result) => {
      t.equal(err, null)
      t.equal(result, 'asyncHandlerV2')
    }
  )
})
