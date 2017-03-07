import { SubscriberClient, InvalidJsonError, ApiError } from '../common';

export class RouterUtils {
  static checkCredentials(req, res, next): any {
    if (req.body.password && req.body.username) {
      next();
    } else {
      res.statusCode = 400;
      res.json(new InvalidJsonError().toJSON());
    }
  }
  
  static checkTenantID(req, res, next): any {
    if (req.headers['tenant-id']) {
      next();
    } else {
      res.statusCode = 400;
      res.json(new ApiError('Missing Tenant-ID header', 400, 'BAD_REQUEST'));
    }
  }

  static checkEndpointID(req, res, next): any {
    if (req.headers['endpoint-id']) {
      next();
    } else {
      res.statusCode = 400;
      res.json(new ApiError('Missing Endpoint-ID header', 400, 'BAD_REQUEST'));
    }
  }

  /**
   * Checks if the requested OpenStack service needs to fetch information from another service and composes the new request body
   * 
   * @static
   * @param {any} req 
   * @param {any} res 
   * @param {any} next 
   * 
   * @memberOf RouterUtils
   */
  static getInfoFromServices(req, res, next) {
    if (req.method === 'POST') {
      if ((req.path in SubscriberClient.registeredMessages) && (SubscriberClient.registeredMessages[req.path].length > 0)) {
        Promise.all(SubscriberClient.registeredMessages[req.path].map(SubscriberClient.notifyPublisher.bind(SubscriberClient)))
          .then(results => {
            return Promise.resolve(results.forEach(result => {
              req.body[result['accessKey']] = result['body'];
            }));
          })
          .then(() => {
            next();
          });
      }
    }
    else {
      next();
    }
  } 
}