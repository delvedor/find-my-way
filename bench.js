'use strict'

const Benchmark = require('benchmark')
const suite = Benchmark.Suite()

const FindMyWay = require('./')

const findMyWay = new FindMyWay()
findMyWay.on('GET', '/', () => true)
findMyWay.on('GET', '/user/:id', () => true)
findMyWay.on('GET', '/customer/:name-:surname', () => true)
findMyWay.on('GET', '/at/:hour(^\\d+)h:minute(^\\d+)m', () => true)
findMyWay.on('GET', '/abc/def/ghi/lmn/opq/rst/uvz', () => true)

suite
  .add('lookup static route', function () {
    findMyWay.lookup({ method: 'GET', url: '/' }, null)
  })
  .add('lookup dynamic route', function () {
    findMyWay.lookup({ method: 'GET', url: '/user/tomas' }, null)
  })
  .add('lookup dynamic multi-parametric route', function () {
    findMyWay.lookup({ method: 'GET', url: '/customer/john-doe' }, null)
  })
  .add('lookup dynamic multi-parametric route with regex', function () {
    findMyWay.lookup({ method: 'GET', url: '/at/12h00m' }, null)
  })
  .add('lookup long static route', function () {
    findMyWay.lookup({ method: 'GET', url: '/abc/def/ghi/lmn/opq/rst/uvz' }, null)
  })
  .add('find static route', function () {
    findMyWay.find('GET', '/')
  })
  .add('find dynamic route', function () {
    findMyWay.find('GET', '/user/tomas')
  })
  .add('find dynamic multi-parametric route', function () {
    findMyWay.find('GET', '/customer/john-doe')
  })
  .add('find dynamic multi-parametric route with regex', function () {
    findMyWay.find('GET', '/at/12h00m')
  })
  .add('find long static route', function () {
    findMyWay.find('GET', '/abc/def/ghi/lmn/opq/rst/uvz')
  })
  .on('cycle', function (event) {
    console.log(String(event.target))
  })
  .on('complete', function () {})
  .run()
