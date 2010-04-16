// TODO: support proxy domains passed into ctor, so people can use this
// API with a proxy to interact w/ CloudServers from their own sites

// Built according to the Cloud Servers Language Binding Guide, rev 09/16/09.

// TODO: only need to do this once after we roll all our files together.
if (typeof(com) == "undefined")
  com = { rackspace: { cloud: { servers: { api: { client: {} } } } } }
__csapi_client = com.rackspace.cloud.servers.api.client;

/**
 * Creates a new CloudServersService after synchronously authenticating 
 * against the Cloud Servers API.
 *
 * opts:object contains
 *   username:string Rackspace Cloud Servers user
 *   apiKey:string
 *   settings?:Settings to override any default settings
 * 
 * Throws an UnauthorizedFault if credentials are invalid.
 */
__csapi_client.CloudServersService = function(opts) {
  this._authUrl = "https://auth.api.rackspacecloud.com/v1.0";
  this._username = opts.username;
  this._apiKey = opts.apiKey;
  var out_fault = {};
  this._blockingAuthenticate();
}
__csapi_client.CloudServersService.prototype = {

  /**
   * Synchronously authenticates using this's credentials.  Upon success,
   * sets this._serverManagementUrl and this._authToken.  
   *
   * Throws an UnauthorizedFault if credentials are invalid.
   */
  _blockingAuthenticate: function(attempt) {
    var MAX_ATTEMPTS = 3;
    attempt = attempt || 1;
    var fault = undefined; // gets set by error callback if we fail

    var that = this;
    $.ajax({
      async: false,
      url: that._authUrl,
      beforeSend: function(xhr) {
        xhr.setRequestHeader("X-Auth-User", that._username);
        xhr.setRequestHeader("X-Auth-Key", that._apiKey);
      },
      success: function(data, response, xhr) {
        that._authToken = xhr.getResponseHeader("X-Auth-Token");
        // Per the binding document -- really
        var wrongUrl = xhr.getResponseHeader("X-Server-Management-Url");
        var accountID = wrongUrl.match(/\/([^\/]+)(\/?)$/)[1];
        var right = "https://servers.api.rackspacecloud.com/v1.0/" + accountID;
        that._serverManagementUrl = right;
      },
      error: function(xhr) {
        if (attempt < MAX_ATTEMPTS) {
          try {
            that._blockingAuthenticate(attempt+1);
          } catch (ex) {
            fault = ex;
          }
        } else {
          // Since we can't throw directly from a callback function, we set a
          // variable for the caller to throw.  This only works because we're
          // within a *synchronous* ajax call.
          fault = new __csapi_client.UnauthorizedFault(
            xhr.status, xhr.responseText);
        }
      }
    });
    if (fault)
      throw fault;
  },

  // TODO: implement this.serviceInfo to query Version, Limits, and Settings.

  createServerManager: function() {
    // TODO
  },

  createImageManager: function() {
    // TODO
  },

  createSharedIpGroupManager: function() {
    // TODO
  },

  createFlavorManager: function() {
    // TODO
  },
}
