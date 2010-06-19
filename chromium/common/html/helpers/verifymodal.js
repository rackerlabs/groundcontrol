function verifyModal(opts) {
  opts.text = opts.text || "Really?";
  opts.title = opts.title || "Confirm";
  var yes = opts.yes || function() {};
  var no = opts.no || function() {};
  var answer = function(callback) {
    return function() {
      $(this).dialog("close");
      callback();
    }
  }
  $("<div>").text(opts.text).dialog({
    title: opts.title,
    buttons: { "Yes": answer(yes), "No": answer(no) },
  });
}

