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
