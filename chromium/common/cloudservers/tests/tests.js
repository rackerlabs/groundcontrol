function CSAPITests(opts) {
  this._opts = opts;
  if (!opts.username) {
    opts.username = prompt("Enter username for tests");
  }
  if (!opts.apiKey) {
    opts.apiKey = prompt("Enter API key for tests");
  }
}
function ServerTests(username, apiKey) {
  this.username = username;
  this.apiKey = apiKey;
}
ServerTests.prototype = {
  init: function(result) {
    result.setTimeout(5000);
    result.log("Logging in...");
    try {
      var client = com.rackspace.cloud.servers.api.client;
      this.service = new client.CloudServersService({
        username: this.username,
        apiKey: this.apiKey
      });
    }
    catch (fault) {
      result.failure("Couldn't log in: " + fault.message);
    }
    result.log("Making entities");
    result.setTimeout(60000);
    // Make some entities for tests to use
    var that = this;
    that.service.servers.createList(true, 0, 3).forEachAsync({
      each: function() { },
      complete: function(entities) {
        that.entities = entities;
        result.success();
      },
      fault: function(fault) { result.failure(fault.message); }
    });
  },

  testReboot: function(result) {
    this.service.servers.reboot({
      entity: this.entities[0],
      success: function() { result.success(); },
      fault: function(fault) { result.failure(fault.message); }
    });
  },

  testGetBackupSchedule: function(result) {
    this.service.servers.getSchedule({
      entity: this.entities[1],
      success: function(schedule) { 
        if (schedule.enabled == false && 
            schedule.weekly == undefined &&
            schedule.daily == undefined) {
          result.success();
        } else {
          result.failure("Wrong backup schedule")
        }
      },
      fault: function(fault) { result.failure(fault.message); }
    });
  },

  // Assure that setting the given backup schedule allows us to get the same
  // schedule in return.  Not very interesting unless entity's schedule is
  // different from the one passed to the test.
  _testSettingABackupSchedule: function(testSchedule, result) {
    var that = this;
    var entity = this.entities[2];
    that.service.servers.setSchedule({
      entity: entity,
      enabled: testSchedule.enabled,
      weekly: testSchedule.weekly,
      daily: testSchedule.daily,
      success: function() { 
        that.service.servers.getSchedule({
          entity: entity,
          success: function(newSchedule) {
            if (newSchedule.enabled == testSchedule.enabled && 
                newSchedule.weekly == testSchedule.weekly &&
                newSchedule.daily == testSchedule.daily) {
              result.success();
            } else {
              result.failure("Wrong backup schedule")
            }
          },
          fault: function(fault) { result.failure(fault.message); }
        });
      },
      fault: function(fault) { result.failure(fault.message); }
    });
  },

  testSetBackupSchedule1: function(result) {
    var testSchedule = { enabled: true, weekly: 4, daily: 22 };
    return this._testSettingABackupSchedule(testSchedule, result);
  },

  testSetBackupSchedule2: function(result) {
    var testSchedule = { enabled: false, weekly: 4 };
    this._testSettingABackupSchedule(testSchedule, result);
  },

  testSetBackupSchedule3: function(result) {
    var testSchedule = { enabled: true, daily: 0};
    this._testSettingABackupSchedule(testSchedule, result);
  },

} // end ServerTests
