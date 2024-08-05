declare module 'connect-timeout' {
    import { RequestHandler } from 'express';
    function timeout(time: string): RequestHandler;
    export = timeout;
  }
  