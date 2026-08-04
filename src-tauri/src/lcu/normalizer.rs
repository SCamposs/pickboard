use std::collections::{BTreeSet, HashMap, HashSet};

use super::models::{ChampSelectSession, ResolvedBans, ResolvedPick, ResolvedSnapshot, TeamMember};

pub fn map_assigned_position(position: &str) -> Option<String> {
    match position.trim().to_ascii_lowercase().as_str() {
        "top" => Some("TOP".to_string()),
        "jungle" => Some("JG".to_string()),
        "middle" => Some("MID".to_string()),
        "bottom" => Some("ADC".to_string()),
        "utility" => Some("SUP".to_string()),
        _ => None,
    }
}

fn resolve_champion(
    champion_id: u64,
    catalog: &HashMap<u64, String>,
    unknown: &mut BTreeSet<u64>,
) -> Option<String> {
    if champion_id == 0 {
        return None;
    }
    let resolved = catalog.get(&champion_id).cloned();
    if resolved.is_none() {
        unknown.insert(champion_id);
    }
    resolved
}

fn confirmed_ally_cells(session: &ChampSelectSession) -> Option<HashSet<i64>> {
    let actions = session.actions.as_ref()?;
    let mut completed = HashSet::new();
    for action in actions.iter().flatten() {
        if action.kind.eq_ignore_ascii_case("pick")
            && action.completed
            && !action.is_in_progress
            && action.champion_id > 0
        {
            completed.insert(action.actor_cell_id);
        }
    }
    Some(completed)
}

fn ally_pick(
    member: &TeamMember,
    confirmed_cells: Option<&HashSet<i64>>,
    catalog: &HashMap<u64, String>,
    unknown: &mut BTreeSet<u64>,
) -> Option<ResolvedPick> {
    if let Some(cells) = confirmed_cells {
        if !cells.contains(&member.cell_id) {
            return None;
        }
    }
    resolve_champion(member.champion_id, catalog, unknown).map(|champion_id| ResolvedPick {
        champion_id,
        role: map_assigned_position(&member.assigned_position),
    })
}

fn resolved_ids(
    ids: impl IntoIterator<Item = u64>,
    catalog: &HashMap<u64, String>,
    unknown: &mut BTreeSet<u64>,
) -> Vec<String> {
    let mut seen = HashSet::new();
    ids.into_iter()
        .filter_map(|id| resolve_champion(id, catalog, unknown))
        .filter(|id| seen.insert(id.clone()))
        .collect()
}

pub fn normalize_session(
    session: &ChampSelectSession,
    catalog: &HashMap<u64, String>,
    session_key: String,
    sequence: u64,
) -> ResolvedSnapshot {
    let mut unknown = BTreeSet::new();
    let confirmed_cells = confirmed_ally_cells(session);
    let ally_picks = session
        .my_team
        .iter()
        .filter_map(|member| ally_pick(member, confirmed_cells.as_ref(), catalog, &mut unknown))
        .collect();
    let enemy_picks = resolved_ids(
        session.their_team.iter().map(|member| member.champion_id),
        catalog,
        &mut unknown,
    );
    let bans = session.bans.clone().unwrap_or_default();
    let ally_bans = resolved_ids(bans.my_team_bans, catalog, &mut unknown);
    let enemy_bans = resolved_ids(bans.their_team_bans, catalog, &mut unknown);

    ResolvedSnapshot {
        session_key,
        phase: session
            .timer
            .as_ref()
            .map(|timer| timer.phase.trim().to_string())
            .filter(|phase| !phase.is_empty()),
        sequence,
        ally_picks,
        enemy_picks,
        bans: ResolvedBans {
            ally: ally_bans,
            enemy: enemy_bans,
        },
        unknown_champion_ids: unknown.into_iter().collect(),
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::{map_assigned_position, normalize_session};
    use crate::lcu::models::ChampSelectSession;

    fn catalog() -> HashMap<u64, String> {
        HashMap::from([
            (22, "Ashe".to_string()),
            (103, "Ahri".to_string()),
            (254, "Vi".to_string()),
            (555, "Pyke".to_string()),
        ])
    }

    fn parse(json: &str) -> ChampSelectSession {
        serde_json::from_str(json).unwrap()
    }

    #[test]
    fn maps_assigned_positions_without_guessing() {
        assert_eq!(map_assigned_position("top").as_deref(), Some("TOP"));
        assert_eq!(map_assigned_position("jungle").as_deref(), Some("JG"));
        assert_eq!(map_assigned_position("middle").as_deref(), Some("MID"));
        assert_eq!(map_assigned_position("bottom").as_deref(), Some("ADC"));
        assert_eq!(map_assigned_position("utility").as_deref(), Some("SUP"));
        assert_eq!(map_assigned_position("unknown"), None);
    }

    #[test]
    fn keeps_only_confirmed_ally_picks_and_never_assigns_enemy_roles() {
        let session = parse(
            r#"{
              "myTeam":[
                {"cellId":1,"championId":254,"assignedPosition":"jungle"},
                {"cellId":2,"championId":103,"assignedPosition":"middle"}
              ],
              "theirTeam":[{"cellId":6,"championId":555,"assignedPosition":"utility"}],
              "actions":[[
                {"actorCellId":1,"championId":254,"completed":true,"isInProgress":false,"type":"pick"},
                {"actorCellId":2,"championId":103,"completed":false,"isInProgress":true,"type":"pick"}
              ]],
              "bans":{"myTeamBans":[],"theirTeamBans":[]},
              "timer":{"phase":"BAN_PICK"}
            }"#,
        );
        let result = normalize_session(&session, &catalog(), "session".into(), 1);
        assert_eq!(result.ally_picks.len(), 1);
        assert_eq!(result.ally_picks[0].champion_id, "Vi");
        assert_eq!(result.ally_picks[0].role.as_deref(), Some("JG"));
        assert_eq!(result.enemy_picks, vec!["Pyke"]);
    }

    #[test]
    fn tolerates_missing_and_extra_fields() {
        let session = parse(r#"{"myTeam":[],"theirTeam":[],"futureField":{"value":1}}"#);
        let result = normalize_session(&session, &catalog(), "session".into(), 1);
        assert!(result.ally_picks.is_empty());
        assert!(result.enemy_picks.is_empty());
        assert!(result.bans.ally.is_empty());
        assert_eq!(result.phase, None);
    }

    #[test]
    fn resolves_bans_and_ignores_zeroes_and_duplicates() {
        let session = parse(
            r#"{"bans":{"myTeamBans":[22,0,22],"theirTeamBans":[103]},"myTeam":[],"theirTeam":[]}"#,
        );
        let result = normalize_session(&session, &catalog(), "session".into(), 1);
        assert_eq!(result.bans.ally, vec!["Ashe"]);
        assert_eq!(result.bans.enemy, vec!["Ahri"]);
    }

    #[test]
    fn reports_unknown_champions_without_dropping_known_data() {
        let session = parse(
            r#"{"myTeam":[],"theirTeam":[{"championId":9999},{"championId":22}],"bans":{"myTeamBans":[],"theirTeamBans":[]}}"#,
        );
        let result = normalize_session(&session, &catalog(), "session".into(), 1);
        assert_eq!(result.enemy_picks, vec!["Ashe"]);
        assert_eq!(result.unknown_champion_ids, vec![9999]);
    }

    #[test]
    fn follows_current_member_champion_after_a_swap() {
        let session = parse(
            r#"{
              "myTeam":[{"cellId":1,"championId":103,"assignedPosition":"middle"}],
              "theirTeam":[],
              "actions":[[{"actorCellId":1,"championId":254,"completed":true,"isInProgress":false,"type":"pick"}]]
            }"#,
        );
        let result = normalize_session(&session, &catalog(), "session".into(), 1);
        assert_eq!(result.ally_picks[0].champion_id, "Ahri");
    }

    #[test]
    fn produces_deterministic_duplicate_snapshots() {
        let session = parse(r#"{"myTeam":[],"theirTeam":[{"championId":22},{"championId":22}]}"#);
        let first = normalize_session(&session, &catalog(), "session".into(), 1);
        let second = normalize_session(&session, &catalog(), "session".into(), 1);
        assert_eq!(first, second);
        assert_eq!(first.enemy_picks, vec!["Ashe"]);
    }
}
