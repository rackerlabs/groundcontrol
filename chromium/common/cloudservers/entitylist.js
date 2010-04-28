// TODO: only need to do this once after we roll all our files together.
if (typeof(com) == "undefined")
  com = { rackspace: { cloud: { servers: { api: { client: {} } } } } }
__csapi_client = com.rackspace.cloud.servers.api.client;

/**
 * A list of entities that can be iterated.
 *
 * entityManager:EntityManager the manager of entities of the type contained
 *     in this list.
 * opts:object contains:
 *   detailed:bool true if the entities should contain all information; false
 *       if they should only contain name and id.
 *   changes_since?: the time after which an entity must have been modified
 *       in order to appear in the list.  You should only pass in
 *       Last-Modified header values as reported by the server.  Defaults to
 *       the beginning of time.
 *   offset?:integer the offset into the entities at which to start the list.
 *       Defaults to zero.
 *   limit?:integer the maximum number of items to return.  Defaults to 
 *       no limit.
 */
__csapi_client.EntityList = function(entityManager, opts) {
  this._entityManager = entityManager;
  opts.offset = opts.offset || 0;
  this._options = opts;

  this.reset(); // See reset() for definitions of member variables.
}
__csapi_client.EntityList.prototype = {
  __proto__: undefined,

  /**
   * Starts iteration over at the offset specified in the constructor, so that
   * a subsequent next() call will return the first entity in the list.
   */
  reset: function() {
    // The most recently fetched page as an array of entities.
    this._currentPage = undefined;
    // The index into currentPage of the next uniterated entity.
    this._nextPageIndex = 0;
    // Our global index in the list
    this._trueIndex = this._options.offset;
    // The "Last-Modified" header reported by the server.
    this._lastModified = undefined;
  },

  /**
   * Returns true if the list contains no items.
   *
   * Throws a CloudServersFault if there was a problem communicating with the
   * server.
   */
  isEmpty: function() {
    var haveIterated =  (this._trueIndex > this._options.offset);
    if (haveIterated)
      return false;
    else
      return (this.hasNext() == false);
  },

  /**
   * Return the latest last-modification of any entity in this list.
   *
   * Throws a CloudServersFault if there was a problem communicating
   * with the server.
   */
  getLastModified: function() {
    if (this._lastModified == undefined) {
      this.hasNext(); // fetches a page and sets _lastModified
    }
    return this._lastModified;
  },

  /**
   * Asynchronously call each() for each item in the list, then call success().
   *
   * If next() has been called one or more times on the list and reset() has
   * not been called since that time, forEachAsync will begin with the
   * following entity.
   *
   * Call fault() and abort the iteration if there is a problem communicating
   * with the server.
   *
   * opts:object contains:
   *   each:function(entity) called for each entity in the list.
   *     entity:Entity the entity from the list.
   *
   *   complete?:function() called once all entities have had each() called
   *       upon them, if there was no fault.  This is called even if there
   *       no entities in the list.
   *
   *   fault?:function(fault)
   *     fault:CloudServersFault the fault that occurred
   */
  forEachAsync: function(opts) {
    var that = this;
    var visitOneItem = function() {
      that._nextAsync({
        success: function(entity) {
          opts.each(entity);
          visitOneItem(); // keep visiting as long as it keeps working
        },
        complete: opts.complete,
        fault: opts.fault
      });
    };
    visitOneItem(); // start the process
  },

  /**
   * Call success callback with the next item in the iteration, or call fault
   * callback if there was a problem communicating with the server.  
   *
   * opts:object contains:
   *   success:function(entity) passed the entity upon success.  If there are
   *       no more entities in the list, entity will be null.
   *   fault?:function(fault) passed a CloudServersFault object upon error
   */
  _nextAsync: function(opts) {
    // Within a page?  Iterate.
    if (this._currentPage && this._nextPageIndex < this._currentPage.length) {
      opts.success(this.next());
    }
    // Is our page empty?  We're at the end of the list: return null.
    else if (this._currentPage && this._currentPage.length == 0) {
      opts.success(null);
    }
    // No page yet or beyond a (non-empty) page?  Fetch a page and recurse.
    else {
      var that = this;
      that._storeNextPage({ 
        async: true,
        success: function() {
          // OK, now the page exists, so we'll hit a different 'if' block.
          that._nextAsync(opts);
        },
        fault: opts.fault
      });
    }
  },

  /**
   * Sets this._currentPage to the next page of entities from the server and
   * this._lastModified to the date returned, then calls success callback.  Or
   * does nothing and calls fault callback upon fault.
   *
   * When beyond the final page, will set this._currentPage to an empty array.
   *
   * opts:objects contains:
   *   async:bool true if the page should be fetched asynchronously.
   *   success?:function() called upon successful update
   *   fault?:function(fault) passed a CloudServersFault object upon error
   */
  _storeNextPage: function(opts) {
    opts.success = opts.sucess || function() {};
    // Fetch a page starting from this._trueIndex, our current offset.
    var requestPath = (this._options.detailed ? "detail" : "");
    var path_opts = [];
    // TODO: getTime() works based on 1969 epoch, not 1970 epoch.
    path_opts.push("offset=" + this._trueIndex);
    if (this._options.limit) {
      var numConsumed = this._trueIndex - this._options.offset;
      var numRemaining = this._options.limit - numConsumed;
      if (numRemaining <= 0) {
        // Save us the round trip to the server: we're done.
        this._currentPage = [];
        this._nextPageIndex = 0;
        opts.success();
        return;
      }
      // Note that this may be limit=0 if we've consumed our whole page;
      // the server will then return an empty array to us.
      path_opts.push("limit=" + numRemaining);
    }
    if (this._options.changes_since) {
      path_opts.push("changes-since=" + 
                     new Date(this._options.changes_since).getTime() / 1000);
    }
    requestPath += "?" + path_opts.join("&");

    var that = this;
    that._entityManager._request({
      async: opts.async,
      path: requestPath,
      success: function(json, status, xhr) {
        if (status == 304) { // not modified: no changes.
          that._currentPage = [];
        }
        else {
          for (var key in json) break; // grab the only key name
          that._currentPage = json[key];
        }
        that._nextPageIndex = 0;
        that._lastModified = xhr.getResponseHeader("Last-Modified");
        opts.success();
      },
      fault: opts.fault
    });
  },

  /**
   * Synchronously checks with the server, then returns true if a call to
   * next() will not fail.  Use forEachAsync() instead of hasNext() and
   * next() for an asynchronous approach.
   * 
   * Throws a CloudServersFault if it has trouble communicating with the
   * server.
   */
  hasNext: function() {
    // Within a page?  We're fine.
    if (this._currentPage && this._nextPageIndex < this._currentPage.length) {
      return true;
    }
    // Is our page empty?  We're at the end of the list.
    else if (this._currentPage && this._currentPage.length == 0) {
      return false;
    }
    // No page yet or beyond a (non-empty) page?  Fetch a page and recurse.
    var out_fault = undefined;
    self._storeNextPage({
      async: false,
      fault: function(fault) {
        out_fault = fault;
      }
    });
    if (out_fault)
      throw out_fault;
    else
      return hasNext();
  },

  /**
   * Returns the next entity in the iteration.  Behavior is undefined if you
   * have not called hasNext() at least once since the previous call to next().
   */
  next: function() {
    this._nextPageIndex++;
    this._trueIndex++;
    return this._currentPage[this._nextPageIndex - 1];
  },

  /**
   * Modify the current list to contain all entities that have been modified
   * since the list was created (or since the last call to delta()).
   */
  delta: function() {
    this._options.changes_since = this.getLastModified();
    this.reset();
  }
}
