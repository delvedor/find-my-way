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
    /test (GET) {"host":"auth.fastify.io"}
    └── /:hello (GET)
        /:hello (GET) {"version":"1.1.2"}
        /:hello (GET) {"version":"2.0.0"}
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
  findMyWay.on('PUT', '/test/:hello', () => {})
  findMyWay.on('GET', '/test/:hello', { constraints: { version: '1.1.2' } }, () => {})
  findMyWay.on('GET', '/test/:hello', { constraints: { version: '2.0.0' } }, () => {})

  const arrayTree = findMyWay.prettyPrint({ commonPrefix: false })
  const arrayExpected = `└── / (-)
    └── test (GET)
        test (GET) {"host":"auth.fastify.io"}
        └── /:hello (GET, PUT)
            /:hello (GET) {"version":"1.1.2"}
            /:hello (GET) {"version":"2.0.0"}
`
  t.is(typeof arrayTree, 'string')
  t.equal(arrayTree, arrayExpected)
})

test('pretty print includeMeta - commonPrefix: true', t => {
  t.plan(6)

  const findMyWay = FindMyWay()
  const namedFunction = () => {}
  const store = {
    onRequest: [() => {}, namedFunction],
    onTimeout: [() => {}],
    genericMeta: 'meta',
    mixedMeta: ['mixed items', { an: 'object' }],
    objectMeta: { one: '1', two: 2 },
    functionMeta: namedFunction
  }

  findMyWay.on('GET', '/test', () => {}, store)
  findMyWay.on('GET', '/test', { constraints: { host: 'auth.fastify.io' } }, () => {}, store)
  findMyWay.on('GET', '/testing/:hello', () => {}, store)
  findMyWay.on('PUT', '/tested/:hello', () => {}, store)
  findMyWay.on('GET', '/test/:hello', { constraints: { version: '1.1.2' } }, () => {})
  findMyWay.on('GET', '/test/:hello', { constraints: { version: '2.0.0' } }, () => {})

  const radixTree = findMyWay.prettyPrint({ commonPrefix: true, includeMeta: true })
  const radixTreeExpected = `└── /
    ├── test (GET)
    │   • (onRequest) ["anonymous()","namedFunction()"]
    │   • (onTimeout) ["anonymous()"]
    │   • (genericMeta) "meta"
    │   • (mixedMeta) ["mixed items",{"an":"object"}]
    │   • (objectMeta) {"one":"1","two":2}
    │   • (functionMeta) "namedFunction()"
    │   test (GET) {"host":"auth.fastify.io"}
    │   • (onRequest) ["anonymous()","namedFunction()"]
    │   • (onTimeout) ["anonymous()"]
    │   • (genericMeta) "meta"
    │   • (mixedMeta) ["mixed items",{"an":"object"}]
    │   • (objectMeta) {"one":"1","two":2}
    │   • (functionMeta) "namedFunction()"
    │   ├── ing/:hello (GET)
    │   │   • (onRequest) ["anonymous()","namedFunction()"]
    │   │   • (onTimeout) ["anonymous()"]
    │   │   • (genericMeta) "meta"
    │   │   • (mixedMeta) ["mixed items",{"an":"object"}]
    │   │   • (objectMeta) {"one":"1","two":2}
    │   │   • (functionMeta) "namedFunction()"
    │   └── /:hello (GET) {"version":"1.1.2"}
    │       /:hello (GET) {"version":"2.0.0"}
    └── tested/:hello (PUT)
        • (onRequest) ["anonymous()","namedFunction()"]
        • (onTimeout) ["anonymous()"]
        • (genericMeta) "meta"
        • (mixedMeta) ["mixed items",{"an":"object"}]
        • (objectMeta) {"one":"1","two":2}
        • (functionMeta) "namedFunction()"
`
  const radixTreeSpecific = findMyWay.prettyPrint({ commonPrefix: true, includeMeta: ['onTimeout', 'objectMeta', 'nonExistent'] })
  const radixTreeSpecificExpected = `└── /
    ├── test (GET)
    │   • (onTimeout) ["anonymous()"]
    │   • (objectMeta) {"one":"1","two":2}
    │   test (GET) {"host":"auth.fastify.io"}
    │   • (onTimeout) ["anonymous()"]
    │   • (objectMeta) {"one":"1","two":2}
    │   ├── ing/:hello (GET)
    │   │   • (onTimeout) ["anonymous()"]
    │   │   • (objectMeta) {"one":"1","two":2}
    │   └── /:hello (GET) {"version":"1.1.2"}
    │       /:hello (GET) {"version":"2.0.0"}
    └── tested/:hello (PUT)
        • (onTimeout) ["anonymous()"]
        • (objectMeta) {"one":"1","two":2}
`

  const radixTreeNoMeta = findMyWay.prettyPrint({ commonPrefix: true, includeMeta: false })
  const radixTreeNoMetaExpected = `└── /
    ├── test (GET)
    │   test (GET) {"host":"auth.fastify.io"}
    │   ├── ing/:hello (GET)
    │   └── /:hello (GET) {"version":"1.1.2"}
    │       /:hello (GET) {"version":"2.0.0"}
    └── tested/:hello (PUT)
`

  t.is(typeof radixTree, 'string')
  t.equal(radixTree, radixTreeExpected)

  t.is(typeof radixTreeSpecific, 'string')
  t.equal(radixTreeSpecific, radixTreeSpecificExpected)

  t.is(typeof radixTreeNoMeta, 'string')
  t.equal(radixTreeNoMeta, radixTreeNoMetaExpected)
})

test('pretty print includeMeta - commonPrefix: false', t => {
  t.plan(6)

  const findMyWay = FindMyWay()
  const namedFunction = () => {}
  const store = {
    onRequest: [() => {}, namedFunction],
    onTimeout: [() => {}],
    genericMeta: 'meta',
    mixedMeta: ['mixed items', { an: 'object' }],
    objectMeta: { one: '1', two: 2 },
    functionMeta: namedFunction
  }

  findMyWay.on('GET', '/test', () => {}, store)
  findMyWay.on('GET', '/test', { constraints: { host: 'auth.fastify.io' } }, () => {}, store)
  findMyWay.on('GET', '/test/:hello', () => {}, store)
  findMyWay.on('PUT', '/test/:hello', () => {}, store)
  findMyWay.on('GET', '/test/:hello', { constraints: { version: '1.1.2' } }, () => {})
  findMyWay.on('GET', '/test/:hello', { constraints: { version: '2.0.0' } }, () => {})

  const arrayTree = findMyWay.prettyPrint({ commonPrefix: false, includeMeta: true })
  const arrayExpected = `└── / (-)
    └── test (GET)
        • (onRequest) ["anonymous()","namedFunction()"]
        • (onTimeout) ["anonymous()"]
        • (genericMeta) "meta"
        • (mixedMeta) ["mixed items",{"an":"object"}]
        • (objectMeta) {"one":"1","two":2}
        • (functionMeta) "namedFunction()"
        test (GET) {"host":"auth.fastify.io"}
        • (onRequest) ["anonymous()","namedFunction()"]
        • (onTimeout) ["anonymous()"]
        • (genericMeta) "meta"
        • (mixedMeta) ["mixed items",{"an":"object"}]
        • (objectMeta) {"one":"1","two":2}
        • (functionMeta) "namedFunction()"
        └── /:hello (GET, PUT)
            • (onRequest) ["anonymous()","namedFunction()"]
            • (onTimeout) ["anonymous()"]
            • (genericMeta) "meta"
            • (mixedMeta) ["mixed items",{"an":"object"}]
            • (objectMeta) {"one":"1","two":2}
            • (functionMeta) "namedFunction()"
            /:hello (GET) {"version":"1.1.2"}
            /:hello (GET) {"version":"2.0.0"}
`

  const arraySpecific = findMyWay.prettyPrint({ commonPrefix: false, includeMeta: ['onRequest', 'mixedMeta', 'nonExistent'] })
  const arraySpecificExpected = `└── / (-)
    └── test (GET)
        • (onRequest) ["anonymous()","namedFunction()"]
        • (mixedMeta) ["mixed items",{"an":"object"}]
        test (GET) {"host":"auth.fastify.io"}
        • (onRequest) ["anonymous()","namedFunction()"]
        • (mixedMeta) ["mixed items",{"an":"object"}]
        └── /:hello (GET, PUT)
            • (onRequest) ["anonymous()","namedFunction()"]
            • (mixedMeta) ["mixed items",{"an":"object"}]
            /:hello (GET) {"version":"1.1.2"}
            /:hello (GET) {"version":"2.0.0"}
`
  const arrayNoMeta = findMyWay.prettyPrint({ commonPrefix: false, includeMeta: false })
  const arrayNoMetaExpected = `└── / (-)
    └── test (GET)
        test (GET) {"host":"auth.fastify.io"}
        └── /:hello (GET, PUT)
            /:hello (GET) {"version":"1.1.2"}
            /:hello (GET) {"version":"2.0.0"}
`

  t.is(typeof arrayTree, 'string')
  t.equal(arrayTree, arrayExpected)

  t.is(typeof arraySpecific, 'string')
  t.equal(arraySpecific, arraySpecificExpected)

  t.is(typeof arrayNoMeta, 'string')
  t.equal(arrayNoMeta, arrayNoMetaExpected)
})
