$(document).ready(function() {
  // Place JavaScript code here...
  if (typeof onLoad !== "undefined") {
    for (const f of onLoad) {
      f();
    }
  }
});