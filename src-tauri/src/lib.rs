use tauri::Manager;
use std::process::Command;

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

#[tauri::command]
async fn download_and_install_windows(app: tauri::AppHandle, url: String) -> Result<String, String> {
    if !is_allowed_update_url(&url) {
        return Err("URL cập nhật không hợp lệ.".to_string());
    }

    let temp_dir = std::env::temp_dir();
    let installer_path = temp_dir.join("PhysBoard-Setup-update.exe");
    let dest_str = installer_path.to_string_lossy().to_string();
    let url_clone = url.clone();

    let download_result = tauri::async_runtime::spawn_blocking(move || -> Result<String, String> {
        let mut cmd = Command::new("curl.exe");
        cmd.args(["-fL", "--silent", "--show-error", "-o", &dest_str, &url_clone]);
        #[cfg(target_os = "windows")]
        {
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            cmd.creation_flags(CREATE_NO_WINDOW);
        }
        let output = cmd.output().map_err(|e| format!("Không thể khởi chạy trình tải: {e}"))?;
        if !output.status.success() {
            let err = String::from_utf8_lossy(&output.stderr);
            return Err(format!("Tải bản cập nhật thất bại: {}", err.trim()));
        }
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
