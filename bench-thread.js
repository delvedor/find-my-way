'use strict'

const { workerData, parentPort } = require('worker_threads')

const Benchmark = require('benchmark')
// The default number of samples for Benchmark seems to be low enough that it
// can generate results with significant variance (~2%) for this benchmark
// suite. This makes it sometimes a bit confusing to actually evaluate impact of
// changes on performance. Setting the minimum of samples to 500 results in
// significantly lower variance on my local setup for this tests suite, and
// gives me higher confidence in benchmark results.
Benchmark.options.minSamples = 500

const suite = Benchmark.Suite()

const FindMyWay = require('./')

const findMyWay = new FindMyWay()

const testingMethods = {
  lookup: findMyWay.lookup,
  find: findMyWay.find
}

const { name, setupURLs, testingMethodName, args } = workerData
const testingMethod = testingMethods[testingMethodName]

for (const { method, url, opts } of setupURLs) {
  if (opts !== undefined) {
    findMyWay.on(method, url, opts, () => true)
  } else {
    findMyWay.on(method, url, () => true)
  }
}

suite
  .add(name, () => {
    testingMethod.call(findMyWay, ...args)
  })
  .on('cycle', (event) => {
    parentPort.postMessage(String(event.target))
  })
  .on('complete', () => {})
  .run()
