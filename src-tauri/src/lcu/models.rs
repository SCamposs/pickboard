use serde::{Deserialize, Serialize};

pub const STATUS_EVENT: &str = "pickboard://lcu-status";
pub const SNAPSHOT_EVENT: &str = "pickboard://lcu-snapshot";

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LcuStatus {
    pub state: String,
    pub message: Option<String>,
}

impl LcuStatus {
    pub fn new(state: &str, message: Option<&str>) -> Self {
        Self {
            state: state.to_string(),
            message: message.map(str::to_string),
        }
    }
}

impl Default for LcuStatus {
    fn default() -> Self {
        Self::new("disabled", None)
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChampSelectSession {
    #[serde(default)]
    pub my_team: Vec<TeamMember>,
    #[serde(default)]
    pub their_team: Vec<TeamMember>,
    pub bans: Option<SessionBans>,
    pub actions: Option<Vec<Vec<ChampSelectAction>>>,
    pub timer: Option<SessionTimer>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TeamMember {
    #[serde(default)]
    pub cell_id: i64,
    #[serde(default)]
    pub champion_id: u64,
    #[serde(default)]
    pub assigned_position: String,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionBans {
    #[serde(default)]
    pub my_team_bans: Vec<u64>,
    #[serde(default)]
    pub their_team_bans: Vec<u64>,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChampSelectAction {
    #[serde(default)]
    pub actor_cell_id: i64,
    #[serde(default)]
    pub champion_id: u64,
    #[serde(default)]
    pub completed: bool,
    #[serde(default)]
    pub is_in_progress: bool,
    #[serde(rename = "type", default)]
    pub kind: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionTimer {
    #[serde(default)]
    pub phase: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JsonApiEvent {
    #[serde(default)]
    pub uri: String,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedPick {
    pub champion_id: String,
    pub role: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ResolvedSnapshot {
    pub session_key: String,
    pub phase: Option<String>,
    pub sequence: u64,
    pub ally_picks: Vec<ResolvedPick>,
    pub enemy_picks: Vec<String>,
    pub bans: ResolvedBans,
    pub unknown_champion_ids: Vec<u64>,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
pub struct ResolvedBans {
    pub ally: Vec<String>,
    pub enemy: Vec<String>,
}

pub fn sanitize_error(message: &str, secret: Option<&str>) -> String {
    let mut sanitized = message.to_string();
    if let Some(secret) = secret.filter(|value| !value.is_empty()) {
        sanitized = sanitized.replace(secret, "[redacted]");
    }
    if sanitized.to_ascii_lowercase().contains("authorization") {
        return "Falha de autenticação local com o League Client.".to_string();
    }
    sanitized
}

#[cfg(test)]
mod tests {
    use super::sanitize_error;

    #[test]
    fn removes_credentials_from_errors() {
        let sanitized = sanitize_error("authorization token-secret failed", Some("token-secret"));
        assert!(!sanitized.contains("token-secret"));
        assert!(!sanitized.to_ascii_lowercase().contains("authorization"));
    }
}
