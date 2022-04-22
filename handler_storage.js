'use strict'

const assert = require('assert')
const deepEqual = require('fast-deep-equal')

class HandlerStorage {
  constructor () {
    this.handlers = [] // unoptimized list of handler objects for which the fast matcher function will be compiled
    this.hasConstraints = false
    this.compiledHandler = null
    this.unconstrainedHandler = null // optimized reference to the handler that will match most of the time
    this.constrainedHandlerStores = null
  }

  getHandler (constraints) {
    return this.handlers.filter(handler => deepEqual(constraints, handler.constraints))[0]
  }

  // This is the hot path for node handler finding -- change with care!
  getMatchingHandler (constrainer, derivedConstraints) {
    if (derivedConstraints === undefined) {
      return this.unconstrainedHandler
    }

    if (this.hasConstraints) {
      // This node is constrained, use the performant precompiled constraint matcher
      return this._getHandlerMatchingConstraints(constrainer, derivedConstraints)
    }

    // This node doesn't have any handlers that are constrained, so it's handlers probably match. Some requests have constraint values that *must* match however, like version, so check for those before returning it.
    if (!derivedConstraints.__hasMustMatchValues) {
      return this.unconstrainedHandler
    }

    return null
  }

  addHandler (handler, params, store, constraints) {
    if (!handler) return
    assert(!this.getHandler(constraints), `There is already a handler with constraints '${JSON.stringify(constraints)}' and method '${this.method}'`)

    const handlerObject = { handler, params, constraints, store: store || null, paramsLength: params.length }

    this.handlers.push(handlerObject)
    // Sort the most constrained handlers to the front of the list of handlers so they are tested first.
    this.handlers.sort((a, b) => Object.keys(a.constraints).length - Object.keys(b.constraints).length)

    if (Object.keys(constraints).length > 0) {
      this.hasConstraints = true
    } else {
      this.unconstrainedHandler = handlerObject
    }

    if (this.hasConstraints && this.handlers.length > 32) {
      throw new Error('find-my-way supports a maximum of 32 route handlers per node when there are constraints, limit reached')
    }

    // Note that the fancy constraint handler matcher needs to be recompiled now that the list of handlers has changed
    // This lazy compilation means we don't do the compile until the first time the route match is tried, which doesn't waste time re-compiling every time a new handler is added
    this.compiledHandler = null
  }

  // Slot for the compiled constraint matching function
  _getHandlerMatchingConstraints (constrainer, derivedConstraints) {
    if (this.compiledHandler === null) {
      this.compiledHandler = this._compileGetHandlerMatchingConstraints(constrainer)
    }
    return this.compiledHandler(derivedConstraints)
  }

  // Builds a store object that maps from constraint values to a bitmap of handler indexes which pass the constraint for a value
  // So for a host constraint, this might look like { "fastify.io": 0b0010, "google.ca": 0b0101 }, meaning the 3rd handler is constrainted to fastify.io, and the 2nd and 4th handlers are constrained to google.ca.
  // The store's implementation comes from the strategies provided to the Router.
  _buildConstraintStore (constrainer, constraint) {
    const store = constrainer.newStoreForConstraint(constraint)

    for (let i = 0; i < this.handlers.length; i++) {
      const handler = this.handlers[i]
      const mustMatchValue = handler.constraints[constraint]
      if (typeof mustMatchValue !== 'undefined') {
        let indexes = store.get(mustMatchValue)
        if (!indexes) {
          indexes = 0
        }
        indexes |= 1 << i // set the i-th bit for the mask because this handler is constrained by this value https://stackoverflow.com/questions/1436438/how-do-you-set-clear-and-toggle-a-single-bit-in-javascrip
        store.set(mustMatchValue, indexes)
      }
    }

    return store
  }

  // Builds a bitmask for a given constraint that has a bit for each handler index that is 0 when that handler *is* constrained and 1 when the handler *isnt* constrainted. This is opposite to what might be obvious, but is just for convienience when doing the bitwise operations.
  _constrainedIndexBitmask (constraint) {
    let mask = 0b0
    for (let i = 0; i < this.handlers.length; i++) {
      const handler = this.handlers[i]
      if (handler.constraints && constraint in handler.constraints) {
        mask |= 1 << i
      }
    }
    return ~mask
  }

  // Compile a fast function to match the handlers for this node
  // The function implements a general case multi-constraint matching algorithm.
  // The general idea is this: we have a bunch of handlers, each with a potentially different set of constraints, and sometimes none at all. We're given a list of constraint values and we have to use the constraint-value-comparison strategies to see which handlers match the constraint values passed in.
  // We do this by asking each constraint store which handler indexes match the given constraint value for each store. Trickily, the handlers that a store says match are the handlers constrained by that store, but handlers that aren't constrained at all by that store could still match just fine. So, each constraint store can only describe matches for it, and it won't have any bearing on the handlers it doesn't care about. For this reason, we have to ask each stores which handlers match and track which have been matched (or not cared about) by all of them.
  // We use bitmaps to represent these lists of matches so we can use bitwise operations to implement this efficiently. Bitmaps are cheap to allocate, let us implement this masking behaviour in one CPU instruction, and are quite compact in memory. We start with a bitmap set to all 1s representing every handler that is a match candidate, and then for each constraint, see which handlers match using the store, and then mask the result by the mask of handlers that that store applies to, and bitwise AND with the candidate list. Phew.
  // We consider all this compiling function complexity to be worth it, because the naive implementation that just loops over the handlers asking which stores match is quite a bit slower.
  _compileGetHandlerMatchingConstraints (constrainer) {
    this.constrainedHandlerStores = {}
    let constraints = new Set()
    for (const handler of this.handlers) {
      for (const key of Object.keys(handler.constraints)) {
        constraints.add(key)
      }
    }
    constraints = Array.from(constraints)
    const lines = []

    // always check the version constraint first as it is the most selective
    constraints.sort((a, b) => a === 'version' ? 1 : 0)

    for (const constraint of constraints) {
      this.constrainedHandlerStores[constraint] = this._buildConstraintStore(constrainer, constraint)
    }

    lines.push(`
    let candidates = 0b${'1'.repeat(this.handlers.length)}
    let mask, matches
    `)
    for (const constraint of constraints) {
      // Setup the mask for indexes this constraint applies to. The mask bits are set to 1 for each position if the constraint applies.
      lines.push(`
      mask = ${this._constrainedIndexBitmask(constraint)}
      value = derivedConstraints.${constraint}
      `)

      // If there's no constraint value, none of the handlers constrained by this constraint can match. Remove them from the candidates.
      // If there is a constraint value, get the matching indexes bitmap from the store, and mask it down to only the indexes this constraint applies to, and then bitwise and with the candidates list to leave only matching candidates left.
      lines.push(`
      if (typeof value === "undefined") {
        candidates &= mask
      } else {
        matches = this.constrainedHandlerStores.${constraint}.get(value) || 0
        candidates &= (matches | mask)
      }
      if (candidates === 0) return null;
      `)
    }
    // Return the first handler who's bit is set in the candidates https://stackoverflow.com/questions/18134985/how-to-find-index-of-first-set-bit
    lines.push(`
    const handler = this.handlers[Math.floor(Math.log2(candidates))]
    if (handler && derivedConstraints.__hasMustMatchValues && handler === this.unconstrainedHandler) {
      return null;
    }
    return handler;
    `)

    return new Function('derivedConstraints', lines.join('\n')) // eslint-disable-line
  }
}

module.exports = HandlerStorage
