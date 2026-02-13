use wasm_bindgen::prelude::*;
use js_sys::Date;
use serde::{Deserialize, Serialize};

#[cfg(feature = "console_error_panic_hook")]
fn set_hook() {
    console_error_panic_hook::set_once();
}

#[cfg(not(feature = "console_error_panic_hook"))]
fn set_hook() {}

#[wasm_bindgen]
pub fn init_panic_hook() {
    set_hook();
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    System,
    User,
    Assistant,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: Role,
    pub content: String,
    pub timestamp: f64,
}

#[derive(Serialize)]
pub struct ConversationSnapshot {
    pub context: String,
    pub messages: Vec<ChatMessage>,
}

#[wasm_bindgen]
pub struct ConversationManager {
    system_context: String,
    messages: Vec<ChatMessage>,
}

#[wasm_bindgen]
impl ConversationManager {
    #[wasm_bindgen(constructor)]
    pub fn new(system_context: String) -> ConversationManager {
        init_panic_hook();
        ConversationManager {
            system_context: system_context.trim().to_string(),
            messages: Vec::new(),
        }
    }

    #[wasm_bindgen(js_name = context)]
    pub fn context(&self) -> String {
        self.system_context.clone()
    }

    #[wasm_bindgen(js_name = setContext)]
    pub fn set_context(&mut self, context: String) {
        self.system_context = context.trim().to_string();
    }

    pub fn reset(&mut self) {
        self.messages.clear();
    }

    #[wasm_bindgen(js_name = appendUser)]
    pub fn append_user(&mut self, content: String) -> Result<(), JsValue> {
        self.push_message(Role::User, content)
    }

    #[wasm_bindgen(js_name = appendAssistant)]
    pub fn append_assistant(&mut self, content: String) -> Result<(), JsValue> {
        self.push_message(Role::Assistant, content)
    }

    pub fn is_empty(&self) -> bool {
        self.messages.is_empty()
    }

    pub fn length(&self) -> usize {
        self.messages.len()
    }

    #[wasm_bindgen(js_name = history)]
    pub fn history(&self) -> Result<JsValue, JsValue> {
        let snapshot = ConversationSnapshot {
            context: self.system_context.clone(),
            messages: self.messages.clone(),
        };
        serde_wasm_bindgen::to_value(&snapshot)
            .map_err(|err| JsValue::from_str(&format!("Failed to serialize history: {err}")))
    }

    #[wasm_bindgen(js_name = conversationMessages)]
    pub fn conversation_messages(&self) -> Result<JsValue, JsValue> {
        let mut combined = Vec::with_capacity(self.messages.len() + 1);
        if !self.system_context.trim().is_empty() {
            combined.push(ChatMessage {
                role: Role::System,
                content: self.system_context.clone(),
                timestamp: 0.0,
            });
        }
        combined.extend(self.messages.clone());
        serde_wasm_bindgen::to_value(&combined)
            .map_err(|err| JsValue::from_str(&format!("Failed to serialize payload: {err}")))
    }

    fn push_message(&mut self, role: Role, content: String) -> Result<(), JsValue> {
        let cleaned = content.trim();
        if cleaned.is_empty() {
            return Err(JsValue::from_str("Message cannot be empty"));
        }
        self.messages.push(ChatMessage {
            role,
            content: cleaned.to_string(),
            timestamp: Date::now(),
        });
        Ok(())
    }
}
