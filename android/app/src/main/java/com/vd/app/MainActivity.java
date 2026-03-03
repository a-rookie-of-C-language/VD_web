package com.vd.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Get WebView and configure settings
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();

            // Enable hardware acceleration
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);

            // Disable zoom
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);

            // Set viewport
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);

            // Enable caching for better performance
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setAppCacheEnabled(true);

            // Improve rendering
            settings.setRenderPriority(WebSettings.RenderPriority.HIGH);
            webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);
        }
    }
}
