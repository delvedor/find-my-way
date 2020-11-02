'use strict'

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
findMyWay.on('GET', '/', () => true)
findMyWay.on('GET', '/user/:id', () => true)
findMyWay.on('GET', '/user/:id/static', () => true)
findMyWay.on('POST', '/user/:id', () => true)
findMyWay.on('PUT', '/user/:id', () => true)
findMyWay.on('GET', '/customer/:name-:surname', () => true)
findMyWay.on('POST', '/customer', () => true)
findMyWay.on('GET', '/at/:hour(^\\d+)h:minute(^\\d+)m', () => true)
findMyWay.on('GET', '/abc/def/ghi/lmn/opq/rst/uvz', () => true)
findMyWay.on('GET', '/versioned', () => true)
findMyWay.on('GET', '/versioned', { constraints: { version: '1.2.0' } }, () => true)

findMyWay.on('GET', '/products', () => true)
findMyWay.on('GET', '/products/:id', () => true)
findMyWay.on('GET', '/products/:id/options', () => true)

findMyWay.on('GET', '/posts', () => true)
findMyWay.on('POST', '/posts', () => true)
findMyWay.on('GET', '/posts/:id', () => true)
findMyWay.on('GET', '/posts/:id/author', () => true)
findMyWay.on('GET', '/posts/:id/comments', () => true)
findMyWay.on('POST', '/posts/:id/comments', () => true)
findMyWay.on('GET', '/posts/:id/comments/:id', () => true)
findMyWay.on('GET', '/posts/:id/comments/:id/author', () => true)
findMyWay.on('GET', '/posts/:id/counter', () => true)

findMyWay.on('GET', '/pages', () => true)
findMyWay.on('POST', '/pages', () => true)
findMyWay.on('GET', '/pages/:id', () => true)

findMyWay.on('GET', '/products', () => true)
findMyWay.on('GET', '/products/:id', () => true)
findMyWay.on('GET', '/products/:id/options', () => true)

findMyWay.on('GET', '/posts', () => true)
findMyWay.on('POST', '/posts', () => true)
findMyWay.on('GET', '/posts/:id', () => true)
findMyWay.on('GET', '/posts/:id/author', () => true)
findMyWay.on('GET', '/posts/:id/comments', () => true)
findMyWay.on('POST', '/posts/:id/comments', () => true)
findMyWay.on('GET', '/posts/:id/comments/:id', () => true)
findMyWay.on('GET', '/posts/:id/comments/:id/author', () => true)
findMyWay.on('GET', '/posts/:id/counter', () => true)

findMyWay.on('GET', '/pages', () => true)
findMyWay.on('POST', '/pages', () => true)
findMyWay.on('GET', '/pages/:id', () => true)

suite
  .add('lookup static route', function () {
    findMyWay.lookup({ method: 'GET', url: '/', headers: { host: 'fastify.io' } }, null)
  })
  .add('lookup dynamic route', function () {
    findMyWay.lookup({ method: 'GET', url: '/user/tomas', headers: { host: 'fastify.io' } }, null)
  })
  .add('lookup dynamic multi-parametric route', function () {
    findMyWay.lookup({ method: 'GET', url: '/customer/john-doe', headers: { host: 'fastify.io' } }, null)
  })
  .add('lookup dynamic multi-parametric route with regex', function () {
    findMyWay.lookup({ method: 'GET', url: '/at/12h00m', headers: { host: 'fastify.io' } }, null)
  })
  .add('lookup long static route', function () {
    findMyWay.lookup({ method: 'GET', url: '/abc/def/ghi/lmn/opq/rst/uvz', headers: { host: 'fastify.io' } }, null)
  })
  .add('lookup long dynamic route', function () {
    findMyWay.lookup({ method: 'GET', url: '/user/qwertyuiopasdfghjklzxcvbnm/static', headers: { host: 'fastify.io' } }, null)
  })
  .add('lookup static versioned route', function () {
    findMyWay.lookup({ method: 'GET', url: '/versioned', headers: { 'accept-version': '1.x', host: 'fastify.io' } }, null)
  })
  .add('lookup static constrained (version & host) route', function () {
    findMyWay.lookup({ method: 'GET', url: '/versioned', headers: { 'accept-version': '1.x', host: 'google.com' } }, null)
  })
  .add('find static route', function () {
    findMyWay.find('GET', '/', { host: 'fastify.io' })
  })
  .add('find dynamic route', function () {
    findMyWay.find('GET', '/user/tomas', { host: 'fastify.io' })
  })
  .add('find dynamic multi-parametric route', function () {
    findMyWay.find('GET', '/customer/john-doe', { host: 'fastify.io' })
  })
  .add('find dynamic multi-parametric route with regex', function () {
    findMyWay.find('GET', '/at/12h00m', { host: 'fastify.io' })
  })
  .add('find long static route', function () {
    findMyWay.find('GET', '/abc/def/ghi/lmn/opq/rst/uvz', { host: 'fastify.io' })
  })
  .add('find long dynamic route', function () {
    findMyWay.find('GET', '/user/qwertyuiopasdfghjklzxcvbnm/static', { host: 'fastify.io' })
  })
  .add('find static versioned route', function () {
    findMyWay.find('GET', '/', { version: '1.x' })
  })
  .add('find static constrained (version & host) route', function () {
    findMyWay.find('GET', '/', { version: '1.x', host: 'google.com' })
  })
  .add('find long nested dynamic route', function () {
    findMyWay.find('GET', '/posts/10/comments/42/author', undefined)
  })
  .add('find long nested dynamic route with other method', function () {
    findMyWay.find('POST', '/posts/10/comments', undefined)
  })
  .add('find long nested dynamic route', function () {
    findMyWay.find('GET', '/posts/10/comments/42/author', undefined)
  })
  .add('find long nested dynamic route with other method', function () {
    findMyWay.find('POST', '/posts/10/comments', undefined)
  })
  .on('cycle', function (event) {
    console.log(String(event.target))
  })
  .on('complete', function () {})
  .run()
