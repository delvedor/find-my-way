'use strict'

const { test } = require('node:test')
const FindMyWay = require('../')

// Builds the same router twice: once using the tree walk, once compiled.
function routers (opts, register) {
  const walking = FindMyWay(opts)
  walking.find = FindMyWay.prototype.find // the suite may run with the compiled-lookup preload
  register(walking)

  const compiling = FindMyWay(opts)
  register(compiling)
  compiling.compile()

  return [['walking', walking], ['compiled', compiling]]
}

// Counts the regex executions of route regexes whose source contains marker.
function spyRegexExec (t, marker) {
  const exec = RegExp.prototype.exec
  const spy = { calls: 0 }
  RegExp.prototype.exec = function (str) { // eslint-disable-line no-extend-native
    if (this.source.includes(marker)) spy.calls++
    return exec.call(this, str)
  }
  t.after(() => { RegExp.prototype.exec = exec }) // eslint-disable-line no-extend-native
  return spy
}

test('maxParamLength bounds the input of a regex route before the regex runs', t => {
  const spy = spyRegexExec(t, '(a|aa)')
  const opts = { maxParamLength: 10, onMaxParamLength: () => 'too long' }

  for (const [mode, router] of routers(opts, r => r.on('GET', '/regex/:id(^(a|aa)+$)', () => 'regex'))) {
    spy.calls = 0
    const tooLong = router.find('GET', '/regex/' + 'a'.repeat(1000) + '!')
    t.assert.strictEqual(tooLong.handler(), 'too long', mode)
    t.assert.strictEqual(spy.calls, 0, `${mode}: regex must not run on an over-long segment`)

    spy.calls = 0
    const justTooLong = router.find('GET', '/regex/' + 'a'.repeat(11))
    t.assert.strictEqual(justTooLong.handler(), 'too long', mode)
    t.assert.strictEqual(spy.calls, 0, `${mode}: regex must not run on an over-long segment`)

    const max = router.find('GET', '/regex/' + 'a'.repeat(10))
    t.assert.strictEqual(max.handler(), 'regex', mode)
    t.assert.strictEqual(max.params.id, 'a'.repeat(10), mode)
  }
})

test('maxParamLength bounds a backtracking regex route without onMaxParamLength', t => {
  for (const [mode, router] of routers({ maxParamLength: 10 }, r => r.on('GET', '/regex/:id(^(a|aa)+$)', () => 'regex'))) {
    t.assert.strictEqual(router.find('GET', '/regex/' + 'a'.repeat(1000) + '!'), null, mode)
    t.assert.strictEqual(router.find('GET', '/regex/aaaa').handler(), 'regex', mode)
  }
})

test('maxParamLength applies per parameter on regex nodes with several parameters', t => {
  const register = r => {
    r.on('GET', '/geo/:lat-:lng', () => 'geo')
    r.on('GET', '/file/:name.:ext', () => 'file')
    r.on('GET', '/suffix/:param(^\\w{3})bar', () => 'suffix')
    r.on('GET', '/multi/:a(^\\d+)-:b(^\\d+).json', () => 'multi')
  }

  for (const [mode, router] of routers({ maxParamLength: 5 }, register)) {
    const geo = router.find('GET', '/geo/12345-67890')
    t.assert.strictEqual(geo.handler(), 'geo', mode)
    t.assert.deepStrictEqual({ ...geo.params }, { lat: '12345', lng: '67890' }, mode)
    t.assert.strictEqual(router.find('GET', '/geo/123456-7890'), null, mode)
    t.assert.strictEqual(router.find('GET', '/geo/12345-678901'), null, mode)

    const file = router.find('GET', '/file/hello.json')
    t.assert.deepStrictEqual({ ...file.params }, { name: 'hello', ext: 'json' }, mode)

    const suffix = router.find('GET', '/suffix/abcbar')
    t.assert.strictEqual(suffix.handler(), 'suffix', mode)
    t.assert.deepStrictEqual({ ...suffix.params }, { param: 'abc' }, mode)

    const multi = router.find('GET', '/multi/12345-67890.json')
    t.assert.strictEqual(multi.handler(), 'multi', mode)
    t.assert.deepStrictEqual({ ...multi.params }, { a: '12345', b: '67890' }, mode)
    t.assert.strictEqual(router.find('GET', '/multi/12345-678901.json'), null, mode)
  }
})
