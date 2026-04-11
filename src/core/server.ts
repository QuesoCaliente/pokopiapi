import Fastify from 'fastify';
import { loggerConfig } from './logger.js';

export function buildServer() {
  const server = Fastify({
    logger: loggerConfig,
  });

  return server;
}
