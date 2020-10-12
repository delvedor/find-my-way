'use strict'

const assert = require('assert')

function ConstraintsStore (stores) {
  if (!(this instanceof ConstraintsStore)) {
    return new ConstraintsStore(stores)
  }
  this.storeIdCounter = 1
  this.stores = stores
  this.storeMap = new Map()
}

ConstraintsStore.prototype.set = function (constraints, store) {
  // TODO: Should I check for existence of at least one constraint?
  if (typeof constraints !== 'object' || constraints === null) {
    throw new TypeError('Constraints should be an object')
  }

  const storeId = this.storeIdCounter++
  this.storeMap.set(storeId, store)

  var kConstraint
  const kConstraints = Object.keys(constraints)
  for (var i = 0; i < kConstraints.length; i++) {
    kConstraint = kConstraints[i]
    assert(this.stores[kConstraint] !== null, `No strategy available for handling the constraint '${kConstraint}'`)
    this.stores[kConstraint].set(constraints[kConstraint], storeId)
  }

  return this
}

ConstraintsStore.prototype.get = function (constraints, method) {
  if (typeof constraints !== 'object' || constraints === null) {
    throw new TypeError('Constraints should be an object')
  }

  var tmpStoreId, storeId
  const kConstraints = Object.keys(constraints)
  for (var i = 0; i < kConstraints.length; i++) {
    const kConstraint = kConstraints[i]
    assert(this.stores[kConstraint] !== null, `No strategy available for handling the constraint '${kConstraint}'`)
    tmpStoreId = this.stores[kConstraint].get(constraints[kConstraint])
    if (!tmpStoreId || (storeId && tmpStoreId !== storeId)) return null
    else storeId = tmpStoreId
  }

  if (storeId) {
    const store = this.storeMap.get(storeId)
    if (store && store[method]) return store
  }

  return null
}

module.exports = ConstraintsStore
