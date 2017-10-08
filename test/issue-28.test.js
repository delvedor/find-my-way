'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('wildcard (more complex test)', t => {
  t.plan(3)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('we should not be here, the url is: ' + req.url)
    }
  })

  findMyWay.on('GET', '/test/*', (req, res, params) => {
    switch (params['*']) {
      case 'hello':
        t.ok('correct parameter')
        break
      case 'hello/world':
        t.ok('correct parameter')
        break
      case '':
        t.ok('correct parameter')
        break
      default:
        t.fail('wrong parameter: ' + params['*'])
    }
  })

  findMyWay.lookup(
    { method: 'GET', url: '/test/hello' },
    null
  )

  findMyWay.lookup(
    { method: 'GET', url: '/test/hello/world' },
    null
  )

  findMyWay.lookup(
    { method: 'GET', url: '/test/' },
    null
  )
})

test('Wildcard inside a node with a static route but different method', t => {
  t.plan(2)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('we should not be here, the url is: ' + req.url)
    }
  })

  findMyWay.on('GET', '/test/hello', (req, res, params) => {
    t.is(req.method, 'GET')
  })

  findMyWay.on('OPTIONS', '/*', (req, res, params) => {
    t.is(req.method, 'OPTIONS')
  })

  findMyWay.lookup(
    { method: 'GET', url: '/test/hello' },
    null
  )

  findMyWay.lookup(
    { method: 'OPTIONS', url: '/test/hello' },
    null
  )
})

test('Wildcard inside a node with a static route but different method (more complex case)', t => {
  t.plan(5)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      if (req.url === '/test/helloo' && req.method === 'GET') {
        t.ok('Everything fine')
      } else {
        t.fail('we should not be here, the url is: ' + req.url)
      }
    }
  })

  findMyWay.on('GET', '/test/hello', (req, res, params) => {
    t.is(req.method, 'GET')
  })

  findMyWay.on('OPTIONS', '/*', (req, res, params) => {
    t.is(req.method, 'OPTIONS')
  })

  findMyWay.lookup(
    { method: 'GET', url: '/test/hello' },
    null
  )

  findMyWay.lookup(
    { method: 'GET', url: '/test/helloo' },
    null
  )

  findMyWay.lookup(
    { method: 'OPTIONS', url: '/test/' },
    null
  )

  findMyWay.lookup(
    { method: 'OPTIONS', url: '/test' },
    null
  )

  findMyWay.lookup(
    { method: 'OPTIONS', url: '/test/helloo' },
    null
  )
})

test('Wildcard edge cases', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('we should not be here, the url is: ' + req.url)
    }
  })

  findMyWay.on('GET', '/test1/foo', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/test2/foo', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('OPTIONS', '/*', (req, res, params) => {
    t.is(req.method, 'OPTIONS')
  })

  findMyWay.lookup(
    { method: 'OPTIONS', url: '/test1/foo' },
    null
  )
})

test('Wildcard edge cases same method', t => {
  t.plan(2)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('we should not be here, the url is: ' + req.url)
    }
  })

  findMyWay.on('OPTIONS', '/test1/foo', (req, res, params) => {
    t.is(req.method, 'OPTIONS')
  })

  findMyWay.on('OPTIONS', '/test2/foo', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('OPTIONS', '/*', (req, res, params) => {
    t.is(req.url, '/test/foo')
  })

  findMyWay.lookup(
    { method: 'OPTIONS', url: '/test1/foo' },
    null
  )

  findMyWay.lookup(
    { method: 'OPTIONS', url: '/test/foo' },
    null
  )
})

test('Wildcard and parametric edge cases', t => {
  t.plan(3)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('we should not be here, the url is: ' + req.url)
    }
  })

  findMyWay.on('OPTIONS', '/test1/foo', (req, res, params) => {
    t.is(req.method, 'OPTIONS')
  })

  findMyWay.on('OPTIONS', '/test2/foo', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/:test/foo', (req, res, params) => {
    t.is(req.url, '/example/foo')
  })

  findMyWay.on('OPTIONS', '/*', (req, res, params) => {
    t.is(req.url, '/test/foo/hey')
  })

  findMyWay.lookup(
    { method: 'OPTIONS', url: '/test1/foo' },
    null
  )

  findMyWay.lookup(
    { method: 'OPTIONS', url: '/test/foo/hey' },
    null
  )

  findMyWay.lookup(
    { method: 'GET', url: '/example/foo' },
    null
  )
})

test('Mixed wildcard and static with same method', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('we should not be here, the url is: ' + req.url)
    }
  })

  findMyWay.on('GET', '/foo1/bar1/baz', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo1/bar2/baz', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo2/bar2/baz', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '*', (req, res, params) => {
    t.is(req.url, '/foo1/bar1/kuux')
  })

  findMyWay.lookup(
    { method: 'GET', url: '/foo1/bar1/kuux' },
    null
  )
})

test('Nested wildcards case - 1', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('we should not be here, the url is: ' + req.url)
    }
  })

  findMyWay.on('GET', '*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo1/*', (req, res, params) => {
    t.is(req.url, '/foo1/bar1/kuux')
  })

  findMyWay.on('GET', '/foo2/*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.lookup(
    { method: 'GET', url: '/foo1/bar1/kuux' },
    null
  )
})

test('Nested wildcards case - 2', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('we should not be here, the url is: ' + req.url)
    }
  })

  findMyWay.on('GET', '/foo2/*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo1/*', (req, res, params) => {
    t.is(req.url, '/foo1/bar1/kuux')
  })

  findMyWay.on('GET', '*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.lookup(
    { method: 'GET', url: '/foo1/bar1/kuux' },
    null
  )
})

test('Nested wildcards with parametric and static - 1', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('we should not be here, the url is: ' + req.url)
    }
  })

  findMyWay.on('GET', '*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo1/*', (req, res, params) => {
    t.is(req.url, '/foo1/bar1/kuux')
  })

  findMyWay.on('GET', '/foo2/*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo3/:param', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo4/param', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.lookup(
    { method: 'GET', url: '/foo1/bar1/kuux' },
    null
  )
})

test('Nested wildcards with parametric and static - 2', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('we should not be here, the url is: ' + req.url)
    }
  })

  findMyWay.on('GET', '*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo1/*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo2/*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo3/:param', (req, res, params) => {
    t.is(req.url, '/foo3/bar1')
  })

  findMyWay.on('GET', '/foo4/param', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.lookup(
    { method: 'GET', url: '/foo3/bar1' },
    null
  )
})

test('Nested wildcards with parametric and static - 3', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('we should not be here, the url is: ' + req.url)
    }
  })

  findMyWay.on('GET', '*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo1/*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo2/*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo3/:param', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo4/param', (req, res, params) => {
    t.is(req.url, '/foo4/param')
  })

  findMyWay.lookup(
    { method: 'GET', url: '/foo4/param' },
    null
  )
})

test('Nested wildcards with parametric and static - 4', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('we should not be here, the url is: ' + req.url)
    }
  })

  findMyWay.on('GET', '*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo1/*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo2/*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo3/:param', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo1/param', (req, res, params) => {
    t.is(req.url, '/foo1/param')
  })

  findMyWay.lookup(
    { method: 'GET', url: '/foo1/param' },
    null
  )
})

test('Nested wildcards with parametric and static - 5', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('we should not be here, the url is: ' + req.url)
    }
  })

  findMyWay.on('GET', '*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo1/*', (req, res, params) => {
    t.is(req.url, '/foo1/param/hello/test/long/routee')
  })

  findMyWay.on('GET', '/foo2/*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo3/:param', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo1/param/hello/test/long/route', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.lookup(
    { method: 'GET', url: '/foo1/param/hello/test/long/routee' },
    null
  )
})

test('Nested wildcards with parametric and static - 6', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('we should not be here, the url is: ' + req.url)
    }
  })

  findMyWay.on('GET', '*', (req, res, params) => {
    t.is(req.url, '/foo4/param/hello/test/long/routee')
  })

  findMyWay.on('GET', '/foo1/*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo2/*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo3/:param', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo4/param/hello/test/long/route', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.lookup(
    { method: 'GET', url: '/foo4/param/hello/test/long/routee' },
    null
  )
})

test('Nested wildcards with parametric and static - 7', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('we should not be here, the url is: ' + req.url)
    }
  })

  findMyWay.on('GET', '*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo1/*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo2/*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo3/:param', (req, res, params) => {
    t.is(req.url, '/foo3/hello')
  })

  findMyWay.on('GET', '/foo3/*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo4/param/hello/test/long/route', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.lookup(
    { method: 'GET', url: '/foo3/hello' },
    null
  )
})

test('Nested wildcards with parametric and static - 8', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.fail('we should not be here, the url is: ' + req.url)
    }
  })

  findMyWay.on('GET', '*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo1/*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo2/*', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo3/:param', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.on('GET', '/foo3/*', (req, res, params) => {
    t.is(req.url, '/foo3/hello/world')
  })

  findMyWay.on('GET', '/foo4/param/hello/test/long/route', (req, res, params) => {
    t.fail('we should not be here, the url is: ' + req.url)
  })

  findMyWay.lookup(
    { method: 'GET', url: '/foo3/hello/world' },
    null
  )
})
