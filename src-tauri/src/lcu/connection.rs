use base64::{engine::general_purpose::STANDARD, Engine};
use futures_util::SinkExt;
use reqwest::StatusCode;
use tokio::net::TcpStream;
use tokio_tungstenite::{
    connect_async_tls_with_config,
    tungstenite::{
        client::IntoClientRequest,
        http::{header::AUTHORIZATION, HeaderValue},
        Message,
    },
    Connector, MaybeTlsStream, WebSocketStream,
};

use super::{
    discovery::{is_loopback_host, LcuCredentials},
    models::ChampSelectSession,
};

const LOOPBACK_HOST: &str = "127.0.0.1";
const CHAMP_SELECT_ENDPOINT: &str = "/lol-champ-select/v1/session";
const JSON_API_SUBSCRIPTION: &str = r#"[5,"OnJsonApiEvent"]"#;

pub enum SessionResponse {
    Active(ChampSelectSession),
    Inactive,
}

pub type LcuWebSocket = WebSocketStream<MaybeTlsStream<TcpStream>>;

pub struct LcuConnection {
    credentials: LcuCredentials,
    http: reqwest::Client,
    authorization: HeaderValue,
}

impl LcuConnection {
    pub fn new(credentials: LcuCredentials) -> Result<Self, String> {
        if !is_loopback_host(LOOPBACK_HOST) {
            return Err("Destino local da LCU rejeitado.".to_string());
        }
        let authorization = HeaderValue::from_str(&format!(
            "Basic {}",
            STANDARD.encode(format!("riot:{}", credentials.password))
        ))
        .map_err(|_| "Não foi possível preparar a autenticação local.".to_string())?;
        let http = reqwest::Client::builder()
            .danger_accept_invalid_certs(true)
            .build()
            .map_err(|_| "Não foi possível preparar a conexão local.".to_string())?;
        Ok(Self {
            credentials,
            http,
            authorization,
        })
    }

    pub fn pid(&self) -> u32 {
        self.credentials.pid
    }

    fn http_url(&self, endpoint: &str) -> String {
        format!(
            "{}://{}:{}{}",
            self.credentials.protocol, LOOPBACK_HOST, self.credentials.port, endpoint
        )
    }

    fn websocket_url(&self) -> String {
        let scheme = if self.credentials.protocol == "https" {
            "wss"
        } else {
            "ws"
        };
        format!("{scheme}://{LOOPBACK_HOST}:{}/", self.credentials.port)
    }

    pub async fn fetch_session(&self) -> Result<SessionResponse, String> {
        let response = self
            .http
            .get(self.http_url(CHAMP_SELECT_ENDPOINT))
            .header(AUTHORIZATION, self.authorization.clone())
            .send()
            .await
            .map_err(|_| "O League Client não respondeu à conexão local.".to_string())?;
        if response.status() == StatusCode::NOT_FOUND {
            return Ok(SessionResponse::Inactive);
        }
        if !response.status().is_success() {
            return Err(format!(
                "O League Client respondeu com status {}.",
                response.status().as_u16()
            ));
        }
        response
            .json::<ChampSelectSession>()
            .await
            .map(SessionResponse::Active)
            .map_err(|_| "A seleção atual usa um formato ainda não reconhecido.".to_string())
    }

    pub async fn connect_websocket(&self) -> Result<LcuWebSocket, String> {
        let mut request = self
            .websocket_url()
            .into_client_request()
            .map_err(|_| "Não foi possível preparar os eventos locais.".to_string())?;
        request
            .headers_mut()
            .insert(AUTHORIZATION, self.authorization.clone());
        let connector = if self.credentials.protocol == "https" {
            let tls = native_tls::TlsConnector::builder()
                .danger_accept_invalid_certs(true)
                .build()
                .map_err(|_| "Não foi possível preparar o TLS local.".to_string())?;
            Some(Connector::NativeTls(tls))
        } else {
            None
        };
        let (mut socket, _) = connect_async_tls_with_config(request, None, false, connector)
            .await
            .map_err(|_| "Não foi possível acompanhar os eventos do League Client.".to_string())?;
        socket
            .send(Message::Text(JSON_API_SUBSCRIPTION.into()))
            .await
            .map_err(|_| "Não foi possível assinar os eventos do League Client.".to_string())?;
        Ok(socket)
    }
}
