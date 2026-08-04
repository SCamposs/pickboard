use tokio_tungstenite::tungstenite::Message;

use super::models::JsonApiEvent;

const CHAMP_SELECT_URI: &str = "/lol-champ-select/v1/session";

pub fn is_champ_select_event(message: &Message) -> bool {
    let Message::Text(text) = message else {
        return false;
    };
    let Ok(value) = serde_json::from_str::<serde_json::Value>(text) else {
        return false;
    };
    let Some(payload) = value.as_array().and_then(|items| items.get(2)) else {
        return false;
    };
    serde_json::from_value::<JsonApiEvent>(payload.clone())
        .map(|event| event.uri.starts_with(CHAMP_SELECT_URI))
        .unwrap_or(false)
}

#[cfg(test)]
mod tests {
    use tokio_tungstenite::tungstenite::Message;

    use super::is_champ_select_event;

    #[test]
    fn filters_json_api_events_by_uri() {
        let relevant = Message::Text(
            r#"[8,"OnJsonApiEvent",{"data":{},"eventType":"Update","uri":"/lol-champ-select/v1/session"}]"#
                .into(),
        );
        let unrelated =
            Message::Text(r#"[8,"OnJsonApiEvent",{"uri":"/lol-chat/v1/conversations"}]"#.into());
        assert!(is_champ_select_event(&relevant));
        assert!(!is_champ_select_event(&unrelated));
    }
}
