# find-my-way

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)  [![Build Status](https://travis-ci.org/delvedor/find-my-way.svg?branch=master)](https://travis-ci.org/delvedor/find-my-way)

A crazy fast HTTP router, internally uses an highly performant [Radix Tree](https://en.wikipedia.com/wiki/Radix_tree) (aka compact [Prefix Tree](https://en.wikipedia.com/wiki/Trie)), supports route params, wildcards, and it's framework independent.  
It is inspired by the [echo](https://github.com/labstack/echo) router, some parts have been extracted from [trekjs](https://github.com/trekjs) router.

## Install
```
npm i find-my-way --save
```

## Usage
```js
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
```

## License
**[find-my-way - MIT](https://github.com/delvedor/find-my-way/blob/master/LICENSE)**  
**[trekjs/router - MIT](https://github.com/trekjs/router/blob/master/LICENSE)**

*The software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and non infringement. In no event shall the authors or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.*

Copyright © 2017 Tomas Della Vedova
