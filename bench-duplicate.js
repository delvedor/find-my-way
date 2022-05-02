'use strict'

const removeDuplicateSlashes = require('./lib/duplicate-slashes')

const Benchmark = require('benchmark')
Benchmark.options.minSamples = 200
Benchmark.options.maxTime = 5

const suite = Benchmark.Suite()

const uri = [
  '/a/b',
  '/api/v1/myNamespace/myObject/action1',
  '/a//b',
  '/api/v1/myNamespace/myObject//action1',
  '/a///////////////////////b',
  '/api/v1/myNamespace/myObject///////////////////////action1',
  '/api//v1//myNamespace//myObject//action1'
]

const duplicationSlashesRegex = new RegExp(/\/\/+/g)

function removeDuplicateSlashesRegex (path) {
  return path.replace(duplicationSlashesRegex, '/')
}

uri.forEach(function (u, i) {
  suite.add(`removeDuplicateSlashes(${i}) [${u}]`, function () {
    removeDuplicateSlashes(u)
  })
  suite.add(`removeDuplicateSlashesRegex(${i}) [${u}]`, function () {
    removeDuplicateSlashesRegex(u)
  })
})
suite
  .on('cycle', function (event) {
    console.log(String(event.target))
  })
  .on('complete', function () {
  })
  .run()
