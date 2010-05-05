/*
* Copyright 2010 Rackspace US, Inc.
*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

// TODO: only need to do this once after we roll all our files together.
if (typeof(com) == "undefined")
  com = { rackspace: { cloud: { servers: { api: { client: {} } } } } }
__csapi_client = com.rackspace.cloud.servers.api.client;

// Class handling polling the server for changes to objects, and notifying
// listeners.

__csapi_client.NotifyPoller = function(entityManager) {
  this._entityManager = entityManager;
}
__csapi_client.NotifyPoller.prototype = {
  __proto__: undefined,

  _pollIntervalMs: 10000, // TODO set this reasonably somehow

  /**
   * Return poll and callback data about the given entity.
   */
  _data: function(entity) {
    this._dataMap = this._dataMap || {};

    // We have to clean up stale entries occasionally; so do it now.
    for (id in this._dataMap) {
      if (this._dataMap[id].callbacks.length == 0)
        delete this._dataMap[id];
    }

    if (this._dataMap[entity.id] == undefined) {
      this._dataMap[entity.id] = {
        latestKnownEntity: entity, // latest version we're aware of
        callbacks: [], // maps of {fn, latestKnownEntity} that the fn knows of
        currentlyWaitingForResponse: false, // in the middle of a server call?
        pollTimerId: undefined // exists if a timer between polls is running
      };
    }
    return this._dataMap[entity.id];
  },

  /**
   * Registers a callback to be run when entity changes on the server.
   *
   * entity:Entity the entity to watch for a change.
   * callback:function as passed to EntityManager.notify().
   */
  register: function(entity, callback) {
    console.log("Registering entity " + entity.id);

    var data = this._data(entity);
    data.callbacks.push({ fn: callback, latestKnownEntity: entity });
    this._pollNow(data);
  },

  // Stop calling callback (which was earlier passed to register()) for the
  // given entity (whose id matches that of the entity earlier passed to
  // register()).
  deregister: function(entity, callback) {
    console.log("Denotifying for entity " + entity.id);

    var data = this._data(entity);
    data.callbacks = data.callbacks.filter(function(entry) {
      return entry.fn != callback;
    });
  },

  // Check for an update to the entity on the server, and notify any callbacks
  // who didn't already know about the update.  Then register a callback to do
  // it again in a little while.
  _pollNow: function(data) {
    if (data.callbacks.length == 0)
      return; // Nobody cares

    if (data.currentlyWaitingForResponse)
      return; // already polling, so hold your horses

    // If a timer plans to poll in the future, abort it -- we're polling now.
    if (data.pollTimerId) {
      window.clearTimeout(data.pollTimerId);
      delete data.pollTimerId;
    }

    console.log("Polling for entity " + data.latestKnownEntity.id);

    data.currentlyWaitingForResponse = true;

    var that = this;
    that._entityManager.refresh({
      entity: data.latestKnownEntity,
      success: function(newEntity) {
        data.currentlyWaitingForResponse = false;
        data.latestKnownEntity = newEntity;

        function is_stale(oldEntity) {
          var hisTimestamp = oldEntity._lastModified;
          var newTimestamp = data.latestKnownEntity._lastModified;
          return (new Date(hisTimestamp) < new Date(newTimestamp));
        }

        // Avoid list mutation if callbacks deregister themselves
        var callbacksCopy = data.callbacks.slice();
        for (var i = 0; i < callbacksCopy.length; i++) {
          if (is_stale(callbacksCopy[i].latestKnownEntity)) {
            console.log("Notifying callback " + i + " for id " + newEntity.id);
            callbacksCopy[i].latestKnownEntity = newEntity;
            callbacksCopy[i].fn({error:false, targetEntity:newEntity});
          }
          else {
            var cM = callbacksCopy[i].latestKnownEntity._lastModified;
            var lM = data.latestKnownEntity._lastModified;
            console.log("callback " + i + " for entity " + newEntity.id + 
                        " not notified, because " + cM + " >= " + lM);
          }
        }

        data.pollTimerId = window.setTimeout(function() { 
          delete data.pollTimerId;
          that._pollNow(data); 
        }, that._pollIntervalMs);
      },
      fault: function(fault) {
        data.currentlyWaitingForResponse = false;
        var deregistered = data.callbacks;
        data.callbacks = []; // deregister them

        for (var i = 0; i < deregistered.length; i++) {
          deregistered[i].fn({error:true, fault:fault});
        }
      }
    });
  }
}
