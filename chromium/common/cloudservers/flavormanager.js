// TODO: only need to do this once after we roll all our files together.
if (typeof(com) == "undefined")
  com = { rackspace: { cloud: { servers: { api: { client: {} } } } } }
__csapi_client = com.rackspace.cloud.servers.api.client;

/**
 * Creates a new FlavorManager instance.  Users should use
 * CloudServersService.createFlavorManager() rather than calling this
 * constructor directly.
 *
 * service:CloudServersService instance to work with.
 */
__csapi_client.FlavorManager = function(service) {
  __csapi_client.EntityManager.call(this, service, "/flavors");
}
__csapi_client.FlavorManager.prototype = {
  __proto__: __csapi_client.EntityManager.prototype,

  /**
   * Return false if the given entity is in the middle of completing an
   * operation on the server (based on its local attributes).
   */
  _doneWaiting: function(oldEntity, newEntity) {
    return (oldEntity._lastModified != newEntity._lastModified);
  },

  // These are not allowed on Flavors.
  create: function(opts) { this._unsupportedMethod(opts); },
  update: function(opts) { this._unsupportedMethod(opts); },
  remove: function(opts) { this._unsupportedMethod(opts); },
}
