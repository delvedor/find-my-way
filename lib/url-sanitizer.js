'use strict'

const fastDecode = require('fast-decode-uri-component')

// It must spot all the chars where decodeURIComponent(x) !== decodeURI(x)
// The chars are: # $ & + , / : ; = ? @
const uriComponentsCharMap = new Array(53).fill(0x00)
uriComponentsCharMap[50] = new Array(103).fill(0x00)
uriComponentsCharMap[50][51] = true // # '%23'
uriComponentsCharMap[50][52] = true // $ '%24'
uriComponentsCharMap[50][54] = true // & '%26'
uriComponentsCharMap[50][66] = true // + '%2B'
uriComponentsCharMap[50][98] = true // + '%2b'
uriComponentsCharMap[50][67] = true // , '%2C'
uriComponentsCharMap[50][99] = true // , '%2c'
uriComponentsCharMap[50][70] = true // / '%2F'
uriComponentsCharMap[50][102] = true // / '%2f'

uriComponentsCharMap[51] = new Array(103).fill(0x00)
uriComponentsCharMap[51][65] = true // : '%3A'
uriComponentsCharMap[51][97] = true // : '%3a'
uriComponentsCharMap[51][66] = true // ; '%3B'
uriComponentsCharMap[51][98] = true // ; '%3b'
uriComponentsCharMap[51][68] = true // = '%3D'
uriComponentsCharMap[51][100] = true // = '%3d'
uriComponentsCharMap[51][70] = true // ? '%3F'
uriComponentsCharMap[51][102] = true // ? '%3f'

uriComponentsCharMap[52] = new Array(49).fill(0x00)
uriComponentsCharMap[52][48] = true // @ '%40'

function sanitizeUrl (url) {
  let originPath = url
  let shouldDecode = false
  let containsEncodedComponents = false
  let highChar
  let lowChar
  for (var i = 0, len = url.length; i < len; i++) {
    var charCode = url.charCodeAt(i)

    if (shouldDecode && !containsEncodedComponents) {
      if (highChar === 0 && uriComponentsCharMap[charCode]) {
        highChar = charCode
        lowChar = 0x00
      } else if (highChar && lowChar === 0 && uriComponentsCharMap[highChar][charCode]) {
        containsEncodedComponents = true
      } else {
        highChar = undefined
        lowChar = undefined
      }
    }

    // Some systems do not follow RFC and separate the path and query
    // string with a `;` character (code 59), e.g. `/foo;jsessionid=123456`.
    // Thus, we need to split on `;` as well as `?` and `#`.
    if (charCode === 63 || charCode === 59 || charCode === 35) {
      originPath = url.slice(0, i)
      break
    } else if (charCode === 37) {
      shouldDecode = true
      highChar = 0x00
    }
  }
  const decoded = shouldDecode ? decodeURI(originPath) : originPath

  const sliceParameter = containsEncodedComponents
    ? sliceAndDecode.bind(null, originPath)
    : slicePath.bind(null, decoded)

  return {
    path: decoded,
    originPath,
    sliceParameter
  }
}

module.exports = sanitizeUrl

function sliceAndDecode (path, from, to) {
  return fastDecode(path.slice(from, to))
}

function slicePath (path, from, to) {
  return path.slice(from, to)
}
