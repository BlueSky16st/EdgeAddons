(function initializePopup() {
  'use strict';

  const SUPPORTED_LANGUAGES = new Set(['auto', 'zh_CN', 'zh_TW', 'en']);
  const filter = globalThis.BilibiliThumbFilter;
  const hideThumbIconInput = document.querySelector('#hide-thumb-icon');
  const onlyThumbDanmakuInput = document.querySelector('#only-thumb-danmaku');
  const languageSelect = document.querySelector('#ui-language');
  const status = document.querySelector('#status');
  let currentMessages = {};
  let currentLanguagePreference = 'auto';

  function getAutomaticLanguage() {
    const uiLanguage = chrome.i18n.getUILanguage().replace('_', '-').toLowerCase();

    if (['zh-tw', 'zh-hk', 'zh-mo'].includes(uiLanguage)) {
      return 'zh_TW';
    }

    if (uiLanguage.startsWith('zh')) {
      return 'zh_CN';
    }

    return 'en';
  }

  function resolveLanguage(preference) {
    return preference === 'auto' ? getAutomaticLanguage() : preference;
  }

  async function loadMessages(language) {
    const messagesUrl = chrome.runtime.getURL(`_locales/${language}/messages.json`);
    const response = await fetch(messagesUrl);

    if (!response.ok) {
      throw new Error(`Unable to load locale: ${language}`);
    }

    const localizedEntries = await response.json();
    return Object.fromEntries(
      Object.entries(localizedEntries).map(([key, value]) => [key, value.message]),
    );
  }

  function applyMessages(messages, language) {
    currentMessages = messages;
    document.documentElement.lang = language.replace('_', '-');
    document.title = messages.popupTitle;

    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const message = messages[element.dataset.i18n];
      if (message) {
        element.textContent = message;
      }
    });

    document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
      const message = messages[element.dataset.i18nAriaLabel];
      if (message) {
        element.setAttribute('aria-label', message);
      }
    });
  }

  async function renderLanguage(preference) {
    const resolvedLanguage = resolveLanguage(preference);
    const messages = await loadMessages(resolvedLanguage);
    applyMessages(messages, resolvedLanguage);
  }

  function showStatus(messageKey) {
    status.textContent = currentMessages[messageKey] || '';
  }

  async function saveSetting(input, key) {
    const previousValue = !input.checked;
    status.textContent = '';

    try {
      await chrome.storage.sync.set({ [key]: input.checked });
    } catch (error) {
      input.checked = previousValue;
      showStatus('saveError');
      console.error('Bilibili Thumb Danmaku Filter: failed to save a setting.', error);
    }
  }

  async function changeLanguage() {
    const nextPreference = languageSelect.value;
    const previousPreference = currentLanguagePreference;
    status.textContent = '';

    try {
      await renderLanguage(nextPreference);
      await chrome.storage.sync.set({ uiLanguage: nextPreference });
      currentLanguagePreference = nextPreference;
    } catch (error) {
      languageSelect.value = previousPreference;
      await renderLanguage(previousPreference).catch(() => {});
      showStatus('languageLoadError');
      console.error('Bilibili Thumb Danmaku Filter: failed to change language.', error);
    }
  }

  hideThumbIconInput.addEventListener('change', () => {
    saveSetting(hideThumbIconInput, 'hideThumbIcon');
  });

  onlyThumbDanmakuInput.addEventListener('change', () => {
    saveSetting(onlyThumbDanmakuInput, 'onlyThumbDanmaku');
  });

  languageSelect.addEventListener('change', changeLanguage);

  async function start() {
    try {
      const [settings, storedLanguage] = await Promise.all([
        filter.loadSettings(chrome.storage.sync),
        chrome.storage.sync.get({ uiLanguage: 'auto' }),
      ]);
      const languagePreference = SUPPORTED_LANGUAGES.has(storedLanguage.uiLanguage)
        ? storedLanguage.uiLanguage
        : 'auto';

      hideThumbIconInput.checked = settings.hideThumbIcon;
      onlyThumbDanmakuInput.checked = settings.onlyThumbDanmaku;
      languageSelect.value = languagePreference;
      currentLanguagePreference = languagePreference;

      try {
        await renderLanguage(languagePreference);
      } catch (error) {
        const englishMessages = await loadMessages('en');
        applyMessages(englishMessages, 'en');
        showStatus('languageLoadError');
        console.error('Bilibili Thumb Danmaku Filter: failed to load language.', error);
      }
    } catch (error) {
      hideThumbIconInput.checked = filter.DEFAULT_SETTINGS.hideThumbIcon;
      onlyThumbDanmakuInput.checked = filter.DEFAULT_SETTINGS.onlyThumbDanmaku;
      languageSelect.value = 'auto';
      currentLanguagePreference = 'auto';

      try {
        await renderLanguage('auto');
      } catch {
        const englishMessages = await loadMessages('en');
        applyMessages(englishMessages, 'en');
      }

      showStatus('loadError');
      console.error('Bilibili Thumb Danmaku Filter: failed to load settings.', error);
    }
  }

  start();
}());
