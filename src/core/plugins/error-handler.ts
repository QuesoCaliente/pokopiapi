import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyError } from 'fastify';

export default fp(async (server: FastifyInstance) => {
  server.setErrorHandler((error: FastifyError, _request, reply) => {
    const statusCode = error.statusCode ?? 500;

    if (statusCode >= 500) {
      server.log.error(error);
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
