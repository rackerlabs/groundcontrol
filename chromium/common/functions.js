function _get(key) {
  var result = localStorage.getItem(key);
  if (result != null)
    return JSON.parse(result);
  else
    return result;
}
function _set(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
function _delete(key) {
  localStorage.removeItem(key);
}
