
function escapeRegExp (string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function removeDuplicateSlashes (path) {
  return path.replace(/\/\/+/g, '/')
}

function trimLastSlash (path) {
  if (path.length > 1 && path.charCodeAt(path.length - 1) === 47) {
    return path.slice(0, -1)
  }
  return path
}

function trimRegExpStartAndEnd (regexString) {
  // removes chars that marks start "^" and end "$" of regexp
  if (regexString.charCodeAt(1) === 94) {
    regexString = regexString.slice(0, 1) + regexString.slice(2)
  }

  if (regexString.charCodeAt(regexString.length - 2) === 36) {
    regexString = regexString.slice(0, regexString.length - 2) + regexString.slice(regexString.length - 1)
  }

  return regexString
}

function getClosingParenthensePosition (path, idx) {
  // `path.indexOf()` will always return the first position of the closing parenthese,
  // but it's inefficient for grouped or wrong regexp expressions.
  // see issues #62 and #63 for more info

  let parentheses = 1

  while (idx < path.length) {
    idx++

    // ignore skipped chars
    if (path[idx] === '\\') {
      idx++
      continue
    }

    if (path[idx] === ')') {
      parentheses--
    } else if (path[idx] === '(') {
      parentheses++
    }

    if (!parentheses) return idx
  }

  throw new TypeError('Invalid regexp expression in "' + path + '"')
}

function defaultBuildPrettyMeta (route) {
  // buildPrettyMeta function must return an object, which will be parsed into key/value pairs for display
  if (!route) return {}
  if (!route.store) return {}
  return Object.assign({}, route.store)
}

module.exports.escapeRegExp = escapeRegExp
module.exports.removeDuplicateSlashes = removeDuplicateSlashes
module.exports.trimLastSlash = trimLastSlash
module.exports.trimRegExpStartAndEnd = trimRegExpStartAndEnd
module.exports.getClosingParenthensePosition = getClosingParenthensePosition
module.exports.defaultBuildPrettyMeta = defaultBuildPrettyMeta
