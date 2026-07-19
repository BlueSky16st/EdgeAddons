(function initializeThumbDanmakuController() {
  'use strict';

  const CONTAINER_SELECTOR = '.bpx-player-row-dm-wrap';
  const COMMENT_SELECTOR = "div[role='comment']";
  const filter = globalThis.BilibiliThumbFilter;

  if (!filter) {
    return;
  }

  let settings = filter.DEFAULT_SETTINGS;
  let activeContainer = null;
  let containerObserver = null;
  let bindScheduled = false;

  function processExistingComments() {
    if (!activeContainer) {
      return;
    }

    activeContainer.querySelectorAll(COMMENT_SELECTOR).forEach((comment) => {
      filter.processComment(comment, settings);
    });
  }

  function resetAddedComments(records) {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return;
        }

        if (node.matches(COMMENT_SELECTOR)) {
          filter.resetClassification(node);
        }

        node.querySelectorAll(COMMENT_SELECTOR).forEach((comment) => {
          filter.resetClassification(comment);
        });
      });
    });
  }

  function observeContainer(container) {
    containerObserver = new MutationObserver((records) => {
      resetAddedComments(records);
      processExistingComments();
    });

    containerObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  function bindAvailableContainer() {
    bindScheduled = false;

    if (activeContainer && activeContainer.isConnected) {
      return;
    }

    const nextContainer = document.querySelector(CONTAINER_SELECTOR);
    if (!nextContainer) {
      return;
    }

    if (containerObserver) {
      containerObserver.disconnect();
    }

    activeContainer = nextContainer;
    processExistingComments();
    observeContainer(activeContainer);
  }

  function scheduleContainerBinding() {
    if (bindScheduled) {
      return;
    }

    bindScheduled = true;
    queueMicrotask(bindAvailableContainer);
  }

  function applyStorageChanges(changes, areaName) {
    if (areaName !== 'sync') {
      return;
    }

    const nextSettings = { ...settings };
    let settingsChanged = false;

    ['onlyThumbDanmaku', 'hideThumbIcon'].forEach((key) => {
      if (changes[key]) {
        nextSettings[key] = changes[key].newValue;
        settingsChanged = true;
      }
    });

    if (!settingsChanged) {
      return;
    }

    settings = filter.normalizeSettings(nextSettings);
    processExistingComments();
  }

  async function start() {
    try {
      settings = await filter.loadSettings(chrome.storage.sync);
    } catch (error) {
      settings = filter.DEFAULT_SETTINGS;
      console.warn('B站大拇指弹幕筛选器：读取设置失败，已使用默认设置。', error);
    }

    chrome.storage.onChanged.addListener(applyStorageChanges);

    const documentObserver = new MutationObserver(scheduleContainerBinding);
    documentObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    bindAvailableContainer();
  }

  start();
}());
