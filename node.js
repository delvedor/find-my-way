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
  this.map = map || {}
}

Node.prototype.add = function (node) {
  this.children.push(node)
  this.numberOfChildren++
}

Node.prototype.find = function (label, kind) {
  for (var i = 0; i < this.numberOfChildren; i++) {
    if (this.children[i].label === label && this.children[i].kind === kind) {
      return this.children[i]
    }
  }
  return null
}

Node.prototype.findByLabel = function (label) {
  for (var i = 0; i < this.numberOfChildren; i++) {
    if (this.children[i].label === label) {
      return this.children[i]
    }
  }
  return null
}

Node.prototype.findByKind = function (kind) {
  for (var i = 0; i < this.numberOfChildren; i++) {
    if (this.children[i].kind === kind) {
      return this.children[i]
    }
  }
  return null
}

Node.prototype.addHandler = function (method, handler, params, store) {
  this.map[method] = {
    handler: handler,
    params: params,
    store: store || null
  }
}

Node.prototype.findHandler = function (method) {
  return this.map[method]
}

module.exports = Node
