'use strict'

const { test } = require('node:test')
const { execFileSync } = require('node:child_process')
const FindMyWay = require('../')

test('If onBadUrl is defined, then a bad url should be handled differently (find)', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.assert.fail('Should not be defaultRoute')
    },
    onBadUrl: (path, req, res) => {
      t.assert.equal(path, '/%world', { todo: 'this is not executed' })
    }
  })

  findMyWay.on('GET', '/hello/:id', (req, res) => {
    t.assert.fail('Should not be here')
  })

  const handle = findMyWay.find('GET', '/hello/%world')
  t.assert.notDeepStrictEqual(handle, null)
})

test('If onBadUrl is defined, then a bad url should be handled differently (lookup)', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.assert.fail('Should not be defaultRoute')
    },
    onBadUrl: (path, req, res) => {
      t.assert.equal(path, '/hello/%world')
    }
  })

  findMyWay.on('GET', '/hello/:id', (req, res) => {
    t.assert.fail('Should not be here')
  })

  findMyWay.lookup({ method: 'GET', url: '/hello/%world', headers: {} }, null)
})

test('If onBadUrl is not defined, then we should call the defaultRoute (find)', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.assert.fail('Should not be defaultRoute')
    }
  })

  findMyWay.on('GET', '/hello/:id', (req, res) => {
    t.assert.fail('Should not be here')
  })

  const handle = findMyWay.find('GET', '/hello/%world')
  t.assert.equal(handle, null)
})

test('If onBadUrl is not defined, then we should call the defaultRoute (lookup)', t => {
  t.plan(1)
  const findMyWay = FindMyWay({
    defaultRoute: (req, res) => {
      t.assert.ok('Everything fine')
    }
  })

  findMyWay.on('GET', '/hello/:id', (req, res) => {
    t.assert.fail('Should not be here')
  })

  findMyWay.lookup({ method: 'GET', url: '/hello/%world', headers: {} }, null)
})

test('absolute urls work when Error is frozen', t => {
  const script = `
    'use strict'
    Object.freeze(Error)
    const findMyWay = require(${JSON.stringify(require.resolve('../'))})({ onBadUrl: () => {} })
    findMyWay.on('GET', '/hello/:id', () => {})
    process.stdout.write(JSON.stringify([
      findMyWay.find('GET', 'http://example.com/hello/world').params,
      findMyWay.find('GET', 'http://[invalid/hello/world') !== null
    ]))
  `
  const output = execFileSync(process.execPath, ['-e', script], { encoding: 'utf8' })
  t.assert.deepEqual(JSON.parse(output), [{ id: 'world' }, true])
})

test('absolute urls are validated without URL.parse', t => {
  const script = `
    'use strict'
    delete URL.parse
    const findMyWay = require(${JSON.stringify(require.resolve('../'))})({ onBadUrl: () => {} })
    findMyWay.on('GET', '/hello/:id', () => {})
    process.stdout.write(JSON.stringify([
      findMyWay.find('GET', 'http://example.com/hello/world').params,
      findMyWay.find('GET', 'http://[invalid/hello/world') !== null
    ]))
  `
  const output = execFileSync(process.execPath, ['-e', script], { encoding: 'utf8' })
  t.assert.deepEqual(JSON.parse(output), [{ id: 'world' }, true])
})
