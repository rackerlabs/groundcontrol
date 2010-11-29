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

// This exists just for the sake of declaring somewhere that faults will
// containing code and message, and may contain details and retryAfter.
// In practice, faults may have 'object' as their prototype.

/**
 * A fault thrown by the service.
 * code:integer HTTP status code
 * message:string informational message
 * details?:string optional further details
 * retryAfter?:Date after which to retry a request that was OverLimit.
 */
__compute_client.ComputeFault = function(
    code, message, details, retryAfter) {
  this.code = code;
  this.message = message;
  if (details) this.details = details;
  if (retryAfter) this.retryAfter = retryAfter;
}
