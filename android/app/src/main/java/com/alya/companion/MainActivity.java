package com.alya.companion;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.media.projection.MediaProjectionManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Base64;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.util.List;

/**
 * MainActivity with Native AndroidBridge JavascriptInterface for Alya AI Companion:
 * - Serves bundled Vite web assets over https://appassets.androidplatform.net/ via WebViewAssetLoader
 *   so ES modules, Web Speech API, WebRTC audio, and localStorage run in a secure HTTPS context
 * - Installed App Discovery & Matching (respecting Android 11+ <queries>)
 * - Native Package & Search Intent Launching + External URL opening
 * - System Settings Navigation & Runtime Audio/Notification Permission Handling
 * - Foreground Service Lifecycle Controls (Start, Update, Stop)
 * - MediaProjection & Window Screen Capture Consent Flow
 */
public class MainActivity extends Activity {
    private static final int REQUEST_MEDIA_PROJECTION = 4001;
    private static final int REQUEST_OVERLAY_PERMISSION = 4002;
    private static final int REQUEST_RUNTIME_PERMISSIONS = 4003;

    private WebView webView;
    private PermissionRequest pendingWebPermissionRequest;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && getWindow() != null) {
            getWindow().setStatusBarColor(0xFF030107);
            getWindow().setNavigationBarColor(0xFF030107);
        }

        webView = new WebView(this);
        webView.setBackgroundColor(0xFF030107);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setTextZoom(100);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        }

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .setDomain("appassets.androidplatform.net")
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (url != null && "appassets.androidplatform.net".equals(url.getHost())) {
                    String path = url.getPath() != null ? url.getPath() : "/";
                    if (path.equals("/") || path.isEmpty()) {
                        Uri rewritten = url.buildUpon().path("/public/index.html").build();
                        return assetLoader.shouldInterceptRequest(rewritten);
                    }
                    if (!path.startsWith("/public/")) {
                        Uri rewritten = url.buildUpon().path("/public" + path).build();
                        WebResourceResponse res = assetLoader.shouldInterceptRequest(rewritten);
                        if (res != null) {
                            return res;
                        }
                    }
                }
                return assetLoader.shouldInterceptRequest(url);
            }
        });

        webView.addJavascriptInterface(new AndroidBridge(this), "AndroidBridge");

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                runOnUiThread(() -> {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        boolean needsAudio = false;
                        for (String res : request.getResources()) {
                            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(res)) {
                                needsAudio = true;
                                break;
                            }
                        }
                        if (needsAudio && checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                            pendingWebPermissionRequest = request;
                            requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQUEST_RUNTIME_PERMISSIONS);
                            return;
                        }
                    }
                    request.grant(request.getResources());
                });
            }
        });

        // Load bundled web app via secure HTTPS asset loader origin
        webView.loadUrl("https://appassets.androidplatform.net/public/index.html");
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
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_RUNTIME_PERMISSIONS && pendingWebPermissionRequest != null) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                pendingWebPermissionRequest.grant(pendingWebPermissionRequest.getResources());
            } else {
                pendingWebPermissionRequest.deny();
            }
            pendingWebPermissionRequest = null;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == REQUEST_MEDIA_PROJECTION) {
            if (resultCode == Activity.RESULT_OK) {
                String snapshot = captureCurrentViewBase64();
                dispatchScreenCaptureToWeb(snapshot);
            } else {
                dispatchScreenCaptureToWeb(null);
            }
        }
    }

    private String captureCurrentViewBase64() {
        try {
            View rootView = getWindow().getDecorView().getRootView();
            int width = rootView.getWidth() > 0 ? rootView.getWidth() : 1080;
            int height = rootView.getHeight() > 0 ? rootView.getHeight() : 1920;
            Bitmap bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            rootView.draw(canvas);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            bitmap.compress(Bitmap.CompressFormat.PNG, 90, baos);
            bitmap.recycle();
            return "data:image/png;base64," + Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP);
        } catch (Exception e) {
            return null;
        }
    }

    private void dispatchScreenCaptureToWeb(final String dataUrl) {
        if (webView == null) return;
        runOnUiThread(() -> {
            String jsArg = dataUrl != null ? ("'" + dataUrl.replace("'", "\\'") + "'") : "null";
            webView.evaluateJavascript(
                    "if (typeof window.__onNativeScreenCaptureResult === 'function') { window.__onNativeScreenCaptureResult(" + jsArg + "); }",
                    null
            );
        });
    }

    public class AndroidBridge {
        private final Context context;

        public AndroidBridge(Context context) {
            this.context = context;
        }

        @JavascriptInterface
        public String findMatchingApps(String rawQuery) {
            try {
                String q = rawQuery == null ? "" : rawQuery.trim().toLowerCase();
                PackageManager pm = context.getPackageManager();
                Intent mainIntent = new Intent(Intent.ACTION_MAIN, null);
                mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);

                List<ResolveInfo> apps = pm.queryIntentActivities(mainIntent, 0);
                JSONArray matches = new JSONArray();

                for (ResolveInfo info : apps) {
                    String label = info.loadLabel(pm).toString();
                    String pkg = info.activityInfo.packageName;
                    if (label.toLowerCase().contains(q) || pkg.toLowerCase().contains(q)) {
                        JSONObject item = new JSONObject();
                        item.put("label", label);
                        item.put("packageName", pkg);
                        matches.put(item);
                    }
                }
                return matches.toString();
            } catch (Exception e) {
                return "[]";
            }
        }

        @JavascriptInterface
        public boolean launchPackage(String packageName) {
            try {
                PackageManager pm = context.getPackageManager();
                Intent launchIntent = pm.getLaunchIntentForPackage(packageName);
                if (launchIntent != null) {
                    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(launchIntent);
                    return true;
                }
                return false;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public boolean launchAppSearch(String packageName, String query) {
            try {
                if ("com.google.android.youtube".equals(packageName)) {
                    Intent ytIntent = new Intent(Intent.ACTION_SEARCH);
                    ytIntent.setPackage(packageName);
                    ytIntent.putExtra("query", query);
                    ytIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(ytIntent);
                    return true;
                }
                Intent webSearch = new Intent(Intent.ACTION_VIEW,
                        Uri.parse("https://www.google.com/search?q=" + Uri.encode(query)));
                webSearch.setPackage(packageName);
                webSearch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(webSearch);
                return true;
            } catch (Exception e) {
                return launchPackage(packageName);
            }
        }

        @JavascriptInterface
        public boolean openUrl(String url) {
            try {
                if (url == null || url.trim().isEmpty()) return false;
                Intent viewIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(url.trim()));
                viewIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(viewIntent);
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public boolean openSystemIntent(String intentAction) {
            try {
                Intent sysIntent = new Intent(intentAction);
                sysIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(sysIntent);
                return true;
            } catch (Exception e) {
                return false;
            }
        }

        @JavascriptInterface
        public void startForegroundService(String title, String body) {
            if (Build.VERSION.SDK_INT >= 33) {
                if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQUEST_RUNTIME_PERMISSIONS);
                }
            }
            Intent svc = new Intent(context, AlyaForegroundService.class);
            svc.setAction("ACTION_START");
            svc.putExtra("title", title);
            svc.putExtra("body", body);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(svc);
            } else {
                context.startService(svc);
            }
        }

        @JavascriptInterface
        public void updateForegroundNotification(String title, String body) {
            Intent svc = new Intent(context, AlyaForegroundService.class);
            svc.setAction("ACTION_UPDATE");
            svc.putExtra("title", title);
            svc.putExtra("body", body);
            context.startService(svc);
        }

        @JavascriptInterface
        public void stopForegroundService() {
            Intent svc = new Intent(context, AlyaForegroundService.class);
            svc.setAction("ACTION_STOP");
            context.stopService(svc);
        }

        @JavascriptInterface
        public boolean canDrawOverlays() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                return Settings.canDrawOverlays(context);
            }
            return true;
        }

        @JavascriptInterface
        public void requestOverlayPermission() {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + context.getPackageName()));
                startActivityForResult(intent, REQUEST_OVERLAY_PERMISSION);
            }
        }

        @JavascriptInterface
        public void requestScreenCapture() {
            MediaProjectionManager mpm = (MediaProjectionManager) getSystemService(Context.MEDIA_PROJECTION_SERVICE);
            if (mpm != null) {
                startActivityForResult(mpm.createScreenCaptureIntent(), REQUEST_MEDIA_PROJECTION);
            } else {
                dispatchScreenCaptureToWeb(captureCurrentViewBase64());
            }
        }
    }
}
