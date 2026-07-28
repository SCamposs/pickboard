mod champion_updates;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            champion_updates::check_champion_version,
            champion_updates::get_installed_champion_catalog,
            champion_updates::install_champion_update
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o PickBoard");
}

