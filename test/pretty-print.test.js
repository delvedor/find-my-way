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

  const expected = `/
├ test (GET) 
│ └── /hello (GET) 
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

  const expected = `/
├ test (GET) 
│ └ /
│   └── :hello (GET) 
└ hello/
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

  const expected = `/
└ test (GET) 
  └ /
    └ :
      ├── :hello (GET) 
      ├── :hello (POST) 
      │ 
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

  const expected = `/
├ test (GET) 
│ └ /
│   └── * (GET) 
└ hello/
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

  const expected = `/
└ test (GET) 
  └ /hello
    ├ /
    │ └── :
    │     ├── :id (GET) 
    │     └── :id (POST) 
    │     
    └── world (GET) 
`

  t.is(typeof tree, 'string')
  t.equal(tree, expected)
})

test('pretty print - handle multiple handlers in parametric route properly', t => {
  t.plan(2)

  const findMyWay = FindMyWay()
  findMyWay.on('GET', '/:a', () => {})
  findMyWay.on('POST', '/:b', () => {})
  findMyWay.on('POST', '/c', () => {})

  const tree = findMyWay.prettyPrint()

  const expected = `/
├── :
│   ├── :a (GET) 
│   └── :b (POST) 
│   
└── c (POST) 
`

  t.is(typeof tree, 'string')
  t.equal(tree, expected)
})

test('pretty print - log handler`s name', t => {
  t.plan(2)

  const findMyWay = FindMyWay()
  findMyWay.on('GET', '/:a', function functionA () {})
  findMyWay.on('POST', '/:b', function functionB () {})
  findMyWay.on('POST', '/c', function functionC () {})

  const tree = findMyWay.prettyPrint()

  const expected = `/
├── :
│   ├── :a (GET) functionA
│   └── :b (POST) functionB
│   
└── c (POST) functionC
`

  t.is(typeof tree, 'string')
  t.equal(tree, expected)
})
