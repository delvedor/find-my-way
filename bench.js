'use strict'

const Benchmark = require('benchmark')
const suite = Benchmark.Suite()

const FindMyWay = require('./')

const findMyWay = new FindMyWay()
findMyWay.on('GET', '/', () => true)
findMyWay.on('GET', '/user/:id', () => true)
findMyWay.on('GET', '/user/:id/static', () => true)
findMyWay.on('GET', '/customer/:name-:surname', () => true)
findMyWay.on('GET', '/at/:hour(^\\d+)h:minute(^\\d+)m', () => true)
findMyWay.on('GET', '/abc/def/ghi/lmn/opq/rst/uvz', () => true)
// findMyWay.on('GET', '/', { version: '1.2.0' }, () => true)

suite
  .add('lookup static route', function () {
    findMyWay.lookup({ method: 'GET', url: '/', headers: {} }, null)
  })
  .add('lookup dynamic route', function () {
    findMyWay.lookup({ method: 'GET', url: '/user/tomas', headers: {} }, null)
  })
  .add('lookup dynamic multi-parametric route', function () {
    findMyWay.lookup({ method: 'GET', url: '/customer/john-doe', headers: {} }, null)
  })
  .add('lookup dynamic multi-parametric route with regex', function () {
    findMyWay.lookup({ method: 'GET', url: '/at/12h00m', headers: {} }, null)
  })
  .add('lookup long static route', function () {
    findMyWay.lookup({ method: 'GET', url: '/abc/def/ghi/lmn/opq/rst/uvz', headers: {} }, null)
  })
  .add('lookup long dynamic route', function () {
    findMyWay.lookup({ method: 'GET', url: '/user/qwertyuiopasdfghjklzxcvbnm/static', headers: {} }, null)
  })
//  .add('lookup static versioned route', function () {
//    findMyWay.lookup({ method: 'GET', url: '/', headers: { 'accept-version': '1.x' } }, null)
//  })
  .add('find static route', function () {
    findMyWay.find('GET', '/', undefined)
  })
  .add('find dynamic route', function () {
    findMyWay.find('GET', '/user/tomas', undefined)
  })
  .add('find dynamic multi-parametric route', function () {
    findMyWay.find('GET', '/customer/john-doe', undefined)
  })
  .add('find dynamic multi-parametric route with regex', function () {
    findMyWay.find('GET', '/at/12h00m', undefined)
  })
  .add('find long static route', function () {
    findMyWay.find('GET', '/abc/def/ghi/lmn/opq/rst/uvz', undefined)
  })
  .add('find long dynamic route', function () {
    findMyWay.find('GET', '/user/qwertyuiopasdfghjklzxcvbnm/static', undefined)
  })
//  .add('find static versioned route', function () {
//    findMyWay.find('GET', '/', '1.x')
//  })
  .on('cycle', function (event) {
    console.log(String(event.target))
  })
  .on('complete', function () {})
  .run()
