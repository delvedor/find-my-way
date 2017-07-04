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
