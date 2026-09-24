/*
 * Hebrew Quiz — Android WebView wrapper around the PWA.
 * © Shimon Donen, 2026.
 */
package com.shimondonen.hebrewquiz;

import android.annotation.TargetApi;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONArray;

import java.util.Locale;

public class MainActivity extends Activity implements TextToSpeech.OnInitListener {

    // The PWA URL the app opens. Update if the deploy URL changes.
    private static final String APP_URL =
        "https://feniks80.github.io/hebrew-quiz/index.html";

    // Only this host is loaded inside the WebView; anything else (external
    // links) is handed off to the system browser / another app.
    private static final String ALLOWED_HOST = "feniks80.github.io";

    private WebView webView;
    private TextToSpeech tts;
    private volatile boolean ttsReady;

    // The language ("he" / "ru") currently selected on the TTS engine, so we
    // don't call setLanguage() again for repeated speech in the same language.
    private String currentLang;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            Window w = getWindow();
            w.setStatusBarColor(Color.parseColor("#2563eb"));
        }

        // Start the system TTS engine. The Hebrew / Russian voices come from
        // whatever Google TTS (or another engine) has installed.
        tts = new TextToSpeech(getApplicationContext(), this);

        webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setAllowFileAccess(false);
        settings.setTextZoom(Math.round(getResources().getConfiguration().fontScale * 100));

        // Expose the native TTS bridge so the JS can sidestep WebView's
        // half-implemented speechSynthesis API, and a tiny key/value store
        // bridge so progress can survive a PWA reinstall / storage wipe.
        webView.addJavascriptInterface(new TtsBridge(), "AndroidTTS");
        webView.addJavascriptInterface(new StoreBridge(), "AndroidStore");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUrl(Uri.parse(url));
            }

            @TargetApi(Build.VERSION_CODES.N)
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleUrl(request.getUrl());
            }
        });
        webView.setWebChromeClient(new WebChromeClient());

        if (savedInstanceState == null) {
            webView.loadUrl(APP_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }

        setContentView(webView);
    }

    /**
     * Decides whether a navigation should stay inside the app's WebView
     * (the PWA's own host) or be handed off to an external app / browser.
     */
    private boolean handleUrl(Uri uri) {
        if (uri != null && ALLOWED_HOST.equals(uri.getHost())) {
            return false;
        }
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception ignored) {
            // No app can handle this URL; just swallow the navigation.
        }
        return true;
    }

    @Override
    public void onInit(int status) {
        if (status == TextToSpeech.SUCCESS) {
            ttsReady = true;
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override public void onStart(String utteranceId) {}
                @Override public void onDone(String utteranceId) {}
                @Override public void onError(String utteranceId) {}
            });
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        webView.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (tts != null) tts.stop();
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            new AlertDialog.Builder(this)
                .setMessage("Выйти из приложения?")
                .setPositiveButton("Выйти", (d, w) -> finish())
                .setNegativeButton("Остаться", null)
                .show();
        }
    }

    @Override
    protected void onDestroy() {
        if (tts != null) {
            try { tts.stop(); tts.shutdown(); } catch (Exception ignored) {}
        }
        super.onDestroy();
    }

    /** JavaScript bridge: window.AndroidTTS.speak(text, lang, rate) and friends. */
    public class TtsBridge {
        @JavascriptInterface
        public boolean speak(String text, String lang, double rate) {
            if (!ttsReady || tts == null || text == null || text.isEmpty()) return false;

            if (!(lang == null ? currentLang == null : lang.equals(currentLang))) {
                int result;
                if ("ru".equals(lang)) {
                    result = tts.setLanguage(new Locale("ru", "RU"));
                } else {
                    result = tts.setLanguage(new Locale("he", "IL"));
                    if (result < 0) {
                        // Older Android labels Hebrew as 'iw'.
                        result = tts.setLanguage(new Locale("iw", "IL"));
                    }
                }
                if (result < 0) {
                    currentLang = null;
                    return false;
                }
                currentLang = lang;
            }

            float r = (float) rate;
            if (r < 0.1f) r = 0.1f;
            if (r > 2f) r = 2f;
            tts.setSpeechRate(r);

            int res = tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "u" + System.currentTimeMillis());
            return res == TextToSpeech.SUCCESS;
        }

        @JavascriptInterface
        public boolean isReady() {
            return ttsReady && tts != null;
        }

        @JavascriptInterface
        public boolean hasLanguage(String lang) {
            if (!ttsReady || tts == null) return false;
            Locale loc = "ru".equals(lang)
                    ? new Locale("ru", "RU") : new Locale("he", "IL");
            int r = tts.isLanguageAvailable(loc);
            if (r >= TextToSpeech.LANG_AVAILABLE) return true;
            if (!"ru".equals(lang)) {
                r = tts.isLanguageAvailable(new Locale("iw", "IL"));
                return r >= TextToSpeech.LANG_AVAILABLE;
            }
            return false;
        }

        @JavascriptInterface
        public void openTtsSettings() {
            runOnUiThread(() -> {
                try {
                    startActivity(new Intent(TextToSpeech.Engine.ACTION_INSTALL_TTS_DATA));
                } catch (ActivityNotFoundException e1) {
                    try {
                        startActivity(new Intent("com.android.settings.TTS_SETTINGS"));
                    } catch (Exception e2) {
                        // No TTS settings screen available on this device; ignore.
                    }
                }
            });
        }
    }

    /**
     * JavaScript bridge: window.AndroidStore, a tiny native key/value store
     * so quiz progress can be recovered even if the PWA's own storage
     * (localStorage / IndexedDB) gets cleared by the OS or a reinstall.
     */
    public class StoreBridge {
        private SharedPreferences prefs() {
            return getSharedPreferences("hq_store", MODE_PRIVATE);
        }

        @JavascriptInterface
        public String get(String key) {
            return prefs().getString(key, null);
        }

        @JavascriptInterface
        public void set(String key, String value) {
            prefs().edit().putString(key, value).apply();
        }

        @JavascriptInterface
        public void remove(String key) {
            prefs().edit().remove(key).apply();
        }

        @JavascriptInterface
        public void clear() {
            prefs().edit().clear().apply();
        }

        @JavascriptInterface
        public String keys() {
            JSONArray arr = new JSONArray();
            for (String k : prefs().getAll().keySet()) {
                arr.put(k);
            }
            return arr.toString();
        }
    }
}
