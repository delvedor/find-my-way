'use strict'

const httpMethodStrategy = require('./strategies/http-method')
const treeDataSymbol = Symbol('treeData')

function printObjectTree (obj, parentPrefix = '') {
  let tree = ''
  const keys = Object.keys(obj)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const value = obj[key]
    const isLast = i === keys.length - 1

    const nodePrefix = isLast ? '└── ' : '├── '
    const childPrefix = isLast ? '    ' : '│   '

    const nodeData = value[treeDataSymbol] || ''
    const prefixedNodeData = nodeData.split('\n').join('\n' + parentPrefix + childPrefix)

    tree += parentPrefix + nodePrefix + key + prefixedNodeData + '\n'
    tree += printObjectTree(value, parentPrefix + childPrefix)
  }
  return tree
}

function parseFunctionName (fn) {
  let fName = fn.name || ''

  fName = fName.replace('bound', '').trim()
  fName = (fName || 'anonymous') + '()'
  return fName
}

function parseMeta (meta) {
  if (Array.isArray(meta)) return meta.map(m => parseMeta(m))
  if (typeof meta === 'symbol') return meta.toString()
  if (typeof meta === 'function') return parseFunctionName(meta)
  return meta
}

function serializeMeta (route, options) {
  let serializedMetaData = ''

  const metaDataObject = options.buildPrettyMeta(route)

  let includeMetaKeys = options.includeMeta
  if (!Array.isArray(includeMetaKeys)) {
    includeMetaKeys = Reflect.ownKeys(metaDataObject)
  }

  for (const metaKey of includeMetaKeys) {
    if (!Object.prototype.hasOwnProperty.call(metaDataObject, metaKey)) continue

    const serializedKey = metaKey.toString()
    const metaValue = metaDataObject[metaKey]
    const serializedValue = JSON.stringify(parseMeta(metaValue))
    serializedMetaData += `\n• (${serializedKey}) ${serializedValue}`
  }

  return serializedMetaData
}

function serializeRoute (route, options) {
  const constraints = { ...route.opts.constraints }

  let method = options.method
  if (method === undefined) {
    method = constraints[httpMethodStrategy.name]
    delete constraints[httpMethodStrategy.name]
  }

  let handlerString = ` (${method})`
  if (Object.keys(constraints).length !== 0) {
    handlerString += ' ' + JSON.stringify(constraints)
  }

  if (options.includeMeta) {
    const originRoute = { ...route, method, opts: { constraints } }
    handlerString += serializeMeta(originRoute, options)
  }

  return handlerString
}

function buildObjectTree (node, tree, prefix, options) {
  if (node.isLeafNode || options.commonPrefix !== false) {
    prefix = prefix || '(empty root node)'
    tree = tree[prefix] = {}

    if (node.isLeafNode) {
      tree[treeDataSymbol] = node.routes
        .map(route => serializeRoute(route, options))
        .join(`\n${prefix}`)
    }

    prefix = ''
  }

  if (node.staticChildren) {
    for (const child of Object.values(node.staticChildren)) {
      buildObjectTree(child, tree, prefix + child.prefix, options)
    }
  }

  if (node.parametricChildren) {
    for (const child of Object.values(node.parametricChildren)) {
      const childPrefix = Array.from(child.nodePaths).join('|')
      buildObjectTree(child, tree, prefix + childPrefix, options)
    }
  }

  if (node.wildcardChild) {
    buildObjectTree(node.wildcardChild, tree, '*', options)
  }
}

function prettyPrintTree (root, options) {
  const objectTree = {}
  buildObjectTree(root, objectTree, root.prefix, options)
  return printObjectTree(objectTree)
}

module.exports = { prettyPrintTree }
