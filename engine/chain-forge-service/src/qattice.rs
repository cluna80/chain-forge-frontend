use super::{describe, validate_chain_id, Chain, Chains, Config, Node};
use serde::Deserialize;
use serde_json::{json, Value};
use std::{net::TcpListener, path::Path, process::Stdio, time::Duration};
use tokio::process::Command;

const VALIDATORS: [&str; 4] = ["pqdev-0", "pqdev-1", "pqdev-2", "pqdev-3"];

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct CreateDevnet {
    chain_id: String,
}

pub(super) async fn create(body: &str, cfg: &Config, chains: &Chains) -> (u16, Value) {
    let request: CreateDevnet = match serde_json::from_str(body) {
        Ok(request) => request,
        Err(error) => return (400, json!({"error": error.to_string()})),
    };
    let id = request.chain_id;
    if let Err(error) = validate_chain_id(&id) {
        return (400, json!({"error": error}));
    }

    let binary = match cfg.pq_devnet_bin.canonicalize() {
        Ok(path) if path.is_file() => path,
        _ => return (500, json!({"error": "Set --pq-devnet-bin to a built pq-devnet-node executable."})),
    };
    if chains.lock().unwrap().contains_key(&id) {
        return (409, json!({"error": "This chain ID is already running."}));
    }

    let dir = cfg.data_dir.join(&id);
    if let Err(error) = std::fs::create_dir_all(&cfg.data_dir) {
        return (500, json!({"error": format!("Could not create data directory: {error}")}));
    }
    let mut builder = std::fs::DirBuilder::new();
    #[cfg(unix)]
    {
        use std::os::unix::fs::DirBuilderExt;
        builder.mode(0o700);
    }
    if let Err(error) = builder.create(&dir) {
        return if error.kind() == std::io::ErrorKind::AlreadyExists {
            (409, json!({"error": "This chain ID already has files. Choose a new chain ID."}))
        } else {
            (500, json!({"error": format!("Could not create chain directory: {error}")}))
        };
    }

    match launch(&binary, &dir, &id).await {
        Ok(chain) => {
            chains.lock().unwrap().insert(id.clone(), chain);
            match describe(&id, chains).await {
                Some(mut result) => {
                    result["genesis"] = read_json(&dir.join("genesis.json")).unwrap_or(Value::Null);
                    (200, result)
                }
                None => (404, json!({"error": "The devnet stopped during launch."})),
            }
        }
        Err(error) => (500, json!({"error": format!("{error}. Launch files remain in {}; choose a new chain ID to try again.", dir.display())})),
    }
}

async fn launch(binary: &Path, dir: &Path, id: &str) -> Result<Chain, String> {
    let ports = (0..VALIDATORS.len())
        .map(|_| TcpListener::bind(("127.0.0.1", 0)))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("Could not reserve validator ports: {error}"))?;
    let port_numbers = ports.iter().map(|port| port.local_addr().map(|addr| addr.port()))
        .collect::<Result<Vec<_>, _>>().map_err(|error| error.to_string())?;
    let port_list = port_numbers.iter().map(u16::to_string).collect::<Vec<_>>().join(",");

    for validator in VALIDATORS {
        setup(binary, dir, &["keygen", "--dir", validator]).await?;
    }
    setup(binary, dir, &[
        "assemble", "--out", "genesis.json", "--chain-id", id,
        "--ports", &port_list, "--dirs", &VALIDATORS.join(","),
    ]).await?;

    let mut nodes = Vec::with_capacity(VALIDATORS.len());
    for ((validator, port), reservation) in VALIDATORS.into_iter().zip(port_numbers).zip(ports) {
        let log_path = dir.join(format!("{validator}.log"));
        let log = std::fs::File::create(&log_path).map_err(|error| error.to_string())?;
        let stderr = log.try_clone().map_err(|error| error.to_string())?;
        drop(reservation);
        let child = Command::new(binary)
            .current_dir(dir)
            .args(["run", "--config", "genesis.json", "--dir", validator])
            .stdin(Stdio::null())
            .stdout(log)
            .stderr(stderr)
            .kill_on_drop(true)
            .spawn()
            .map_err(|error| format!("Could not start {validator}: {error}"))?;
        nodes.push(Node {
            validator: validator.into(),
            api_port: None,
            p2p_port: port,
            log_path,
            status_file: Some(dir.join(validator).join("status.json")),
            child,
        });
    }
    Ok(Chain { dir: dir.to_path_buf(), nodes })
}

async fn setup(binary: &Path, dir: &Path, args: &[&str]) -> Result<(), String> {
    let mut command = Command::new(binary);
    command.current_dir(dir).args(args).stdin(Stdio::null())
        .stdout(Stdio::null()).stderr(Stdio::null()).kill_on_drop(true);
    let status = tokio::time::timeout(Duration::from_secs(15), command.status())
        .await.map_err(|_| format!("{} timed out", args[0]))?
        .map_err(|error| format!("Could not run {}: {error}", args[0]))?;
    if !status.success() {
        return Err(format!("pq-devnet-node {} failed ({status})", args[0]));
    }
    Ok(())
}

pub(super) fn read_json(path: &Path) -> Option<Value> {
    serde_json::from_slice(&std::fs::read(path).ok()?).ok()
}

pub(super) fn status(path: &Path) -> Option<Value> {
    let record = read_json(path)?;
    Some(json!({
        "running": record["fatal"].is_null(),
        "height": record["exec"]["height"].as_u64()?,
        "state_root": record["exec"]["state_digest"].as_str()?,
        "committed_height": record["committed_height"],
        "pruned_watermark": record["pruned_watermark"],
        "recovering": record["recovering"],
        "fatal": record["fatal"],
        "environment": "devnet",
    }))
}
