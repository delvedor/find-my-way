'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('Wildcard mixed with dynamic and common prefix', t => {
  t.plan(5)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('OPTIONS', '/*', (req, res, params) => {
    t.strictEqual(req.method, 'OPTIONS')
  })

  findMyWay.on('GET', '/obj/params/*', (req, res, params) => {
    t.strictEqual(req.method, 'GET')
  })

  findMyWay.on('GET', '/obj/:id', (req, res, params) => {
    t.strictEqual(req.method, 'GET')
  })

  findMyWay.on('GET', '/obj_params/*', (req, res, params) => {
    t.strictEqual(req.method, 'GET')
  })

  findMyWay.lookup({ method: 'OPTIONS', url: '/obj/params', headers: {} }, null)

  findMyWay.lookup({ method: 'OPTIONS', url: '/obj/params/12', headers: {} }, null)

  findMyWay.lookup({ method: 'GET', url: '/obj/params/12', headers: {} }, null)

  findMyWay.lookup({ method: 'OPTIONS', url: '/obj_params/12', headers: {} }, null)

  findMyWay.lookup({ method: 'GET', url: '/obj_params/12', headers: {} }, null)
})
