import { Express, Router, RequestHandler, ErrorRequestHandler } from 'express';
import { Options, StreamOptions } from 'morgan';
import { Logger, LoggerFactory, RedisClient } from './common';
import { APP_CONFIG } from './config';
import connectRedis = require('connect-redis');
import { RabbitClient } from './common';
import { ApiRouterFactory } from './api';
import { RouterUtils } from './utils';
import express = require('express');
import expressSession = require('express-session');
import cors = require('cors');
import bodyParser = require('body-parser');
import morgan = require('morgan');
import fs = require('fs');
import io = require('socket.io');
import http = require('http');

export class ExpressAppFactory {

  private static LOGGER: Logger = LoggerFactory.getLogger();

  private constructor() {}

  static getExpressApp(
    apiRouter: Router,
    preApiRouterMiddlewareFns: Array<RequestHandler | ErrorRequestHandler>,
    postApiRouterMiddlewareFns: Array<RequestHandler | ErrorRequestHandler>): [Express, any] {
    
    const app: Express = express();
    const server = http.Server(app);
    const socketIo = io(server);

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    let redisStore = connectRedis(expressSession);
    let sessionOptions = {
      secret: process.env.SESSION_SECRET,
      saveUninitialized: true,
      resave: true,
      cookie: {
        maxAge: 3600000,
        httpOnly: false
      }
    };

    if (APP_CONFIG.getEnvironment() !== 'dev') {
      sessionOptions['store'] = new redisStore({
        host: APP_CONFIG.redisHost,
        port: APP_CONFIG.redisPort,
        client: RedisClient,
        ttl: 3600000
      });
    }

    const sessionMiddleware = expressSession(sessionOptions);
  
    app.use(expressSession(sessionOptions));
    socketIo.use((socket, next) => {
      sessionMiddleware(socket.request, socket.request.res, next);
    });

    app.use(cors({
      origin: true,
      credentials: true
    }));

    if (APP_CONFIG.serveStatic) {
      ExpressAppFactory.LOGGER.info(`Serving static files from public`);
      app.use(express.static('public'));
    }

    if (APP_CONFIG.enableHttpRequestLogging) {
      ExpressAppFactory.LOGGER.info(`Request logging is enabled`);
      app.use(
        morgan(
          ':remote-addr :user-agent :method :url :status :response-time ms - :res[content-length]',
          {'stream': LoggerFactory.stream }
        ));
    }

    if (preApiRouterMiddlewareFns != null) {
      postApiRouterMiddlewareFns.forEach((middlewareFn) => app.use(middlewareFn));
    }

    app.use('/api', apiRouter);

    if (fs.existsSync('./routes.yml')) {
      RouterUtils.parseRouteConfigFile()
        .then(routingList => routingList.map(route => {
          ExpressAppFactory.LOGGER.debug(JSON.stringify(route));
          app.use(route.routingPath, ApiRouterFactory.registerNewAPI(route));
        }))
        .catch(error => {
          ExpressAppFactory.LOGGER.warn(error);
        });
    } else {
      ExpressAppFactory.LOGGER.debug('Creating empty routes file')
      fs.closeSync(fs.openSync('./routes.yml', 'w'));
    }


    if (postApiRouterMiddlewareFns != null) {
      postApiRouterMiddlewareFns.forEach((middlewareFn) => app.use(middlewareFn));
    }

    // workaround to initial config in order to return configure socketIo object
    // needs refactoring
    return [server, socketIo];
  }

}
