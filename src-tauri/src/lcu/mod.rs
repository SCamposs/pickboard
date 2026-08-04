mod champ_select;
mod connection;
mod discovery;
mod models;
mod normalizer;
mod watcher;

use std::collections::HashMap;

use serde::Deserialize;
use tauri::{AppHandle, State};
use tokio::sync::RwLock;

pub use models::LcuStatus;

#[derive(Default)]
pub struct LcuRuntime {
    pub(crate) enabled: std::sync::atomic::AtomicBool,
    pub(crate) catalog: RwLock<HashMap<u64, String>>,
    pub(crate) status: RwLock<LcuStatus>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChampionMapping {
    key: String,
    id: String,
}

#[tauri::command]
pub async fn configure_lcu_catalog(
    runtime: State<'_, LcuRuntime>,
    champions: Vec<ChampionMapping>,
) -> Result<(), String> {
    let mut catalog = runtime.catalog.write().await;
    catalog.clear();
    for champion in champions {
        if let Ok(key) = champion.key.parse::<u64>() {
            catalog.insert(key, champion.id);
        }
    }
    Ok(())
}

#[tauri::command]
pub async fn set_lcu_sync_enabled(
    runtime: State<'_, LcuRuntime>,
    enabled: bool,
) -> Result<(), String> {
    runtime
        .enabled
        .store(enabled, std::sync::atomic::Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
pub async fn get_lcu_status(runtime: State<'_, LcuRuntime>) -> Result<LcuStatus, String> {
    Ok(runtime.status.read().await.clone())
}

pub fn start_watcher(app: AppHandle) {
    tauri::async_runtime::spawn(watcher::run(app));
}
