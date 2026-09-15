'use strict'

const { test } = require('node:test')
const FindMyWay = require('..')

test('sanitizeUrlPath should decode reserved characters inside params and strip querystring', t => {
  t.plan(1)

  const url = '/%65ncod%65d?foo=bar'
  const sanitized = FindMyWay.sanitizeUrlPath(url)

  t.assert.equal(sanitized, '/encoded')
})

test('sanitizeUrlPath should decode non-reserved characters but keep reserved encoded when not in params', t => {
  t.plan(1)

  const url = '/hello/%20world?foo=bar'
  const sanitized = FindMyWay.sanitizeUrlPath(url)

  t.assert.equal(sanitized, '/hello/ world')
})

test('sanitizeUrlPath should treat semicolon as queryparameter delimiter when enabled', t => {
  t.plan(2)

  const url = '/hello/%23world;foo=bar'

  const sanitizedWithDelimiter = FindMyWay.sanitizeUrlPath(url, true)
  t.assert.equal(sanitizedWithDelimiter, '/hello/#world')

  const sanitizedWithoutDelimiter = FindMyWay.sanitizeUrlPath(url, false)
  t.assert.equal(sanitizedWithoutDelimiter, '/hello/#world;foo=bar')
})

test('sanitizeUrlPath trigger an error if the url is invalid', t => {
  t.plan(1)

  const url = '/Hello%3xWorld/world'
  t.assert.throws(() => {
    FindMyWay.sanitizeUrlPath(url)
  }, 'URIError: URI malformed')
})

test('sanitizeUrlPath decodes a literal percent encoded as %25 exactly once', t => {
  t.plan(3)

  // %25 is the percent-encoded '%' char: it must survive the single decode as
  // a bare '%' and never be double decoded.
  t.assert.equal(FindMyWay.sanitizeUrlPath('/a%25b'), '/a%b')
  t.assert.equal(FindMyWay.sanitizeUrlPath('/100%25'), '/100%')
  // %25 followed by more percent-encoding still decodes only once.
  t.assert.equal(FindMyWay.sanitizeUrlPath('/a%25%20b'), '/a% b')
})

test('sanitizing a path full of %25 sequences stays linear', t => {
  t.plan(2)

  // Before the fix every %25 rebuilt the whole string, making the cost O(n^2):
  // a request target of thousands of %25 sequences exhausted CPU before
  // routing. With the single-pass rebuild this stays fast regardless of count.
  const url = '/' + '%25'.repeat(50000)
  const start = process.hrtime.bigint()
  const decoded = FindMyWay.sanitizeUrlPath(url)
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6

  t.assert.ok(decoded.length === 50001 && decoded.startsWith('/%'))
  // The quadratic implementation took ~4s for this input; the fixed one takes
  // a few ms. The generous bound catches a regression without being flaky.
  t.assert.ok(elapsedMs < 1000, `sanitize took ${elapsedMs.toFixed(1)}ms`)
})

test('routing a path full of %25 sequences is not quadratic', t => {
  t.plan(2)

  const findMyWay = FindMyWay()
  findMyWay.on('GET', '/x', () => {})

  const target = '/' + '%25'.repeat(50000)
  const start = process.hrtime.bigint()
  const result = findMyWay.find('GET', target)
  const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6

  t.assert.equal(result, null)
  // The O(n^2) re-encode took seconds for this target; the fixed one is ms.
  t.assert.ok(elapsedMs < 1000, `find took ${elapsedMs.toFixed(1)}ms`)
})
