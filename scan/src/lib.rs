use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::JsFuture;
use web_sys::{AbortController, Request, RequestInit, RequestMode};

#[wasm_bindgen]
pub struct Scanner;

#[wasm_bindgen]
impl Scanner {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self
    }

    pub async fn check_port(ip: String, port: u16, timeout: i32) -> bool {
        let url = format!("http://{}:{}/", ip, port);
        
        // Setup AbortController for timeout
        let controller = match AbortController::new() {
            Ok(c) => c,
            Err(_) => return false,
        };
        let signal = controller.signal();
        
        let window = match web_sys::window() {
            Some(w) => w,
            None => return false,
        };

        // Set timeout to abort request
        let timeout_cb = Closure::once(move || {
            controller.abort();
        });
        
        let timeout_id = match window.set_timeout_with_callback_and_timeout_and_arguments_0(
            timeout_cb.as_ref().unchecked_ref(),
            timeout,
        ) {
            Ok(id) => id,
            Err(_) => return false,
        };
        timeout_cb.forget(); // Leak memory for callback logic simplicity (cleaned up by browser eventually)

        let mut opts = RequestInit::new();
        opts.method("GET");
        opts.mode(RequestMode::NoCors);
        opts.signal(Some(&signal));
        
        let request = match Request::new_with_str_and_init(&url, &opts) {
            Ok(r) => r,
            Err(_) => {
                window.clear_timeout_with_handle(timeout_id);
                return false;
            },
        };

        let promise = window.fetch_with_request(&request);
        
        let result = JsFuture::from(promise).await;
        window.clear_timeout_with_handle(timeout_id);

        // If fetch succeeds (even with opaque response), the port is likely OPEN/Accessible
        // If it fails (TypeError: Failed to fetch), it's likely CLOSED or Connection Refused (or Timeout)
        result.is_ok()
    }

    pub fn get_fingerprint(ports: Vec<u16>) -> String {
        // High confidence specific devices
        if ports.contains(&62078) { return "iOS Device".to_string(); }
        if ports.contains(&5555) { return "Android Device (ADB)".to_string(); }
        if ports.contains(&9100) || ports.contains(&631) { return "Printer".to_string(); }
        if ports.contains(&8008) || ports.contains(&8009) { return "Google Cast Device (Android/TV)".to_string(); }
        if ports.contains(&554) { return "IP Camera".to_string(); }

        // General Services
        if ports.contains(&445) || ports.contains(&139) { return "File Server (SMB)".to_string(); }
        if ports.contains(&53) { return "DNS / Router".to_string(); }
        if ports.contains(&22) { return "SSH Server".to_string(); }
        
        // Web based
        if ports.contains(&80) || ports.contains(&443) || ports.contains(&8080) {
             if ports.contains(&8888) { return "Proxy/Service".to_string(); }
             return "Web Device".to_string();
        }

        if ports.contains(&5353) { return "Smart Device (mDNS)".to_string(); }
        if !ports.is_empty() { return "Unknown Network Device".to_string(); }
        "Offline".to_string()
    }
}


