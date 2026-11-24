package com.physboard.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private long lastBackPressMs = 0L;

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

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdaterPlugin.class);
        super.onCreate(savedInstanceState);

        // Edge-to-edge & Display Cutout Safe-Area support (Android 9+ / 15+)
        Window window = getWindow();
        if (window != null) {
            WindowCompat.setDecorFitsSystemWindows(window, false);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                WindowManager.LayoutParams lp = window.getAttributes();
                lp.layoutInDisplayCutoutMode =
                    WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                window.setAttributes(lp);
            }
            window.setStatusBarColor(Color.TRANSPARENT);
            window.setNavigationBarColor(Color.TRANSPARENT);
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
                        handleDoubleBackExit();
                    }
                );
            }
        });

        // Optimize WebView performance for high-framerate drawing & 60-120fps touch response
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            // Force hardware acceleration on WebView layer
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

            WebSettings settings = webView.getSettings();
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);

            // Pre-rasterize offscreen tiles to eliminate lag during pan and zoom
            settings.setOffscreenPreRaster(true);
        }
    }
}
