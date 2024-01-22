function init() {
  var container = document.querySelector('.bpx-player-row-dm-wrap');

  var observer = new MutationObserver(function (records, itself) {
    var icons = container.querySelectorAll("div[role='comment'] .bili-high-icon");
    icons.forEach(function (icon) {
      icon.remove();
    });
  });

  observer.observe(container, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });
}

init();
