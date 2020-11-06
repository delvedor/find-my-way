'use strict'

const SemVerStore = require('semver-store')

function build (enabled) {
  if (enabled) {
    return {
      storage: SemVerStore,
      deriveVersion: function (req, ctx) {
        return req.headers['accept-version']
      }
    }
  }
  return {
    storage: SemVerStore,
    deriveVersion: function (req, ctx) {},
    disabled: true
  }
}

module.exports = build
