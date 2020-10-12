'use strict'

const assert = require('assert')
const http = require('http')
const Handlers = buildHandlers()

const types = {
  STATIC: 0,
  PARAM: 1,
  MATCH_ALL: 2,
  REGEX: 3,
  // It's used for a parameter, that is followed by another parameter in the same part
  MULTI_PARAM: 4
}

function Node(options) {
  // former arguments order: prefix, children, kind, handlers, regex, constraints
  options = options || {}
  this.prefix = options.prefix || '/'
  this.label = this.prefix[0]
  this.children = options.children || {}
  this.numberOfChildren = Object.keys(this.children).length
  this.kind = options.kind || this.types.STATIC
  this.handlers = new Handlers(options.handlers)
  this.regex = options.regex || null
  this.wildcardChild = null
  this.parametricBrother = null
  // kConstraints allows us to know which constraints we need to extract from the request
  this.kConstraints = new Set()
  this.constraintsStorage = options.constraints
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
  this.kind = this.types.STATIC
  this.handlers = new Handlers()
  this.numberOfChildren = 0
  this.regex = null
  this.wildcardChild = null
  this.kConstraints = new Set()
  this.constraintsStorage = constraints
  return this
}

Node.prototype.findByLabel = function (path) {
  return this.children[path[0]]
}

Node.prototype.findMatchingChild = function (derivedConstraints, path, method) {
  var child = this.children[path[0]]
  if (child !== undefined && (child.numberOfChildren > 0 || child.getMatchingHandler(derivedConstraints, method) !== null)) {
    if (path.slice(0, child.prefix.length) === child.prefix) {
      return child
    }
  }

  child = this.children[':']
  if (child !== undefined && (child.numberOfChildren > 0 || child.getMatchingHandler(derivedConstraints, method) !== null)) {
    return child
  }

  child = this.children['*']
  if (child !== undefined && (child.numberOfChildren > 0 || child.getMatchingHandler(derivedConstraints, method) !== null)) {
    return child
  }

  return null
}

Node.prototype.setHandler = function (method, handler, params, store) {
  if (!handler) return

  assert(
    this.handlers[method] !== undefined,
    `There is already a handler with method '${method}'`
  )

  this.handlers[method] = {
    handler: handler,
    params: params,
    store: store || null,
    paramsLength: params.length
  }
}

Node.prototype.setConstraintsHandler = function (constraints, method, handler, params, store) {
  if (!handler) return

  const handlers = this.constraintsStorage.get(constraints, method) || new Handlers()

  assert(handlers[method] === null, `There is already a handler with constraints '${JSON.stringify(constraints)}' and method '${method}'`)

  // Update kConstraints with new constraint keys for this node
  Object.keys(constraints).forEach(kConstraint => this.kConstraints.add(kConstraint))

  handlers[method] = {
    handler: handler,
    params: params,
    store: store || null,
    paramsLength: params.length
  }

  this.constraintsStorage.set(constraints, handlers)
}

Node.prototype.getHandler = function (method) {
  return this.handlers[method]
}

Node.prototype.getConstraintsHandler = function (constraints, method) {
  var handlers = this.constraintsStorage.get(constraints, method)
  return handlers === null ? handlers : handlers[method]
}

Node.prototype.getMatchingHandler = function (derivedConstraints, method) {
  if (derivedConstraints) {
    var handler = this.getConstraintsHandler(derivedConstraints, method)
    if (handler) return handler;
  }

  return this.getHandler(method)
}

Node.prototype.prettyPrint = function (prefix, tail) {
  var paramName = ''
  var handlers = this.handlers || {}
  var methods = Object.keys(handlers).filter(method => handlers[method] && handlers[method].handler)

  if (this.prefix === ':') {
    methods.forEach((method, index) => {
      var params = this.handlers[method].params
      var param = params[params.length - 1]
      if (methods.length > 1) {
        if (index === 0) {
          paramName += param + ` (${method})\n`
          return
        }
        paramName += prefix + '    :' + param + ` (${method})`
        paramName += (index === methods.length - 1 ? '' : '\n')
      } else {
        paramName = params[params.length - 1] + ` (${method})`
      }
    })
  } else if (methods.length) {
    paramName = ` (${methods.join('|')})`
  }

  var tree = `${prefix}${tail ? '└── ' : '├── '}${this.prefix}${paramName}\n`

  prefix = `${prefix}${tail ? '    ' : '│   '}`
  const labels = Object.keys(this.children)
  for (var i = 0; i < labels.length - 1; i++) {
    tree += this.children[labels[i]].prettyPrint(prefix, false)
  }
  if (labels.length > 0) {
    tree += this.children[labels[labels.length - 1]].prettyPrint(prefix, true)
  }
  return tree
}

function buildHandlers (handlers) {
  var code = `handlers = handlers || {}
  `
  for (var i = 0; i < http.METHODS.length; i++) {
    var m = http.METHODS[i]
    code += `this['${m}'] = handlers['${m}'] || null
    `
  }
  return new Function('handlers', code) // eslint-disable-line
}

module.exports = Node
module.exports.Handlers = Handlers
