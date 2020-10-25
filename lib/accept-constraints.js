'use strict'

const ConstraintsStore = require('./constraints-store')

const acceptVersionStrategy = require('./strategies/accept-version')
const acceptHostStrategy = require('./strategies/accept-host')
const assert = require('assert')

module.exports = (customStrategies) => {
  const strategiesObject = {
    version: strategyObjectToPrototype(acceptVersionStrategy),
    host: strategyObjectToPrototype(acceptHostStrategy)
  }

  if (customStrategies) {
    var kCustomStrategies = Object.keys(customStrategies)
    var strategy
    for (var i = 0; i < kCustomStrategies.length; i++) {
      strategy = customStrategies[kCustomStrategies[i]]
      assert(typeof strategy.name === 'string' && strategy.name !== '', 'strategy.name is required.')
      assert(strategy.storage && typeof strategy.storage === 'function', 'strategy.storage function is required.')
      assert(strategy.deriveConstraint && typeof strategy.deriveConstraint === 'function', 'strategy.deriveConstraint function is required.')
      strategy = strategyObjectToPrototype(strategy)
      strategy.isCustom = true
      strategiesObject[strategy.name] = strategy
    }
  }

  // Convert to array for faster processing inside deriveConstraints
  const strategies = Object.values(strategiesObject)

  const acceptConstraints = {
    storage: function () {
      const stores = {}
      for (var i = 0; i < strategies.length; i++) {
        stores[strategies[i].name] = strategies[i].storage()
      }
      return ConstraintsStore(stores)
    },
    deriveConstraints: function deriveConstraints (req, ctx) {
      const derivedConstraints = {
        host: req.headers.host
      }

      const version = req.headers['accept-version']
      if (version) {
        derivedConstraints.version = version
      }

      // custom strategies insertion position

      return derivedConstraints
    }
  }

  if (customStrategies) {
    var code = acceptConstraints.deriveConstraints.toString()
    var customStrategiesCode =
    `var value
      for (var i = 0; i < strategies.length; i++) {
        if (strategies[i].isCustom) {
          value = strategies[i].deriveConstraint(req, ctx)
          if (value) {
            derivedConstraints[strategies[i].name] = value
          }
        }
      }
    `
    code = code.replace('// custom strategies insertion position', customStrategiesCode)
    acceptConstraints.deriveConstraints = new Function(code) // eslint-disable-line
  }

  return acceptConstraints
}

function strategyObjectToPrototype (strategy) {
  const StrategyPrototype = function () {}
  StrategyPrototype.prototype.name = strategy.name
  StrategyPrototype.prototype.storage = strategy.storage
  StrategyPrototype.prototype.deriveConstraint = strategy.deriveConstraint
  return new StrategyPrototype()
}
