import { expectType } from 'tsd'
import * as Router from '../../'
import { Http2ServerRequest, Http2ServerResponse } from 'http2'
import { IncomingMessage, ServerResponse } from 'http'

let http1Req!: IncomingMessage;
let http1Res!: ServerResponse;
let http2Req!: Http2ServerRequest;
let http2Res!: Http2ServerResponse;

// HTTP1
{
  let handler: Router.Handler<Router.HTTPVersion.V1>
  const router = Router({
    ignoreTrailingSlash: true,
    allowUnsafeRegex: false,
    caseSensitive: false,
    maxParamLength: 42,
    defaultRoute (http1Req, http1Res) {},
    onBadUrl (path, http1Req, http1Res) {},
    constraints: {
      foo: {
        name: 'foo',
        mustMatchWhenDerived: true,
        storage () {
          return {
            get (version) { return handler },
            set (version, handler) {},
            del (version) {},
            empty () {}
          }
        },
        deriveConstraint(req) { return '1.0.0' },
        validate(value) { if (typeof value === "string") { throw new Error("invalid")} }
      }
    }
  })
  expectType<Router.Instance<Router.HTTPVersion.V1>>(router)

  expectType<void>(router.on('GET', '/', () => {}))
  expectType<void>(router.on(['GET', 'POST'], '/', () => {}))
  expectType<void>(router.on('GET', '/', { constraints: { version: '1.0.0' }}, () => {}))
  expectType<void>(router.on('GET', '/', () => {}, {}))
  expectType<void>(router.on('GET', '/', {constraints: { version: '1.0.0' }}, () => {}, {}))

  expectType<void>(router.get('/', () => {}))
  expectType<void>(router.get('/', { constraints: { version: '1.0.0' }}, () => {}))
  expectType<void>(router.get('/', () => {}, {}))
  expectType<void>(router.get('/', { constraints: { version: '1.0.0' }}, () => {}, {}))

  expectType<void>(router.off('GET', '/'))
  expectType<void>(router.off(['GET', 'POST'], '/'))

  expectType<void>(router.lookup(http1Req, http1Res))
  expectType<Router.FindResult<Router.HTTPVersion.V1> | null>(router.find('GET', '/'))
  expectType<Router.FindResult<Router.HTTPVersion.V1> | null>(router.find('GET', '/', {}))
  expectType<Router.FindResult<Router.HTTPVersion.V1> | null>(router.find('GET', '/', {version: '1.0.0'}))

  expectType<void>(router.reset())
  expectType<string>(router.prettyPrint())
}

// HTTP2
{
  let handler: Router.Handler<Router.HTTPVersion.V2>
  const router = Router<Router.HTTPVersion.V2>({
    ignoreTrailingSlash: true,
    allowUnsafeRegex: false,
    caseSensitive: false,
    maxParamLength: 42,
    defaultRoute (http1Req, http1Res) {},
    onBadUrl (path, http1Req, http1Res) {},
    constraints: {
      foo: {
        name: 'foo',
        mustMatchWhenDerived: true,
        storage () {
          return {
            get (version) { return handler },
            set (version, handler) {},
            del (version) {},
            empty () {}
          }
        },
        deriveConstraint(req) { return '1.0.0' },
        validate(value) { if (typeof value === "string") { throw new Error("invalid")} }
      }
    }
  })
  expectType<Router.Instance<Router.HTTPVersion.V2>>(router)

  expectType<void>(router.on('GET', '/', () => {}))
  expectType<void>(router.on(['GET', 'POST'], '/', () => {}))
  expectType<void>(router.on('GET', '/', { constraints: { version: '1.0.0' }}, () => {}))
  expectType<void>(router.on('GET', '/', () => {}, {}))
  expectType<void>(router.on('GET', '/', { constraints: { version: '1.0.0' }}, () => {}, {}))

  expectType<void>(router.get('/', () => {}))
  expectType<void>(router.get('/', { constraints: { version: '1.0.0' }}, () => {}))
  expectType<void>(router.get('/', () => {}, {}))
  expectType<void>(router.get('/', { constraints: { version: '1.0.0' }}, () => {}, {}))

  expectType<void>(router.off('GET', '/'))
  expectType<void>(router.off(['GET', 'POST'], '/'))

  expectType<void>(router.lookup(http2Req, http2Res))
  expectType<Router.FindResult<Router.HTTPVersion.V2> | null>(router.find('GET', '/', {}))
  expectType<Router.FindResult<Router.HTTPVersion.V2> | null>(router.find('GET', '/', {version: '1.0.0', host: 'fastify.io'}))

  expectType<void>(router.reset())
  expectType<string>(router.prettyPrint())

}
