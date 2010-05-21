// Requires jQuery


// Place a display+edit widget inside of the current jQuery element.
// opts:
//   originalValue: the value to display and edit
//   display: function(value) returns the HTML to display the given value
//   makeEditUi: function(value) returns an edit UI for the given value
//   getValue: function(editUi) returns the current value in the edit UI
//   save: function(value, success(), failure(explanatory_message))
//         Called when the user tries to save the given value.  Should either
//         call success() (in which case the new value will be displayed) or
//         failure() (in which case the given error message will display.)
jQuery.fn.showAndEdit = function(opts) {

  var theValue = opts.originalValue;
  var $ui = $("<span>");
  this.html($ui);

  function display() {
    var chg = $('<a href="#">').
      addClass("editlink").text("change").
      click(function() { edit(); });

    $ui.html(opts.display(theValue)).append(chg);
  }

  function edit() {
    var $editUi = $(opts.makeEditUi(theValue));
    // We don't attach this node just yet as we're trying hard to be an inline
    // span as long as we can... adding a div to our span seems to make us wrap
    // to the next line.
    var $errormessage = $("<div>").css("color", "red");

    var saveBtn = $('<input type="button">').val("Save").click(function() {
      $errormessage.remove();
      saveBtn.val("Saving...").attr("disabled", true);
      cancelBtn.attr("disabled", true);
      var newValue = opts.getValue($editUi);
      opts.save(
        newValue,
        function() {
          theValue = newValue;
          display();
        },
        function(message) {
          $errormessage.text(message).appendTo($ui);
          saveBtn.val("Save").attr("disabled", false);
          cancelBtn.attr("disabled", false);
        }
      );
    });
    var cancelBtn = $('<input type="button">').val("Cancel").click(display);

    $ui.html($editUi).append(saveBtn).append(cancelBtn);
  }

  display();

  return this;
}
