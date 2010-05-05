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
