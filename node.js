'use strict'

/*
  Node type
    static: 0,
    param: 1,
    matchAll: 2,
*/

function Node (prefix, children, kind, map) {
  this.prefix = prefix || '/'
  this.label = this.prefix[0]
  this.children = children || []
  this.numberOfChildren = this.children.length
  this.kind = kind || 0
  this.map = map || null
}

Node.prototype.add = function (node) {
  this.children.push(node)
  this.numberOfChildren++
}

Node.prototype.find = function (label, kind) {
  for (var i = 0; i < this.numberOfChildren; i++) {
    var child = this.children[i]
    if (child.label === label && child.kind === kind && child.map) {
      return child
    }
  }
  return null
}

Node.prototype.findByLabel = function (label) {
  for (var i = 0; i < this.numberOfChildren; i++) {
    var child = this.children[i]
    if (child.label === label) {
      return child
    }
  }
  return null
}

Node.prototype.findByKind = function (kind) {
  for (var i = 0; i < this.numberOfChildren; i++) {
    var child = this.children[i]
    if (child.kind === kind && child.map) {
      return child
    }
  }
  return null
}

Node.prototype.setHandler = function (method, handler, params, store) {
  this.map = this.map || {}
  this.map[method] = {
    handler: handler,
    params: params,
    store: store || null
  }
}

Node.prototype.getHandler = function (method) {
  return this.map ? this.map[method] : null
}

module.exports = Node
