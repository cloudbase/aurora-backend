import http = require('http');
import { Request, Response } from 'express';
import expressSession = require('express-session');
import { Logger, LoggerFactory } from './';
import io = require('socket.io');

export class SocketManager {
  public socketConnection: SocketIO.Server;
  private currentConnection: SocketIO.Socket;
  public static clientsMap = {};
  public static socketEvents = {
    authenticate: 'AUTHENTICATE',
    tokenUpdate: 'TOKEN-UPDATE',
  };

  private static LOGGER: Logger = LoggerFactory.getLogger();
  constructor(serverInstance: http.Server, sessionMiddleware: (Request, Response, any) => any) {
    this.socketConnection = io(serverInstance);
    this.socketConnection.use((socket, next) => {
      sessionMiddleware(socket.request, socket.request.res, next);
    });

  }

  static connectionHandler(this: SocketIO.Server, socket: SocketIO.Socket) {
    SocketManager.LOGGER.info(`New socket client connected - ${socket.client.id}`);
    this.emit('welcome', {'message': 'hello'});

    SocketManager.registerClient.bind(socket);
    SocketManager.updateToken.bind(socket);
    socket.on(SocketManager.socketEvents.authenticate, SocketManager.registerClient);
    socket.on(SocketManager.socketEvents.tokenUpdate, SocketManager.updateToken);
  }

  static registerClient(this: SocketIO.Socket, data: {}) {
    if (this.request.session.token) {
      SocketManager.clientsMap[this.request.session.token] = this.client.id;
      SocketManager.LOGGER.debug(`Updated clients object with ${this.client.id}`);
      this.emit('Registered session');
    } else {
      SocketManager.LOGGER.debug('Message emited by a user that is not authenticated');
      this.emit('Current session is not authenticated');
    }
  }

  static updateToken(this: SocketIO.Socket, data: {}) {
    if (SocketManager.clientsMap.hasOwnProperty(data['old-token'])) {
      SocketManager.clientsMap[data['new-token']] = SocketManager.clientsMap[data['old-token']];
      delete SocketManager.clientsMap[data['old-token']];
    } else {
      this.emit('Invalid token value');
    }
  }

  static notifyClient(this: SocketIO.Server, queueMessage: any) {
    queueMessage.ack();
    const tokenId: string = queueMessage['body'].token;
    SocketManager.LOGGER.debug(`Received resource update from OpenStack - ${JSON.stringify(queueMessage['body'])}`);
    if (SocketManager.clientsMap.hasOwnProperty(tokenId)) {
      const socketId: string = SocketManager.clientsMap[tokenId];
      if (this.sockets.connected.hasOwnProperty(socketId)) {
        this.sockets.connected[socketId].emit(queueMessage['body'].info);
      } else {
        SocketManager.LOGGER.warn(`Missing socket connection with id - ${socketId}`);
      }
    } else {
      SocketManager.LOGGER.warn(`No connection found corresponding to the following token id - ${tokenId}`);
    }
  }
}