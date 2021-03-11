'use strict'

const t = require('tap')
const test = t.test
const FindMyWay = require('../')

test('pretty print - static routes', t => {
  t.plan(2)

  const findMyWay = FindMyWay()
  findMyWay.on('GET', '/test', () => {})
  findMyWay.on('GET', '/test/hello', () => {})
  findMyWay.on('GET', '/hello/world', () => {})

  const tree = findMyWay.prettyPrint()

  const expected = `└── /
    ├── test (GET)
    │   └── /hello (GET)
    └── hello/world (GET)
`

  t.is(typeof tree, 'string')
  t.equal(tree, expected)
})

test('pretty print - parametric routes', t => {
  t.plan(2)

  const findMyWay = FindMyWay()
  findMyWay.on('GET', '/test', () => {})
  findMyWay.on('GET', '/test/:hello', () => {})
  findMyWay.on('GET', '/hello/:world', () => {})

  const tree = findMyWay.prettyPrint()

  const expected = `└── /
    ├── test (GET)
    │   └── /:hello (GET)
    └── hello/:world (GET)
`

  t.is(typeof tree, 'string')
  t.equal(tree, expected)
})

test('pretty print - mixed parametric routes', t => {
  t.plan(2)

  const findMyWay = FindMyWay()
  findMyWay.on('GET', '/test', () => {})
  findMyWay.on('GET', '/test/:hello', () => {})
  findMyWay.on('POST', '/test/:hello', () => {})
  findMyWay.on('GET', '/test/:hello/world', () => {})

  const tree = findMyWay.prettyPrint()

  const expected = `└── /test (GET)
    └── /
        └── :hello (GET)
            :hello (POST)
            └── /world (GET)
`

  t.is(typeof tree, 'string')
  t.equal(tree, expected)
})

test('pretty print - wildcard routes', t => {
  t.plan(2)

  const findMyWay = FindMyWay()
  findMyWay.on('GET', '/test', () => {})
  findMyWay.on('GET', '/test/*', () => {})
  findMyWay.on('GET', '/hello/*', () => {})

  const tree = findMyWay.prettyPrint()

  const expected = `└── /
    ├── test (GET)
    │   └── /* (GET)
    └── hello/* (GET)
`

  t.is(typeof tree, 'string')
  t.equal(tree, expected)
})

test('pretty print - parametric routes with same parent and followed by a static route which has the same prefix with the former routes', t => {
  t.plan(2)

  const findMyWay = FindMyWay()
  findMyWay.on('GET', '/test', () => {})
  findMyWay.on('GET', '/test/hello/:id', () => {})
  findMyWay.on('POST', '/test/hello/:id', () => {})
  findMyWay.on('GET', '/test/helloworld', () => {})

  const tree = findMyWay.prettyPrint()

  const expected = `└── /test (GET)
    └── /hello
        ├── /
        │   └── :id (GET)
        │       :id (POST)
        └── world (GET)
`

  t.is(typeof tree, 'string')
  t.equal(tree, expected)
})

test('pretty print - constrained parametric routes', t => {
  t.plan(2)

  const findMyWay = FindMyWay()
  findMyWay.on('GET', '/test', () => {})
  findMyWay.on('GET', '/test', { constraints: { host: 'auth.fastify.io' } }, () => {})
  findMyWay.on('GET', '/test/:hello', () => {})
  findMyWay.on('GET', '/test/:hello', { constraints: { version: '1.1.2' } }, () => {})
  findMyWay.on('GET', '/test/:hello', { constraints: { version: '2.0.0' } }, () => {})

  const tree = findMyWay.prettyPrint()

  const expected = `└── /test (GET)
    /test (GET {"host":"auth.fastify.io"})
    └── /:hello (GET)
        /:hello (GET {"version":"1.1.2"})
        /:hello (GET {"version":"2.0.0"})
`

  t.is(typeof tree, 'string')
  t.equal(tree, expected)
})

test('pretty print - multiple parameters are drawn appropriately', t => {
  t.plan(2)

  const findMyWay = FindMyWay()
  findMyWay.on('GET', '/test', () => {})
  // routes with a nested parameter (i.e. no handler for the /:param) were breaking the display
  findMyWay.on('GET', '/test/:hello/there/:ladies', () => {})
  findMyWay.on('GET', '/test/:hello/there/:ladies/and/:gents', () => {})
  findMyWay.on('GET', '/test/are/:you/:ready/to/:rock', () => {})

  const tree = findMyWay.prettyPrint()

  const expected = `└── /test (GET)
    └── /
        ├── :hello/there/:ladies (GET)
        │   └── /and/:gents (GET)
        └── are/:you/:ready/to/:rock (GET)
`

  t.is(typeof tree, 'string')
  t.equal(tree, expected)
})

test('pretty print commonPrefix - use routes array to draw flattened routes', t => {
  t.plan(4)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test', () => {})
  findMyWay.on('GET', '/test/hello', () => {})
  findMyWay.on('GET', '/testing', () => {})
  findMyWay.on('GET', '/testing/:param', () => {})
  findMyWay.on('PUT', '/update', () => {})

  const radixTree = findMyWay.prettyPrint({ commonPrefix: true })
  const arrayTree = findMyWay.prettyPrint({ commonPrefix: false })

  const radixExpected = `└── /
    ├── test (GET)
    │   ├── /hello (GET)
    │   └── ing (GET)
    │       └── /:param (GET)
    └── update (PUT)
`
  const arrayExpected = `└── / (-)
    ├── test (GET)
    │   └── /hello (GET)
    ├── testing (GET)
    │   └── /:param (GET)
    └── update (PUT)
`

  t.is(typeof radixTree, 'string')
  t.is(typeof arrayTree, 'string')

  t.equal(radixTree, radixExpected)
  t.equal(arrayTree, arrayExpected)
})

test('pretty print commonPrefix - handle wildcard root', t => {
  t.plan(2)

  const findMyWay = FindMyWay()

  findMyWay.on('OPTIONS', '*', () => {})
  findMyWay.on('GET', '/test/hello', () => {})
  findMyWay.on('GET', '/testing', () => {})
  findMyWay.on('GET', '/testing/:param', () => {})
  findMyWay.on('PUT', '/update', () => {})

  const arrayTree = findMyWay.prettyPrint({ commonPrefix: false })
  const arrayExpected = `├── * (OPTIONS)
└── / (-)
    ├── test/hello (GET)
    ├── testing (GET)
    │   └── /:param (GET)
    └── update (PUT)
`

  t.is(typeof arrayTree, 'string')
  t.equal(arrayTree, arrayExpected)
})

test('pretty print commonPrefix - handle constrained routes', t => {
  t.plan(2)

  const findMyWay = FindMyWay()

  findMyWay.on('GET', '/test', () => {})
  findMyWay.on('GET', '/test', { constraints: { host: 'auth.fastify.io' } }, () => {})
  findMyWay.on('GET', '/test/:hello', () => {})
  findMyWay.on('GET', '/test/:hello', { constraints: { version: '1.1.2' } }, () => {})
  findMyWay.on('GET', '/test/:hello', { constraints: { version: '2.0.0' } }, () => {})

  const arrayTree = findMyWay.prettyPrint({ commonPrefix: false })
  const arrayExpected = `└── / (-)
    └── test (GET, GET {"host":"auth.fastify.io"})
        └── /:hello (GET, GET {"version":"1.1.2"}, GET {"version":"2.0.0"})
`
  t.is(typeof arrayTree, 'string')
  t.equal(arrayTree, arrayExpected)
})
