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
            let node = std::env::current_exe()?
                .parent()
                .expect("executable has a parent directory")
                .join("node");
            let resources = app.path().resource_dir()?;
            let shim = resources
                .join("server")
                .join("scripts")
                .join("desktop-server.mjs");

            let mut child = Command::new(&node)
                .arg(&shim)
                .stdout(Stdio::piped())
                .stderr(Stdio::inherit())
                .spawn()
                .unwrap_or_else(|e|

                    panic!("failed to start the embedded server ({}): {e}", shim.display())
                );

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
