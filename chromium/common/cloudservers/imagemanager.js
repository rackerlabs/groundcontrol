// TODO: only need to do this once after we roll all our files together.
if (typeof(com) == "undefined")
  com = { rackspace: { cloud: { servers: { api: { client: {} } } } } }
__csapi_client = com.rackspace.cloud.servers.api.client;

/**
 * Creates a new ImageManager instance.  Users should use
 * CloudServersService.createImageManager() rather than calling this
 * constructor directly.
 *
 * service:CloudServersService instance to work with.
 */
__csapi_client.ImageManager = function(service) {
  __csapi_client.EntityManager.call(this, service, "/images");
}
__csapi_client.ImageManager.prototype = {
  __proto__: __csapi_client.EntityManager.prototype,

  /**
   * Return the data to send in create request for the given entity.
   */
  _dataForCreate: function(entity) {
    return { image: entity };
  },

  /**
   * Return false if the given entity is in the middle of completing an
   * operation on the server (based on its local attributes).
   */
  _doneWaiting: function(oldEntity, newEntity) {
    return (newEntity.status in {
      ACTIVE:1, FAILED:1, UNKNOWN:1
    });
  },

  // Updates are not allowed on Images.
  update: function(opts) { this._unsupportedMethod(opts); },
}
