const t = require('tap')
const test = t.test
const FindMyWay = require('..')
const { StaticNode } = require('../lib/node')
const proxyquire = require('proxyquire')
const HandlerStorage = require('../lib/handler-storage')
const Constrainer = require('../lib/constrainer')
const { safeDecodeURIComponent } = require('../lib/url-sanitizer')
const acceptVersionStrategy = require('../lib/strategies/accept-version')
const httpMethodStrategy = require('../lib/strategies/http-method')

test('should throw an error if unexpected node kind', (t) => {
  t.plan(1)

  const findMyWay = FindMyWay()

  const savedGetNextNode = StaticNode.prototype.getNextNode
  StaticNode.prototype.getNextNode = () => {
    return { kind: 6 }
  }

  findMyWay.get('/a', () => {})
  t.throws(() => findMyWay.find('GET', '/a'), new Error('Unexpected node kind 6'))

  StaticNode.prototype.getNextNode = savedGetNextNode
})

test('FULL_PATH_REGEXP and OPTIONAL_PARAM_REGEXP should be considered safe', (t) => {
  t.plan(1)

  t.doesNotThrow(() => require('..'))
})

test('should throw an error for unsafe FULL_PATH_REGEXP', (t) => {
  t.plan(1)

  t.throws(() => proxyquire('..', {
    'safe-regex2': () => false
  }), new Error('the FULL_PATH_REGEXP is not safe, update this module'))
})

test('Should throw an error for unsafe OPTIONAL_PARAM_REGEXP', (t) => {
  t.plan(1)

  let callCount = 0
  t.throws(() => proxyquire('..', {
    'safe-regex2': () => {
      return ++callCount < 2
    }
  }), new Error('the OPTIONAL_PARAM_REGEXP is not safe, update this module'))
})

test('Should find an error if httpMethods contain duplicates', (t) => {
  t.plan(2)

  t.doesNotThrow(() => proxyquire.noCallThru()('../index', {
    './lib/http-methods': ['GET']
  }))

  t.throws(() => proxyquire.noCallThru()('../index', {
    './lib/http-methods': ['GET', 'GET']
  }), new Error('Method already exists: get'))
})

test('double colon does not define parametric node', (t) => {
  t.plan(2)

  const findMyWay = FindMyWay()

  findMyWay.get('/::id', () => {})
  const route1 = findMyWay.findRoute('GET', '/::id')
  t.strictSame(route1.params, [])

  findMyWay.get('/:foo(\\d+)::bar', () => {})
  const route2 = findMyWay.findRoute('GET', '/:foo(\\d+)::bar')
  t.strictSame(route2.params, ['foo'])
})

test('should return null if no wildchar child', (t) => {
  t.plan(2)

  const findMyWay = FindMyWay()

  findMyWay.get('*', () => {})
  t.ok(findMyWay.findRoute('GET', '*'))

  const savedGetWildcardChild = StaticNode.prototype.getWildcardChild
  StaticNode.prototype.getWildcardChild = () => null
  t.equal(findMyWay.findRoute('GET', '*'), null)

  StaticNode.prototype.getWildcardChild = savedGetWildcardChild
})

test('case insensitive static routes', (t) => {
  t.plan(3)

  const findMyWay = FindMyWay({
    caseSensitive: false
  })

  findMyWay.get('/foo', () => {})
  findMyWay.get('/foo/bar', () => {})
  findMyWay.get('/foo/bar/baz', () => {})

  t.ok(findMyWay.findRoute('GET', '/FoO'))
  t.ok(findMyWay.findRoute('GET', '/FOo/Bar'))
  t.ok(findMyWay.findRoute('GET', '/fOo/Bar/bAZ'))
})

test('wildcard must be the last character in the route', (t) => {
  t.plan(3)

  const expectedError = new Error('Wildcard must be the last character in the route')

  const findMyWay = FindMyWay()

  findMyWay.get('*', () => {})
  t.throws(() => findMyWay.findRoute('GET', '*1'), expectedError)
  t.throws(() => findMyWay.findRoute('GET', '*/'), expectedError)
  t.throws(() => findMyWay.findRoute('GET', '*?'), expectedError)
})

test('findRoute normalizes wildcard patterns with leading slash', (t) => {
  t.plan(4)

  const findMyWay = FindMyWay()
  findMyWay.get('*', () => {})

  t.equal(findMyWay.routes.length, 1)
  // will match with leading slash
  t.equal(findMyWay.routes[0].pattern, '/*')

  t.ok(findMyWay.findRoute('GET', '*'))

  // will fail if we remove it
  findMyWay.routes[0].pattern = '*'

  t.equal(findMyWay.findRoute('GET', '*'), null)
})

test('findRoute should default route params to empty array if not defined', (t) => {
  t.plan(4)

  const findMyWay = FindMyWay()
  findMyWay.get('/', () => {})

  t.equal(findMyWay.routes.length, 1)
  t.strictSame(findMyWay.routes[0].params, [])
  t.strictSame(findMyWay.findRoute('GET', '/').params, [])

  findMyWay.routes[0].params = undefined
  t.strictSame(findMyWay.findRoute('GET', '/').params, [])
})

test('name test', (t) => {
  t.plan(4)

  const findMyWay = FindMyWay()
  findMyWay.get('/', () => {})

  t.equal(findMyWay.routes.length, 1)
  t.strictSame(findMyWay.routes[0].params, [])
  t.strictSame(findMyWay.findRoute('GET', '/').params, [])

  findMyWay.routes[0].params = undefined
  t.strictSame(findMyWay.findRoute('GET', '/').params, [])
})

test('does not find the route if maxParamLength is exceeded', t => {
  t.plan(2)
  const findMyWay = FindMyWay({
    maxParamLength: 2
  })

  findMyWay.get('/:id(\\d+)', () => {})

  t.equal(findMyWay.find('GET', '/123'), null)
  t.ok(findMyWay.find('GET', '/12'))
})

test('Should check if a regex is safe to use', (t) => {
  t.plan(1)

  const findMyWay = FindMyWay()

  // we must pass a safe regex to register the route
  // findRoute will still throws the expected assertion error if we try to access it with unsafe reggex
  findMyWay.get('/test/:id(\\d+)', () => {})

  const unSafeRegex = /(x+x+)+y/
  t.throws(() => findMyWay.findRoute('GET', `/test/:id(${unSafeRegex.toString()})`), {
    message: "The regex '(/(x+x+)+y/)' is not safe!"
  })
})

test('Disable safe regex check', (t) => {
  t.plan(1)

  const findMyWay = FindMyWay({ allowUnsafeRegex: true })

  const unSafeRegex = /(x+x+)+y/
  findMyWay.get(`/test2/:id(${unSafeRegex.toString()})`, () => {})
  t.doesNotThrow(() => findMyWay.findRoute('GET', `/test2/:id(${unSafeRegex.toString()})`))
})

test('throws error if no strategy registered for constraint key', (t) => {
  t.plan(2)

  const constrainer = new Constrainer()
  const error = new Error('No strategy registered for constraint key invalid-constraint')
  t.throws(() => constrainer.newStoreForConstraint('invalid-constraint'), error)
  t.throws(() => constrainer.validateConstraints({ 'invalid-constraint': 'foo' }), error)
})

test('throws error if pass an undefined constraint value', (t) => {
  t.plan(1)

  const constrainer = new Constrainer()
  const error = new Error('Can\'t pass an undefined constraint value, must pass null or no key at all')
  t.throws(() => constrainer.validateConstraints({ key: undefined }), error)
})

test('throws error for unknown non-custom strategy for compiling constraint derivation function', (t) => {
  t.plan(1)

  const constrainer = new Constrainer()
  constrainer.strategies['unknown-non-custom-strategy'] = {}

  const error = new Error('unknown non-custom strategy for compiling constraint derivation function')
  t.throws(() => constrainer.noteUsage({ 'unknown-non-custom-strategy': {} }), error)
})

test('getMatchingHandler should return null if not compiled', (t) => {
  t.plan(1)

  const handlerStorage = new HandlerStorage()
  t.equal(handlerStorage.getMatchingHandler({ foo: 'bar' }), null)
})

test('safeDecodeURIComponent should replace %3x to null for every x that is not a valid lowchar', (t) => {
  t.plan(1)

  t.equal(safeDecodeURIComponent('Hello%3xWorld'), 'HellonullWorld')
})

test('SemVerStore version should be a string', (t) => {
  t.plan(1)

  const Storage = acceptVersionStrategy.storage

  t.throws(() => new Storage().set(1), new TypeError('Version should be a string'))
})

test('httpMethodStrategy storage handles set and get operations correctly', (t) => {
  t.plan(2)

  const storage = httpMethodStrategy.storage()

  t.equal(storage.get('foo'), null)

  storage.set('foo', { bar: 'baz' })
  t.strictSame(storage.get('foo'), { bar: 'baz' })
})

test('if buildPrettyMeta argument is undefined, will return an object', (t) => {
  t.plan(1)

  const findMyWay = FindMyWay()
  t.sameStrict(findMyWay.buildPrettyMeta(undefined), {})
})
