import { EventEmitter } from '../../common';
import { OpenstackAPIModel } from './openstack-api-model';

export class GlanceService extends OpenstackAPIModel {
  constructor() {
    super();
    this.name = 'glance';
    this.type = 'image';
    EventEmitter.eventEmitter.on(
      EventEmitter.UPDATE_EVENTS.glance,
      OpenstackAPIModel.update_endpoint
    );
  }
}