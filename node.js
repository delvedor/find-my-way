'use strict'

const assert = require('assert')

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
  this.method = options.method // just for debugging and error messages
  this.children = options.children || {}
  this.numberOfChildren = Object.keys(this.children).length
  this.kind = options.kind || this.types.STATIC
  this.handler = options.handler
  this.regex = options.regex || null
  this.wildcardChild = null
  this.parametricBrother = null
  this.versions = options.versions
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

Node.prototype.reset = function (prefix, versions) {
  this.prefix = prefix
  this.children = {}
  this.kind = this.types.STATIC
  this.handler = null
  this.numberOfChildren = 0
  this.regex = null
  this.wildcardChild = null
  this.versions = versions
  return this
}

Node.prototype.findByLabel = function (path) {
  return this.children[path[0]]
}

Node.prototype.findChild = function (path) {
  var child = this.children[path[0]]
  if (child !== undefined && (child.numberOfChildren > 0 || child.handler !== null)) {
    if (path.slice(0, child.prefix.length) === child.prefix) {
      return child
    }
  }

  child = this.children[':']
  if (child !== undefined && (child.numberOfChildren > 0 || child.handler !== null)) {
    return child
  }

  child = this.children['*']
  if (child !== undefined && (child.numberOfChildren > 0 || child.handler !== null)) {
    return child
  }

  return null
}

Node.prototype.findVersionChild = function (version, path) {
  var child = this.children[path[0]]
  if (child !== undefined && (child.numberOfChildren > 0 || child.getVersionHandler(version) !== null)) {
    if (path.slice(0, child.prefix.length) === child.prefix) {
      return child
    }
  }

  child = this.children[':']
  if (child !== undefined && (child.numberOfChildren > 0 || child.getVersionHandler(version) !== null)) {
    return child
  }

  child = this.children['*']
  if (child !== undefined && (child.numberOfChildren > 0 || child.getVersionHandler(version) !== null)) {
    return child
  }

  return null
}

Node.prototype.setHandler = function (handler, params, store) {
  if (!handler) return

  assert(
    !this.handler,
    `There is already an handler with method '${this.method}'`
  )

  this.handler = {
    handler: handler,
    params: params,
    store: store || null,
    paramsLength: params.length
  }
}

Node.prototype.setVersionHandler = function (version, handler, params, store) {
  if (!handler) return

  assert(
    !this.versions.get(version),
    `There is already an handler with version '${version}' and method '${this.method}'`
  )

  this.versions.set(version, {
    handler: handler,
    params: params,
    store: store || null,
    paramsLength: params.length
  })
}

Node.prototype.getVersionHandler = function (version) {
  return this.versions.get(version)
}

module.exports = Node
