const isRegexSafe = require('safe-regex2')

const FULL_PATH_REGEXP = /^https?:\/\/.*?\//
const OPTIONAL_PARAM_REGEXP = /(\/:[^/()]*?)\?(\/?)/

if (!isRegexSafe(FULL_PATH_REGEXP)) {
  throw new Error('the FULL_PATH_REGEXP is not safe, update this module')
}

if (!isRegexSafe(OPTIONAL_PARAM_REGEXP)) {
  throw new Error('the OPTIONAL_PARAM_REGEXP is not safe, update this module')
}

module.exports.FULL_PATH_REGEXP = FULL_PATH_REGEXP
module.exports.OPTIONAL_PARAM_REGEXP = OPTIONAL_PARAM_REGEXP
