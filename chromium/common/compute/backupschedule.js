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

__compute_client.BackupSchedule = {
  days: [ "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", 
          "SATURDAY" ],
  dayStringToInteger: function(day) {
    var index = this.days.indexOf(day);
    if (index == -1)
      return undefined;
    else
      return index;
  },

  dayIntegerToString: function(day) {
    return this.days[day] || "DISABLED";
  },

  hourStringToInteger: function(hour) {
    if (hour == "DISABLED")
      return undefined;
    else
      return parseInt(hour.substr(2,2)); // 3rd and 4th letters
  },

  hourIntegerToString: function(hour) {
    if (hour == undefined)
      return "DISABLED";

    // Only even hours from 0 to 22 are valid.
    hour = hour % 24;
    hour = Math.max(0, Math.min(22, hour));
    hour = Math.floor(hour / 2) * 2;

    var twodigit = function(i) { return "" + (i < 10 ? "0" + i : i); }
    return "H_" + twodigit(hour) + "00_" + twodigit((hour + 2) % 24) + "00";
  }
}
