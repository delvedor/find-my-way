'use strict'

// Preload that makes every router created by the test suite use the compiled
// lookup, so the whole suite exercises compile() instead of the tree walk:
//
//   NODE_OPTIONS=--require=./test/helpers/compiled-lookup-preload.js borp
//
// The exported constructor is wrapped so each new router behaves as if
// compile() had been called: find() and lookup() dispatch to the compiled
// functions, which are built lazily on the first lookup after a change.
// The prototype is shared with the real Router, so FindMyWay.prototype.find
// is still the tree walk for tests that want the reference behaviour.

const path = require('node:path')

const indexPath = require.resolve(path.join(__dirname, '..', '..'))
const Router = require(indexPath)

function CompiledRouter (opts) {
  const router = new Router(opts)
  router.find = Router.prototype._findCompiled
  router.lookup = Router.prototype._lookupCompiled
  return router
}

CompiledRouter.prototype = Router.prototype
Object.setPrototypeOf(CompiledRouter, Router)

require.cache[indexPath].exports = CompiledRouter
