'use strict'

const acceptVersionStrategy = require('./strategies/accept-version')
const acceptHostStrategy = require('./strategies/accept-host')
const assert = require('assert')

const Strategy = function () {}
Strategy.prototype.name = null
Strategy.prototype.storage = null
Strategy.prototype.validate = null
Strategy.prototype.deriveConstraint = null

// Optimizes prototype shape lookup for a strategy, which we hit a lot in the request path for constraint derivation
function reshapeStrategyObject (strategy) {
  return Object.assign(new Strategy(), strategy)
}

// Optimizes prototype shape lookup for an object of strategies, which we hit a lot in the request path for constraint derivation
function strategiesShape (strategies) {
  const Strategies = function () {}
  for (const key in strategies) {
    Strategies.prototype[key] = null
  }
  return Strategies
}

class Constrainer {
  constructor (customStrategies) {
    const strategies = {
      version: reshapeStrategyObject(acceptVersionStrategy),
      host: reshapeStrategyObject(acceptHostStrategy)
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
        strategy = reshapeStrategyObject(strategy)
        strategy.isCustom = true
        strategies[strategy.name] = strategy
      }
    }

    this.StrategiesShape = strategiesShape(this.strategies)
    this.strategies = Object.assign(new this.StrategiesShape(), strategies)

    // Expose a constructor for maps that hold something per strategy with an optimized prototype
    this.ConstraintMap = function () {}
    for (const strategy in this.strategies) {
      this.ConstraintMap.prototype[strategy] = null
    }

    this.deriveConstraints = this._buildDeriveConstraints()

    // Optimization: cache this dynamic function for Nodes on this shared object so it's only compiled once and JITted sooner
    this.mustMatchHandlerMatcher = this._buildMustMatchHandlerMatcher()
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
      const derivedConstraints = new this.StrategiesShape()
      derivedConstraints.host = req.headers.host
      const version = req.headers['accept-version']
      if (version) {
        derivedConstraints.version = version
      }`]

    for (const key in this.strategies) {
      const strategy = this.strategies[key]
      if (strategy.isCustom) {
        lines.push(`
        value = this.strategies.${key}.deriveConstraint(req, ctx)
        if (value) {
          derivedConstraints["${strategy.name}"] = value
        }`)
      }
    }

    lines.push('return derivedConstraints')

    return new Function('req', 'ctx', lines.join('\n')).bind(this) // eslint-disable-line
  }

  // There are some constraints that can be derived and marked as "must match", where if they are derived, they only match routes that actually have a constraint on the value, like the SemVer version constraint.
  // An example: a request comes in for version 1.x, and this node has a handler that maches the path, but there's no version constraint. For SemVer, the find-my-way semantics do not match this handler to that request.
  // This function is used by Nodes with handlers to match when they don't have any constrained routes to exclude request that do have must match derived constraints present.
  _buildMustMatchHandlerMatcher () {
    const lines = []
    for (const key in this.strategies) {
      const strategy = this.strategies[key]
      if (strategy.mustMatchWhenDerived) {
        lines.push(`if (typeof derivedConstraints.${key} !== "undefined") return null`)
      }
    }
    lines.push('return this.handlers[0]')

    return new Function('derivedConstraints', lines.join('\n')) // eslint-disable-line
  }
}

module.exports = Constrainer