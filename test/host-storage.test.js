const acceptHostStrategy = require('../lib/strategies/accept-host')

const { test } = require('node:test')

test('can get hosts by exact matches', async (t) => {
  const storage = acceptHostStrategy.storage()
  t.assert.equal(storage.get('fastify.io'), undefined)
  storage.set('fastify.io', true)
  t.assert.equal(storage.get('fastify.io'), true)
})

test('can get hosts by regexp matches', async (t) => {
  const storage = acceptHostStrategy.storage()
  t.assert.equal(storage.get('fastify.io'), undefined)
  storage.set(/.+fastify\.io/, true)
  t.assert.equal(storage.get('foo.fastify.io'), true)
  t.assert.equal(storage.get('bar.fastify.io'), true)
})

test('exact host matches take precendence over regexp matches', async (t) => {
  const storage = acceptHostStrategy.storage()
  storage.set(/.+fastify\.io/, 'wildcard')
  storage.set('auth.fastify.io', 'exact')
  t.assert.equal(storage.get('foo.fastify.io'), 'wildcard')
  t.assert.equal(storage.get('bar.fastify.io'), 'wildcard')
  t.assert.equal(storage.get('auth.fastify.io'), 'exact')
})

test('regex cache is invalidated when a new regexp is added', async (t) => {
  const storage = acceptHostStrategy.storage()
  storage.set(/.+fastify\.io/, 'first')
  t.assert.equal(storage.get('foo.fastify.io'), 'first')
  t.assert.equal(storage.get('bar.example.com'), undefined)
  storage.set(/.+example\.com/, 'second')
  t.assert.equal(storage.get('bar.example.com'), 'second')
  t.assert.equal(storage.get('foo.fastify.io'), 'first')
})

test('stateful regex flags (g, y) are stripped to ensure deterministic caching', async (t) => {
  const storage = acceptHostStrategy.storage()
  storage.set(/.+fastify\.io/g, 'wildcard')
  t.assert.equal(storage.get('foo.fastify.io'), 'wildcard')
  t.assert.equal(storage.get('bar.fastify.io'), 'wildcard')
  t.assert.equal(storage.get('baz.fastify.io'), 'wildcard')
  const storage2 = acceptHostStrategy.storage()
  storage2.set(/.+fastify\.io/y, 'wildcard')
  t.assert.equal(storage2.get('foo.fastify.io'), 'wildcard')
  t.assert.equal(storage2.get('bar.fastify.io'), 'wildcard')
  t.assert.equal(storage2.get('baz.fastify.io'), 'wildcard')
})
