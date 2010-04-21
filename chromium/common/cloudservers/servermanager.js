// TODO: only need to do this once after we roll all our files together.
if (typeof(com) == "undefined")
  com = { rackspace: { cloud: { servers: { api: { client: {} } } } } }
__csapi_client = com.rackspace.cloud.servers.api.client;

/**
 * Creates a new ServerManager instance.  Users should use
 * CloudServersService.createServerManager() rather than calling this
 * constructor directly.
 *
 * service:CloudServersService instance to work with.
 */
__csapi_client.ServerManager = function(service) {
  __csapi_client.EntityManager.call(this, service, "/servers");
}
__csapi_client.ServerManager.prototype = {
  __proto__: __csapi_client.EntityManager.prototype,

  /**
   * Return the data to send in an update request for the given Server entity.
   */
  _dataForUpdate: function(entity) {
    return { server: { name: entity.name, adminPass: entity.adminPass } };
  },

  /**
   * Return the data to send in create request for the given Server entity.
   */
  _dataForCreate: function(entity) {
    return { server: entity };
  },

  /**
   * Return false in the given entity is in the middle of completing an
   * operation on the server (based on its local attributes).
   */
  _isInFlux: function(entity) {
    // TODO: could EntityManager implement this as == ACTIVE/ERROR, so that
    // most don't have to customize it?  see binding guide p12
    return entity.status == "ACTIVE" || entity.status == "ERROR";
  },

  reboot: function(server, rebootType) {
  },

  rebuild: function(server, imageId) {
  },

  resize: function(server, flavorId) {
  },

  confirmResize: function(server) {
  },

  revertResize: function(server) {
  },

  shareIp: function(server, ip, sharedIpGroupId, configureServer) {
  },

  unshareIp: function(server, ip) {
  },

  setSchedule: function(server, backupSchedule) {
  },

  getSchedule: function(server) {
  }
}
