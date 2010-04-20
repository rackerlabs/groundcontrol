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
   * Given a Server, return the object that should be sent in update requests.
   */
  _makeUpdateEntity: function(entity) {
    return { server: { name: entity.name, adminPass: entity.adminPass } };
  },

  /**
   * Return false in the given entity is still updating on the server
   * (based on its local attributes).
   */
  _isEntityUpdated: function(entity) {
    // TODO: could EntityManager implement this as == ACTIVE/ERROR, so that
    // most don't have to customize it?
    return entity.status != "PASSWORD";
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
