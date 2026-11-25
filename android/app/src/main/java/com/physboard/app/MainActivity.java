package com.physboard.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private long lastBackPressMs = 0L;
    private boolean isImmersiveFullscreen = false;

    private void handleDoubleBackExit() {
        long now = System.currentTimeMillis();
        if (now - lastBackPressMs < 2000L) {
            finish();
        } else {
            lastBackPressMs = now;
            Toast.makeText(
                this,
                "Bấm Trở lại lần nữa để thoát PhysBoard",
                Toast.LENGTH_SHORT
            ).show();
        }
    }

    private void applyImmersiveFullscreen(boolean enabled) {
        isImmersiveFullscreen = enabled;
        Window window = getWindow();
        if (window == null) return;

        WindowInsetsControllerCompat insetsCtrl =
            WindowCompat.getInsetsController(window, window.getDecorView());

        if (enabled) {
            WindowCompat.setDecorFitsSystemWindows(window, false);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                WindowManager.LayoutParams lp = window.getAttributes();
                lp.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                window.setAttributes(lp);
            }
            if (insetsCtrl != null) {
                insetsCtrl.setSystemBarsBehavior(
                    WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                );
                insetsCtrl.hide(WindowInsetsCompat.Type.systemBars());
            }
        } else {
            WindowCompat.setDecorFitsSystemWindows(window, true);
            if (insetsCtrl != null) {
                insetsCtrl.show(WindowInsetsCompat.Type.systemBars());
                insetsCtrl.setAppearanceLightStatusBars(true);
                insetsCtrl.setAppearanceLightNavigationBars(true);
            }
        }
    }

    public class PhysBoardBridge {
        @JavascriptInterface
        public void setFullscreen(final boolean enabled) {
            runOnUiThread(() -> applyImmersiveFullscreen(enabled));
        }

        @JavascriptInterface
        public boolean isFullscreen() {
            return isImmersiveFullscreen;
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdaterPlugin.class);
        super.onCreate(savedInstanceState);

        // Keep system status bar & tablet taskbar outside WebView by default so UI never overlaps
        Window window = getWindow();
        if (window != null) {
            WindowCompat.setDecorFitsSystemWindows(window, true);
            window.setStatusBarColor(Color.WHITE);
            window.setNavigationBarColor(Color.WHITE);
            WindowInsetsControllerCompat insetsCtrl =
                WindowCompat.getInsetsController(window, window.getDecorView());
            if (insetsCtrl != null) {
                insetsCtrl.setAppearanceLightStatusBars(true);
                insetsCtrl.setAppearanceLightNavigationBars(true);
            }
        }

        // Intercept Android hardware / gesture Back button to close modals/drawers gracefully
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView wv = getBridge() != null ? getBridge().getWebView() : null;
                if (wv == null) {
                    handleDoubleBackExit();
                    return;
                }
                wv.evaluateJavascript(
                    "(function(){try{return Boolean(window.__physboardHandleBack&&window.__physboardHandleBack());}catch(e){return false;}})()",
                    result -> {
                        if ("true".equals(result)) {
                            return;
                        }
                        if (isImmersiveFullscreen) {
                            applyImmersiveFullscreen(false);
                            wv.evaluateJavascript(
                                "window.dispatchEvent(new CustomEvent('physboard-android-fullscreen',{detail:false}))",
                                null
                            );
                            return;
                        }
                        handleDoubleBackExit();
                    }
                );
            }
        });

        // Optimize WebView performance & expose native fullscreen bridge
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
            webView.addJavascriptInterface(new PhysBoardBridge(), "PhysBoardAndroid");

            WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setOffscreenPreRaster(true);
        }
    }
}
