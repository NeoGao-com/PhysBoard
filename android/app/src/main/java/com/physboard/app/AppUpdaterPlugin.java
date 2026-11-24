package com.physboard.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin(name = "AppUpdater")
public class AppUpdaterPlugin extends Plugin {
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private boolean isAllowedUrl(String url) {
        if (url == null) return false;
        return url.startsWith("https://github.com/NeoGao-com/PhysBoard/")
            || url.startsWith("https://objects.githubusercontent.com/")
            || url.startsWith("https://release-assets.githubusercontent.com/");
    }

    @PluginMethod
    public void downloadAndInstallApk(PluginCall call) {
        String rawUrl = call.getString("url");
        if (!isAllowedUrl(rawUrl)) {
            call.reject("URL cập nhật APK không hợp lệ.");
            return;
        }

        executor.execute(() -> {
            HttpURLConnection conn = null;
            try {
                Context context = getContext();
                File apkFile = new File(context.getCacheDir(), "physboard-update.apk");
                if (apkFile.exists()) {
                    //noinspection ResultOfMethodCallIgnored
                    apkFile.delete();
                }

                String currentUrl = rawUrl;
                int redirects = 0;
                while (redirects < 6) {
                    URL u = new URL(currentUrl);
                    conn = (HttpURLConnection) u.openConnection();
                    conn.setInstanceFollowRedirects(false);
                    conn.setConnectTimeout(15000);
                    conn.setReadTimeout(30000);
                    conn.setRequestProperty("User-Agent", "PhysBoard-Android-Updater");
                    int code = conn.getResponseCode();
                    if (code == HttpURLConnection.HTTP_MOVED_TEMP
                        || code == HttpURLConnection.HTTP_MOVED_PERM
                        || code == 307
                        || code == 308) {
                        String loc = conn.getHeaderField("Location");
                        conn.disconnect();
                        if (loc == null || loc.isEmpty()) break;
                        currentUrl = loc;
                        redirects++;
                        continue;
                    }
                    break;
                }

                if (conn == null || conn.getResponseCode() >= 400) {
                    int code = conn != null ? conn.getResponseCode() : -1;
                    call.reject("Không thể tải file APK (HTTP " + code + ").");
                    return;
                }

                long totalBytes = conn.getContentLengthLong();
                long downloaded = 0;
                int lastPercent = -1;

                try (InputStream in = conn.getInputStream();
                     FileOutputStream out = new FileOutputStream(apkFile)) {
                    byte[] buf = new byte[16384];
                    int len;
                    while ((len = in.read(buf)) != -1) {
                        out.write(buf, 0, len);
                        downloaded += len;
                        int percent = totalBytes > 0 ? (int) Math.min(100, (downloaded * 100L) / totalBytes) : -1;
                        if (percent != lastPercent && (percent % 2 == 0 || percent == 100 || percent == -1)) {
                            lastPercent = percent;
                            JSObject progress = new JSObject();
                            progress.put("percent", percent);
                            progress.put("downloaded", downloaded);
                            progress.put("total", totalBytes);
                            notifyListeners("downloadProgress", progress);
                        }
                    }
                    out.flush();
                }

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                    && !context.getPackageManager().canRequestPackageInstalls()) {
                    Intent permIntent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                    permIntent.setData(Uri.parse("package:" + context.getPackageName()));
                    permIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    context.startActivity(permIntent);
                    JSObject res = new JSObject();
                    res.put("needsPermission", true);
                    call.resolve(res);
                    return;
                }

                Uri apkUri = FileProvider.getUriForFile(
                    context,
                    context.getPackageName() + ".fileprovider",
                    apkFile
                );
                Intent installIntent = new Intent(Intent.ACTION_VIEW);
                installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
                installIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(installIntent);

                JSObject res = new JSObject();
                res.put("installedPrompted", true);
                call.resolve(res);
            } catch (Exception e) {
                call.reject("Lỗi khi tải hoặc cài đặt APK: " + e.getMessage());
            } finally {
                if (conn != null) conn.disconnect();
            }
        });
    }
}
