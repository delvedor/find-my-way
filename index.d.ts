import { IncomingMessage, ServerResponse } from 'http';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';

declare function Router<V extends Router.HTTPVersion = Router.HTTPVersion.V1>(
  config?: Router.Config<V>
): Router.Instance<V>;

declare namespace Router {
  enum HTTPVersion {
    V1 = 'http1',
    V2 = 'http2'
  }

  type HTTPMethod =
    | 'ACL'
    | 'BIND'
    | 'CHECKOUT'
    | 'CONNECT'
    | 'COPY'
    | 'DELETE'
    | 'GET'
    | 'HEAD'
    | 'LINK'
    | 'LOCK'
    | 'M-SEARCH'
    | 'MERGE'
    | 'MKACTIVITY'
    | 'MKCALENDAR'
    | 'MKCOL'
    | 'MOVE'
    | 'NOTIFY'
    | 'OPTIONS'
    | 'PATCH'
    | 'POST'
    | 'PROPFIND'
    | 'PROPPATCH'
    | 'PURGE'
    | 'PUT'
    | 'REBIND'
    | 'REPORT'
    | 'SEARCH'
    | 'SOURCE'
    | 'SUBSCRIBE'
    | 'TRACE'
    | 'UNBIND'
    | 'UNLINK'
    | 'UNLOCK'
    | 'UNSUBSCRIBE';

  type Handler<V extends HTTPVersion> = (
    req: V extends HTTPVersion.V1 ? IncomingMessage : Http2ServerRequest,
    res: V extends HTTPVersion.V1 ? ServerResponse : Http2ServerResponse,
    params: { [k: string]: string | undefined },
    store: any
  ) => void;

  interface Config<V extends HTTPVersion> {
    ignoreTrailingSlash?: boolean;

    allowUnsafeRegex?: boolean;

    caseSensitive?: boolean;

    maxParamLength?: number;

    defaultRoute?(
      req: V extends HTTPVersion.V1 ? IncomingMessage : Http2ServerRequest,
      res: V extends HTTPVersion.V1 ? ServerResponse : Http2ServerResponse
    ): void;
  }

  interface RouteOptions {
    version: string;
  }

  interface ShortHandRoute<V extends HTTPVersion> {
    (path: string, handler: Handler<V>): void;
    (path: string, opts: RouteOptions, handler: Handler<V>): void;
    (path: string, handler: Handler<V>, store: any): void;
    (path: string, opts: RouteOptions, handler: Handler<V>, store: any): void;
  }

  interface FindResult<V extends HTTPVersion> {
    handler: Handler<V>;
    params: { [k: string]: string | undefined };
    store: any;
  }

  interface Instance<V extends HTTPVersion> {
    on(
      method: HTTPMethod | HTTPMethod[],
      path: string,
      handler: Handler<V>
    ): void;
    on(
      method: HTTPMethod | HTTPMethod[],
      path: string,
      options: RouteOptions,
      handler: Handler<V>
    ): void;
    on(
      method: HTTPMethod | HTTPMethod[],
      path: string,
      handler: Handler<V>,
      store: any
    ): void;
    on(
      method: HTTPMethod | HTTPMethod[],
      path: string,
      options: RouteOptions,
      handler: Handler<V>,
      store: any
    ): void;

    off(method: HTTPMethod | HTTPMethod[], path: string): void;

    lookup(
      req: V extends HTTPVersion.V1 ? IncomingMessage : Http2ServerRequest,
      res: V extends HTTPVersion.V1 ? ServerResponse : Http2ServerResponse
    ): void;

    find(
      method: HTTPMethod,
      path: string,
      version?: string
    ): FindResult<V> | null;

    reset(): void;
    prettyPrint(): string;

    all: ShortHandRoute<V>;

    acl: ShortHandRoute<V>;
    bind: ShortHandRoute<V>;
    checkout: ShortHandRoute<V>;
    connect: ShortHandRoute<V>;
    copy: ShortHandRoute<V>;
    delete: ShortHandRoute<V>;
    get: ShortHandRoute<V>;
    head: ShortHandRoute<V>;
    link: ShortHandRoute<V>;
    lock: ShortHandRoute<V>;
    'm-search': ShortHandRoute<V>;
    merge: ShortHandRoute<V>;
    mkactivity: ShortHandRoute<V>;
    mkcalendar: ShortHandRoute<V>;
    mkcol: ShortHandRoute<V>;
    move: ShortHandRoute<V>;
    notify: ShortHandRoute<V>;
    options: ShortHandRoute<V>;
    patch: ShortHandRoute<V>;
    post: ShortHandRoute<V>;
    propfind: ShortHandRoute<V>;
    proppatch: ShortHandRoute<V>;
    purge: ShortHandRoute<V>;
    put: ShortHandRoute<V>;
    rebind: ShortHandRoute<V>;
    report: ShortHandRoute<V>;
    search: ShortHandRoute<V>;
    source: ShortHandRoute<V>;
    subscribe: ShortHandRoute<V>;
    trace: ShortHandRoute<V>;
    unbind: ShortHandRoute<V>;
    unlink: ShortHandRoute<V>;
    unlock: ShortHandRoute<V>;
    unsubscribe: ShortHandRoute<V>;
  }
}

export = Router;
