// Requires jQuery.

// An object allowing asynchronous tests to confirm success or failure and to
// log messages.
// Constructor takes an object containing:
//   done:function(successful:bool, failureMessage:string) called when
//       success() or failure() are called upon the object.
//   timeoutMs?:integer number of milliseconds before failure() should be
//       automatically called, if success() or failure() are not called by then.
function DeferredResult(opts) {
  this.log = opts.log || function() { /* Logs ignored */ };
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
    this.log = function() {};
    window.clearTimeout(this._timer);
  }
};

function TestRunner(opts) {
  this._logDiv = opts.logDiv.html("");

  this._resultsTable = $("<table>").
    append("<tr><th>Test</th><th>Result</th></table>").
    css("width", "100%");
  opts.resultsDiv.html(this._resultsTable);
}
TestRunner.prototype = {
  __proto__: null,

  log: function(msg) {
    this._logDiv.append(msg + "<br/>");
  },

  // Run suite.init(), then all suite.test* methods, then suite.destroy().
  // Assumes that all test* methods can be run in parallel.
  runTests: function(suite) {
    var that = this;
    suite.init = suite.init || function(result) { result.success(); };
    suite.destroy = suite.destroy || function(result) { result.success(); };

    // Run init on its own so we can abort if it fails.
    this._runOneTest(suite, "init", function(successful) {
      if (!successful) return;

      var testNames = [];
      for (var attr in suite) {
        if (attr.indexOf("test") == 0) testNames.push(attr);
      }
      
      var results = [];
      for (var i = 0; i < testNames.length; i++) {
        that._runOneTest(suite, testNames[i], function(successful) {
          results.push(successful);
        });
      }

      // Running all tests in parallel; check each second until
      // all tests have completed.
      var waiter = window.setInterval(function() {
        if (results.length != testNames.length)
          return;
        window.clearInterval(waiter);
        // All succeeded?  Color the tests green.
        if (results.filter(function(worked) { return !worked; }).length == 0)
          that._resultsTable.css("background", "#88ff00");
        // Clean up.  We don't care if it fails.
        that._runOneTest(suite, "destroy", function() {});
      }, 1000);
    });
  },

  // Run the test with the given name, update the UI with the test results, and
  // call callback(successful:bool) upon completion.
  _runOneTest: function(suite, testName, callback) {
    var resultLine = $("<tr>").append($("<td>")).append($("<td>"));
    resultLine.find("td").css("margin", 10);
    this._resultsTable.append(resultLine);
    var that = this;
    var result = new DeferredResult({
      timeoutMs: 60000,
      log: function(msg) { 
        that._logDiv.append(msg + "<br/>");
      },
      done: function(successful, failureMessage) {
        var msg = successful ? "OK" : "FAILURE: " + failureMessage;
        resultLine.find("td:last-child").text(msg);
        if (!successful) {
          that._resultsTable.css("background", "red");
        }
        callback(successful);
      }
    });

    var printedName = testName;
    if (printedName.indexOf("test") == 0)
      printedName = printedName.slice(4);
    resultLine.find("td:first-child").text(printedName);
    window.setTimeout(function() {
      try {
        suite[testName](result);
      }
      catch (e) {
        result.failure("Exception thrown: '" + e.message + "'");
      }
    }, 0);
  }

}

var ExampleTests = {
  init: function(result) {
    result.log("I'm initializing now!");
    result.success();
  },

  testSuccessSimple: function(result) {
    result.success();
  },

  testFailureSimple: function(result) {
    result.failure("Failure!");
  },

  testFailureException: function(result) {
    throw new Error("I intentionally threw this.");
  },

  testSuccessDeferred: function(result) {
    window.setTimeout(function() { result.success(); }, 1000);
  },

  testFailureDeferred: function(result) {
    window.setTimeout(function() { result.failure("I failed after 500ms."); }, 500);
  },

  testFailureNoAction: function(result) {
  },

  testFailureTimeout: function(result) {
    // do nothing; we should time out.
    result.setTimeout(1000);
  },

  testSuccessSimpleBeforeTimeout: function(result) {
    // The timeout shouldn't be reached because we return non-deferred.
    result.setTimeout(1000);
    result.success();
  },

  testSuccessDeferredBeforeTimeout: function(result) {
    // finish before the timeout.
    result.setTimeout(1000);
    window.setTimeout(function() { result.success(); }, 800);
  },

  testFailureTimeoutBeforeDeferredSuccess: function(result) {
    // Attempt to finish after the timeout.
    result.setTimeout(1000);
    window.setTimeout(function() { result.success(); }, 2000);
  },

  destroy: function(result) {
    result.log("I'm destroying myself now!");
    result.success();
  }
}
