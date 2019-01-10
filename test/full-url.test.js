'use strict'

const t = require('tap')
const FindMyWay = require('../')

const findMyWay = FindMyWay({
  defaultRoute: (req, res) => {
    t.fail('Should not be defaultRoute')
  }
})

findMyWay.on('GET', '/a', (req, res) => {
  res.end('{"message":"hello world"}')
})

t.deepEqual(findMyWay.find('GET', 'http://localhost/a'), findMyWay.find('GET', '/a'))
t.deepEqual(findMyWay.find('GET', 'http://localhost:8080/a'), findMyWay.find('GET', '/a'))
t.deepEqual(findMyWay.find('GET', 'http://123.123.123.123/a'), findMyWay.find('GET', '/a'))
t.deepEqual(findMyWay.find('GET', 'https://localhost/a'), findMyWay.find('GET', '/a'))
