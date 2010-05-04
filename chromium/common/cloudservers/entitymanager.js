// TODO: There is a bug in the Cloud Servers API as of 5/1/2010.  If an
// entity's status changes on the server, e.g. from PASSWORD to ACTIVE for
// Server entities, the Last-Modified date is not changed.  Thus, refresh()
// receives a 304 Not Modified when polling for status changes using
// If-Modified-Since per the language binding guide's instructions.  This
// is a known bug per Jorge and is being addressed.
//
// An example consequence of the bug is that wait(), which relies on notify()
// which relies on refresh(), never gets informed of the completion of a Server
// password change, because notify() only informs listeners each time
// Last-Modified is updated.  Even if refresh() stopped using If-Modified-Since
// and behaved like find(), notify() cannot tell when changes occur and won't
// notify interested parties.

// TODO: only need to do this once after we roll all our files together.
if (typeof(com) == "undefined")
  com = { rackspace: { cloud: { servers: { api: { client: {} } } } } }
__csapi_client = com.rackspace.cloud.servers.api.client;

/**
 * Base EntityManager class.  Subclasses must implement _dataForUpdate(),
 * _dataForCreate, and _doneWaiting(); see below for usage.
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
 *   type:string
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
    // The header is much easier to parse than the JSON string, so use that
    fault.retryAfter = new Date(xhr.getResponseHeader("Retry-After"));
    // Adjust for the fact that their clock is skewed from ours
    var serverNow = new Date(xhr.getResponseHeader("Date"));
    var skewSeconds = (new Date() - serverNow) / 1000;
    fault.retryAfter.setSeconds(fault.retryAfter.getSeconds() + skewSeconds);
    // The Retry-After is truncated compared to the retryAfter JSON string, so
    // we may be missing up to .999 seconds of the message.  It doesn't hurt to
    // wait a little longer than normal, so add a second for good measure.
    fault.retryAfter.setSeconds(fault.retryAfter.getSeconds() + 1);
  }
  return fault;
},

__csapi_client.EntityManager.prototype = {
  __proto__: undefined,

  /**
   * Subclasses can override CRUD methods to point to this as necessary.
   */
  _unsupportedMethod: function(opts) {
    if (opts.fault) {
      // TODO: What code should a BadMethodFault have?
      opts.fault({
        type: "badMethod",
        code: 400,
        message: "This operation is not supported by this Entity type.",
      });
    }
  },

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
    var data = undefined;
    if (opts.data) {
      data = JSON.stringify(opts.data);
      opts.processData = false;
      opts.contentType = "application/json";
    }
    if (opts.async === undefined) opts.async = true;
    if (opts.type in {GET:1, POST:1}) opts.dataType = "json";

    var that = this;
    console.log("AJAX " + opts.type + " " + opts.path);
    $.ajax({
      async: opts.async,
      type: opts.type,
      url: that._url + "/" + opts.path,
      dataType: opts.dataType,
      data: data,
      processData: opts.processData,
      contentType: opts.contentType,
      cache: false,
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
          console.log("413; retrying in a bit.");
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
              console.log("\"Sleep\"ing...");
              var stopAt = faultData.retryAfter;
              while (new Date() < stopAt) for (var i = 0; i < 100000; i++) {}
              console.log("Awake!");
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
      success: function(json, status, xhr) {
        if (!opts.success) // no need to poll
          return;

        // Suck out the new entity so we have an id to wait on
        for (var key in json) { var newEntity = json[key]; break; }
        // TODO: They don't give us a last-modified date, but a good guess is
        // the current Date on the server.  If they start sending Last-Modified
        // back as I have requested, use that instead: the Date is not really
        // accurate, and not a supported API.
        newEntity._lastModified = xhr.getResponseHeader("Date");
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
      fault: function(fault) {
        // TODO: Temporarily work around an API bug: DELETE returns a blank
        // response body and Content-Type text/xml, which are incompatible.
        // Until they remove the Content-Type header, jQuery will try to parse
        // the empty body and will throw a parsererror.  So a fault with status
        // 202 is actually success.  Remove this check once the API stops
        // sending the Content-Type header.
        if (fault.code == 202) {
          opts.success();
          return;
        }
        opts.fault(fault);
      }
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
   * the server at least once to check the state of the entity and thus 
   * consumes account resources.
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

    var that = this;
    var handleNotification = function(notifyEvent) {
      if (notifyEvent.error) {
        console.log("wait got an error");
        that.stopNotify(opts.entity, handleNotification);
        opts.fault(notifyEvent.fault);
      }
      else if (that._doneWaiting(opts.entity, notifyEvent.targetEntity)) {
        console.log("wait is done waiting");
        that.stopNotify(opts.entity, handleNotification);
        opts.success(notifyEvent.targetEntity);
      } else {
        console.log("wait got notified and will keep waiting");
      }
    };

    // Since notify() only calls callbacks when LastModified is updated, and
    // opts.entity may be the latest, stable version, check explicitly once via
    // refresh() before registering for notifications.
    that.refresh({
      entity: opts.entity,
      fault: opts.fault,
      success: function(updatedEntity) {
        if (that._doneWaiting(opts.entity, updatedEntity))
          opts.success(updatedEntity);
        else
          that.notify(opts.entity, handleNotification);
      }
    });
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
   * detailed:bool true if the entities should contain all information; false
   *     if they should only contain name and id.
   * offset?:integer the offset into the entities at which to start the list.
   *     Defaults to zero.
   * limit?:integer the maximum number of items to return.  Defaults to
   *     no limit.
   */
  createList: function(detailed, offset, limit) {
    return this.createDeltaList(detailed, undefined, offset, limit);
  },

  /**
   * Return a new list of entities modified since changes_since.
   *
   * detailed:bool true if the entities should contain all information; false
   *     if they should only contain name and id.
   * changes_since: the time after which an entity must have been modified
   *     in order to appear in the list.  You should only pass in
   *     Last-Modified header values as reported by the server.  Defaults to
   *     the beginning of time.
   * offset?:integer the offset into the entities at which to start the list.
   *     Defaults to zero.
   * limit?:integer the maximum number of items to return.  Defaults to
   *     no limit.
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
