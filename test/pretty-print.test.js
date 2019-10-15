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

test('pretty print - static routes with named functions', t => {
  t.plan(2)

  const findMyWay = FindMyWay()
  findMyWay.on('GET', '/test', function handler () {})
  findMyWay.on('POST', '/test/hello', function handler2 () {})
  findMyWay.on('PUT', '/hello/world', function handler3 () {})

  const tree = findMyWay.prettyPrint()

  const expected = `└── /
    ├── test (GET) handler
    │   └── /hello (POST) handler2
    └── hello/world (PUT) handler3
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
    │   └── /
    │       └── :hello (GET)
    └── hello/
        └── :world (GET)
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

  const expected = `└── /
    └── test (GET)
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
    │   └── /
    │       └── * (GET)
    └── hello/
        └── * (GET)
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

  const expected = `└── /
    └── test (GET)
        └── /hello
            ├── /
            │   └── :id (GET)
            │       :id (POST)
            └── world (GET)
`

  t.is(typeof tree, 'string')
  t.equal(tree, expected)
})

test('pretty print - parametric routes with named functions', t => {
  t.plan(2)

  const findMyWay = FindMyWay()
  findMyWay.on('GET', '/test', function handler () {})
  findMyWay.on('GET', '/test/hello/:id', function handler2 () {})
  findMyWay.on('POST', '/test/hello/:id', function handler3 () {})
  findMyWay.on('GET', '/test/helloworld', function handler4 () {})

  const tree = findMyWay.prettyPrint()

  const expected = `└── /
    └── test (GET) handler
        └── /hello
            ├── /
            │   └── :id (GET) handler2
            │       :id (POST) handler3
            └── world (GET) handler4
`

  t.is(typeof tree, 'string')
  t.equal(tree, expected)
})
