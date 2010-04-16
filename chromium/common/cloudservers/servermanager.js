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
  this._service = service;
}
__csapi_client.ServerManager.prototype = {
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
