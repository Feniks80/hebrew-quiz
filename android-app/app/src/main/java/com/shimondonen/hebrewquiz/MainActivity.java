/*
 * Hebrew Quiz — Android WebView wrapper around the PWA.
 * © Shimon Donen, 2026.
 */
package com.shimondonen.hebrewquiz;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.view.Window;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.util.Locale;

public class MainActivity extends Activity implements TextToSpeech.OnInitListener {

    // The PWA URL the app opens. Update if the deploy URL changes.
    private static final String APP_URL =
        "https://raw.githack.com/feniks80/hebrew-quiz/claude/new-session-iflHP/index.html";

    private WebView webView;
    private TextToSpeech tts;
    private boolean ttsReady = false;

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

        // Expose the native TTS bridge so the JS can sidestep WebView's
        // half-implemented speechSynthesis API.
        webView.addJavascriptInterface(new TtsBridge(), "AndroidTTS");

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());

        if (savedInstanceState == null) {
            webView.loadUrl(APP_URL);
        } else {
            webView.restoreState(savedInstanceState);
        }

        setContentView(webView);
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
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (tts != null) {
            try { tts.stop(); tts.shutdown(); } catch (Exception ignored) {}
        }
        super.onDestroy();
    }

    /** JavaScript bridge: window.AndroidTTS.speak(text, lang, rate). */
    public class TtsBridge {
        @JavascriptInterface
        public void speak(String text, String lang, double rate) {
            if (!ttsReady || tts == null || text == null) return;
            Locale loc;
            if ("ru".equals(lang)) {
                loc = new Locale("ru", "RU");
            } else {
                loc = new Locale("he", "IL");
            }
            int set = tts.setLanguage(loc);
            if (set == TextToSpeech.LANG_NOT_SUPPORTED
                    || set == TextToSpeech.LANG_MISSING_DATA) {
                if ("he".equals(lang)) {
                    // Older Android labels Hebrew as 'iw'
                    tts.setLanguage(new Locale("iw", "IL"));
                }
            }
            float r = (float) rate;
            if (r < 0.1f) r = 0.1f;
            if (r > 2f) r = 2f;
            tts.setSpeechRate(r);
            tts.stop();
            tts.speak(text, TextToSpeech.QUEUE_FLUSH, null, "u" + System.currentTimeMillis());
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
            if ("he".equals(lang)) {
                r = tts.isLanguageAvailable(new Locale("iw", "IL"));
                return r >= TextToSpeech.LANG_AVAILABLE;
            }
            return false;
        }
    }
}
