mod champion_updates;
mod lcu;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .manage(lcu::LcuRuntime::default())
        .setup(|app| {
            lcu::start_watcher(app.handle().clone());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            champion_updates::check_champion_version,
            champion_updates::get_installed_champion_catalog,
            champion_updates::install_champion_update,
            lcu::configure_lcu_catalog,
            lcu::get_lcu_status,
            lcu::set_lcu_sync_enabled
        ])
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o PickBoard");
}
