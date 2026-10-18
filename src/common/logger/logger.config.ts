import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Params } from 'nestjs-pino';

// The raw Node request plus the fields pino-http and Express add to it
type Req = IncomingMessage & { id?: unknown; originalUrl?: string };

/**
 * Returns the URL the client actually requested. Express rewrites req.url
 * inside routers (e.g. "/api/v1/user" becomes "/user"); originalUrl doesn't change.
 */
const urlOf = (req: Req) => req.originalUrl ?? req.url;

/**
 * Logger settings for nestjs-pino: one line per request
 * @param options.production true when NODE_ENV is "production"
 * @param options.level lowest level to print: trace, debug, info, warn or error
 */
export function createLoggerParams(options: {
  production: boolean;
  level: string;
}): Params {
  return {
    pinoHttp: {
      level: options.level,
      // pino-pretty is a dev dependency, so it's only used outside production
      transport: options.production
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:HH:MM:ss',
              // e.g. "[MongoDB] Connected", or just the message when there's no context
              messageFormat: '{if context}[{context}] {end}{msg}',
              // Already shown in the message, or not useful when reading locally
              ignore: 'pid,hostname,context,req,res,responseTime,reqId',
            },
          },

      // Headers are noise for debugging and can contain tokens or cookies
      serializers: {
        req: (req: Req) => ({
          id: req.id,
          method: req.method,
          url: urlOf(req),
        }),
        res: (res: ServerResponse) => ({ statusCode: res.statusCode }),
      },
      // Logs written during a request only carry its id, not the whole request
      quietReqLogger: true,

      // Failed requests stand out: 4xx as warnings, 5xx as errors
      customLogLevel: (_req, res, error) => {
        if (error || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
      // "METHOD URL STATUS TIME", e.g. "GET /api/v1/user 200 12ms"
      customSuccessMessage: (req, res, responseTime) =>
        `${req.method} ${urlOf(req)} ${res.statusCode} ${Math.round(responseTime)}ms`,
      customErrorMessage: (req, res, error) =>
        `${req.method} ${urlOf(req)} ${res.statusCode} ${error.message}`,

      // Swagger UI loads many assets per page view
      autoLogging: {
        ignore: (req) => urlOf(req)?.startsWith('/api/docs') ?? false,
      },
    },
  };
}
