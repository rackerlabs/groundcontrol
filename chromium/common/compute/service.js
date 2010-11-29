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

// TODO: support proxy domains passed into ctor via settings parameter, so
// people can use this API with a proxy to interact w/ Compute from their
// own sites

// Built according to the Cloud Servers Language Binding Guide, rev 09/16/09.

// TODO: only need to do this once after we roll all our files together.
if (typeof(org) == "undefined")
  org = { openstack: { compute: { api: { client: {} } } } }
__compute_client = org.openstack.compute.api.client;

/**
 * Creates a new ComputeService after synchronously authenticating 
 * against the OpenStack API.
 *
 * opts:object contains
 *   username:string OpenStack user
 *   apiKey:string
 *   authUrl:string OpenStack Compute Auth endpoint (e.g.
 *       https://example.org/openstack-compute/auth)
 *   settings?:Settings to override any default settings
 * 
 * Throws an UnauthorizedFault if credentials are invalid.
 */
__compute_client.ComputeService = function(opts) {
  this._authUrl = opts.authUrl;
  this._username = opts.username;
  // TODO: if opts.settings.proxy, use it
  this._apiKey = opts.apiKey;
  var out_fault = {};
  this._blockingAuthenticate();

  // Convenience attributes
  this.servers = this.createServerManager();
  this.images = this.createImageManager();
  this.flavors = this.createFlavorManager();
  this.sharedIpGroups = this.createSharedIpGroupManager();
}
__compute_client.ComputeService.prototype = {

  /**
   * Synchronously authenticates using this's credentials.  Upon success,
   * sets this._serverManagementUrl and this._authToken.  
   *
   * Throws an UnauthorizedFault if credentials are invalid.
   */
  _blockingAuthenticate: function(_attempt) {
    var MAX_ATTEMPTS = 3;
    _attempt = _attempt || 1;
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
        var url = xhr.getResponseHeader("X-Server-Management-Url");
        that._serverManagementUrl = url;
      },
      error: function(xhr) {
        if (_attempt < MAX_ATTEMPTS) {
          try {
            that._blockingAuthenticate(_attempt+1);
          } catch (ex) {
            fault = ex;
          }
        } else {
          // Since we can't throw directly from a callback function, we set a
          // variable for the caller to throw.  This only works because we're
          // within a *synchronous* ajax call.
          fault = {code: xhr.status, message:xhr.responseText};
        }
      }
    });
    if (fault)
      throw fault;
  },

  // TODO: implement this.serviceInfo to query Version, Limits, and Settings.

  createServerManager: function() {
    return new __compute_client.ServerManager(this);
  },

  createImageManager: function() {
    return new __compute_client.ImageManager(this);
  },

  createSharedIpGroupManager: function() {
    return new __compute_client.SharedIpGroupManager(this);
  },

  createFlavorManager: function() {
    return new __compute_client.FlavorManager(this);
  },
}
