use std::{fmt, fs, path::PathBuf};

use sysinfo::{ProcessesToUpdate, System};

const CLIENT_PROCESS_NAMES: [&str; 2] = ["LeagueClientUx.exe", "LeagueClientUx"];

#[derive(Clone, PartialEq, Eq)]
pub struct LcuCredentials {
    pub pid: u32,
    pub port: u16,
    pub password: String,
    pub protocol: String,
}

impl fmt::Debug for LcuCredentials {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter
            .debug_struct("LcuCredentials")
            .field("pid", &self.pid)
            .field("port", &self.port)
            .field("password", &"[redacted]")
            .field("protocol", &self.protocol)
            .finish()
    }
}

pub fn is_loopback_host(host: &str) -> bool {
    matches!(
        host.trim().to_ascii_lowercase().as_str(),
        "127.0.0.1" | "localhost" | "::1" | "[::1]"
    )
}

fn validated_protocol(value: &str) -> Option<String> {
    match value.trim().to_ascii_lowercase().as_str() {
        "https" => Some("https".to_string()),
        "http" => Some("http".to_string()),
        _ => None,
    }
}

pub fn parse_lockfile(content: &str) -> Result<LcuCredentials, String> {
    let parts = content.trim().splitn(5, ':').collect::<Vec<_>>();
    if parts.len() != 5 || !parts[0].eq_ignore_ascii_case("LeagueClient") {
        return Err("Lockfile do League Client inválido.".to_string());
    }
    let pid = parts[1]
        .parse::<u32>()
        .map_err(|_| "PID inválido no lockfile.".to_string())?;
    let port = parts[2]
        .parse::<u16>()
        .ok()
        .filter(|port| *port > 0)
        .ok_or_else(|| "Porta inválida no lockfile.".to_string())?;
    if parts[3].is_empty() {
        return Err("Credencial ausente no lockfile.".to_string());
    }
    let protocol = validated_protocol(parts[4])
        .ok_or_else(|| "Protocolo inválido no lockfile.".to_string())?;
    Ok(LcuCredentials {
        pid,
        port,
        password: parts[3].to_string(),
        protocol,
    })
}

fn argument_value(args: &[String], name: &str) -> Option<String> {
    let prefix = format!("{name}=");
    for (index, argument) in args.iter().enumerate() {
        if let Some(value) = argument.strip_prefix(&prefix) {
            return Some(value.trim_matches('"').to_string());
        }
        if argument == name {
            return args
                .get(index + 1)
                .map(|value| value.trim_matches('"').to_string());
        }
    }
    None
}

pub fn parse_client_args(args: &[String], pid: u32) -> Result<LcuCredentials, String> {
    let port = argument_value(args, "--app-port")
        .and_then(|value| value.parse::<u16>().ok())
        .filter(|port| *port > 0)
        .ok_or_else(|| "Porta local do League Client não encontrada.".to_string())?;
    let password = argument_value(args, "--remoting-auth-token")
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Credencial local do League Client não encontrada.".to_string())?;
    let protocol = validated_protocol(
        &argument_value(args, "--app-protocol").unwrap_or_else(|| "https".to_string()),
    )
    .ok_or_else(|| "Protocolo local do League Client inválido.".to_string())?;
    Ok(LcuCredentials {
        pid,
        port,
        password,
        protocol,
    })
}

fn lockfile_candidates(process: &sysinfo::Process, args: &[String]) -> Vec<PathBuf> {
    let mut candidates = Vec::new();
    if let Some(install_directory) = argument_value(args, "--install-directory") {
        candidates.push(PathBuf::from(install_directory).join("lockfile"));
    }
    if let Some(executable) = process.exe() {
        if let Some(directory) = executable.parent() {
            candidates.push(directory.join("lockfile"));
        }
    }
    if let Some(directory) = process.cwd() {
        candidates.push(directory.join("lockfile"));
    }
    candidates.sort();
    candidates.dedup();
    candidates
}

pub fn discover() -> Result<Option<LcuCredentials>, String> {
    let mut system = System::new_all();
    system.refresh_processes(ProcessesToUpdate::All);
    for (pid, process) in system.processes() {
        let process_name = process.name().to_string_lossy();
        if !CLIENT_PROCESS_NAMES
            .iter()
            .any(|name| process_name.eq_ignore_ascii_case(name))
        {
            continue;
        }
        let args = process
            .cmd()
            .iter()
            .map(|value| value.to_string_lossy().into_owned())
            .collect::<Vec<_>>();
        let numeric_pid = pid.as_u32();
        if let Ok(credentials) = parse_client_args(&args, numeric_pid) {
            return Ok(Some(credentials));
        }
        for path in lockfile_candidates(process, &args) {
            let Ok(content) = fs::read_to_string(path) else {
                continue;
            };
            if let Ok(credentials) = parse_lockfile(&content) {
                if credentials.pid == numeric_pid {
                    return Ok(Some(credentials));
                }
            }
        }
        return Err(
            "Cliente detectado, mas a conexão local ainda não está disponível.".to_string(),
        );
    }
    Ok(None)
}

#[cfg(test)]
mod tests {
    use super::{is_loopback_host, parse_client_args, parse_lockfile};

    #[test]
    fn parses_valid_lockfile() {
        let credentials = parse_lockfile("LeagueClient:4242:51123:local-secret:https").unwrap();
        assert_eq!(credentials.pid, 4242);
        assert_eq!(credentials.port, 51123);
        assert_eq!(credentials.protocol, "https");
        assert_eq!(credentials.password, "local-secret");
    }

    #[test]
    fn rejects_invalid_lockfile() {
        assert!(parse_lockfile("LeagueClient:pid:0::ftp").is_err());
        assert!(parse_lockfile("OtherClient:1:5000:secret:https").is_err());
    }

    #[test]
    fn extracts_split_and_equals_arguments() {
        let args = vec![
            "LeagueClientUx.exe".to_string(),
            "--app-port=51234".to_string(),
            "--remoting-auth-token".to_string(),
            "safe-test-token".to_string(),
            "--app-protocol=https".to_string(),
        ];
        let credentials = parse_client_args(&args, 9).unwrap();
        assert_eq!(credentials.port, 51234);
        assert_eq!(credentials.password, "safe-test-token");
    }

    #[test]
    fn accepts_only_loopback_hosts() {
        assert!(is_loopback_host("127.0.0.1"));
        assert!(is_loopback_host("localhost"));
        assert!(is_loopback_host("::1"));
        assert!(!is_loopback_host("192.168.0.10"));
        assert!(!is_loopback_host("example.com"));
    }
}
