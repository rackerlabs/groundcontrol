// TODO: only need to do this once after we roll all our files together.
if (typeof(com) == "undefined")
  com = { rackspace: { cloud: { servers: { api: { client: {} } } } } }
__csapi_client = com.rackspace.cloud.servers.api.client;

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
__csapi_client.CloudServersFault = function(
    code, message, details, retryAfter) {
  this.code = code;
  this.message = message;
  if (details) this.details = details;
  if (retryAfter) this.retryAfter = retryAfter;
}
