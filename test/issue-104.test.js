const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('Parametric route, url with parameter common prefix > 1', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/aaa', (req, res) => {
    res.end('{"message":"hello world"}')
  })

  findMyWay.on('GET', '/aabb', (req, res) => {
    res.end('{"message":"hello world"}')
  })

  findMyWay.on('GET', '/abc', (req, res) => {
    res.end('{"message":"hello world"}')
  })

  findMyWay.on('GET', '/:id', (req, res) => {
    res.end('{"message":"hello world"}')
  })

  t.deepEqual(findMyWay.find('GET', '/aab').params, { 'id': 'aab' })
})

test('Parametric route, url with multi parameter common prefix > 1', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/:id/aaa/:id2', (req, res) => {
    res.end('{"message":"hello world"}')
  })

  findMyWay.on('GET', '/:id/aabb/:id2', (req, res) => {
    res.end('{"message":"hello world"}')
  })

  findMyWay.on('GET', '/:id/abc/:id2', (req, res) => {
    res.end('{"message":"hello world"}')
  })

  findMyWay.on('GET', '/:a/:b', (req, res) => {
    res.end('{"message":"hello world"}')
  })

  t.deepEqual(findMyWay.find('GET', '/hello/aab').params, { 'a': 'hello', 'b': 'aab' })
})
