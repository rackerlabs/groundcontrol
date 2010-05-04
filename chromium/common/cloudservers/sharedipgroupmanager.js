// TODO: only need to do this once after we roll all our files together.
if (typeof(com) == "undefined")
  com = { rackspace: { cloud: { servers: { api: { client: {} } } } } }
__csapi_client = com.rackspace.cloud.servers.api.client;

/**
 * Creates a new SharedIpGroupManager instance.  Users should use
 * CloudServersService.createSharedIpGroupManager() rather than calling this
 * constructor directly.
 *
 * service:CloudServersService instance to work with.
 */
__csapi_client.SharedIpGroupManager = function(service) {
  __csapi_client.EntityManager.call(this, service, "/shared_ip_groups");
}
__csapi_client.SharedIpGroupManager.prototype = {
  __proto__: __csapi_client.EntityManager.prototype,

  /**
   * Return the data to send in create request for the given entity.
   */
  _dataForCreate: function(entity) {
    return { sharedIpGroup: entity };
  },

  /**
   * Return false if the given entity is in the middle of completing an
   * operation on the server (based on its local attributes).
   */
  _doneWaiting: function(oldEntity, newEntity) {
    return (oldEntity._lastModified != newEntity._lastModified);
  },

  // Updates are not allowed on SharedIpGroups.
  update: function(opts) { this._unsupportedMethod(opts); },
}
