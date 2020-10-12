'use strict'

const SemVerStore = require('semver-store')

function acceptVersion() { }

acceptVersion.prototype.name = 'version'
acceptVersion.prototype.storage = SemVerStore
acceptVersion.prototype.deriveConstraint = function (req, ctx) {
  return req.headers['version']
}

module.exports = acceptVersion