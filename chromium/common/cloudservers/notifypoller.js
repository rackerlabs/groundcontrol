// Class handling polling the server for changes to objects, and notifying
// listeners.

// TODO This class is in a bad state of flux.  Reread through it and
// clean up, finish, and fix.

function _NotifyPoller(entityManager) {
  this._entityManager = entityManager;

  // A pointer, if any, to the setTimeout() function that will soon poll.
  this._pollTimerId = undefined;

  /**
   * A map from entity ID to an array of callbacks to execute each time the
   *     entity is updated on the server.
   */
  this._listeners = {};
}
NotifyPoller.prototype = {
  __proto__: undefined,

  _pollIntervalMs: 15000, // TODO set this reasonably somehow

  /**
   * Register a callback to be run when entity changes on the server.
   *
   * entity:Entity the entity to watch for a change.
   * callback:function as passed to EntityManager.notify().
   */
  register: function(entity, callback) {
    // Poll immediately to see if the entity can get an immediate callback.
    // There are a few cases to consider to get this right and avoid race
    // conditions:
    //
    //   1. Nobody else is listening: Just start polling as of the entity's
    //      lastModified date.
    //   2. Others are listening and the entity has been updated on the server
    //      since our last poll time: Just poll now, and the callback will be
    //      called.
    //   3. Others are listening and the entity has been updated on the server
    //      since it was fetched but before our last poll time: call the
    //      callback immediately with the updated version, then let our polling
    //      run as normal and check for possible new versions.
    //   4. Others are listening and the entity has not been updated on the
    //      server since it was fetched: just keep polling as usual.
 
    var otherListenersExist = this._someoneIsListening();

    this._listeners[entity.id] = this._listeners[entity.id] || [];
    this._listeners[entity.id].push(callback);

    // Case 1 above
    if (!otherListenersExist) {
      this._lastPollTime = entity._lastModified;
      this._startPollingNow();
    }
    else {
      var that = this;
      that._entityManager.refresh({
        entity: entity,
        success: function(newEntity) {
          // Case 3 above
          if (entity._lastModified < newEntity._lastModified &&
              newEntity._lastModified <= that._lastPollTime) {
            // There was an update, and our next poll won't catch it.
            callback({error:false, targetEntity:newEntity});
          }
          // Case 2 above
          else if (entity._lastModified < newEntity._lastModified &&
                   newEntity._lastModified > that._lastPollTime) {
            // There was an update, but our next poll will catch it.
            // Restart polling now to let callback know about the update ASAP.
            // We can't call the callback or he'd get double-notified.
            window.clearTimeout(that._pollTimerId);
            that._startPollingNow();
          }
          // Case 4 above
          else {
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
    // TODO: race condition here if called by a callback in a string of
    // callbacks, because we're modifying the list.
    var list = this._listeners[entity.id] || [];

    for (var i = 0; i < list.length; i++) {
      if (list[i] === callback) {
        list.removeAt(i);
        i--; // keep going; they may be registered more than once.
      }
    }

    if (list.length == 0)
      delete this._listeners[entity.id];
  },

  // True if there is at least one registered callback.
  _someoneIsListening: function() {
    for (var entry in this._listeners)
      return true;
    return false;
  }

  // Check for new entities on the server, and notify interested parties.
  // Then register a callback to do it again in a little while.
  _pollNow: function() {
    var that = this;

    that.createEntityList({
      lastModified: that._lastPollTime,
      success: function(entities) {
        if (that._someoneIsListening() == false)
          return; // don't re-register polling setTimeout

        for (var i = 0; i < entities.length; i++) {
          // TODO: make a copy of the callback list before calling them,
          // in case any deregister themselves.
          // TODO: call the callbacks if any are registered for this entity.
        }

        that._pollTimerId = window.setTimeout(that._pollNow, 
                                              that._pollIntervalMs);
      },
      fault: function(fault) {
        var deadListeners = this._listeners;
        this._listeners = {}; // deregister everybody

        for (var id in deadListeners) {
          for (var i = 0; i < deadListeners[id].length; i++) {
            deadListeners[id][i]({error:true, fault: fault});
          }
        }
      }
    });
  }
}
