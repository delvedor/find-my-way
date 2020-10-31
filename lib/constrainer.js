'use strict'

const acceptVersionStrategy = require('./strategies/accept-version')
const acceptHostStrategy = require('./strategies/accept-host')
const assert = require('assert')

class Constrainer {
  constructor (customStrategies) {
    this.strategies = {
      version: acceptVersionStrategy,
      host: acceptHostStrategy
    }

    // validate and optimize prototypes of given custom strategies
    if (customStrategies) {
      var kCustomStrategies = Object.keys(customStrategies)
      var strategy
      for (var i = 0; i < kCustomStrategies.length; i++) {
        strategy = customStrategies[kCustomStrategies[i]]
        assert(typeof strategy.name === 'string' && strategy.name !== '', 'strategy.name is required.')
        assert(strategy.storage && typeof strategy.storage === 'function', 'strategy.storage function is required.')
        assert(strategy.deriveConstraint && typeof strategy.deriveConstraint === 'function', 'strategy.deriveConstraint function is required.')
        strategy.isCustom = true
        this.strategies[strategy.name] = strategy
      }
    }

    this.deriveConstraints = this._buildDeriveConstraints()
  }

  newStoreForConstraint (constraint) {
    if (!this.strategies[constraint]) {
      throw new Error(`No strategy registered for constraint key ${constraint}`)
    }
    return this.strategies[constraint].storage()
  }

  validateConstraints (constraints) {
    for (const key in constraints) {
      const value = constraints[key]
      const strategy = this.strategies[key]
      if (!strategy) {
        throw new Error(`No strategy registered for constraint key ${key}`)
      }
      if (strategy.validate) {
        strategy.validate(value)
      }
    }
  }

  // Optimization: build a fast function for deriving the constraints for all the strategies at once. We inline the definitions of the version constraint and the host constraint for performance.
  _buildDeriveConstraints () {
    const lines = [`
      const derivedConstraints = {
        __hasMustMatchValues: false,
        host: req.headers.host,
        version: req.headers['accept-version'],
    `]

    const mustMatchKeys = []

    for (const key in this.strategies) {
      const strategy = this.strategies[key]
      if (strategy.isCustom) {
        lines.push(`
        ${strategy.name}: this.strategies.${key}.deriveConstraint(req, ctx),
      `)
      }

      if (strategy.mustMatchWhenDerived) {
        mustMatchKeys.push(key)
      }
    }

    lines.push('}')

    // There are some constraints that can be derived and marked as "must match", where if they are derived, they only match routes that actually have a constraint on the value, like the SemVer version constraint.
    // An example: a request comes in for version 1.x, and this node has a handler that maches the path, but there's no version constraint. For SemVer, the find-my-way semantics do not match this handler to that request.
    // This function is used by Nodes with handlers to match when they don't have any constrained routes to exclude request that do have must match derived constraints present.
    if (mustMatchKeys.length > 0) {
      lines.push(`derivedConstraints.__hasMustMatchValues = !!(${(mustMatchKeys.map(key => `derivedConstraints.${key}`).join(' || '))})`)
    }
    lines.push('return derivedConstraints')

    return new Function('req', 'ctx', lines.join('\n')).bind(this) // eslint-disable-line
  }
}

module.exports = Constrainer
