# find-my-way

[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com/)  [![Build Status](https://travis-ci.org/delvedor/find-my-way.svg?branch=master)](https://travis-ci.org/delvedor/find-my-way) [![Coverage Status](https://coveralls.io/repos/github/delvedor/find-my-way/badge.svg?branch=master)](https://coveralls.io/github/delvedor/find-my-way?branch=master) [![NPM downloads](https://img.shields.io/npm/dm/find-my-way.svg?style=flat)](https://www.npmjs.com/package/find-my-way)

A crazy fast HTTP router, internally uses an highly performant [Radix Tree](https://en.wikipedia.org/wiki/Radix_tree) (aka compact [Prefix Tree](https://en.wikipedia.org/wiki/Trie)), supports route params, wildcards, and it's framework independent.

If you want to see a benchmark comparison with the most commonly used routers, see [here](https://github.com/delvedor/router-benchmark).<br>
Do you need a real-world example that uses this router? Check out [Fastify](https://github.com/fastify/fastify).

<a name="install"></a>
## Install
```
npm i find-my-way --save
```

<a name="usage"></a>
## Usage
```js
const http = require('http')
const router = require('find-my-way')()

router.on('GET', '/', (req, res, params) => {
  res.end('{"message":"hello world"}')
})

const server = http.createServer((req, res) => {
  router.lookup(req, res)
})

server.listen(3000, err => {
  if (err) throw err
  console.log('Server listening on: http://localost:3000')
})
```

<a name="api"></a>
## API
<a name="constructor"></a>
#### FindMyway([options])
Instance a new router.<br>
You can pass a default route with the option `defaultRoute`.
```js
const router = require('find-my-way')({
  defaultRoute: (req, res) => {
    res.statusCode = 404
    res.end()
  }
})
```

Trailing slashes can be ignored by supplying the `ignoreTrailingSlash` option:
```js
const router = require('find-my-way')({
  ignoreTrailingSlash: true
})
function handler (req, res, params) {
  res.send('foo')
}
// maps "/foo/" and "/foo" to `handler`
router.on('GET', '/foo/', handler)
```

<a name="on"></a>
#### on(method, path, handler, [store])
Register a new route.
```js
router.on('GET', '/example', (req, res, params) => {
  // your code
})
```
Last argument, `store` is used to pass an object that you can access later inside the handler function. If needed, `store` can be updated.
```js
router.on('GET', '/example', (req, res, params, store) => {
  assert.equal(store, { message: 'hello world' })
}, { message: 'hello world' })
```

##### on(methods[], path, handler, [store])
Register a new route for each method specified in the `methods` array.
It comes handy when you need to declare multiple routes with the same handler but different methods.
```js
router.on(['GET', 'POST'], '/example', (req, res, params) => {
  // your code
})
```

<a name="supported-path-formats"></a>
##### Supported path formats
To register a **parametric** path, use the *colon* before the parameter name. For **wildcard** use the *star*.
*Remember that static routes are always inserted before parametric and wildcard.*

```js
// parametric
router.on('GET', '/example/:userId', (req, res, params) => {}))
router.on('GET', '/example/:userId/:secretToken', (req, res, params) => {}))

// wildcard
router.on('GET', '/example/*', (req, res, params) => {}))
```

Regular expression routes are supported as well, but pay attention, RegExp are very expensive in term of performance!
```js
// parametric with regexp
router.on('GET', '/example/:file(^\\d+).png', () => {}))
```

It's possible to define more than one parameter within the same couple of slash ("/"). Such as:
```js
router.on('GET', '/example/near/:lat-:lng/radius/:r', (req, res, params) => {}))
```
*Remember in this case to use the dash ("-") as parameters separator.*

Finally it's possible to have multiple parameters with RegExp.
```js
router.on('GET', '/example/at/:hour(^\\d{2})h:minute(^\\d{2})m', (req, res, params) => {}))
```
In this case as parameter separator it's possible to use whatever character is not matched by the regular expression.

Having a route with multiple parameters may affect negatively the performance, so prefer single parameter approach whenever possible, especially on routes which are on the hot path of your application.

<a name="match-order"></a>
##### Match order
The routes are matched in the following order:
```
static
parametric
wildcards
parametric(regex)
multi parametric(regex)
```

<a name="off"></a>
#### off(method, path)
Deregister a route.
```js
router.off('GET', '/example')
// => { handler: Function, params: Object, store: Object}
// => null
```

##### off(methods[], path, handler, [store])
Deregister a route for each method specified in the `methods` array.
It comes handy when you need to deregister multiple routes with the same path but different methods.
```js
router.off(['GET', 'POST'], '/example')
// => [{ handler: Function, params: Object, store: Object}]
// => null
```

<a name="reset"></a>
#### reset()
Empty router.
```js
router.reset()
```

##### Caveats
* Since *static* routes have greater priority than *parametric* routes, when you register a static route and a dynamic route, which have part of their path equal, the static route shadows the parametric route, that becomes not accessible. For example:
```js
const assert = require('assert')
const router = require('find-my-way')({
  defaultRoute: (req, res) => {
    assert(req.url === '/example/shared/nested/oops')
  }
})

router.on('GET', '/example/shared/nested/test', (req, res, params) => {
  assert.fail('We should not be here')
})

router.on('GET', '/example/:param/nested/oops', (req, res, params) => {
  assert.fail('We should not be here')
})

router.lookup({ method: 'GET', url: '/example/shared/nested/oops' }, null)
```

* It's not possible to register two routes which differs only for their parameters, because internally they would be seen as the same route. In a such case you'll get an early error during the route registration phase. An example is worth thousand words:
```js
const findMyWay = FindMyWay({
  defaultRoute: (req, res) => {}
})

findMyWay.on('GET', '/user/:userId(^\\d+)', (req, res, params) => {})

findMyWay.on('GET', '/user/:username(^[a-z]+)', (req, res, params) => {})
// Method 'GET' already declared for route ':'
```

<a name="shorthand-methods"></a>
##### Shorthand methods
If you want an even nicer api, you can also use the shorthand methods to declare your routes.
```js
router.get(path, handler [, store])
router.delete(path, handler [, store])
router.head(path, handler [, store])
router.patch(path, handler [, store])
router.post(path, handler [, store])
router.put(path, handler [, store])
router.options(path, handler [, store])
router.trace(path, handler [, store])
router.connect(path, handler [, store])
```

If you need a route that supports *all* methods you can use the `all` api.
```js
router.all(path, handler [, store])
```

<a name="lookup"></a>
#### lookup(request, response)
Start a new search, `request` and `response` are the server req/res objects.<br>
If a route is found it will automatically called the handler, otherwise the default route will be called.<br>
The url is sanitized internally, all the parameters and wildcards are decoded automatically.
```js
router.lookup(req, res)
```

<a name="find"></a>
#### find(method, path)
Return (if present) the route registered in *method:path*.<br>
The path must be sanitized, all the parameters and wildcards are decoded automatically.
```js
router.find('GET', '/example')
// => { handler: Function, params: Object, store: Object}
// => null
```

<a name="pretty-print"></a>
#### prettyPrint()
Prints the representation of the internal radix tree, useful for debugging.
```js
findMyWay.on('GET', '/test', () => {})
findMyWay.on('GET', '/test/hello', () => {})
findMyWay.on('GET', '/hello/world', () => {})

console.log(findMyWay.prettyPrint())
// └── /
//   ├── test (GET)
//   │   └── /hello (GET)
//   └── hello/world (GET)
```

<a name="acknowledgements"></a>
## Acknowledgements

This project is kindly sponsored by [LetzDoIt](http://www.letzdoitapp.com/).<br>
It is inspired by the [echo](https://github.com/labstack/echo) router, some parts have been extracted from [trekjs](https://github.com/trekjs) router.

<a name="license"></a>
## License
**[find-my-way - MIT](https://github.com/delvedor/find-my-way/blob/master/LICENSE)**<br>
**[trekjs/router - MIT](https://github.com/trekjs/router/blob/master/LICENSE)**

Copyright © 2017 Tomas Della Vedova
