'use strict'

// It must spot all the chars where decodeURIComponent(x) !== decodeURI(x)
// The chars are: # $ & + , / : ; = ? @
// The table maps the two hex chars following a '%' to the char they decode
// to, or 0 for sequences that decodeURI already handles. A table lookup
// keeps this function's bytecode small enough for V8 to inline the whole
// percent-decoding path into the router's find().
const DECODE_COMPONENT_TABLE = new Uint8Array(768)
for (const [encoded, char] of [
  ['%23', '#'], ['%24', '$'], ['%25', '%'], ['%26', '&'],
  ['%2B', '+'], ['%2b', '+'], ['%2C', ','], ['%2c', ','], ['%2F', '/'], ['%2f', '/'],
  ['%3A', ':'], ['%3a', ':'], ['%3B', ';'], ['%3b', ';'],
  ['%3D', '='], ['%3d', '='], ['%3F', '?'], ['%3f', '?'],
  ['%40', '@']
]) {
  DECODE_COMPONENT_TABLE[((encoded.charCodeAt(1) - 50) << 8) | encoded.charCodeAt(2)] = char.charCodeAt(0)
}

// Returns the charCode of the decoded char, or 0 when decodeURI already
// handles the sequence. Kept minimal so it inlines cheaply into the scans.
function decodeComponentCharCode (highCharCode, lowCharCode) {
  if (highCharCode < 50 || highCharCode > 52 || lowCharCode > 255) {
    return 0
  }
  return DECODE_COMPONENT_TABLE[((highCharCode - 50) << 8) | lowCharCode]
}

function decodeComponentChar (highCharCode, lowCharCode) {
  const charCode = decodeComponentCharCode(highCharCode, lowCharCode)
  if (charCode === 0) {
    return null
  }
  return String.fromCharCode(charCode)
}

// Scanning with native indexOf is much faster than a char-by-char loop for
// long paths, but its fixed call overhead loses on short ones.
const MIN_NATIVE_SCAN_LENGTH = 12

/**
 * Safely decodes a URI path, preserving reserved characters in querystring.
 *
 * @param {string} path - The full request path, possibly including querystring.
 * @param {boolean} [useSemicolonDelimiter] - When true, also treat `;` as a query delimiter.
 * @returns {{ path: string, querystring: string, shouldDecodeParam: boolean }}
 * An object containing the decoded path, the raw querystring, and a flag indicating
 * whether any path parameters contain percent-encoded reserved characters.
 */
function safeDecodeURI (path, useSemicolonDelimiter) {
  if (path.length >= MIN_NATIVE_SCAN_LENGTH) {
    return safeDecodeURINativeScan(path, useSemicolonDelimiter)
  }
  return safeDecodeURICharScan(path, useSemicolonDelimiter, 1)
}

function safeDecodeURINativeScan (path, useSemicolonDelimiter) {
  const percentIndex = path.indexOf('%', 1)

  let delimIndex = path.indexOf('?', 1)
  const hashIndex = path.indexOf('#', 1)
  if (hashIndex !== -1 && (delimIndex === -1 || hashIndex < delimIndex)) {
    delimIndex = hashIndex
  }
  if (useSemicolonDelimiter) {
    const semicolonIndex = path.indexOf(';', 1)
    if (semicolonIndex !== -1 && (delimIndex === -1 || semicolonIndex < delimIndex)) {
      delimIndex = semicolonIndex
    }
  }

  if (percentIndex === -1 || (delimIndex !== -1 && percentIndex > delimIndex)) {
    // No percent-encoding in the path portion, so no decoding is needed
    if (delimIndex === -1) {
      return { path, querystring: '', shouldDecodeParam: false }
    }
    return {
      path: path.slice(0, delimIndex),
      querystring: path.slice(delimIndex + 1),
      shouldDecodeParam: false
    }
  }

  // The path portion contains percent-encoding: process it with the
  // char-by-char loop, starting at the first '%'
  return safeDecodeURIPercentScan(path, useSemicolonDelimiter, percentIndex)
}

// Kept small so V8 can inline it into the router's find(): the expensive
// percent-decoding logic lives in safeDecodeURIPercentScan and is only
// called when a '%' is actually present.
function safeDecodeURICharScan (path, useSemicolonDelimiter, startIndex) {
  for (let i = startIndex; i < path.length; i++) {
    const charCode = path.charCodeAt(i)

    if (charCode === 37) {
      return safeDecodeURIPercentScan(path, useSemicolonDelimiter, i)
    // Some systems do not follow RFC and separate the path and query
    // string with a `;` character (code 59), e.g. `/foo;jsessionid=123456`.
    // Thus, we need to split on `;` as well as `?` and `#` if the useSemicolonDelimiter option is enabled.
    } else if (charCode === 63 || charCode === 35 || (charCode === 59 && useSemicolonDelimiter)) {
      return {
        path: path.slice(0, i),
        querystring: path.slice(i + 1),
        shouldDecodeParam: false
      }
    }
  }
  return { path, querystring: '', shouldDecodeParam: false }
}

// %25 - encoded % char. We need to encode one more time to prevent double
// decoding. Kept out of safeDecodeURIPercentScan so this rarely-taken string
// surgery does not count against V8's inlining budget for the percent scan.
function reencodePercentChar (path, index) {
  return path.slice(0, index + 1) + '25' + path.slice(index + 1)
}

function safeDecodeURIPercentScan (path, useSemicolonDelimiter, startIndex) {
  let shouldDecode = false
  let shouldDecodeParam = false

  let querystring = ''

  for (let i = startIndex; i < path.length; i++) {
    const charCode = path.charCodeAt(i)

    if (charCode === 37) {
      const componentCharCode = decodeComponentCharCode(path.charCodeAt(i + 1), path.charCodeAt(i + 2))

      if (componentCharCode === 0) {
        shouldDecode = true
      } else {
        shouldDecodeParam = true
        // 37 - the '%' char, percent-encoded as %25
        if (componentCharCode === 37) {
          shouldDecode = true
          path = reencodePercentChar(path, i)
          i += 2
        }
        i += 2
      }
    // Some systems do not follow RFC and separate the path and query
    // string with a `;` character (code 59), e.g. `/foo;jsessionid=123456`.
    // Thus, we need to split on `;` as well as `?` and `#` if the useSemicolonDelimiter option is enabled.
    } else if (charCode === 63 || charCode === 35 || (charCode === 59 && useSemicolonDelimiter)) {
      querystring = path.slice(i + 1)
      path = path.slice(0, i)
      break
    }
  }
  const decodedPath = shouldDecode ? decodeURI(path) : path
  return { path: decodedPath, querystring, shouldDecodeParam }
}

function safeDecodeURIComponent (uriComponent) {
  const startIndex = uriComponent.indexOf('%')
  if (startIndex === -1) return uriComponent

  let decoded = ''
  let lastIndex = startIndex

  for (let i = startIndex; i < uriComponent.length; i++) {
    if (uriComponent.charCodeAt(i) === 37) {
      const highCharCode = uriComponent.charCodeAt(i + 1)
      const lowCharCode = uriComponent.charCodeAt(i + 2)

      const decodedChar = decodeComponentChar(highCharCode, lowCharCode)
      decoded += uriComponent.slice(lastIndex, i) + decodedChar

      lastIndex = i + 3
    }
  }
  return uriComponent.slice(0, startIndex) + decoded + uriComponent.slice(lastIndex)
}

module.exports = { safeDecodeURI, safeDecodeURIComponent, safeDecodeURINativeScan, safeDecodeURICharScan, MIN_NATIVE_SCAN_LENGTH }
