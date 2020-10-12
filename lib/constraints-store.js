'use strict'

const assert = require('assert')

function ConstraintsStore (strategies) {
  if (!(this instanceof ConstraintsStore)) {
    return new ConstraintsStore(strategies)
  }

  this.strategies = strategies
}

ConstraintsStore.prototype.set = function (constraints, store) {
  // TODO: Should I check for existence of at least one constraint?
  if (typeof constraints !== 'object' || constraints === null) {
    throw new TypeError('Constraints should be an object')
  }

  Object.keys(constraints).forEach(kConstraint => {
    assert(this.strategies[kConstraint] !== null, `No strategy available for handling the constraint '${kConstraint}'`)
    this.strategies[kConstraint].set(constraints[kConstraint], { store, constraints })
  })

  return this
}

ConstraintsStore.prototype.get = function (constraints, method) {
  if (typeof constraints !== 'object' || constraints === null) {
    throw new TypeError('Constraints should be an object')
  }

  var returnedStore = null
  const keys = Object.keys(constraints)
  for (var i = 0; i < keys.length; i++) {
    const kConstraint = keys[i]
    assert(this.strategies[kConstraint] !== null, `No strategy available for handling the constraint '${kConstraint}'`)
    const storedObject = this.strategies[kConstraint].get(constraints[kConstraint])
    if (!storedObject || !storedObject.store || !storedObject.store[method]) return null
    // TODO: Order of properties may result in inequality
    if (JSON.stringify(constraints) !== JSON.stringify(storedObject.constraints)) return null
    if (!returnedStore) returnedStore = storedObject.store
  }

  return returnedStore
}

module.exports = ConstraintsStore
