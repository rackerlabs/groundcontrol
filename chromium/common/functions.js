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

// Figure out how to persist data.
try {
  localStorage;
  LOCALSTORAGE = undefined;
}
catch (ex) {
  LOCALSTORAGE = Components.classes["@mozilla.org/preferences-service;1"]
                        .getService(Components.interfaces.nsIPrefBranch);
}

function _get(key) {
  if (LOCALSTORAGE) {
    try {
      var result = LOCALSTORAGE.getCharPref(key);
    }
    catch (ex) {
      var result = null;
    }
  }
  else {
    var result = localStorage.getItem(key);
  }

  if (result != null)
    return JSON.parse(result);
  else
    return result;
}
function _set(key, value) {
  if (LOCALSTORAGE)
    LOCALSTORAGE.setCharPref(key, JSON.stringify(value));
  else
    localStorage.setItem(key, JSON.stringify(value));
}
function _delete(key) {
  if (LOCALSTORAGE) {
    try {
      LOCALSTORAGE.clearUserPref(key);
    }
    catch (ex) {
    }
  }
  else {
    localStorage.removeItem(key);
  }
}

var log = function(msg) {
  if (typeof console != "undefined" && console.log) {
    console.log(msg);
  }
}
