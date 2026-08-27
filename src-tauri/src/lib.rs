//! The Orelis native shell.
//!
//! Deliberately thin. Everything clinical lives in the web bundle, so this file
//! only does what a webview cannot: register plugins, keep one instance, and put
//! a tray icon in the system tray on desktop.
//!
//! Anything added here has to be written three times (desktop, Android, iOS) and
//! cannot be hot-reloaded, so the bar for putting logic in Rust is high — if the
//! webview can do it, it should.

#[cfg(desktop)]
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default();

    // ---------------------------------------------------------------------
    // Single instance must be registered FIRST.
    //
    // The plugin works by claiming a lock during registration; if another plugin
    // that touches the same window is registered before it, the second launch can
    // briefly create a window before being told to exit. Registering it first is
    // the documented requirement, not a style preference.
    //
    // For an EMR this matters more than for most apps: two windows on one machine
    // means two SQLite handles on one file, and SQLite's write lock will make one
    // of them start failing writes.
    // ---------------------------------------------------------------------
    #[cfg(desktop)]
    let builder = builder.plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
        // A second launch focuses the window that already exists rather than
        // opening another one. Without this the second launch appears to do
        // nothing at all, and users double-click again.
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.show();
            let _ = window.unminimize();
            let _ = window.set_focus();
        }
    }));

    let builder = builder
        // The local mirror. See Cargo.toml for why the `sqlite` feature is
        // load-bearing.
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_os::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                // Clinical support calls start with "what did it say when it
                // failed". Without a log file on disk the answer is always "the
                // user closed the window", so keep a rolling file alongside
                // stdout.
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir { file_name: None },
                ))
                .level(log::LevelFilter::Info)
                .build(),
        );

    #[cfg(desktop)]
    let builder = builder
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init());

    builder
        .setup(|_app| {
            // Tray icon: a clinician keeps Orelis open all shift, and on Windows
            // a minimised window is easy to lose. Desktop only — mobile has no
            // tray.
            #[cfg(desktop)]
            {
                let open = MenuItem::with_id(_app, "open", "Open Orelis", true, None::<&str>)?;
                let quit = MenuItem::with_id(_app, "quit", "Quit", true, None::<&str>)?;
                let menu = Menu::with_items(_app, &[&open, &quit])?;

                TrayIconBuilder::new()
                    .icon(_app.default_window_icon().unwrap().clone())
                    .menu(&menu)
                    .tooltip("Orelis")
                    // Left-click should reopen, which is what users expect on
                    // Windows; without this the menu is the only way back.
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "open" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => app.exit(0),
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        use tauri::tray::{MouseButton, MouseButtonState, TrayIconEvent};
                        if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        } = event
                        {
                            if let Some(window) = tray.app_handle().get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.unminimize();
                                let _ = window.set_focus();
                            }
                        }
                    })
                    .build(_app)?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Orelis");
}
