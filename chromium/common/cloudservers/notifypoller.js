// TODO: only need to do this once after we roll all our files together.
if (typeof(com) == "undefined")
  com = { rackspace: { cloud: { servers: { api: { client: {} } } } } }
__csapi_client = com.rackspace.cloud.servers.api.client;

// Class handling polling the server for changes to objects, and notifying
// listeners.

__csapi_client.NotifyPoller = function(entityManager) {
  this._entityManager = entityManager;

  // A pointer, if any, to the setTimeout() function that will soon poll.
  this._pollTimerId = undefined;

  /**
   * A map from entity ID to an array of callbacks to execute each time the
   *     entity is updated on the server.
   */
  this._listeners = {};
}
__csapi_client.NotifyPoller.prototype = {
  __proto__: undefined,

  _pollIntervalMs: 30000, // TODO set this reasonably somehow

  /**
   * Registers a callback to be run when entity changes on the server.
   * If callback is already registered for this entity, does not reregister.
   *
   * entity:Entity the entity to watch for a change.
   * callback:function as passed to EntityManager.notify().
   */
  register: function(entity, callback) {
    // Check immediately to see if the entity can get an immediate callback.
    // There are a few cases to consider to get this right and avoid race
    // conditions:
    //
    //   1. Nobody else is listening: Start polling as of the entity's
    //      lastModified date.
    //   2. Others are listening and the entity has been updated on the server
    //      since our previous poll: Do our next poll right now, so the 
    //      callback will be called.
    //   3. Others are listening and the entity has been updated on the server
    //      since it was fetched but before our previous poll: call the
    //      callback immediately with the updated version, then keep
    //      polling as usual to watch for further changes.
    //   4. Others are listening and the entity has not been updated on the
    //      server since it was fetched: just keep polling as usual.
 
    console.log("Registering entity " + entity.id);
    var otherListenersExist = this._someoneIsListening();

    this._listeners[entity.id] = this._listeners[entity.id] || [];
    // Disallow multiple registration.
    if (this._listeners[entity.id].indexOf(callback) != -1)
      return;

    this._listeners[entity.id].push(callback);

    // Case 1 above
    if (!otherListenersExist) {
      console.log("Case 1");
      this._lastPollTime = entity._lastModified;
      this._pollNow();
    }
    else {
      console.log("Not case 1");
      var that = this;
      that._entityManager.refresh({
        entity: entity,
        success: function(newEntity) {
          // Case 3 above
          if (entity._lastModified < newEntity._lastModified &&
              newEntity._lastModified <= that._lastPollTime) {
            console.log("Case 3");
            // There was an update, and our next poll won't catch it.
            callback({error:false, targetEntity:newEntity});
          }
          // Case 2 above
          else if (entity._lastModified < newEntity._lastModified &&
                   newEntity._lastModified > that._lastPollTime) {
            console.log("Case 2");
            // There was an update, and our next poll will report it.
            window.clearTimeout(that._pollTimerId);
            that._pollNow();
          }
          // Case 4 above
          else {
            console.log("Case 4");
            // There was no update, so just keep polling as usual.
          }
        },
        fault: function(fault) {
          // An excellent excuse to not deal with this guy at all!
          that.deregister(entity, callback);
          callback({error:true, fault:fault});
        }
      });
    }
  },

  // Stop calling callback (which was earlier passed to register()) for the
  // given entity (whose id matches that of the entity earlier passed to
  // register()).
  deregister: function(entity, callback) {
    console.log("Denotifying for entity " + entity.id);
    var list = this._listeners[entity.id] || [];

    var where = list.indexOf(callback);
    if (where != -1)
      list.splice(where, 1);

    if (list.length == 0)
      delete this._listeners[entity.id];
  },

  // True if there is at least one registered callback.
  _someoneIsListening: function() {
    for (var entry in this._listeners)
      return true;
    return false;
  },

  // Send fault to all listeners and deregister them.
  _faultAndDeregisterEveryone: function(fault) {
    var deadListeners = this._listeners;
    this._listeners = {}; // deregister everybody

    for (var id in deadListeners) {
      for (var i = 0; i < deadListeners[id].length; i++) {
        deadListeners[id][i]({error:true, fault: fault});
      }
    }
  },

  // Check for new entities on the server, and notify interested parties.
  // Then register a callback to do it again in a little while.
  _pollNow: function() {
    var that = this;

    var list = that._entityManager.createDeltaList(true, that._lastPollTime);
    list.forEachAsync({
      each: function(changedEntity) {
        if (!that._listeners[changedEntity.id])
          continue;

        // avoid list mutation when callbacks deregister themselves
        var callbacksCopy = that._listeners[changedEntity.id].slice();

        for (var i=0; i < callbacksCopy.length; i++) {
          callbacksCopy[i]({error:false, targetEntity:changedEntity});
        }
      },
      complete: function() {
        if (that._someoneIsListening()) {
          // Poll again later
          that._lastPollTime = list.getLastModified();
          that._pollTimerId = window.setTimeout(that._pollNow,
          that._pollIntervalMs);
        }
      },
      fault: that._faultAndDeregisterEveryone
    });

  }
}
