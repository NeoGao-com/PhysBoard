use tauri::Manager;
use std::process::{Command, Stdio};

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[tauri::command]
fn get_runtime_info() -> serde_json::Value {
    serde_json::json!({
        "engine": "tauri-rust",
        "version": env!("CARGO_PKG_VERSION"),
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH
    })
}

fn is_allowed_update_url(url: &str) -> bool {
    url.starts_with("https://github.com/NeoGao-com/PhysBoard/")
        || url.starts_with("https://objects.githubusercontent.com/")
        || url.starts_with("https://release-assets.githubusercontent.com/")
}

fn fetch_content_length(url: &str) -> u64 {
    let mut cmd = Command::new("curl.exe");
    cmd.args(["-sIL", url]);
    #[cfg(target_os = "windows")]
    {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
    let Ok(output) = cmd.output() else {
        return 0;
    };
    let headers = String::from_utf8_lossy(&output.stdout);
    let mut len: u64 = 0;
    for line in headers.lines() {
        let lower = line.to_ascii_lowercase();
        if let Some(rest) = lower.strip_prefix("content-length:") {
            if let Ok(parsed) = rest.trim().parse::<u64>() {
                if parsed > 0 {
                    len = parsed;
                }
            }
        }
    }
    len
}

fn emit_progress(app: &tauri::AppHandle, percent: i32, downloaded: u64, total: u64) {
    if let Some(win) = app.get_webview_window("main") {
        let script = format!(
            "window.dispatchEvent(new CustomEvent('physboard:update-progress',{{detail:{{percent:{},downloaded:{},total:{}}}}}))",
            percent, downloaded, total
        );
        let _ = win.eval(&script);
    }
}

#[tauri::command]
async fn download_and_install_windows(app: tauri::AppHandle, url: String) -> Result<String, String> {
    if !is_allowed_update_url(&url) {
        return Err("URL cập nhật không hợp lệ.".to_string());
    }

    let temp_dir = std::env::temp_dir();
    let installer_path = temp_dir.join("PhysBoard-Setup-update.exe");
    let _ = std::fs::remove_file(&installer_path);
    let dest_str = installer_path.to_string_lossy().to_string();
    let url_clone = url.clone();
    let app_clone = app.clone();

    let download_result = tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        let total_bytes = fetch_content_length(&url_clone);
        emit_progress(&app_clone, 0, 0, total_bytes);

        let mut cmd = Command::new("curl.exe");
        cmd.args(["-fL", "--silent", "--show-error", "-o", &dest_str, &url_clone]);
        cmd.stdout(Stdio::null());
        cmd.stderr(Stdio::piped());
        #[cfg(target_os = "windows")]
        {
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Không thể khởi chạy trình tải: {e}"))?;

        let mut last_percent: i32 = -1;
        loop {
            match child.try_wait() {
                Ok(Some(status)) => {
                    if !status.success() {
                        return Err("Tải bản cập nhật thất bại. Vui lòng kiểm tra kết nối mạng.".to_string());
                    }
                    break;
                }
                Ok(None) => {
                    let downloaded = std::fs::metadata(&dest_str).map(|m| m.len()).unwrap_or(0);
                    let pct = if total_bytes > 0 {
                        ((downloaded.saturating_mul(100)) / total_bytes).min(99) as i32
                    } else {
                        -1
                    };
                    if pct != last_percent {
                        last_percent = pct;
                        emit_progress(&app_clone, pct, downloaded, total_bytes);
                    }
                    std::thread::sleep(std::time::Duration::from_millis(160));
                }
                Err(e) => return Err(format!("Lỗi theo dõi tiến trình tải: {e}")),
            }
        }

        emit_progress(&app_clone, 100, total_bytes, total_bytes);
        Ok(dest_str)
    })
    .await
    .map_err(|e| format!("Lỗi tác vụ tải: {e}"))??;

    // Launch NSIS installer and exit current app so files can be replaced cleanly
    Command::new(&download_result)
        .spawn()
        .map_err(|e| format!("Không thể mở trình cài đặt: {e}"))?;

    let app_handle = app.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(450));
        app_handle.exit(0);
    });

    Ok(download_result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_runtime_info,
            download_and_install_windows
        ])
        .run(tauri::generate_context!())
        .expect("error while running PhysBoard Tauri application");
}
