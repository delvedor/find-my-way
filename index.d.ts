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
    | 'DELETE'
    | 'GET'
    | 'HEAD'
    | 'PATCH'
    | 'POST'
    | 'PUT'
    | 'OPTIONS';

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

    all: ShortHandRoute<V>;

    get: ShortHandRoute<V>;
    post: ShortHandRoute<V>;
    put: ShortHandRoute<V>;
    patch: ShortHandRoute<V>;
    delete: ShortHandRoute<V>;
    head: ShortHandRoute<V>;
    options: ShortHandRoute<V>;

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
  }
}

export = Router;
