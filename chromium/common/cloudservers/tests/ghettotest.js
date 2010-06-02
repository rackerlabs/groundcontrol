// Requires jQuery.

var ghettotest = {
  setResultsDiv: function(div) {
    TestSuite.prototype._resultsTable = $("<table>").
      append("<tr><th>Test</th><th>Result</th></table>").
      css("width", "100%");
    div.html(TestSuite.prototype._resultsTable);
  },

  setLogDiv: function(div) {
    div.html("");
    TestSuite.prototype._logDiv = div;
  },

  run: function(filename) {
    // TODO
    new ExampleTests().runTests();
  }
}

// An object allowing asynchronous tests to confirm success or failure.
// Constructor takes an object containing:
//   done:function(successful:bool, failureMessage:string) called when
//       success() or failure() are called upon the object.
//   timeoutMs?:integer number of milliseconds before failure() should be
//       automatically called, if success() or failure() are not called by then.
function DeferredResult(opts) {
  this.done = opts.done || function() {};
  if (opts.timeoutMs) {
    this.setTimeout(opts.timeoutMs);
  }
}
DeferredResult.prototype = {
  // Automatically call failure() after ms milliseconds if neither success()
  // nor failure() have been called.
  setTimeout: function(ms) {
    var that = this;
    window.clearTimeout(this._timer);
    this._timer = window.setTimeout(function() {
      that._destroy();
      that.done(false, "Timed out after " + ms + " milliseconds");
    }, ms);
  },

  success: function() {
    this._destroy();
    this.done(true);
  },
  failure: function(message) {
    this._destroy();
    this.done(false, message);
  },
  // Called after success() or failure() have been called.
  _destroy: function(message) {
    this.failure = function() {};
    this.success = function() {};
    window.clearTimeout(this._timer);
  }
};

function TestSuite() {
}
TestSuite.prototype = {
  __proto__: null,

  _logDiv: undefined,

  _resultsTable: undefined,

  log: function(msg) {
    this._logDiv.append(msg + "<br/>");
  },

  // Run the test with the given name, update the UI with the test results, and
  // call callback(successful:bool) upon completion.
  _runOneTest: function(testName, callback) {
    var resultLine = $("<tr>").append($("<td>")).append($("<td>"));
    resultLine.find("td").css("margin", 10);
    this._resultsTable.append(resultLine);
    var that = this;
    var deferred = new DeferredResult({
      timeoutMs: 60000,
      done: function(successful, failureMessage) {
        var msg = successful ? "OK" : "FAILURE: " + failureMessage;
        resultLine.find("td:last-child").text(msg);
        if (!successful) {
          that.failedAtLeastOnce = true;
          that._resultsTable.css("background", "red");
        }
        callback(successful);
      }
    });

    var printedName = testName;
    if (printedName.indexOf("test") == 0)
      printedName = printedName.slice(4);
    resultLine.find("td:first-child").text(printedName);
    try {
      var result = this[testName](deferred);
      if (result != deferred) {
        (result === true) ? deferred.success() : deferred.failure(result);
      }
    }
    catch (e) {
      deferred.failure("Exception thrown: '" + e.message + "'");
    }
  },

  // Run this.init(), then all this.test* methods, then this.destroy().
  // Assumes that all test* methods can be run in parallel.
  runTests: function() {
    this.init = this.init || function() { return true; };
    this.destroy = this.destroy || function() { return true; };

    var that = this;
    this._runOneTest("init", function(successful) {
      if (!successful) return;

      var testNames = [];
      for (var attr in that) {
        if (attr.indexOf("test") == 0) testNames.push(attr);
      }
      that._runNextTest(testNames);
    });
  },

  // Pop a test name off the given list and execute it.  When it finishes,
  // recurse.
  _runNextTest: function(testNames) {
    if (!testNames || testNames.length == 0) {
      this._runOneTest("destroy", function() {
        if (!this.failedAtLeastOnce)
          this._resultsTable.css("background", "#88ff00");
      });
      return;
    }

    var testName = testNames.shift();

    var that = this;
    this._runOneTest(testName, function() {
      window.setTimeout(function() {
        that._runNextTest(testNames);
      }, 0);
    });
  }
}

function ExampleTests() {
}
ExampleTests.prototype = {
  __proto__: TestSuite.prototype,

  init: function(dfr) {
    this.log("I'm initializing now!");
    return true;
  },

  testSuccessSimple: function(dfr) {
    return true;
  },

  testFailureSimple: function(dfr) {
    return "Failure!";
  },

  testFailureException: function(dfr) {
    throw new Error("I intentionally threw this.");
  },

  testSuccessDeferred: function(dfr) {
    window.setTimeout(function() { dfr.success(); }, 1000);
    return dfr;
  },

  testFailureDeferred: function(dfr) {
    window.setTimeout(function() { dfr.failure("I failed after 500ms."); }, 500);
    return dfr;
  },

  testSuccessSimpleWithIncorrectDeferUsage: function(dfr) {
    window.setTimeout(function() { dfr.failure("Hi"); }, 1);
    // forget to return dfr
    return true;
  },

  testFailureTimeout: function(dfr) {
    // do nothing; we should time out.
    dfr.setTimeout(1000);
    return dfr;
  },

  testSuccessSimpleDespiteDeferTimeout: function(dfr) {
    // The timeout shouldn't be reached because we return non-deferred.
    dfr.setTimeout(1000);
    return true;
  },

  testSuccessDeferredBeforeTimeout: function(dfr) {
    // finish before the timeout.
    dfr.setTimeout(1000);
    window.setTimeout(function() { dfr.success(); }, 800);
    return dfr;
  },

  testFailureTimeoutBeforeDeferredSuccess: function(dfr) {
    // Attempt to finish after the timeout.
    dfr.setTimeout(1000);
    window.setTimeout(function() { dfr.success(); }, 2000);
    return dfr;
  },

  destroy: function() {
    this.log("I'm destroying myself now!");
    return true;
  }
}

