// TODO: only need to do this once after we roll all our files together.
if (typeof(com) == "undefined")
  com = { rackspace: { cloud: { servers: { api: { client: {} } } } } }
__csapi_client = com.rackspace.cloud.servers.api.client;

__csapi_client.BackupSchedule = {
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
