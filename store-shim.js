/*!
 * store-shim.js
 *
 * Makes the Android app's native storage bridge (window.AndroidStore, backed by
 * SharedPreferences) the source of truth for progress, transparently, so no page
 * has to change how it reads/writes localStorage.
 *
 * If window.AndroidStore is not present (plain browser, PWA outside the app),
 * this file does nothing at all.
 *
 * If it IS present:
 *   1. On load, AndroidStore is authoritative: every key AndroidStore holds is
 *      copied into localStorage (overwriting any local value). Any localStorage
 *      key AndroidStore does NOT have yet is pushed into AndroidStore (first-run
 *      migration, e.g. the very first time the app opens a page after install).
 *   2. From then on, Storage.prototype.setItem/removeItem/clear are patched so
 *      that any write to window.localStorage is mirrored into AndroidStore, with
 *      no change needed in any page's own code.
 *
 * This keeps progress alive across web-origin changes (domain moves, http/https
 * switches, WebView cache clears, etc.) because it lives in native
 * SharedPreferences rather than the page's origin-scoped localStorage.
 *
 * © Shimon Donen, 2026
 */
(function () {
  'use strict';
  try {
    var bridge = window.AndroidStore;
    if (!bridge) return;

    // ── 1) Sync on load: AndroidStore wins, then migrate anything local-only ──
    var bridgeKeys = {};
    try {
      var rawKeys = bridge.keys();
      var keyList = rawKeys ? JSON.parse(rawKeys) : [];
      if (Object.prototype.toString.call(keyList) === '[object Array]') {
        for (var i = 0; i < keyList.length; i++) {
          var k = keyList[i];
          if (typeof k !== 'string') continue;
          bridgeKeys[k] = true;
          try {
            var v = bridge.get(k);
            if (v !== null && v !== undefined) {
              localStorage.setItem(k, v);
            }
          } catch (eGet) {}
        }
      }
    } catch (eKeys) {}

    try {
      var localOnly = [];
      for (var j = 0; j < localStorage.length; j++) {
        var lk = localStorage.key(j);
        if (lk !== null && !bridgeKeys[lk]) localOnly.push(lk);
      }
      for (var m = 0; m < localOnly.length; m++) {
        try {
          var lv = localStorage.getItem(localOnly[m]);
          if (lv !== null) bridge.set(localOnly[m], lv);
        } catch (eSet) {}
      }
    } catch (eMigrate) {}

    // ── 2) Mirror future localStorage writes into AndroidStore ──
    try {
      var proto = Storage.prototype;
      var origSetItem = proto.setItem;
      var origRemoveItem = proto.removeItem;
      var origClear = proto.clear;

      proto.setItem = function (key, value) {
        var result = origSetItem.call(this, key, value);
        if (this === window.localStorage) {
          try { bridge.set(key, String(value)); } catch (e1) {}
        }
        return result;
      };

      proto.removeItem = function (key) {
        var result = origRemoveItem.call(this, key);
        if (this === window.localStorage) {
          try { bridge.remove(key); } catch (e2) {}
        }
        return result;
      };

      proto.clear = function () {
        var result = origClear.call(this);
        if (this === window.localStorage) {
          try { bridge.clear(); } catch (e3) {}
        }
        return result;
      };
    } catch (ePatch) {}
  } catch (eOuter) {}
})();
