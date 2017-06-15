'use strict'

/*
  Node type
    static: 0,
    param: 1,
    matchAll: 2,
*/

function Node (prefix, children, kind, handler) {
  this.prefix = prefix || '/'
  this.label = this.prefix[0]
  this.children = children || []
  this.numberOfChildren = this.children.length
  this.kind = kind || 0
  this.handler = handler || null
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

Node.prototype.addHandler = function (handler, params, store) {
  this.handler = {
    handler: handler,
    params: params,
    store: store || null
  }
}

Node.prototype.getHandler = function () {
  return this.handler
}

module.exports = Node
