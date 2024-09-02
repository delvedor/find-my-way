'use strict'

const { test } = require('tap')
const { NullObject } = require('../lib/null-object')

test('NullObject', t => {
  t.plan(2)
  const nullObject = new NullObject()
  t.ok(nullObject instanceof NullObject)
  t.ok(typeof nullObject === 'object')
})

test('has no methods from generic Object class', t => {
  function getAllPropertyNames (obj) {
    const props = []

    do {
      Object.getOwnPropertyNames(obj).forEach(function (prop) {
        if (props.indexOf(prop) === -1) {
          props.push(prop)
        }
      })
    } while (obj = Object.getPrototypeOf(obj)) // eslint-disable-line

    return props
  }
  const propertyNames = getAllPropertyNames({})
  t.plan(propertyNames.length + 1)

  const nullObject = new NullObject()

  for (const propertyName of propertyNames) {
    t.notOk(propertyName in nullObject, propertyName)
  }
  t.equal(getAllPropertyNames(nullObject).length, 0)
})
