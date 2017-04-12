import { APP_CONFIG } from './config';
import { Logger, LoggerFactory, RabbitClient } from './common';
import { Express, Router } from 'express';
import { ExpressAppFactory } from './express-app-factory';
import { ApiRouterFactory } from './api';
import { RestErrorMiddleware } from './common';
import { RouterUtils } from './utils';
import util = require('util');
import yaml = require('js-yaml');
import fs = require('fs');

const LOGGER: Logger = LoggerFactory.getLogger();
const apiRouter: Router = ApiRouterFactory.getApiRouter();

// Get the application middleware (to be mounted after the api router)
const errorMiddleware = [
  RestErrorMiddleware.normalizeToRestError,
  RestErrorMiddleware.serializeRestError
];

const result = ExpressAppFactory.getExpressApp(apiRouter, null, errorMiddleware);
const app: Express = result[0];
const io = result[1];
const rabbitClient = new RabbitClient('AURORA_GENERAL_EXCHANGE', 'AURORA_GENERAL');

/**
 * Registration handler for new services
 */
rabbitClient.rabbitConnection.handle('NEW_SERVICE', message => {
  try {
      message.ack();
      LOGGER.info(`Received new service message - ${JSON.stringify(message.body)}`);
      RouterUtils.evaluateNewServiceMessage(message.body, app._router.stack.filter(r => r.route).map(r => r.route.path))
        .then(result => {
          app.use(result.routingPath, ApiRouterFactory.registerNewAPI(result));
          RouterUtils.updateRoutesFile(result);
        })
        .catch(error => {
          LOGGER.error('Unable to mount new service service');
          LOGGER.error(error)
        });
  } catch (err) {
      LOGGER.debug(err);
      message.nack();
  }
});

rabbitClient.rabbitConnection.onUnhandled(message => {
    LOGGER.debug(message);
});


io.on('connection', socket => {
  LOGGER.debug(socket.request.session);

  //LOGGER.debug(socket);
  io.emit('welcome', {'message': 'hello'});
})

app.listen(APP_CONFIG.port, () => {
  LOGGER.info(`Express server listening on port ${APP_CONFIG.port}.`);
});
