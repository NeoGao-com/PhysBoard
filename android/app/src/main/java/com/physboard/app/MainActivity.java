package com.physboard.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.MotionEvent;
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
    private int lastNativeStylusMask = 0;

    private void syncNativeStylusState(MotionEvent ev) {
        if (ev == null || ev.getPointerCount() == 0) return;
        int toolType = ev.getToolType(0);
        if (toolType != MotionEvent.TOOL_TYPE_STYLUS && toolType != MotionEvent.TOOL_TYPE_ERASER) {
            return;
        }
        int action = ev.getActionMasked();
        boolean ended = action == MotionEvent.ACTION_UP
            || action == MotionEvent.ACTION_CANCEL
            || action == MotionEvent.ACTION_HOVER_EXIT
            || action == MotionEvent.ACTION_POINTER_UP;
        boolean isEraserTail = !ended && toolType == MotionEvent.TOOL_TYPE_ERASER;
        int btnState = ended ? 0 : ev.getButtonState();
        boolean isPrimaryBarrel = (btnState & MotionEvent.BUTTON_STYLUS_PRIMARY) != 0;
        boolean isSecondaryBarrel = (btnState & MotionEvent.BUTTON_STYLUS_SECONDARY) != 0;
        int mask = (isEraserTail ? 1 : 0) | (isPrimaryBarrel ? 2 : 0) | (isSecondaryBarrel ? 4 : 0);
        if (mask == lastNativeStylusMask) return;
        lastNativeStylusMask = mask;

        WebView wv = getBridge() != null ? getBridge().getWebView() : null;
        if (wv == null) return;
        final String js = "window.__physboardNativeStylusState={isEraserTail:"
            + isEraserTail
            + ",isPrimaryBarrel:"
            + isPrimaryBarrel
            + ",isSecondaryBarrel:"
            + isSecondaryBarrel
            + ",ts:Date.now()};";
        wv.post(() -> wv.evaluateJavascript(js, null));
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        syncNativeStylusState(ev);
        return super.dispatchTouchEvent(ev);
    }

    @Override
    public boolean dispatchGenericMotionEvent(MotionEvent ev) {
        syncNativeStylusState(ev);
        return super.dispatchGenericMotionEvent(ev);
    }

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
