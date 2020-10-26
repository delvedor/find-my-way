'use strict'

const SemVerStore = require('semver-store')
const assert = require('assert')

module.exports = {
  name: 'version',
  mustMatchWhenDerived: true,
  storage: SemVerStore,
  validate (value) {
    assert(typeof value === 'string', 'Version should be a string')
  }
}
