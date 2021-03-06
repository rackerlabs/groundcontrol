/*
* Copyright 2010 Rackspace US, Inc.
*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

// TODO: only need to do this once after we roll all our files together.
if (typeof(org) == "undefined")
  org = { openstack: { compute: { api: { client: {} } } } }
__compute_client = org.openstack.compute.api.client;

/**
 * Creates a new ServerManager instance.  Users should use
 * ComputeService.createServerManager() rather than calling this
 * constructor directly.
 *
 * service:ComputeService instance to work with.
 */
__compute_client.ServerManager = function(service) {
  __compute_client.EntityManager.call(this, service, "/servers");
}
__compute_client.ServerManager.prototype = {
  __proto__: __compute_client.EntityManager.prototype,

  /**
   * Return the data to send in an update request for the given Server entity.
   */
  _dataForUpdate: function(entity) {
    return { server: { name: entity.name, adminPass: entity.adminPass } };
  },

  /**
   * Return the data to send in create request for the given Server entity.
   */
  _dataForCreate: function(entity) {
    return { server: entity };
  },

  /**
   * Return false if the given entity is in the middle of completing an
   * operation on the server (based on its local attributes).
   */
  _doneWaiting: function(oldEntity, newEntity) {
    return (newEntity.status in {
      ACTIVE:1, SUSPENDED:1, VERIFY_RESIZE:1, DELETED:1, ERROR:1, UNKNOWN:1
    });
  },

  /**
   * Perform an action on the given entity.
   *
   * opts:object contains:
   *   entity:Entity The entity to receive the action.
   *   type?:string The type of the request.  Defaults to "POST".
   *   path?:string The request path to use.  Defaults to entityId + "/action"
   *   data?:object The data to be sent with the request.  Defaults to none.
   *   success?:function(entity) called after the action has been requested;
   *       the entity may not have yet returned to a stable state.
   *     entity:Entity the entity after the action has been requested.
   *   fault?:function(fault) called if there is a problem with the request.
   *     fault:ComputeFault details about the problem.
   */
  _action: function(opts) {
    opts.fault = opts.fault || function() { };
    opts.type = opts.type || "POST";
    opts.path = opts.path || (opts.entity.id + "/action");

    var that = this;
    that._request({
      type: opts.type,
      path: opts.path,
      data: opts.data,
      success: function() {
        if (opts.success) {
          that.refresh({
            entity: opts.entity,
            success: function(updatedEntity) {
              opts.success(updatedEntity);
            },
            fault: opts.fault
          });
        }
      },
      fault: opts.fault
    });
  },

  /**
   * Reboot the server.
   *
   * opts:object contains:
   *   entity:Entity The server to reboot.
   *   hard?: true if a hard reboot.  Defaults to false (soft reboot).
   *   success?:function(server) called after reboot has been requested.
   *     server:Entity the rebooted (or rebooting) server.
   *   fault?:function(fault) called if there is a problem with the request.
   *     fault:ComputeFault details about the problem.
   */
  reboot: function(opts) {
    opts.data = { reboot: { type: (opts.hard ? "HARD" : "SOFT") } };
    this._action(opts);
  },

  /**
   * Remove all data on the server and replace it with the given image.  Its
   * id and IP addresses will remain the same.
   *
   * opts:object contains:
   *   entity:Entity The server to rebuild.
   *   imageId:integer The id of the new image to use on the server.
   *   success?:function(server) called once the rebuild has begun.
   *     server:Entity the server in the process of rebuilding.
   *   fault?:function(fault) called if there is a problem with the request.
   *     fault:ComputeFault details about the problem.
   */
  rebuild: function(opts) {
    opts.data = { rebuild: { imageId: opts.imageId } };
    this._action(opts);
  },

  /**
   * Change the flavor of the given server.
   *
   * opts:object contains:
   *   entity:Entity The server to resize.
   *   flavorId:integer The id of the new flavor to use on the server.
   *   success?:function(server) called once resize has begun.  You still
   *       at that point have the opportunity to call confirmResize() or
   *       revertResize() for 24 hours.
   *     server:Entity the server in the process of resizing.
   *   fault?:function(fault) called if there is a problem with the request.
   *     fault:ComputeFault details about the problem.
   */
  resize: function(opts) {
    opts.data = { resize: { flavorId: opts.flavorId } };
    this._action(opts);
  },

  /**
   * Confirm an earlier resize of the given server, at which point you will no
   * longer be able to call revertResize() on that server.
   *
   * opts:object contains:
   *   entity:Entity The server for whom to confirm the resize.
   *   success?:function(server) called after confirmation has been sent.
   *     server:Entity the server.
   *   fault?:function(fault) called if there is a problem with the request.
   *     fault:ComputeFault details about the problem.
   */
  confirmResize: function(opts) {
    opts.data = { confirmResize: null };
    this._action(opts);
  },

  /**
   * Revert an earlier resize of the given server, rolling back to the
   * original size.
   *
   * opts:object contains:
   *   entity:Entity The server for whom to revert the resize.
   *   success?:function(server) called after the revert has been requested.
   *       wait() on server if you want to wait until the revert is complete.
   *     server:Entity the reverted server.
   *   fault?:function(fault) called if there is a problem with the request.
   *     fault:ComputeFault details about the problem.
   */
  revertResize: function(opts) {
    opts.data = { revertResize: null };
    this._action(opts);
  },

  /**
   * Share an IP from an existing server in the specified
   * shared IP group to another specified server in the same group. By default,
   * the operation modifies cloud network restrictions to allow IP traffic for
   * the given IP to/from the server specified, but does not bind the IP to the
   * server itself. A heartbeat facility (e.g. keepalived) can then be used
   * within the servers to perform health checks and manage IP failover. If the
   * configureServer attribute is set to true, the server is configured with
   * the new address, though the address is not enabled. Note that configuring
   * the server does require a reboot.
   *
   * TODO not clear if the 'entity' is the sender or receiver of the IP.
   *
   * opts:object contains:
   *   entity:Entity The server in question.
   *   ip:string The IP address to share.
   *   sharedIpGroupId:integer the IP group from which to share the IP.
   *   configureServer?:boolean if true, reboot the server and configure it
   *       with the new address.  Defaults to false.
   *   success?:function(server) called after the share has been requested.
   *       wait() on the server if you want to wait until the share completes.
   *     server:Entity the updated server.
   *   fault?:function(fault) called if there is a problem with the request.
   *     fault:ComputeFault details about the problem.
   */
  shareIp: function(opts) {
    opts.data = {
      shareIp: {
        sharedIpGroupId: opts.sharedIpGroupId,
        configureServer: opts.configureServer || false
      }
    };
    opts.type = "PUT";
    opts.path = opts.entity.id + "/ips/public/" + opts.ip;

    this._action(opts);
  },

  /**
   * Remove the given shared IP address from the given server.
   *
   * opts:object contains:
   *   entity:Entity The server from which to remove the address.
   *   ip:string The IP address to unshare.
   *   success?:function(server) called after the unshare is complete.
   *     server:Entity the updated server.
   *   fault?:function(fault) called if there is a problem with the request.
   *     fault:ComputeFault details about the problem.
   */
  unshareIp: function(opts) {
    opts.type = "DELETE";
    opts.path = opts.entity.id + "/ips/public/" + opts.ip;

    this._action(opts);
  },


  /**
   * Set the backup schedule for the given server.
   *
   * opts:object contains:
   *   entity:Entity The server for whom to set the backup schedule.
   *   weekly?:integer The day of the week to perform weekly backups, from 0
   *       (Sunday) to 6 (Saturday).  Defaults to not performing weekly backups.
   *   daily?:integer The rough hour of day GMT when to perform daily backups,
   *       from 0 to 22.  This value will be rounded down to the previous even 
   *       hour, and the backup should be performed somewhere between that time
   *       and two hours hence.  For example, 14 and 15 both mean that backups
   *       should occur some time between 2pm and 4pm GMT.  Defaults to not
   *       performing daily backups.
   *   enabled?:boolean Defaults to true.  If it is false, or if weekly and
   *       daily are both unspecified, backups will not be performed.
   *   success?:function(server) called after the schedule has been set.
   *     server:Entity the updated server.
   *   fault?:function(fault) called if there is a problem with the request.
   *     fault:ComputeFault details about the problem.
   */
  setSchedule: function(opts) {
    var BS = __compute_client.BackupSchedule;
    opts.data = {
      backupSchedule: {
        enabled: (opts.enabled != undefined ? opts.enabled : true),
        weekly: BS.dayIntegerToString(opts.weekly),
        daily: BS.hourIntegerToString(opts.daily)
      }
    };
    opts.type = "POST";
    opts.path = opts.entity.id + "/backup_schedule";

    this._action(opts);
  },


  /**
   * Get the backup schedule for the given server.
   *
   * opts:object contains:
   *   entity:Entity The server for whom to get the backup schedule.
   *   success:function(schedule) called after the schedule has been retrieved.
   *       schedule:object contains:
   *     weekly?:integer The day of the week to perform weekly backups, from 0
   *         (Sunday) to 6 (Saturday).  If undefined, weekly backups are
   *         not performed.
   *     daily?:integer The rough hour of day GMT when to perform daily backups,
   *         from 0 to 22.  Backups should be performed somewhere between that
   *         time and two hours hence.  For example, 14 means that backups should
   *         occur some time between 2pm and 4pm GMT.  If undefined, daily
   *         backups are not performed.
   *     enabled:boolean If false, backups will not be performed.
   *   fault?:function(fault) called if there is a problem with the request.
   *     fault:ComputeFault details about the problem.
   */
  getSchedule: function(opts) {
    this._request({
      path: opts.entity.id + "/backup_schedule",
      fault: opts.fault,
      success: function(json) {
        var BS = __compute_client.BackupSchedule;
        var result = {
          enabled: json.backupSchedule.enabled,
          weekly: BS.dayStringToInteger(json.backupSchedule.weekly),
          daily: BS.hourStringToInteger(json.backupSchedule.daily)
        }
        opts.success(result);
      }
    });
  }
}
