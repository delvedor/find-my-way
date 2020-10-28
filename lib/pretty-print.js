function prettyPrintFlattenedNode (flattenedNode, prefix, tail) {
  var paramName = ''
  const handlers = flattenedNode.nodes.map(node => node.handlers.map(handler => ({ method: node.method, ...handler }))).flat()

  handlers.forEach((handler, index) => {
    let suffix = `(${handler.method}`
    if (Object.keys(handler.constraints).length > 0) {
      suffix += ' ' + JSON.stringify(handler.constraints)
    }
    suffix += ')'

    let name = ''
    if (flattenedNode.prefix.includes(':')) {
      var params = handler.params
      name = params[params.length - 1]
      if (index > 0) {
        name = ':' + name
      }
    } else if (index > 0) {
      name = flattenedNode.prefix
    }

    if (index === 0) {
      paramName += name + ` ${suffix}`
      return
    } else {
      paramName += '\n'
    }

    paramName += prefix + '    ' + name + ` ${suffix}`
  })

  var tree = `${prefix}${tail ? '└── ' : '├── '}${flattenedNode.prefix}${paramName}\n`

  prefix = `${prefix}${tail ? '    ' : '│   '}`
  const labels = Object.keys(flattenedNode.children)
  for (var i = 0; i < labels.length; i++) {
    const child = flattenedNode.children[labels[i]]
    tree += prettyPrintFlattenedNode(child, prefix, i === (labels.length - 1))
  }
  return tree
}

function flattenNode (flattened, node) {
  if (node.handlers.length > 0) {
    flattened.nodes.push(node)
  }

  if (node.children) {
    for (const child of Object.values(node.children)) {
      const childPrefixSegments = child.prefix.split(/(?=\/)/) // split on the slash separator but use a regex to lookahead and not actually match it, preserving it in the returned string segments
      let cursor = flattened
      let parent
      for (const segment of childPrefixSegments) {
        parent = cursor
        cursor = cursor.children[segment]
        if (!cursor) {
          cursor = {
            prefix: segment,
            nodes: [],
            children: {}
          }
          parent.children[segment] = cursor
        }
      }

      flattenNode(cursor, child)
    }
  }
}

function compressFlattenedNode (flattenedNode) {
  const childKeys = Object.keys(flattenedNode.children)
  if (flattenedNode.nodes.length === 0 && childKeys.length === 1) {
    const child = flattenedNode.children[childKeys[0]]
    if (child.nodes.length <= 1) {
      compressFlattenedNode(child)
      flattenedNode.nodes = child.nodes
      flattenedNode.prefix += child.prefix
      flattenedNode.children = child.children
      return flattenedNode
    }
  }

  for (const key of Object.keys(flattenedNode.children)) {
    compressFlattenedNode(flattenedNode.children[key])
  }

  return flattenedNode
}

module.exports = { flattenNode, compressFlattenedNode, prettyPrintFlattenedNode }
