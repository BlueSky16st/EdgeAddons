(function initializeDanmakuFilter(globalScope) {
  'use strict';

  const ICON_SELECTOR = '.bili-high-icon, .bili-danmaku-x-high-icon';
  const HIDDEN_CLASS = 'btf-hidden-danmaku';
  const THUMB_DATA_KEY = 'btfThumbDanmaku';
  const SIGNATURE_DATA_KEY = 'btfDanmakuSignature';
  const DEFAULT_SETTINGS = Object.freeze({
    onlyThumbDanmaku: false,
    hideThumbIcon: true,
  });

  function normalizeSettings(settings) {
    const source = settings || {};

    return {
      onlyThumbDanmaku: source.onlyThumbDanmaku === true,
      hideThumbIcon: source.hideThumbIcon !== false,
    };
  }

  async function loadSettings(storageArea) {
    const stored = await storageArea.get([
      'onlyThumbDanmaku',
      'hideThumbIcon',
      'showThumbIcon',
    ]);
    const needsMigration = typeof stored.hideThumbIcon !== 'boolean';
    const migratedSettings = normalizeSettings({
      onlyThumbDanmaku: stored.onlyThumbDanmaku,
      hideThumbIcon: needsMigration && typeof stored.showThumbIcon === 'boolean'
        ? !stored.showThumbIcon
        : stored.hideThumbIcon,
    });

    if (needsMigration) {
      await storageArea.set({ hideThumbIcon: migratedSettings.hideThumbIcon });
    }

    if (typeof stored.showThumbIcon === 'boolean') {
      await storageArea.remove('showThumbIcon');
    }

    return migratedSettings;
  }

  function getContentSignature(comment) {
    const textWalker = document.createTreeWalker(comment, NodeFilter.SHOW_TEXT);
    const textParts = [];
    let textNode = textWalker.nextNode();

    while (textNode) {
      const parentElement = textNode.parentElement;
      const text = textNode.nodeValue.trim();

      if (text && parentElement && !parentElement.closest(ICON_SELECTOR)) {
        textParts.push(text);
      }

      textNode = textWalker.nextNode();
    }

    return textParts.join('\u001f');
  }

  function resetClassification(comment) {
    delete comment.dataset[THUMB_DATA_KEY];
    delete comment.dataset[SIGNATURE_DATA_KEY];
  }

  function processComment(comment, settings, options) {
    const normalizedSettings = normalizeSettings(settings);
    const shouldResetClassification = options && options.resetClassification === true;
    const icons = Array.from(comment.querySelectorAll(ICON_SELECTOR));
    const contentSignature = getContentSignature(comment);
    const previousSignature = comment.dataset[SIGNATURE_DATA_KEY];
    const contentChanged = previousSignature !== undefined
      && previousSignature !== contentSignature;
    const wasThumbDanmaku = comment.dataset[THUMB_DATA_KEY] === 'true';
    const isThumbDanmaku = icons.length > 0
      || (!shouldResetClassification && !contentChanged && wasThumbDanmaku);

    comment.dataset[THUMB_DATA_KEY] = String(isThumbDanmaku);
    comment.dataset[SIGNATURE_DATA_KEY] = contentSignature;
    comment.classList.toggle(
      HIDDEN_CLASS,
      normalizedSettings.onlyThumbDanmaku && !isThumbDanmaku,
    );

    if (normalizedSettings.hideThumbIcon) {
      icons.forEach((icon) => icon.remove());
    }

    return isThumbDanmaku;
  }

  const api = {
    DEFAULT_SETTINGS,
    HIDDEN_CLASS,
    ICON_SELECTOR,
    SIGNATURE_DATA_KEY,
    THUMB_DATA_KEY,
    getContentSignature,
    loadSettings,
    normalizeSettings,
    processComment,
    resetClassification,
  };

  globalScope.BilibiliThumbFilter = api;
}(typeof globalThis !== 'undefined' ? globalThis : this));
