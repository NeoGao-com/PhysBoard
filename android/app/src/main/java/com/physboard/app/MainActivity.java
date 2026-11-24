package com.physboard.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdaterPlugin.class);
        super.onCreate(savedInstanceState);

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
