import * as Router from '../..';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';
import { IncomingMessage, ServerResponse } from 'http';

let http1Req!: IncomingMessage;
let http1Res!: ServerResponse;
let http2Req!: Http2ServerRequest;
let http2Res!: Http2ServerResponse;

// ==== HTTP1 ====

const http1Router = Router({
  defaultRoute(req, res) {
    const request: IncomingMessage = req;
    const response: ServerResponse = res;
    response.end(request.url);
  },
  onBadUrl(path, req, res) {
    const request: IncomingMessage = req;
    const response: ServerResponse = res;
    response.end(request.url + path);
  }
});

http1Router.on('GET', '/test', (req, res) => res.end(req.url));
http1Router.on('GET', '/test', { version: '2.0.0' }, (req, res) =>
  res.end(req.url)
);
http1Router.on('GET', '/test', (req, res) => res.end(req.url), { foo: 'bar' });
http1Router.on(
  ['POST', 'PUT'],
  '/test',
  { version: '1.0.0' },
  (req, res) => res.end(req.url),
  { foo: 'bar' }
);
http1Router.delete(
  '/item/:id',
  (req, res, params, store) => {
    const id: string | undefined = params.id;
    res.end(`
    url: ${req.url || '-'},
    id: ${id || '-'},
    foo: ${store.foo}
  `);
  },
  { foo: 'bar' }
);

(function http1RouterFind() {
  const result = http1Router.find('GET', '/test', '1.0.0');
  if (!result) {
    return;
  }
  const { handler, params, store } = result;

  handler(http1Req, http1Res, params, store);
})();

http1Router.lookup(http1Req, http1Res);
http1Router.lookup(http1Req, http1Res, {foo: 'bar'});
http1Router.off('GET', '/path');
http1Router.off(['GET', 'CHECKOUT'], '/path');
http1Router.prettyPrint();
http1Router.reset();

// ==== HTTP2 ====

const http2Router = Router<Router.HTTPVersion.V2>({
  allowUnsafeRegex: true,
  caseSensitive: false,
  ignoreTrailingSlash: true,
  maxParamLength: 200,
  defaultRoute(req, res) {
    const request: Http2ServerRequest = req;
    const response: Http2ServerResponse = res;
    response.end(request.url);
  },
  onBadUrl(path, req, res) {
    const request: Http2ServerRequest = req;
    const response: Http2ServerResponse = res;
    response.end(request.url + path);
  }
});

http2Router.on('GET', '/test', (req, res) => res.end(req.url));
http2Router.on('GET', '/test', { version: '2.0.0' }, (req, res) =>
  res.end(req.url)
);
http2Router.on('GET', '/test', (req, res) => res.end(req.url), { foo: 'bar' });
http2Router.on(
  ['POST', 'PUT'],
  '/test',
  { version: '1.0.0' },
  (req, res) => res.end(req.url),
  { foo: 'bar' }
);
http2Router.delete(
  '/item/:id',
  (req, res, params, store) => {
    const id: string | undefined = params.id;
    res.end(`
    url: ${req.url || '-'},
    id: ${id || '-'},
    foo: ${store.foo}
  `);
  },
  { foo: 'bar' }
);

(function http2RouterFind() {
  const result = http2Router.find('GET', '/test', '1.0.0');
  if (!result) {
    return;
  }
  const { handler, params, store } = result;

  handler(http2Req, http2Res, params, store);
})();

http2Router.lookup(http2Req, http2Res);
http2Router.lookup(http2Req, http2Res, {foo: 'bar'});
http2Router.off('GET', '/path');
http2Router.off(['GET', 'CHECKOUT'], '/path');
http2Router.prettyPrint();
http2Router.reset();
