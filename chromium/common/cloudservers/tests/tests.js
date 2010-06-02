function CSAPITests(opts) {
  this._opts = opts;
  if (!opts.username) {
    opts.username = prompt("Enter username for tests");
  }
  if (!opts.apiKey) {
    opts.apiKey = prompt("Enter API key for tests");
  }
}
function ServerTests() {
  TestSuite.call(this);
}
ServerTests.prototype = {
  __proto__: TestSuite,

  init: function(deferred) {
    //this.service = blah
    //this.entities = blah
    //(deferred.done() when finished)

    return deferred;
  },

  testReboot: function(deferred) {
    this.service.servers.reboot({
      entity: this.entities[0],
      success: function() { deferred.success(); },
      fault: function(fault) { deferred.failure(fault.message); }
    });
    return deferred;
  },

  testGetBackupSchedule: function(deferred) {
    this.service.servers.getBackupSchedule({
      entity: this.entities[1],
      success: function(schedule) { 
        if (schedule.enabled == false && 
            schedule.weekly == undefined &&
            schedule.daily == undefined) {
          deferred.success();
        } else {
          deferred.failure("Wrong backup schedule")
        }
      },
      fault: function(fault) { deferred.failure(fault.message); }
    });
    return deferred;
  },

  // Assure that setting the given backup schedule allows us to get the same
  // schedule in return.  Not very interesting unless entity's schedule is
  // different from the one passed to the test.
  _testSettingABackupSchedule: function(schedule, entity, deferred) {
    this.service.servers.setBackupSchedule({
      entity: entity,
      schedule: testSchedule,
      success: function() { 
        this.service.servers.getBackupSchedule({
          entity: entity,
          success: function(newSchedule) {
            if (newSchedule.enabled == testSchedule.enabled && 
                newSchedule.weekly == testSchedule.weekly &&
                newSchedule.daily == testSchedule.daily) {
              deferred.success();
            } else {
              deferred.failure("Wrong backup schedule")
            }
          },
          fault: function(fault) { deferred.failure(fault.message); }
        });
      },
      fault: function(fault) { deferred.failure(fault.message); }
    });
    return deferred;
  },

  testSetBackupSchedule1: function(deferred) {
    var testSchedule = { enabled: true, weekly: 4, daily: 22 };
    return this._testSettingABackupSchedule(testSchedule, deferred);
  },

  testSetBackupSchedule2: function(deferred) {
    var testSchedule = { enabled: false, weekly: 4 };
    return this._testSettingABackupSchedule(testSchedule, deferred);
  },

  testSetBackupSchedule3: function(deferred) {
    var testSchedule = { enabled: true, daily: 0};
    return this._testSettingABackupSchedule(testSchedule, deferred);
  },

} // end ServerTests
