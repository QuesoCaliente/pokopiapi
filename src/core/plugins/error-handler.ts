import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyError } from 'fastify';
import { posthog } from '../posthog.js';

export default fp(async (server: FastifyInstance) => {
  server.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode = error.statusCode ?? 500;

    if (statusCode >= 500) {
      server.log.error(error);
      const distinctId =
        (request.headers['x-posthog-distinct-id'] as string | undefined) ?? 'anonymous';
      posthog.captureException(error, distinctId, {
        status_code: statusCode,
        url: request.url,
        method: request.method,
      });
    }

    reply.status(statusCode).send({
      statusCode,
      error: statusCode >= 500 ? 'Internal Server Error' : error.message,
      ...(statusCode < 500 && { message: error.message }),
    });
  });

  server.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({
      statusCode: 404,
      error: 'Not Found',
      message: 'The requested resource does not exist',
    });
  });
});
