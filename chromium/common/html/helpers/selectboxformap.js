// Return a <select> box with <option>s whose ids are the keys to the
// map and whose values are map[key][textAttribute].  The <option> whose
// id is selectedKey will be selected.
function selectBoxForMap(map, textAttribute, selectedKey) {
  var result = $("<select>");
  for (var key in map) {
    $("<option>").
      attr("id", key).
      text(map[key][textAttribute]).
      attr("selected", (selectedKey == key)).
      appendTo(result);
  }
  return result;
}
