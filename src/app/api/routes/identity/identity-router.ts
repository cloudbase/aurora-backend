import {RestRouter} from '../../../common';
import {IdentityController} from './identity-controller';
import {IdentityService, OpenstackService} from '../../../openstack';

export class IdentityRouter extends RestRouter {
  identityController: IdentityController;
  
  constructor(identityService: IdentityService, openstackService: OpenstackService) {
    super();
    this.identityController = new IdentityController(identityService, openstackService);
    this.initRoutes();
  }

  initRoutes() {
    this.router.get('/', this.wrapRouteFn(this.identityController, this.identityController.listVersions));
    this.router.post('/tokens', this.wrapRouteFn(this.identityController, this.identityController.authenticate));
    this.router.get('/extensions', this.wrapRouteFn(this.identityController, this.identityController.listExtensions));
    this.router.get('/tenants', this.wrapRouteFn(this.identityController, this.identityController.listTenants));
    this.router.get('/logout', this.wrapRouteFn(this.identityController, this.identityController.logout));
    this.router.all('/', this.wrapRouteFn(this.identityController, this.identityController.throwMethodNotAllowedError));
  }
}
