// TrainingGeeks desktop shell.
//
// The whole app is the existing Next.js server: a bundled Node runtime
// (externalBin, beside this executable) runs scripts/desktop-server.mjs from
// the bundled resources, which boots the standalone server on a free
// localhost-only port and prints "READY <port>". We show a splash until that
// line arrives, then point the webview at the local server. On quit the
// server is taken down with us (SIGTERM first so SQLite closes cleanly).
//
// macOS behaviour: .fit files opened from Finder or dropped on the Dock icon
// are POSTed to the running server's /api/import; cmd+W hides the window
// (server keeps running, Dock click brings it back); cmd+Q shuts everything
// down.

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::menu::{CheckMenuItem, Menu, MenuItemKind};
use tauri::{AppHandle, Manager, RunEvent, WindowEvent};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

#[derive(Default)]
struct Server {
    proc: Mutex<Option<Child>>,
    /// Port the sidecar reported READY on — None until it does.
    port: Mutex<Option<String>>,
    /// Files macOS asked us to open before the server was ready.
    pending: Mutex<Vec<PathBuf>>,
}

/// Navigate the main window to a path on the running server.
fn navigate(app: &AppHandle, port: &str, path: &str) {
    let url = format!("http://127.0.0.1:{port}{path}");
    let h = app.clone();
    let _ = app.run_on_main_thread(move || {
        if let Some(win) = h.get_webview_window("main") {
            let _ = win.eval(&format!("window.location.replace('{url}')"));
        }
    });
}

/// Hand FIT files to the server's existing import endpoint. curl is part of
/// macOS, so the shell needs no HTTP client of its own; the import (parse +
/// fitness recompute) can take seconds, hence the thread.
fn import(app: &AppHandle, port: String, paths: Vec<PathBuf>) {
    let app = app.clone();
    std::thread::spawn(move || {
        let mut curl = Command::new("curl");
        curl.args(["-sS", "-X", "POST"]);
        for p in &paths {
            // Quoted so a path containing ; or , is not read as form syntax.
            curl.arg("-F").arg(format!("files=@\"{}\"", p.display()));
        }
        curl.arg(format!("http://127.0.0.1:{port}/api/import"));
        match curl.output() {
            Ok(out) if out.status.success() => {
                println!("[import] {}", String::from_utf8_lossy(&out.stdout).trim());
                navigate(&app, &port, "/");
            }
            Ok(out) => eprintln!(
                "[import] failed: {}",
                String::from_utf8_lossy(&out.stderr).trim()
            ),
            Err(e) => eprintln!("[import] could not run curl: {e}"),
        }
    });
}

/// Finder open / Dock drop. Queues the files if the server is still booting.
fn open_files(app: &AppHandle, paths: Vec<PathBuf>) {
    if paths.is_empty() {
        return;
    }
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.show();
        let _ = win.set_focus();
    }
    let state = app.state::<Server>();
    let port = state.port.lock().unwrap().clone();
    match port {
        Some(port) => import(app, port, paths),
        None => state.pending.lock().unwrap().extend(paths),
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(Server::default())
        .on_menu_event(|app, event| {
            if event.id() == "start-at-login" {
                // The check mark toggles itself; mirror it in the launch agent.
                let mgr = app.autolaunch();
                let r = if mgr.is_enabled().unwrap_or(false) {
                    mgr.disable()
                } else {
                    mgr.enable()
                };
                if let Err(e) = r {
                    eprintln!("[autostart] {e}");
                }
            }
        })
        .setup(|app| {
            // "Start at Login" goes in the app menu, right under About — the
            // web UI is served by the sidecar and has no Tauri IPC access.
            let checked = app.handle().autolaunch().is_enabled().unwrap_or(false);
            let toggle = CheckMenuItem::with_id(
                app.handle(),
                "start-at-login",
                "Start at Login",
                true,
                checked,
                None::<&str>,
            )?;
            let menu = Menu::default(app.handle())?;
            if let Some(MenuItemKind::Submenu(app_menu)) = menu.items()?.into_iter().next() {
                app_menu.insert(&toggle, 1)?;
            }
            app.set_menu(menu)?;

            let exe = std::env::current_exe()?;
            let macos_dir = exe
                .parent()
                .expect("executable has a parent directory")
                .to_path_buf();
            let node = macos_dir.join("node");

            // macOS bundle layout is fixed: Contents/MacOS -> Contents/Resources.
            // Derive it from the exe path (resource_dir() panics when the
            // binary is launched directly), falling back to the API.
            let resources = macos_dir
                .parent()
                .map(|contents| contents.join("Resources"))
                .filter(|p| p.join("server").exists())
                .or_else(|| app.path().resource_dir().ok())
                .expect("cannot locate bundled resources");
            let shim = resources
                .join("server")
                .join("scripts")
                .join("desktop-server.mjs");

            let fail = |app: &tauri::App, msg: String| {
                eprintln!("{msg}");
                if let Some(win) = app.get_webview_window("main") {
                    let safe = msg.replace('`', "'").replace('\\', "/");
                    let _ = win.eval(&format!(
                        "document.querySelector('.sub').textContent = `{safe}`"
                    ));
                }
            };

            let mut child = match Command::new(&node)
                .arg(&shim)
                .stdout(Stdio::piped())
                .stderr(Stdio::inherit())
                .spawn()
            {
                Ok(c) => c,
                Err(e) => {
                    fail(app, format!("Could not start the training server: {e}"));
                    return Ok(());
                }
            };

            let stdout = child.stdout.take().expect("server stdout is piped");
            *app.state::<Server>().proc.lock().unwrap() = Some(child);

            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let mut navigated = false;
                // Keep draining stdout for the server's lifetime so the pipe
                // never fills and blocks it.
                for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                    println!("[server] {line}");
                    if navigated {
                        continue;
                    }
                    if let Some(port) = line.strip_prefix("READY ") {
                        navigated = true;
                        let port = port.trim().to_string();
                        let state = handle.state::<Server>();
                        *state.port.lock().unwrap() = Some(port.clone());
                        navigate(&handle, &port, "/");
                        let queued: Vec<PathBuf> =
                            state.pending.lock().unwrap().drain(..).collect();
                        if !queued.is_empty() {
                            import(&handle, port, queued);
                        }
                    }
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building the application")
        .run(|app, event| match event {
            // A FIT double-clicked in Finder or dropped on the Dock icon.
            #[cfg(target_os = "macos")]
            RunEvent::Opened { urls } => {
                let paths = urls.iter().filter_map(|u| u.to_file_path().ok()).collect();
                open_files(app, paths);
            }
            // cmd+W hides the window instead of destroying it: the sidecar
            // keeps running (and syncing), and the state is still there when
            // the Dock icon brings it back.
            RunEvent::WindowEvent {
                label,
                event: WindowEvent::CloseRequested { api, .. },
                ..
            } => {
                if let Some(win) = app.get_webview_window(&label) {
                    api.prevent_close();
                    let _ = win.hide();
                }
            }
            #[cfg(target_os = "macos")]
            RunEvent::Reopen { .. } => {
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.show();
                    let _ = win.set_focus();
                }
            }
            RunEvent::Exit => {
                if let Some(mut child) = app.state::<Server>().proc.lock().unwrap().take() {
                    // Graceful first — the shim forwards SIGTERM to the
                    // server so SQLite checkpoints and closes.
                    #[cfg(unix)]
                    {
                        let _ = Command::new("kill")
                            .args(["-TERM", &child.id().to_string()])
                            .status();
                        std::thread::sleep(std::time::Duration::from_millis(800));
                    }
                    let _ = child.kill();
                    let _ = child.wait();
                }
            }
            _ => {}
        });
}
