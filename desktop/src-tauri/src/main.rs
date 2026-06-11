// TrainingGeeks desktop shell.
//
// The whole app is the existing Next.js server: a bundled Node runtime
// (externalBin, beside this executable) runs scripts/desktop-server.mjs from
// the bundled resources, which boots the standalone server on a free
// localhost-only port and prints "READY <port>". We show a splash until that
// line arrives, then point the webview at the local server. On quit the
// server is taken down with us (SIGTERM first so SQLite closes cleanly).

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use tauri::{Manager, RunEvent};

struct ServerProc(Mutex<Option<Child>>);

fn main() {
    tauri::Builder::default()
        .manage(ServerProc(Mutex::new(None)))
        .setup(|app| {
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
            *app.state::<ServerProc>().0.lock().unwrap() = Some(child);

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
                        let url = format!("http://127.0.0.1:{}/", port.trim());
                        let h = handle.clone();
                        let _ = handle.run_on_main_thread(move || {
                            if let Some(win) = h.get_webview_window("main") {
                                let _ = win.eval(&format!(
                                    "window.location.replace('{url}')"
                                ));
                            }
                        });
                    }
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building the application")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                if let Some(mut child) = app.state::<ServerProc>().0.lock().unwrap().take() {
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
        });
}
