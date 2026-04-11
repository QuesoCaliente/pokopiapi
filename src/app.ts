import { buildServer } from './core/server.js';
import envPlugin from './core/plugins/env.js';
import corsPlugin from './core/plugins/cors.js';
import helmetPlugin from './core/plugins/helmet.js';
import rateLimitPlugin from './core/plugins/rate-limit.js';
import compressPlugin from './core/plugins/compress.js';
import swaggerPlugin from './core/plugins/swagger.js';
import errorHandlerPlugin from './core/plugins/error-handler.js';
import cachePlugin from './core/plugins/cache.js';
import healthRoutes from './routes/health/health.route.js';
import pokemonRoutes from './routes/pokemon/pokemon.route.js';

export async function buildApp() {
  const server = buildServer();

  // Core plugins
  await server.register(envPlugin);
  await server.register(corsPlugin);
  await server.register(helmetPlugin);
  await server.register(rateLimitPlugin);
  await server.register(compressPlugin);
  await server.register(errorHandlerPlugin);
  await server.register(cachePlugin);
  await server.register(swaggerPlugin);

  // Routes (unversioned)
  await server.register(healthRoutes);

  // API v1
  await server.register(
    async (v1) => {
      await v1.register(pokemonRoutes);
    },
    { prefix: '/api/v1' },
  );

  return server;
}
