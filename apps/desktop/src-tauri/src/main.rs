#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

const DRAFTS_FILE_NAME: &str = "skeet-drafts.json";

fn drafts_file_path(app_handle: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
  let resolver = app_handle.path_resolver();
  let mut dir = resolver
    .app_data_dir()
    .ok_or_else(|| "Konnte App-Datenverzeichnis nicht ermitteln.".to_string())?;
  std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;
  dir.push(DRAFTS_FILE_NAME);
  Ok(dir)
}

#[tauri::command]
fn load_drafts(app_handle: tauri::AppHandle) -> Result<String, String> {
  let path = drafts_file_path(&app_handle)?;
  if !path.exists() {
    return Ok("[]".to_string());
  }

  let data = std::fs::read_to_string(&path).map_err(|error| error.to_string())?;
  let value: serde_json::Value = serde_json::from_str(&data).map_err(|error| error.to_string())?;

  if !value.is_array() {
    return Err("Ungültiges Format – erwartet ein JSON-Array.".into());
  }

  serde_json::to_string(&value).map_err(|error| error.to_string())
}

#[tauri::command]
fn save_drafts(app_handle: tauri::AppHandle, data: String) -> Result<(), String> {
  let path = drafts_file_path(&app_handle)?;
  let value: serde_json::Value = serde_json::from_str(&data).map_err(|error| error.to_string())?;

  if !value.is_array() {
    return Err("Ungültiges Format – erwartet ein JSON-Array.".into());
  }

  let formatted = serde_json::to_string_pretty(&value).map_err(|error| error.to_string())?;
  std::fs::write(&path, formatted).map_err(|error| error.to_string())?;
  Ok(())
}

#[tauri::command]
fn get_drafts_path(app_handle: tauri::AppHandle) -> Result<String, String> {
  let path = drafts_file_path(&app_handle)?;
  Ok(path.to_string_lossy().to_string())
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![load_drafts, save_drafts, get_drafts_path])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
