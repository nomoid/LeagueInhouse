declare function onLoad(): void;

$(document).ready(function() {
  // Place JavaScript code here...
  if (onLoad) {
    onLoad();
  }
});