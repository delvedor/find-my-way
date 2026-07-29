/// <reference types="node" />

import { expect } from 'tstyche';
import Router from '../../';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import { IncomingMessage, ServerResponse } from 'http';

let http1Req!: IncomingMessage;
let http1Res!: ServerResponse;
let http2Req!: Http2ServerRequest;
let http2Res!: Http2ServerResponse;
let ctx!: { req: IncomingMessage; res: ServerResponse };
let done!: (err: Error | null, result: any) => void;

expect(Router.sanitizeUrlPath('/hello/%20world?foo=bar')).type.toBe<string>();
expect(
  Router.sanitizeUrlPath('/hello/%23world;foo=bar', true)
).type.toBe<string>();
expect(Router.removeDuplicateSlashes('//hello///world')).type.toBe<string>();
expect(Router.trimLastSlash('/hello/')).type.toBe<string>();

// HTTP1
{
  let handler!: Router.Handler<Router.HTTPVersion.V1>;
  const router = Router({
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true,
    allowUnsafeRegex: false,
    caseSensitive: false,
    maxParamLength: 42,
    querystringParser: (queryString) => {},
    defaultRoute(http1Req, http1Res) {},
    onBadUrl(path, http1Req, http1Res) {},
    onMaxParamLength(path, http1Req, http1Res) {},
    constraints: {
      foo: {
        name: 'foo',
        mustMatchWhenDerived: true,
        storage() {
          return {
            get(version) {
              return handler;
            },
            set(version, handler) {}
          };
        },
        deriveConstraint(req) {
          return '1.0.0';
        },
        validate(value) {
          if (typeof value === 'string') {
            throw new Error('invalid');
          }
        }
      }
    }
  });
  expect(router).type.toBe<Router.Instance<Router.HTTPVersion.V1>>();

  expect(router.on('GET', '/', () => {})).type.toBe<void>();
  expect(router.on(['GET', 'POST'], '/', () => {})).type.toBe<void>();
  expect(
    router.on('GET', '/', { constraints: { version: '1.0.0' } }, () => {})
  ).type.toBe<void>();
  expect(router.on('GET', '/', () => {}, {})).type.toBe<void>();
  expect(
    router.on('GET', '/', { constraints: { version: '1.0.0' } }, () => {}, {})
  ).type.toBe<void>();

  expect(router.get('/', () => {})).type.toBe<void>();
  expect(
    router.get('/', { constraints: { version: '1.0.0' } }, () => {})
  ).type.toBe<void>();
  expect(router.get('/', () => {}, {})).type.toBe<void>();
  expect(
    router.get('/', { constraints: { version: '1.0.0' } }, () => {}, {})
  ).type.toBe<void>();

  expect(router.off('GET', '/')).type.toBe<void>();
  expect(router.off(['GET', 'POST'], '/')).type.toBe<void>();

  expect(router.lookup(http1Req, http1Res)).type.toBe<any>();
  expect(router.lookup(http1Req, http1Res, done)).type.toBe<any>();
  expect(router.lookup(http1Req, http1Res, ctx, done)).type.toBe<any>();
  expect(
    router.find('GET', '/')
  ).type.toBe<Router.FindResult<Router.HTTPVersion.V1> | null>();
  expect(
    router.find('GET', '/', {})
  ).type.toBe<Router.FindResult<Router.HTTPVersion.V1> | null>();
  expect(
    router.find('GET', '/', { version: '1.0.0' })
  ).type.toBe<Router.FindResult<Router.HTTPVersion.V1> | null>();

  expect(
    router.findRoute('GET', '/')
  ).type.toBe<Router.FindRouteResult<Router.HTTPVersion.V1> | null>();
  expect(
    router.findRoute('GET', '/', {})
  ).type.toBe<Router.FindRouteResult<Router.HTTPVersion.V1> | null>();
  expect(
    router.findRoute('GET', '/', { version: '1.0.0' })
  ).type.toBe<Router.FindRouteResult<Router.HTTPVersion.V1> | null>();

  expect(router.reset()).type.toBe<void>();
  expect(router.prettyPrint()).type.toBe<string>();
  expect(router.prettyPrint({ method: 'GET' })).type.toBe<string>();
  expect(router.prettyPrint({ commonPrefix: false })).type.toBe<string>();
  expect(router.prettyPrint({ commonPrefix: true })).type.toBe<string>();
  expect(router.prettyPrint({ includeMeta: true })).type.toBe<string>();
  expect(
    router.prettyPrint({ includeMeta: ['test', Symbol('test')] })
  ).type.toBe<string>();
}

// HTTP2
{
  const constraints: {
    [key: string]: Router.ConstraintStrategy<Router.HTTPVersion.V2, string>;
  } = {
    foo: {
      name: 'foo',
      mustMatchWhenDerived: true,
      storage() {
        return {
          get(version) {
            return handler;
          },
          set(version, handler) {}
        };
      },
      deriveConstraint(req) {
        return '1.0.0';
      },
      validate(value) {
        if (typeof value === 'string') {
          throw new Error('invalid');
        }
      }
    }
  };

  let handler!: Router.Handler<Router.HTTPVersion.V2>;
  const router = Router<Router.HTTPVersion.V2>({
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true,
    allowUnsafeRegex: false,
    caseSensitive: false,
    maxParamLength: 42,
    querystringParser: (queryString) => {},
    defaultRoute(http1Req, http1Res) {},
    onBadUrl(path, http1Req, http1Res) {},
    constraints
  });
  expect(router).type.toBe<Router.Instance<Router.HTTPVersion.V2>>();

  expect(router.on('GET', '/', () => {})).type.toBe<void>();
  expect(router.on(['GET', 'POST'], '/', () => {})).type.toBe<void>();
  expect(
    router.on('GET', '/', { constraints: { version: '1.0.0' } }, () => {})
  ).type.toBe<void>();
  expect(router.on('GET', '/', () => {}, {})).type.toBe<void>();
  expect(
    router.on('GET', '/', { constraints: { version: '1.0.0' } }, () => {}, {})
  ).type.toBe<void>();

  expect(router.addConstraintStrategy(constraints.foo!)).type.toBe<void>();

  expect(router.get('/', () => {})).type.toBe<void>();
  expect(
    router.get('/', { constraints: { version: '1.0.0' } }, () => {})
  ).type.toBe<void>();
  expect(router.get('/', () => {}, {})).type.toBe<void>();
  expect(
    router.get('/', { constraints: { version: '1.0.0' } }, () => {}, {})
  ).type.toBe<void>();

  expect(router.off('GET', '/')).type.toBe<void>();
  expect(router.off(['GET', 'POST'], '/')).type.toBe<void>();

  expect(router.lookup(http2Req, http2Res)).type.toBe<any>();
  expect(router.lookup(http2Req, http2Res, done)).type.toBe<any>();
  expect(router.lookup(http2Req, http2Res, ctx, done)).type.toBe<any>();
  expect(
    router.find('GET', '/', {})
  ).type.toBe<Router.FindResult<Router.HTTPVersion.V2> | null>();
  expect(
    router.find('GET', '/', { version: '1.0.0', host: 'fastify.io' })
  ).type.toBe<Router.FindResult<Router.HTTPVersion.V2> | null>();

  expect(router.reset()).type.toBe<void>();
  expect(router.prettyPrint()).type.toBe<string>();
}

// Custom Constraint
{
  let handler!: Router.Handler<Router.HTTPVersion.V1>;

  interface AcceptAndContentType {
    accept?: string | undefined;
    contentType?: string | undefined;
  }

  const customConstraintWithObject: Router.ConstraintStrategy<
    Router.HTTPVersion.V1,
    AcceptAndContentType
  > = {
    name: 'customConstraintWithObject',
    deriveConstraint<Context>(
      req: Router.Req<Router.HTTPVersion.V1>,
      ctx: Context | undefined
    ): AcceptAndContentType {
      return {
        accept: req.headers.accept,
        contentType: req.headers['content-type']
      };
    },
    validate(value: unknown): void {},
    storage() {
      return {
        get(version) {
          return handler;
        },
        set(version, handler) {}
      };
    }
  };

  const storageWithObject = customConstraintWithObject.storage();
  const acceptAndContentType: AcceptAndContentType = {
    accept: 'application/json',
    contentType: 'application/xml'
  };

  expect(
    customConstraintWithObject.deriveConstraint(http1Req, http1Res)
  ).type.toBe<AcceptAndContentType>();
  expect(
    storageWithObject.get(acceptAndContentType)
  ).type.toBe<Router.Handler<Router.HTTPVersion.V1> | null>();
  expect(
    storageWithObject.set(acceptAndContentType, () => {})
  ).type.toBe<void>();

  const customConstraintWithDefault: Router.ConstraintStrategy<Router.HTTPVersion.V1> =
    {
      name: 'customConstraintWithObject',
      deriveConstraint<Context>(
        req: Router.Req<Router.HTTPVersion.V1>,
        ctx: Context | undefined
      ): string {
        return req.headers.accept ?? '';
      },
      storage() {
        return {
          get(version) {
            return handler;
          },
          set(version, handler) {}
        };
      }
    };

  const storageWithDefault = customConstraintWithDefault.storage();

  expect(
    customConstraintWithDefault.deriveConstraint(http1Req, http1Res)
  ).type.toBe<string>();
  expect(
    storageWithDefault.get('')
  ).type.toBe<Router.Handler<Router.HTTPVersion.V1> | null>();
  expect(storageWithDefault.set('', () => {})).type.toBe<void>();
}
