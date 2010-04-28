// TODO: only need to do this once after we roll all our files together.
if (typeof(com) == "undefined")
  com = { rackspace: { cloud: { servers: { api: { client: {} } } } } }
__csapi_client = com.rackspace.cloud.servers.api.client;

// TODO: test rate limiting retries

/**
 * Base EntityManager class.  Subclasses must implement _dataForUpdate(),
 * _dataForCreate, and _isInFlux(); see below for usage.
 *
 * service:CloudServersService is the service that created this manager.
 * apiRoot:string is the suffix to append to the service's management URL
 *   to control the particular type of entity, e.g. "/servers".
 */
__csapi_client.EntityManager = function(service, apiRoot) {
  this._service = service;
  this._url = service._serverManagementUrl + apiRoot;
  this._notifyPoller = new __csapi_client.NotifyPoller(this);
}

/**
 * Given a completed XMLHttpRequest whose responseText contains fault 
 * information, return a fault:object containing:
 *   code:integer
 *   message:string
 *   details?:string
 *   retryAfter?:Date time after which to retry a rate-limited request
 */
__csapi_client.EntityManager._parseFault = function(xhr) {
  var text = xhr.responseText || '{ "dunno": { "message": "Unknown fault" } }';
  var json = $.parseJSON(text);
  for (var faultname in json) { // grab the only object within json
    var fault = json[faultname];
    fault.type = faultname;
    break;
  }
  fault.code = xhr.status;
  if (fault.retryAfter) {
    // Adjust for the fact that their clock is skewed from ours
    fault.retryAfter = new Date(xhr.getResponseHeader("Retry-After"));
    var serverNow = new Date(xhr.getResponseHeader("Date"));
    var skewSeconds = (serverNow - new Date()) / 1000;
    fault.retryAfter.setSeconds(fault.retryAfter.getSeconds() + skewSeconds);
  }
  return fault;
},

/**
 * Return a Javascript Date for the given XML Schema date string.  Return
 * null if the date cannot be parsed.
 *
 * Does not know how to parse BC dates or AD dates < 100.
 *
 * Valid examples of input:
 * 2010-04-28T10:46:37.0123456789Z
 * 2010-04-28T10:46:37.37Z
 * 2010-04-28T10:46:37Z
 * 2010-04-28T10:46:37
 * 2010-04-28T10:46:37.012345+05:30
 * 2010-04-28T10:46:37.37-05:30
 * 1776-04-28T10:46:37+05:30
 * 0150-04-28T10:46:37-05:30
 */
__csapi_client.EntityManager._xmlDateToJavascriptDate = function(xmlDate) {
  // It's times like these you wish Javascript supported multiline regex specs
  var re = /^([0-9]{4,})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(\.[0-9]+)?(Z|([+-])([0-9]{2}):([0-9]{2}))?$/;
  var match = xmlDate.match(re);
  if (!match)
    return null;

  var all = match[0];
  var year = match[1];  var month = match[2];  var day = match[3];
  var hour = match[4];  var minute = match[5]; var second = match[6];
  var milli = match[7]; 
  var z_or_offset = match[8];  var offset_sign = match[9]; 
  var offset_hour = match[10]; var offset_minute = match[11];

  if (offset_sign) { // ended with +xx:xx or -xx:xx as opposed to Z or nothing
    var direction = (offset_sign == "+" ? 1 : -1);
    hour =   parseInt(hour)   + parseInt(offset_hour)   * direction;
    minute = parseInt(minute) + parseInt(offset_minute) * direction;
  }
  var utcDate = Date.UTC(year, month, day, hour, minute, second, (milli || 0));
  return new Date(utcDate);
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
   *   data:object to JSON.stringify() and send in the request body
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
    if (opts.data) {
      opts.data = JSON.stringify(opts.data);
      opts.processData = false;
      opts.contentType = "application/json";
    }
    if (opts.async === undefined) opts.async = true;
    if (opts.type in {GET:1, POST:1}) opts.dataType = "json";

    var that = this;
    $.ajax({
      async: opts.async,
      type: opts.type,
      url: that._url + "/" + opts.path,
      dataType: opts.dataType,
      data: opts.data,
      processData: opts.processData,
      contentType: opts.contentType,
      beforeSend: function(xhr) {
        xhr.setRequestHeader("X-Auth-Token", that._service._authToken);
        opts.beforeSend(xhr);
      },
      success: opts.success,
      error: function(xhr, status, error) {
        // Authentication failed --> reauthenticate and try again once
        if (xhr.status == 401) {
          if (_retryData.authFailedOnce) { // give up
            opts.fault(EntityManager._parseFault(xhr));
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
          var faultData = __csapi_client.EntityManager._parseFault(xhr);
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
        opts.fault(__csapi_client.EntityManager._parseFault(xhr));
      }
    });
  },

  /**
   * Create the given entity on the server, calling success or fault callbacks
   * asynchronously upon completion.
   *
   * opts:object contains:
   *   entity:Entity to create.
   *   success?:function(entity) called when the entity has been created on the
   *       server.  This may be after a significant delay for some entity
   *       types.  Note that if you do not specify a success callback, the
   *       system does not have to poll the server until completion, which
   *       saves account resources.
   *     entity:Entity the newly created entity.
   *   fault?:function(fault) called if there was an error in your request.
   *     fault:CloudServersFault the fault that occurred.
   */
  create: function(opts) {
    opts.fault = opts.fault || function() {};

    var that = this;
    that._request({
      type: "POST",
      path: "",
      data: that._dataForCreate(opts.entity),
      success: function(json) {
        if (!opts.success) // no need to poll
          return;

        // Suck out the new entity so we have an id to wait on
        for (var key in json) { var newEntity = json[key]; break; }
        // Wait for completion, then call success callback
        that.wait({
          entity: newEntity,
          success: opts.success,
          fault: opts.fault
        });
      },
      fault: opts.fault
    });
  },

  /**
   * Delete the given entity on the server, calling success or fault callbacks
   * asynchronously upon completion.
   *
   * opts:object contains:
   *   entity:Entity to delete.
   *   success?:function() called upon deleteion.
   *   fault?:function(fault) called if there was an error in your request.
   *     fault:CloudServersFault the fault that occurred.
   */
  remove: function(opts) {
    opts.success = opts.success || function() {};
    this._request({
      type: "DELETE",
      path: opts.entity.id,
      success: function() { opts.success() }, // strip incoming arguments
      fault: opts.fault
    });
  },

  /**
   * Update the given entity, calling success or fault callbacks asynchronously
   * upon completion.
   *
   * opts:object contains:
   *   entity:Entity to update.
   *   success?:function(entity) called when the update has completed on the
   *       server.  This may be after a significant delay for some entity
   *       types.  Note that if you do not specify a success callback, the
   *       system does not have to poll the server until completion, which
   *       saves account resources.
   *     entity:Entity the updated entity.
   *   fault?:function(fault) called if there was an error in your request.
   *     fault:CloudServersFault the fault that occurred.
   *
   */
  update: function(opts) {
    opts.fault = opts.fault || function() {};

    var that = this;
    that._request({
      type: "PUT",
      path: opts.entity.id,
      data: that._dataForUpdate(opts.entity),
      success: function(json) {
        if (!opts.success) // no need to poll
          return;

        // Conveniently, wait() requires entity, success, and fault?, and
        // we have those.
        that.wait(opts);
      },
      fault: opts.fault
    });
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
          for (var key in json) { var result = json[key]; break; }
          result._lastModified = xhr.getResponseHeader("Last-Modified");
          opts.success(result);
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
        for (var key in json) { var result = json[key]; break; }
        result._lastModified = xhr.getResponseHeader("Last-Modified");
        opts.success(result);
      },
      fault: function(fault) {
        if (fault.code == 404)
          opts.success(null); // not found, but not a fault
        else
          opts.fault(fault);
      }
    });
  },

  /**
   * When the given entity has completed whatever action is currently
   * in progress upon it, call success callback asynchronously, or fault
   * callback if there was a problem while waiting.  Note that this polls
   * the server and thus consumes account resources.
   *
   * opts:object contains:
   *   entity:Entity the entity in flux.  The server is guaranteed to be
   *       polled at least once to fetch the latest status, even if the local
   *       entity's properties do not reflect a state of flux.
   *   success:function(entity) called once the entity is not in flux.
   *       If wait is called upon an entity that is not in flux on the server,
   *       success will still be called.
   *     entity:Entity the newly fetched entity.
   *   fault?:function(fault) called if there is a problem communicating with
   *       the server.
   *     fault:CloudServersFault details about the problem.
   *   timeout_ms?:integer the number of milliseconds to wait before giving up,
   *       in which case neither callback will be called.  Defaults to infinity.
   */
  wait: function(opts) {
    opts.fault = opts.fault || function() {};

    // TODO FIXME very temporary code to prove notify works at least once
    // because, right now, it doesn't
    opts.entity.status="PASSWORD";

    // If the entity is already in a "complete" state, we don't need to wait.
    if (!this._isInFlux(opts.entity, opts.entity)) {
      opts.success(opts.entity);
      return;
    }

    var that = this;
    var handleNotification = function(notifyEvent) {
      if (notifyEvent.error) {
        that.stopNotify(opts.entity, handleNotification);
        opts.fault(notifyEvent.fault);
      }
      else if (!that._isInFlux(opts.entity, notifyEvent.targetEntity)) {
        that.stopNotify(opts.entity, handleNotification);
        opts.success(notifyEvent.targetEntity);
      }
    };

    that.notify(opts.entity, handleNotification);
  },

  /**
   * Register a listener that is called each time the given entity changes
   * on the server.
   *
   * callback:function(event) called each time the entity changes.
   *   event:object contains:
   *     error:bool true if there was a problem communicating with the server
   *     targetEntity:Entity the changed entity, if error is false
   *     fault:CloudServersFault the fault that occurred, if error is true
   */
  notify: function(entity, callback) {
    this._notifyPoller.register(entity, callback);
  },

  /**
   * Deregister a callback function previous registered via notify().
   * Does nothing if the callback was not registered for the given entity.
   *
   * entity:Entity the entity whose id matches the one used to register
   *     the callback via notify().
   * callback:function(event) the function that was passed to notify().
   */
  stopNotify: function(entity, callback) {
    this._notifyPoller.deregister(entity, callback);
  },

  /**
   * Return a new list of entities.
   *
   * TODO: fill in options from EntityList once they shake out
   */
  createList: function(detailed, offset, limit) {
    return this.createDeltaList(detailed, undefined, offset, limit);
  },

  /**
   * Return a new list of entities modified since changes_since.
   *
   * TODO: fill in options from EntityList once they shake out
   */
  createDeltaList: function(detailed, changes_since, offset, limit) {
    return new __csapi_client.EntityList(this, {
      detailed:detailed,
      changes_since:changes_since,
      offset:offset,
      limit:limit
    });
  },
}
