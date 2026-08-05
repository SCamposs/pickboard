use std::{
    sync::atomic::Ordering,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use futures_util::{SinkExt, StreamExt};
use tauri::{AppHandle, Emitter, Manager};
use tokio::time::{interval, sleep};
use tokio_tungstenite::tungstenite::Message;

use super::{
    champ_select::is_champ_select_event,
    connection::{LcuConnection, SessionResponse},
    discovery,
    models::{LcuStatus, SNAPSHOT_EVENT, STATUS_EVENT},
    normalizer::normalize_session,
    LcuRuntime,
};

#[cfg(debug_assertions)]
use super::models::sanitize_error;

struct SessionTracker {
    boot_nonce: u128,
    generation: u64,
    active: bool,
    session_key: Option<String>,
}

impl Default for SessionTracker {
    fn default() -> Self {
        let boot_nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis();
        Self {
            boot_nonce,
            generation: 0,
            active: false,
            session_key: None,
        }
    }
}

impl SessionTracker {
    fn observe(&mut self, active: bool) -> Option<String> {
        if !active {
            self.active = false;
            return None;
        }
        if !self.active {
            self.generation += 1;
            self.session_key = Some(format!("{}-{}", self.boot_nonce, self.generation));
        }
        self.active = true;
        self.session_key.clone()
    }

    fn client_changed(&mut self) {
        self.active = false;
    }
}

async fn emit_status(app: &AppHandle, state: &str, message: Option<&str>) {
    let next = LcuStatus::new(state, message);
    let runtime = app.state::<LcuRuntime>();
    let mut current = runtime.status.write().await;
    if *current == next {
        return;
    }
    *current = next.clone();
    let _ = app.emit(STATUS_EVENT, next);
}

async fn refresh_snapshot(
    app: &AppHandle,
    connection: &LcuConnection,
    tracker: &mut SessionTracker,
    sequence: &mut u64,
) -> Result<(), String> {
    match connection.fetch_session().await? {
        SessionResponse::Inactive => {
            tracker.observe(false);
            emit_status(app, "idle", None).await;
        }
        SessionResponse::Active(session) => {
            let Some(session_key) = tracker.observe(true) else {
                return Ok(());
            };
            *sequence += 1;
            let runtime = app.state::<LcuRuntime>();
            let catalog = runtime.catalog.read().await;
            let snapshot = normalize_session(&session, &catalog, session_key, *sequence);
            drop(catalog);
            let _ = app.emit(SNAPSHOT_EVENT, snapshot);
            emit_status(app, "champ-select", None).await;
        }
    }
    Ok(())
}

async fn monitor_connection(
    app: &AppHandle,
    connection: &LcuConnection,
    tracker: &mut SessionTracker,
    sequence: &mut u64,
) -> Result<(), String> {
    let mut websocket = connection.connect_websocket().await.ok();
    let mut poll = interval(Duration::from_millis(1500));
    let mut websocket_retry_ticks = 0_u8;
    refresh_snapshot(app, connection, tracker, sequence).await?;

    loop {
        if !app.state::<LcuRuntime>().enabled.load(Ordering::Relaxed) {
            return Ok(());
        }

        if let Some(socket) = websocket.as_mut() {
            let mut websocket_interrupted = false;
            tokio::select! {
                _ = poll.tick() => {
                    refresh_snapshot(app, connection, tracker, sequence).await?;
                }
                message = socket.next() => {
                    match message {
                        Some(Ok(Message::Ping(payload))) => {
                            if socket.send(Message::Pong(payload)).await.is_err() {
                                websocket_interrupted = true;
                            }
                        }
                        Some(Ok(message)) if is_champ_select_event(&message) => {
                            refresh_snapshot(app, connection, tracker, sequence).await?;
                        }
                        Some(Ok(Message::Close(_))) | None => {
                            websocket_interrupted = true;
                        }
                        Some(Err(_)) => {
                            websocket_interrupted = true;
                        }
                        _ => {}
                    }
                }
            }
            if websocket_interrupted {
                websocket = None;
                websocket_retry_ticks = 0;
            }
        } else {
            poll.tick().await;
            refresh_snapshot(app, connection, tracker, sequence).await?;
            websocket_retry_ticks = websocket_retry_ticks.saturating_add(1);
            if websocket_retry_ticks >= 3 {
                websocket = connection.connect_websocket().await.ok();
                websocket_retry_ticks = 0;
            }
        }
    }
}

pub async fn run(app: AppHandle) {
    let mut tracker = SessionTracker::default();
    let mut sequence = 0_u64;
    let mut last_pid = None;
    let mut reconnect_delay = 1_u64;

    loop {
        let enabled = app.state::<LcuRuntime>().enabled.load(Ordering::Relaxed);
        if !enabled {
            emit_status(&app, "disabled", None).await;
            sleep(Duration::from_millis(500)).await;
            continue;
        }

        let credentials = match discovery::discover() {
            Ok(Some(credentials)) => credentials,
            Ok(None) => {
                if last_pid.take().is_some() {
                    tracker.client_changed();
                }
                emit_status(&app, "searching", None).await;
                sleep(Duration::from_secs(2)).await;
                continue;
            }
            Err(_) => {
                emit_status(
                    &app,
                    "unavailable",
                    Some("Você ainda pode preencher o draft manualmente."),
                )
                .await;
                sleep(Duration::from_secs(2)).await;
                continue;
            }
        };

        if last_pid != Some(credentials.pid) {
            if last_pid.is_some() {
                tracker.client_changed();
            }
            last_pid = Some(credentials.pid);
        }
        emit_status(&app, "client-found", None).await;
        emit_status(&app, "connecting", None).await;
        let connection = match LcuConnection::new(credentials) {
            Ok(connection) => connection,
            Err(_) => {
                emit_status(
                    &app,
                    "unavailable",
                    Some("Você ainda pode preencher o draft manualmente."),
                )
                .await;
                sleep(Duration::from_secs(2)).await;
                continue;
            }
        };
        debug_assert_eq!(last_pid, Some(connection.pid()));

        match monitor_connection(&app, &connection, &mut tracker, &mut sequence).await {
            Ok(()) => reconnect_delay = 1,
            Err(_error) => {
                #[cfg(debug_assertions)]
                eprintln!("LCU: {}", sanitize_error(&_error, None));
                emit_status(
                    &app,
                    "reconnecting",
                    Some("O modo manual continua disponível."),
                )
                .await;
                sleep(Duration::from_secs(reconnect_delay)).await;
                reconnect_delay = (reconnect_delay * 2).min(8);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::SessionTracker;

    #[test]
    fn reconnect_keeps_the_same_active_session_key() {
        let mut tracker = SessionTracker::default();
        let first = tracker.observe(true).unwrap();
        let after_reconnect = tracker.observe(true).unwrap();
        assert_eq!(first, after_reconnect);
    }

    #[test]
    fn a_new_session_gets_a_new_key_after_inactivity() {
        let mut tracker = SessionTracker::default();
        let first = tracker.observe(true).unwrap();
        tracker.observe(false);
        let second = tracker.observe(true).unwrap();
        assert_ne!(first, second);
    }
}
