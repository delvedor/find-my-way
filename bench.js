'use strict'

const Benchmark = require('benchmark')
const suite = Benchmark.Suite()

const FindMyWay = require('./')

const findMyWay = new FindMyWay()
findMyWay.on('GET', '/', () => true)
findMyWay.on('GET', '/user', () => true)

suite
  .add('fmw router static route', function () {
    findMyWay.lookup('GET', '/')
  })
  .add('fmw router dynamic route', function () {
    findMyWay.lookup('GET', '/user/tomas')
  })
  .on('cycle', function (event) {
    console.log(String(event.target))
  })
  .on('complete', function () {})
  .run()
