function authenticate(username, api_key, callback) {
  $.ajax({
    url: "https://auth.api.rackspacecloud.com/v1.0",
    beforeSend: function(xhr) {
      xhr.setRequestHeader("X-Auth-User", username);
      xhr.setRequestHeader("X-Auth-Key", api_key);
    },
    success: function(data, response, xhr) {
      var response = {
        smgmt: xhr.getResponseHeader("X-Server-Management-Url"),
        storage: xhr.getResponseHeader("X-Storage-Url"),
        cdn: xhr.getResponseHeader("X-CDN-Management-Url"),
        auth_token: xhr.getResponseHeader("X-Auth-Token"),
      }

      callback(response);
    }
  })
}
