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


// Erm, I decided this isn't worth it, as it takes the same number of
// lines to specify request headers using the below method as it does to
// just specify them in a beforeSend callback.  Keeping around in case I
// change my mind by the time I finish the project.
/*
// Improve jQuery.ajax to handle request headers more easily.  It now takes
// an optional "requestHeaders" dictionary that will be applied to the
// request, e.g. { "Content-Type": "text/plain" }.
(function($) {
  var _oldAjax = $.ajax;
  $.ajax = function(opts) {
    var oldBeforeSend = opts.beforeSend;
    opts.beforeSend = function(xhr) {
      opts.requestHeaders = opts.requestHeaders || {};
      for (header in opts.requestHeaders)
        xhr.setRequestHeader(header, opts.requestHeaders[header]);
      }
      if (oldBeforeSend)
        oldBeforeSend(xhr);
    }
    _oldAjax(opts);
  }
})(jQuery); // run the function
*/
