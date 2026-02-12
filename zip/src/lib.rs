use std::io::{Cursor, Write};

use js_sys::{Array, Uint8Array};
use wasm_bindgen::prelude::*;
use zip::write::FileOptions;
use zip::{CompressionMethod, ZipWriter};

#[cfg(feature = "console_error_panic_hook")]
#[wasm_bindgen(start)]
pub fn init_console_panic_hook() {
    console_error_panic_hook::set_once();
}

fn to_js_error(err: impl std::fmt::Display) -> JsValue {
    JsValue::from_str(&err.to_string())
}

/// Build a ZIP archive in-memory using the provided file names and byte buffers.
#[wasm_bindgen]
pub fn zip_files(names: Array, contents: Array) -> Result<Uint8Array, JsValue> {
    let name_count = names.length();
    if name_count == 0 {
        return Err(JsValue::from_str("no files provided"));
    }

    if name_count != contents.length() {
        return Err(JsValue::from_str("names and contents length mismatch"));
    }

    let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
    let options = FileOptions::default()
        .compression_method(CompressionMethod::Deflated)
        .unix_permissions(0o644);

    for idx in 0..name_count {
        let mut name = names
            .get(idx)
            .as_string()
            .ok_or_else(|| JsValue::from_str("file names must be strings"))?;

        if name.contains("..") {
            return Err(JsValue::from_str("parent traversal is not allowed"));
        }

        while name.starts_with('/') || name.starts_with('\\') {
            name.remove(0);
        }

        if name.is_empty() {
            return Err(JsValue::from_str("file name cannot be empty"));
        }

        let raw = contents.get(idx);
        let data = Uint8Array::new(&raw).to_vec();

        writer
            .start_file(name, options)
            .map_err(|err| JsValue::from_str(&format!("unable to add file #{idx}: {err}")))?;
        writer
            .write_all(&data)
            .map_err(|err| JsValue::from_str(&format!("unable to write file #{idx}: {err}")))?;
    }

    let cursor = writer.finish().map_err(to_js_error)?;
    let bytes = cursor.into_inner();

    Ok(Uint8Array::from(bytes.as_slice()))
}
