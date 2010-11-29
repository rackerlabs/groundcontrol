function ServerTests(username, apiKey) {
  this.username = username;
  this.apiKey = apiKey;
}
ServerTests.prototype = {
  _deleteTestServers: function(result, callback) {
    result.log("Deleting all servers named 'test{anything}'");
    var that = this;
    that.service.servers.createList(true).forEachAsync({
      fault: function(fault) { result.failure(fault.message); },
      each: function(entity) { 
        if (!entity.name.match('^test')) 
          return;
        result.log("Deleting " + entity.name);
        that.service.servers.remove({ entity: entity });
      },
      complete: callback
    });
  },

  init: function(result) {
    result.setTimeout(5000);
    result.log("Logging in...");
    try {
      var client = org.openstack.compute.api.client;
      this.service = new client.ComputeService({
        username: this.username,
        apiKey: this.apiKey
      });
    }
    catch (fault) {
      result.failure("Couldn't log in: " + fault.message);
    }

    var that = this;
    that.entities = [];
    var SERVERS_NEEDED = 10;
    result.setTimeout(180000);
    that._deleteTestServers(result, function() {
      result.log("Creating " + SERVERS_NEEDED + " new servers for tests");

      result.setTimeout(300000);
      for (var i=0; i < SERVERS_NEEDED; i++) {
        that.service.servers.create({
          entity: { name: "test" + Math.random(), imageId: 10, flavorId: 2 },
          success: function(entity) {

            that.service.servers.wait({
              entity: entity,
              success: function(updatedEntity) {

                that.entities.push(entity);
                result.log("Created entity " + that.entities.length);
                if (that.entities.length == SERVERS_NEEDED)
                  result.success();

              },
              fault: function(fault) { result.failure(fault.message); }
            });

          },
          fault: function(fault) { result.failure(fault.message); }
        });
      }

    });
  },

  testInitialCreate: function(result) {
    var that = this;
    this.service.servers.create({
      entity: { 
        name: "testInitialCreate" + Math.random(), imageId: 10, flavorId: 2 
      },
      success: function(entity) { 
        result.success();
        that.service.servers.remove({entity: entity});
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
  _testSettingABackupSchedule: function(entityNumber, testSchedule, result) {
    var that = this;
    var entity = this.entities[entityNumber];
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
    return this._testSettingABackupSchedule(2, testSchedule, result);
  },

  testSetBackupSchedule2: function(result) {
    var testSchedule = { enabled: false, weekly: 4 };
    this._testSettingABackupSchedule(3, testSchedule, result);
  },

  testSetBackupSchedule3: function(result) {
    var testSchedule = { enabled: true, daily: 0};
    this._testSettingABackupSchedule(4, testSchedule, result);
  },

  testResize: function(result) {
    var entity = this.entities[5];
    var newFlavorId = (entity.flavorId == 2 ? 3 : 2);
    this.service.servers.resize({
      entity: entity,
      flavorId: newFlavorId,
      success: function(server) { 
        if (server.status != "UNKNOWN") {
          result.failure(
            "Server status " + server.status + " instead of UNKNOWN");
        }
        result.success();
      },
      fault: function(fault) { result.failure(fault.message); }
    });
  },

  testRebuild: function(result) {
    var entity = this.entities[6];
    var newImageId = (entity.imageId == 10 ? 17 : 10);
    this.service.servers.rebuild({
      entity: entity,
      imageId: newImageId,
      success: function(server) { 
        if (server.imageId != newImageId) {
          result.failure("Image ID should be " + newImageId + 
                         " but it's " + server.imageId);
          return;
        }
        result.success();
      },
      fault: function(fault) { result.failure(fault.message); }
    });
  },

  testConfirmResize: function(result) {
    var entity = this.entities[7];
    var newFlavorId = (entity.flavorId == 2 ? 3 : 2);
    var that = this;
    this.service.servers.resize({
      entity: entity,
      flavorId: newFlavorId,
      success: function(server) { 
        if (server.status != "UNKNOWN") {
          result.failure(
            "Server status " + server.status + " instead of UNKNOWN");
          return;
        }
        result.log("Waiting for VERIFY_RESIZE state...");
        result.setTimeout(300000);
        that.service.servers.notify(server, function(event) {
          if (event.error) {
            result.failure("Error talking to server");
            return;
          }
          if (event.targetEntity.status != "VERIFY_RESIZE") {
            return; // keep waiting
          }
          that.service.servers.confirmResize({
            entity: event.targetEntity,
            fault: function(fault) { result.failure(fault.message); },
            success: function(updatedServer) {
              if (! updatedServer.status in { "UNKNOWN":1, "ACTIVE": 1}) {
                result.failure("Wrong status: " + updatedServer.status +
                               " instead of UNKNOWN/ACTIVE");
              }
              else if (updatedServer.flavorId != newFlavorId) {
                result.failure("Updated server flavorId should be " +
                               newFlavorId + " but it's " + 
                               updatedServer.flavorId);
              }
              else {
                result.success();
              }
            }
          }); // end confirmResize call
        }); // end notify
      }, // end resize success
      fault: function(fault) { result.failure(fault.message); }
    }); // end resize call
  },

  testRevertResize: function(result) {
    var entity = this.entities[8];
    var newFlavorId = (entity.flavorId == 2 ? 3 : 2);
    var that = this;
    this.service.servers.resize({
      entity: entity,
      flavorId: newFlavorId,
      success: function(server) { 
        if (server.status != "UNKNOWN") {
          result.failure(
            "Server status " + server.status + " instead of UNKNOWN");
          return;
        }
        result.log("Waiting for VERIFY_RESIZE state...");
        result.setTimeout(300000);
        that.service.servers.notify(server, function(event) {
          if (event.error) {
            result.failure("Error talking to server");
            return;
          }
          if (event.targetEntity.status != "VERIFY_RESIZE") {
            return; // keep waiting
          }
          that.service.servers.revertResize({
            entity: event.targetEntity,
            fault: function(fault) { result.failure(fault.message); },
            success: function(updatedServer) {
              if (! updatedServer.status in { "UNKNOWN":1, "ACTIVE": 1}) {
                result.failure("Wrong status: " + updatedServer.status +
                               " instead of UNKNOWN/ACTIVE");
              }
              else if (updatedServer.flavorId != entity.flavorId) {
                result.failure("Updated server flavorId should be " +
                               entity.flavorId + " but it's " + 
                               updatedServer.flavorId);
              }
              else {
                result.success();
              }
            }
          }); // end confirmResize call
        }); // end notify
      }, // end resize success
      fault: function(fault) { result.failure(fault.message); }
    }); // end resize call
  },

  testRemove: function(result) {
    this.service.servers.remove({
      entity: this.entities[9],
      success: function() { result.success(); },
      fault: function(fault) { result.failure(fault.message); }
    });
  },

  destroy: function(result) {
    this._deleteTestServers(result, function() {
      result.success();
    });
  }
} // end ServerTests
