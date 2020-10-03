'use strict'

const SemVerStore = require('semver-store')

module.exports = {
  storage: SemVerStore,
  deriveConstraint: function (req, ctx) {
    return req.headers['accept-version']
  }
}
