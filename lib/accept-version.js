'use strict'

const SemVerStore = require('semver-store')

function build () {
  return {
    storage: SemVerStore,
    deriveVersion: function (req, ctx) {
      return req.headers['accept-version']
    }
  }
}

module.exports = build
