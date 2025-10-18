#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::menu::{Menu, MenuItem, Submenu};

fn main() {
    let menu = Menu::new()
        .unwrap()
        .add_submenu(
            Submenu::with_items(
                "ThreadWriter",
                &[
                    MenuItem::with_id("about", "Über ThreadWriter", true, None::<&str>).unwrap(),
                    MenuItem::with_id("reset_layout", "Layout zurücksetzen", true, None::<&str>).unwrap(),
                    MenuItem::with_id("quit", "Beenden", true, None::<&str>).unwrap(),
                ],
            )
            .unwrap(),
        );

    tauri::Builder::default()
        .menu(menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "quit" => {
                app.exit(0);
            }
            "reset_layout" => {
                let _ = app.emit("tw-reset-layout", ());
            }
            "about" => {
                let _ = app.emit("tw-about", ());
            }
            _ => {}
        })
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
