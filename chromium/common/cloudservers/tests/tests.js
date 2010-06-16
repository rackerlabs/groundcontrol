function ServerTests(username, apiKey) {
  this.username = username;
  this.apiKey = apiKey;
}
ServerTests.prototype = {
  init: function(result) {
    this._createdServers = [];

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
    result.log("Fetching entities for tests");
    result.setTimeout(60000);
    // Make some entities for tests to use
    var that = this;
    that.service.servers.createList(true, 0, 10).forEachAsync({
      each: function() { },
      complete: function(entities) {
        that.entities = entities;
        result.success();
      },
      fault: function(fault) { result.failure(fault.message); }
    });
  },

  testInitialCreate: function(result) {
    var that = this;
    this.service.servers.create({
      entity: { name: "Temporary Server 1", imageId: 10, flavorId: 2 },
      success: function(entity) { 
        that._createdServers.push(entity);
        result.success();
      },
      fault: function(fault) { result.failure(fault.message); }
    });
  },

  testFullCreate: function(result) {
    var that = this;
    this.service.servers.create({
      entity: { name: "Temporary Server 2", imageId: 10, flavorId: 2 },
      success: function(entity) { 
        result.setTimeout(180000);
        that.service.servers.wait({
          entity: entity,
          success: function(updatedEntity) {
            if (updatedEntity.status != "ACTIVE") {
              that._createdServers.push(entity); // for destroy() to clean up
              that._serverToDelete = -1; // to wake testRemove
              result.failure("Server status " + updatedEntity.status +
                             " instead of ACTIVE");
            }
            else {
              that._serverToDelete = entity; // for testRemove to use
              result.success();
            }
          },
          fault: function(fault) { 
            that._createdServers.push(entity); // for destroy() to clean up
            that._serverToDelete = -1; // to wake testRemove
            result.failure(fault.message); 
          }
        });
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
              if (updatedServer.status != "ACTIVE") {
                result.failure("Wrong status: " + updatedServer.status +
                               " instead of ACTIVE");
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
              if (updatedServer.status != "ACTIVE") {
                result.failure("Wrong status: " + updatedServer.status +
                               " instead of ACTIVE");
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
    result.setTimeout(180000);
    result.log("testRemove waiting until a creation is finished...");
    var that = this;
    var waiter = window.setInterval(function() {
      if (that._serverToDelete == undefined)
        return;
      window.clearInterval(waiter);
      if (that._serverToDelete == -1) {
        result.failure("testFullCreate failed, so I can't run.");
        return;
      }
      result.log("testRemove has an entity to delete; proceeding.");
      result.setTimeout(30000);
      that.service.servers.remove({
        entity: that._serverToDelete,
        success: function() { result.success(); },
        fault: function(fault) { result.failure(fault.message); }
      });
    }, 5000);
  },

  destroy: function(result) {
    result.log("Deleting servers created during tests");
    var that = this;
    var numLeft = this._createdServers.length;
    for (var i = 0; i < this._createdServers.length; i++) {
      that.service.servers.remove({
        entity: that._createdServers[i],
        success: function() {
          numLeft -= 1;
          if (numLeft != 0) return;
          result.log("Reverting testResize's work");
          that.service.servers.revertResize({
            entity: that.entities[5],
            fault: function(fault) { result.failure(fault.message); },
            success: function() { result.success(); }
          });
        },
        failure: function(fault) { result.failure(fault.message); }
      });
    }
  }
} // end ServerTests
