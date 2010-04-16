// TODO: only need to do this once after we roll all our files together.
if (typeof(com) == "undefined")
  com = { rackspace: { cloud: { servers: { api: { client: {} } } } } }
__csapi_client = com.rackspace.cloud.servers.api.client;

// code:integer response code
// message:string
// details?:string
__csapi_client.CloudServersFault = function(
    code, message, details) {
  this.code = code;
  this.message = message;
  this.details = details;
}

// Same inputs as CloudServersFault, plus
// retryAfter:integer // TODO timestamp? in seconds?
__csapi_client.OverLimitFault = function(
    code, message, details, retryAfter) {
  __csapi_client.CloudServersFault.call(this, code, message, details);
  this.retryAfter = retryAfter;
}

__csapi_client.UnauthorizedFault = function(
    code, message, details) {
  __csapi_client.CloudServersFault.call(this, code, message, details);
}
