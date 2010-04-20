// TODO: only need to do this once after we roll all our files together.
if (typeof(com) == "undefined")
  com = { rackspace: { cloud: { servers: { api: { client: {} } } } } }
__csapi_client = com.rackspace.cloud.servers.api.client;

// TODO: test rate limiting retries

/**
 * Base EntityManager class.
 *
 * service:CloudServersService is the service that created this manager.
 * apiRoot:string is the suffix to append to the service's management URL
 *   to control the particular type of entity, e.g. "/servers".
 */
__csapi_client.EntityManager = function(service, apiRoot) {
  this._service = service;
  this._url = service._serverManagementUrl + apiRoot;
}
/**
 * Given a string of JSON containing fault information, return a fault:object
 * containing:
 *   code:integer
 *   message:string
 *   details?:string
 *   retryAfter?:Date time after which to retry a rate-limited request
 */
__csapi_client.EntityManager._parseFault = function(text) {
  text = text || '{ "unknown": { "code": 0, "message": "Unknown fault" } }';
  var json = $.parseJSON(text);
  for (var faultname in json) { // grab the only object within json
    var fault = json[faultname];
    break;
  }
  if (fault.retryAfter) { // convert from XML time format to Date
    var t = fault.retryAfter.match(/^(....)-(..)-(..)T(..):(..):(..)Z/);
    fault.retryAfter = new Date(t[1], t[2], t[3], t[4], t[5], t[6]);
  }
  return fault;
}
__csapi_client.EntityManager.prototype = {
  __proto__: undefined,

  /**
   * $.ajax() wrapper that handles reauthentication, rate limiting, and other 
   * conveniences.
   *
   * opts:object contains:
   *   async?:bool defaults to true
   *   type?:string one of GET POST PUT or DELETE.  Defaults to "GET".
   *   path:string to fetch, e.g. "12".  Appended to the EntityManager's URL.
   *   beforeSend?:function(xhr) as in $.ajax
   *   success?:function(json, status, xhr) as in $.ajax
   *   fault?:function(fault:object) called if an unrecoverable error occurs.
   *       The object passed to the callback looks like this:
   *         code: HTTP status code
   *         message:string basic informational message
   *         details?:string more information
   *         retryAfter?:Date if code is 413 ("Over Limit"), the 
   *             time after which to wait before retrying the request.
   *             Note that _request() will attempt to retry for you several
   *             times before throwing this fault.
   *
   * Returns null upon completion if synchronous, else immediately.
   */
  _request: function(opts, _retryData) {
    _retryData = _retryData || { rateLimitedTimes: 0, authFailedOnce: false };
    opts.beforeSend = opts.beforeSend || function() {};
    opts.fault = opts.fault || function() {};
    opts.success = opts.success || function() {};
    opts.type = opts.type || "GET";
    if (opts.async === undefined) opts.async = true;
    if (opts.type in {GET:1, POST:1}) opts.dataType = "json";

    var that = this;
    $.ajax({
      async: opts.async,
      type: opts.type,
      url: that._url + "/" + opts.path,
      dataType: opts.dataType,
      beforeSend: function(xhr) {
        xhr.setRequestHeader("X-Auth-Token", that._service._authToken);
        opts.beforeSend(xhr);
      },
      success: opts.success,
      error: function(xhr, status, error) {
        // Authentication failed --> reauthenticate and try again once
        if (xhr.status == 401) {
          if (_retryData.authFailedOnce) { // give up
            opts.fault(EntityManager._parseFault(xhr.responseText));
          } else {
            _retryData.authFailedOnce = true;
            try {
              that._service._blockingAuthenticate();
            } catch (ex) {
              // Invalid credentials, probably; just retry anyway, and fail.
            }
            that._request(opts, _retryData);
          }
          return;
        }
        // Rate limited --> wait, then try again - several times
        if (xhr.status == 413) {
          var faultData = __csapi_client.EntityManager._parseFault(
            xhr.responseText);
          if (_retryData.rateLimitedTimes > 5) { // give up
            opts.fault(faultData);
          } else {
            _retryData.rateLimitedTimes += 1;
            if (opts.async) {
              window.setTimeout(function() { // wait a while, then retry
                that._request(opts, _retryData);
              }, (faultData.retryAfter - new Date()));
            } else {
              // We're synchronous: no choice but to spin until the timeout
              // has passed.  Yuck, yuck, yuck.
              var stopAt = fault.retryAfter;
              while (new Date() < stopAt) for (var i = 0; i < 100000; i++) {}
              that._request(opts, _retryData);
            }
          }
          return;
        }
        opts.fault(__csapi_client.EntityManager._parseFault(xhr.responseText));
      }
    });
  },

  create: function(entity) {
  },

  remove: function(entity) {
  },

  update: function(entity) {
  },

  /**
   * Fetch the latest version of the given Entity from the server, calling
   * success or fault callbacks asynchronously upon completion.
   *
   * opts:object contains:
   *   entity:Entity to refresh.
   *   success?:function(entity) called upon successful refresh.
   *     entity:Entity the updated entity.
   *   fault?:function(fault) called if there was an error updating the Entity.
   *     fault:CloudServersFault the fault that occurred.
   *     entity:Entity the original, unmodified entity.
   */
  refresh: function(opts) {
    opts.success = opts.success || function() {};
    opts.fault = opts.fault || function() {};
    this._request({
      path: opts.entity.id,
      beforeSend: function(xhr) {
        xhr.setRequestHeader("If-Modified-Since", opts.entity._lastModified);
      },
      success: function(json, status, xhr) {
        if (xhr.status == 304) { // Not Modified
          opts.success(opts.entity);
        }
        else {
          json.server._lastModified = xhr.getResponseHeader("Last-Modified");
          opts.success(json.server);
        }
      },
      fault: function(fault) {
        opts.fault(fault, opts.entity);
      }
    });
  },

  /**
   * Fetch the Entity with the given id, calling success or fault callbacks
   * asynchronously upon completion.
   *
   * opts:object contains:
   *   id:integer of the Entity.
   *   success?:function(entity) called if there were no errors.
   *     entity:Entity the entity, or null if the given id was not found.
   *   fault?:function(fault) called if there was an error fetching the Entity.
   *     fault:CloudServersFault the fault that occurred.
   */
  find: function(opts) {
    opts.success = opts.success || function() {};
    opts.fault = opts.fault || function() {};

    this._request({
      path: opts.id,
      success: function(json, status, xhr) {
        json.server._lastModified = xhr.getResponseHeader("Last-Modified");
        opts.success(json.server);
      },
      fault: function(fault) {
        if (fault.code == 404)
          opts.success(null); // not found, but not a fault
        else
          opts.fault(fault);
      }
    });
  },

  wait: function(entity, timeout_ms) {
    throw {code:501, message:"Not implemented"};
  },

  /**
   * Execute callback when the given entity has changed.
   */
  notify: function(entity, callback) {
    // TODO
  },

  stopNotify: function(entity, callback) {
    // TODO
  },

  createList: function(detailed, offset, limit) {
  },

  createDeltaList: function(detailed, changes_since, offset, limit) {
  },
}
