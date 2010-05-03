// TODO: only need to do this once after we roll all our files together.
if (typeof(com) == "undefined")
  com = { rackspace: { cloud: { servers: { api: { client: {} } } } } }
__csapi_client = com.rackspace.cloud.servers.api.client;

__csapi_client.BackupSchedule = {
  days: [ "SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", 
          "SATURDAY" ],
  hours: [0,2,4,6,8,10,12,14,16,18,20,22].map(function(start) {
    var twodigit = function(i) { return "" + (i < 10 ? "0" + i : i); }
    return "H_" + twodigit(start) + "_" + twodigit(start+2);
  }

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
    // Only even hours are valid
    hour = (hour / 2) * 2;
    var index = this.hour.indexOf(hour);
    if (index == -1)
      return undefined;
    else
      return index;
  },

  hourIntegerToString: function(hour) {
    return this.hours[hour] || "DISABLED";
  }
}
