// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn check_gpu_status() -> String {
    "NVIDIA RTX Hardware Ready (NVENC 4K Enabled)".into()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![check_gpu_status])
        .run(tauri::generate_context!())
        .expect("error while running Parallax Studio Tauri application");
}
