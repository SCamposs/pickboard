use futures_util::stream::{self, StreamExt};
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, path::PathBuf};
use tauri::{AppHandle, Manager};

const VERSIONS_URL: &str = "https://ddragon.leagueoflegends.com/api/versions.json";

#[derive(Debug, Deserialize)]
struct DataDragonImage {
    full: String,
}

#[derive(Debug, Deserialize)]
struct DataDragonChampion {
    id: String,
    key: String,
    name: String,
    image: DataDragonImage,
}

#[derive(Debug, Deserialize)]
struct DataDragonResponse {
    data: HashMap<String, DataDragonChampion>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeChampion {
    id: String,
    key: String,
    name: String,
    image: String,
    search: String,
    aliases: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChampionCatalog {
    version: String,
    champions: Vec<RuntimeChampion>,
}

fn normalize_search(value: &str) -> String {
    value
        .to_lowercase()
        .chars()
        .filter_map(|character| match character {
            'á' | 'à' | 'â' | 'ã' | 'ä' => Some('a'),
            'é' | 'è' | 'ê' | 'ë' => Some('e'),
            'í' | 'ì' | 'î' | 'ï' => Some('i'),
            'ó' | 'ò' | 'ô' | 'õ' | 'ö' => Some('o'),
            'ú' | 'ù' | 'û' | 'ü' => Some('u'),
            'ç' => Some('c'),
            character if character.is_alphanumeric() => Some(character),
            _ => None,
        })
        .collect()
}

fn champions_root(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_local_data_dir()
        .map(|path| path.join("champions"))
        .map_err(|error| format!("Não foi possível localizar os dados locais: {error}"))
}

#[tauri::command]
pub async fn check_champion_version() -> Result<String, String> {
    let response = reqwest::get(VERSIONS_URL)
        .await
        .map_err(|error| format!("Não foi possível consultar o Data Dragon: {error}"))?
        .error_for_status()
        .map_err(|error| format!("O Data Dragon respondeu com erro: {error}"))?;
    let versions = response
        .json::<Vec<String>>()
        .await
        .map_err(|error| format!("A lista de versões é inválida: {error}"))?;
    versions
        .into_iter()
        .next()
        .ok_or_else(|| "O Data Dragon não informou uma versão disponível.".to_string())
}

#[tauri::command]
pub async fn get_installed_champion_catalog(
    app: AppHandle,
) -> Result<Option<ChampionCatalog>, String> {
    let catalog_path = champions_root(&app)?.join("current.json");
    match tokio::fs::read_to_string(catalog_path).await {
        Ok(contents) => serde_json::from_str::<ChampionCatalog>(&contents)
            .map(Some)
            .map_err(|error| format!("A atualização local de campeões está corrompida: {error}")),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(format!("Não foi possível ler os campeões instalados: {error}")),
    }
}

#[tauri::command]
pub async fn install_champion_update(
    app: AppHandle,
    version: String,
) -> Result<ChampionCatalog, String> {
    let current_version = check_champion_version().await?;
    if current_version != version {
        return Err(format!(
            "A versão solicitada mudou. Disponível agora: {current_version}."
        ));
    }

    let client = reqwest::Client::new();
    let data_url =
        format!("https://ddragon.leagueoflegends.com/cdn/{version}/data/pt_BR/champion.json");
    let response = client
        .get(data_url)
        .send()
        .await
        .map_err(|error| format!("Não foi possível baixar os campeões: {error}"))?
        .error_for_status()
        .map_err(|error| format!("O Data Dragon respondeu com erro: {error}"))?;
    let payload = response
        .json::<DataDragonResponse>()
        .await
        .map_err(|error| format!("Os dados recebidos são inválidos: {error}"))?;

    let version_root = champions_root(&app)?.join(&version);
    let image_root = version_root.join("images");
    tokio::fs::create_dir_all(&image_root)
        .await
        .map_err(|error| format!("Não foi possível preparar a pasta de atualização: {error}"))?;

    let mut champions = payload
        .data
        .into_values()
        .map(|champion| RuntimeChampion {
            search: normalize_search(&champion.name),
            image: format!("{version}/images/{}", champion.image.full),
            id: champion.id,
            key: champion.key,
            name: champion.name,
            aliases: Vec::new(),
        })
        .collect::<Vec<_>>();
    champions.sort_by(|left, right| left.name.cmp(&right.name));

    let downloads = champions
        .iter()
        .map(|champion| {
            let client = client.clone();
            let destination = image_root.join(
                PathBuf::from(&champion.image)
                    .file_name()
                    .unwrap_or_default(),
            );
            let url = format!(
                "https://ddragon.leagueoflegends.com/cdn/{version}/img/champion/{}",
                destination.file_name().unwrap_or_default().to_string_lossy()
            );
            async move {
                let bytes = client
                    .get(url)
                    .send()
                    .await
                    .map_err(|error| error.to_string())?
                    .error_for_status()
                    .map_err(|error| error.to_string())?
                    .bytes()
                    .await
                    .map_err(|error| error.to_string())?;
                tokio::fs::write(destination, bytes)
                    .await
                    .map_err(|error| error.to_string())
            }
        })
        .collect::<Vec<_>>();

    let download_results = stream::iter(downloads)
        .buffer_unordered(8)
        .collect::<Vec<_>>()
        .await;
    if let Some(error) = download_results.into_iter().find_map(Result::err) {
        return Err(format!("Falha ao baixar um ícone de campeão: {error}"));
    }

    let catalog = ChampionCatalog { version, champions };
    let serialized = serde_json::to_string_pretty(&catalog)
        .map_err(|error| format!("Não foi possível preparar a atualização: {error}"))?;
    tokio::fs::write(champions_root(&app)?.join("current.json"), serialized)
        .await
        .map_err(|error| format!("Não foi possível salvar a atualização: {error}"))?;
    Ok(catalog)
}

