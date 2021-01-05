const acceptHostStrategy = require('../lib/strategies/accept-host')

const t = require('tap')

t.test('can get hosts by exact matches', async (t) => {
  const storage = acceptHostStrategy.storage()
  t.strictEquals(storage.get('fastify.io'), undefined)
  storage.set('fastify.io', true)
  t.strictEquals(storage.get('fastify.io'), true)
})

t.test('can get hosts by regexp matches', async (t) => {
  const storage = acceptHostStrategy.storage()
  t.strictEquals(storage.get('fastify.io'), undefined)
  storage.set(/.+fastify\.io/, true)
  t.strictEquals(storage.get('foo.fastify.io'), true)
  t.strictEquals(storage.get('bar.fastify.io'), true)
})

t.test('exact host matches take precendence over regexp matches', async (t) => {
  const storage = acceptHostStrategy.storage()
  storage.set(/.+fastify\.io/, 'wildcard')
  storage.set('auth.fastify.io', 'exact')
  t.strictEquals(storage.get('foo.fastify.io'), 'wildcard')
  t.strictEquals(storage.get('bar.fastify.io'), 'wildcard')
  t.strictEquals(storage.get('auth.fastify.io'), 'exact')
})

t.test('exact host matches can be removed', async (t) => {
  const storage = acceptHostStrategy.storage()
  storage.set('fastify.io', true)
  t.strictEquals(storage.get('fastify.io'), true)
  storage.del('fastify.io')
  t.strictEquals(storage.get('fastify.io'), undefined)
})

t.test('regexp host matches can be removed', async (t) => {
  const storage = acceptHostStrategy.storage()
  t.strictEquals(storage.get('fastify.io'), undefined)
  storage.set(/.+fastify\.io/, true)
  t.strictEquals(storage.get('foo.fastify.io'), true)
  storage.del(/.+fastify\.io/)
  t.strictEquals(storage.get('foo.fastify.io'), undefined)
})

t.test('storage can be emptied', async (t) => {
  const storage = acceptHostStrategy.storage()
  storage.set(/.+fastify\.io/, 'wildcard')
  storage.set('auth.fastify.io', 'exact')
  storage.empty()
  t.strictEquals(storage.get('fastify.io'), undefined)
  t.strictEquals(storage.get('foo.fastify.io'), undefined)
})
