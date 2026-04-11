import { buildApp } from './app.js';

async function main() {
  const server = await buildApp();

  try {
    const address = await server.listen({
      port: server.config.PORT,
      host: server.config.HOST,
    });
    server.log.info(`Server listening at ${address}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
