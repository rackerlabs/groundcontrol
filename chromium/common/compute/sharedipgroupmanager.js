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
if (typeof(org) == "undefined")
  org = { openstack: { compute: { api: { client: {} } } } }
__compute_client = org.openstack.compute.api.client;

/**
 * Creates a new SharedIpGroupManager instance.  Users should use
 * ComputeService.createSharedIpGroupManager() rather than calling this
 * constructor directly.
 *
 * service:ComputeService instance to work with.
 */
__compute_client.SharedIpGroupManager = function(service) {
  __compute_client.EntityManager.call(this, service, "/shared_ip_groups");
}
__compute_client.SharedIpGroupManager.prototype = {
  __proto__: __compute_client.EntityManager.prototype,

  /**
   * Return the data to send in create request for the given entity.
   */
  _dataForCreate: function(entity) {
    return { sharedIpGroup: entity };
  },

  /**
   * Return false if the given entity is in the middle of completing an
   * operation on the server (based on its local attributes).
   */
  _doneWaiting: function(oldEntity, newEntity) {
    return (oldEntity._lastModified != newEntity._lastModified);
  },

  // Updates are not allowed on SharedIpGroups.
  update: function(opts) { this._unsupportedMethod(opts); },
}
