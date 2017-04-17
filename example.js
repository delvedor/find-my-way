'use strict'

const http = require('http')
const findMyWay = require('./')()

findMyWay.on('GET', '/', (req, res, params) => {
  res.end('{"hello":"world"}')
})

const server = http.createServer((req, res) => {
  findMyWay.lookup(req.method, req.url, req, res)
})

server.listen(3000, err => {
  if (err) throw err
  console.log('Server listening on: http://localost:3000')
})
