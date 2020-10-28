'use strict'

const assert = require('assert')
const deepEqual = require('fast-deep-equal')

const types = {
  STATIC: 0,
  PARAM: 1,
  MATCH_ALL: 2,
  REGEX: 3,
  // It's used for a parameter, that is followed by another parameter in the same part
  MULTI_PARAM: 4
}

function Node (options) {
  options = options || {}
  this.prefix = options.prefix || '/'
  this.label = this.prefix[0]
  this.method = options.method // not used for logic, just for debugging and pretty printing
  this.handlers = options.handlers || [] // unoptimized list of handler objects for which the fast matcher function will be compiled
  this.children = options.children || {}
  this.numberOfChildren = Object.keys(this.children).length
  this.kind = options.kind || this.types.STATIC
  this.regex = options.regex || null
  this.wildcardChild = null
  this.parametricBrother = null
  this.constrainer = options.constrainer
  this.constrainedHandlerStores = null
}

Object.defineProperty(Node.prototype, 'types', {
  value: types
})

Node.prototype.getLabel = function () {
  return this.prefix[0]
}

Node.prototype.addChild = function (node) {
  var label = ''
  switch (node.kind) {
    case this.types.STATIC:
      label = node.getLabel()
      break
    case this.types.PARAM:
    case this.types.REGEX:
    case this.types.MULTI_PARAM:
      label = ':'
      break
    case this.types.MATCH_ALL:
      this.wildcardChild = node
      label = '*'
      break
    default:
      throw new Error(`Unknown node kind: ${node.kind}`)
  }

  assert(
    this.children[label] === undefined,
    `There is already a child with label '${label}'`
  )

  this.children[label] = node
  this.numberOfChildren = Object.keys(this.children).length

  const labels = Object.keys(this.children)
  var parametricBrother = this.parametricBrother
  for (var i = 0; i < labels.length; i++) {
    const child = this.children[labels[i]]
    if (child.label === ':') {
      parametricBrother = child
      break
    }
  }

  // Save the parametric brother inside static children
  const iterate = (node) => {
    if (!node) {
      return
    }

    if (node.kind !== this.types.STATIC) {
      return
    }

    if (node !== this) {
      node.parametricBrother = parametricBrother || node.parametricBrother
    }

    const labels = Object.keys(node.children)
    for (var i = 0; i < labels.length; i++) {
      iterate(node.children[labels[i]])
    }
  }

  iterate(this)

  return this
}

Node.prototype.reset = function (prefix, constraints) {
  this.prefix = prefix
  this.children = {}
  this.handlers = []
  this.kind = this.types.STATIC
  this.numberOfChildren = 0
  this.regex = null
  this.wildcardChild = null
  this.decompileHandlerMatcher()
  return this
}

Node.prototype.split = function (length) {
  const newChild = new Node(
    {
      prefix: this.prefix.slice(length),
      children: this.children,
      kind: this.kind,
      handlers: this.handlers.slice(0),
      regex: this.regex,
      constrainer: this.constrainer
    }
  )

  if (this.wildcardChild !== null) {
    newChild.wildcardChild = this.wildcardChild
  }

  this.reset(this.prefix.slice(0, length))
  this.addChild(newChild)
  return newChild
}

Node.prototype.findByLabel = function (path) {
  return this.children[path[0]]
}

Node.prototype.findMatchingChild = function (derivedConstraints, path) {
  var child = this.children[path[0]]
  if (child !== undefined && (child.numberOfChildren > 0 || child.getMatchingHandler(derivedConstraints) !== null)) {
    if (path.slice(0, child.prefix.length) === child.prefix) {
      return child
    }
  }

  child = this.children[':']
  if (child !== undefined && (child.numberOfChildren > 0 || child.getMatchingHandler(derivedConstraints) !== null)) {
    return child
  }

  child = this.children['*']
  if (child !== undefined && (child.numberOfChildren > 0 || child.getMatchingHandler(derivedConstraints) !== null)) {
    return child
  }

  return null
}

Node.prototype.addHandler = function (handler, params, store, constraints) {
  if (!handler) return
  assert(!this.getHandler(constraints), `There is already a handler with constraints '${JSON.stringify(constraints)}' and method '${this.method}'`)

  this.handlers.push({
    index: this.handlers.length,
    handler: handler,
    params: params,
    constraints: constraints,
    store: store || null,
    paramsLength: params.length
  })

  this.decompileHandlerMatcher()
}

Node.prototype.getHandler = function (constraints) {
  return this.handlers.filter(handler => deepEqual(constraints, handler.constraints))[0]
}

// We compile the handler matcher the first time this node is matched. We need to recompile it if new handlers are added, so when a new handler is added, we reset the handler matching function to this base one that will recompile it.
function compileThenGetMatchingHandler (derivedConstraints) {
  this.compileHandlerMatcher()
  return this.getMatchingHandler(derivedConstraints)
}

// The handler needs to be compiled for the first time after a node is born
Node.prototype.getMatchingHandler = compileThenGetMatchingHandler

Node.prototype.decompileHandlerMatcher = function () {
  this.getMatchingHandler = compileThenGetMatchingHandler
  return null
}

// Builds a store object that maps from constraint values to a bitmap of handler indexes which pass the constraint for a value
// So for a host constraint, this might look like { "fastify.io": 0b0010, "google.ca": 0b0101 }, meaning the 3rd handler is constrainted to fastify.io, and the 2nd and 4th handlers are constrained to google.ca.
// The store's implementation comes from the strategies provided to the Router.
Node.prototype._buildConstraintStore = function (constraint) {
  const store = this.constrainer.newStoreForConstraint(constraint)

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
Node.prototype._constrainedIndexBitmask = function (constraint) {
  let mask = 0b0
  for (let i = 0; i < this.handlers.length; i++) {
    const handler = this.handlers[i]
    if (handler.constraints && constraint in handler.constraints) {
      mask |= 1 << i
    }
  }
  return ~mask
}

function noHandlerMatcher () {
  return null
}

// Compile a fast function to match the handlers for this node
Node.prototype.compileHandlerMatcher = function () {
  this.constrainedHandlerStores = {}
  const lines = []

  // If this node has no handlers, it can't ever match anything, so set a function that just returns null
  if (this.handlers.length === 0) {
    this.getMatchingHandler = noHandlerMatcher
    return
  }

  // build a list of all the constraints that any of the handlers have
  const constraints = []
  for (const handler of this.handlers) {
    if (!handler.constraints) continue
    for (const key in handler.constraints) {
      if (!constraints.includes(key)) {
        constraints.push(key)
      }
    }
  }

  if (constraints.length === 0) {
    // If this node doesn't have any handlers that are constrained, don't spend any time matching constraints
    this.getMatchingHandler = this.constrainer.mustMatchHandlerMatcher
    return
  }

  // always check the version constraint first as it is the most selective
  constraints.sort((a, b) => a === 'version' ? 1 : 0)

  for (const constraint of constraints) {
    this.constrainedHandlerStores[constraint] = this._buildConstraintStore(constraint)
  }

  // Implement the general case multi-constraint matching algorithm.
  // The general idea is this: we have a bunch of handlers, each with a potentially different set of constraints, and sometimes none at all. We're given a list of constraint values and we have to use the constraint-value-comparison strategies to see which handlers match the constraint values passed in.
  // We do this by asking each constraint store which handler indexes match the given constraint value for each store. Trickly, the handlers that a store says match are the handlers constrained by that store, but handlers that aren't constrained at all by that store could still match just fine. So, there's a "mask" where each constraint store can only say if some of the handlers match or not.
  // To implement this efficiently, we use bitmaps so we can use bitwise operations. They're cheap to allocate, let us implement this masking behaviour in one CPU instruction, and are quite compact in memory. We start with a bitmap set to all 1s representing every handler being a candidate, and then for each constraint, see which handlers match using the store, and then mask the result by the mask of handlers that that store applies to, and bitwise AND with the candidate list. Phew.
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
  return this.handlers[Math.floor(Math.log2(candidates))]
  `)

  this.getMatchingHandler = new Function('derivedConstraints', lines.join('\n')) // eslint-disable-line
}

module.exports = Node
