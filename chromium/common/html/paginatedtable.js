function PaginatedTable(opts) {
  var that = this;

  that._manager = opts.manager;
  that._table = opts.table;
  that._createRow = opts.createRow;
  that._currentPage = 0;

  if (opts.rowClick) {
    that._table.find("tr.dataRow").live("click", function() {
      var theRow = $(this);
      opts.rowClick(theRow.data("entity"));
    });
  }

  var numCols = that._table.find("thead tr td").length;
  that._more = $('<tr><td></td></tr>');
  that._more.find("td").
    attr("colspan", numCols).
    append('<a href="#">More...</a>').
    append('<span class="loading">Loading...</span>');
  that._more.
    find(".loading").hide().end().
    find("a").click(function() { that.loadPage(); }).end();

  that._table.find("tbody").append(this._more);
}

PaginatedTable.prototype = {

  // Append a page of entities to the list.
  loadPage: function() {
    this._more.
      find("a").hide().end().
      find(".loading").show();

    var PAGE_SIZE = 10;
    var offset = this._currentPage * PAGE_SIZE;

    var that = this;
    that._manager.createList(true, offset, PAGE_SIZE).forEachAsync({
      each: function(entity) {
        that.addRowFor(entity);
      },
      complete: function(count) {
        that._currentPage += 1;

        if (count == PAGE_SIZE) { // didn't reach end of list
          that._more.
            find(".loading").hide().end().
            find("a").show();
        }
        else {
          that._more.hide();
        }
      }
    });
  },

  _makeDataRow: function(entity) {
    var result = this._createRow(entity);
    result.addClass("dataRow").data("entity", entity);
    return result;
  },

  addRowFor: function(entity) {
    var newRow = this._makeDataRow(entity);
    this._more.before(newRow);
    newRow.effect("highlight", {}, 3000);
  },

  // Return a jQuery ojbect containing the row(s) for the given entity
  rowFor: function(entity) {
    return this._table.
      find("tr.dataRow").
      filter(function() {
        return $(this).data("entity") == entity;
      });
  },

  // Replace the row for oldEntity with one for newEntity.
  replaceRowFor: function(oldEntity, newEntity) {
    var oldRow = this.rowFor(oldEntity);
    var newRow = this._makeDataRow(newEntity);
    newRow.
      hide().
      replaceAll(oldRow).
      fadeIn('fast').
      effect("highlight", {}, 3000);
  }

}
