use js_sys::Uint8Array;
use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[cfg(feature = "console_error_panic_hook")]
#[wasm_bindgen(start)]
pub fn init_console_panic_hook() {
    console_error_panic_hook::set_once();
}

#[derive(Serialize, Deserialize)]
pub struct VideoFileInfo {
    pub name: String,
    pub size: usize,
    pub mime_type: String,
    pub extension: String,
    pub is_supported: bool,
    pub estimated_codec: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct TrimParams {
    pub start_time: f64,
    pub end_time: f64,
    pub duration: f64,
    pub is_valid: bool,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct CropParams {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
    pub is_valid: bool,
    pub error: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct VideoProcessingParams {
    pub trim: Option<TrimParams>,
    pub crop: Option<CropParams>,
    pub ffmpeg_filters: String,
    pub is_valid: bool,
    pub errors: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct BatchValidationResult {
    pub total: usize,
    pub supported: usize,
    pub unsupported: usize,
    pub total_size: usize,
    pub files: Vec<VideoFileInfo>,
}

const SUPPORTED_VIDEO_EXTENSIONS: &[&str] = &[
    "mp4", "webm", "ogg", "ogv", "mov", "avi", "mkv", "flv", "wmv", "m4v", "3gp", "mpeg", "mpg",
];

const VIDEO_SIGNATURES: &[(&[u8], &str, &str)] = &[
    // (signature bytes, format, codec estimate)
    (b"\x00\x00\x00\x18ftypmp4", "MP4", "H.264/AAC"),
    (b"\x00\x00\x00\x1cftypisom", "MP4", "H.264/AAC"),
    (b"\x1A\x45\xDF\xA3", "WebM/MKV", "VP8/VP9/AV1"),
    (b"RIFF", "AVI", "Various"),
    (b"\x00\x00\x00\x14ftypqt", "MOV", "H.264/AAC"),
    (b"FLV", "FLV", "H.264/AAC"),
];

/// Validate a single video file's name and basic metadata
#[wasm_bindgen]
pub fn validate_video_file(name: String, size: usize, mime_type: String) -> JsValue {
    let extension = name.rsplit('.').next().unwrap_or("").to_lowercase();
    
    let is_supported = SUPPORTED_VIDEO_EXTENSIONS.contains(&extension.as_str())
        || mime_type.starts_with("video/");
    
    let info = VideoFileInfo {
        name,
        size,
        mime_type,
        extension,
        is_supported,
        estimated_codec: None,
    };
    
    serde_wasm_bindgen::to_value(&info).unwrap_or(JsValue::NULL)
}

/// Analyze video file header to detect format and codec
#[wasm_bindgen]
pub fn analyze_video_header(file_name: String, header_bytes: Uint8Array) -> JsValue {
    let bytes = header_bytes.to_vec();
    let extension = file_name.rsplit('.').next().unwrap_or("").to_lowercase();
    
    let mut estimated_codec = None;
    let mut detected_format = None;
    
    // Check magic bytes
    for (signature, format, codec) in VIDEO_SIGNATURES {
        if starts_with_pattern(&bytes, signature) {
            detected_format = Some(format.to_string());
            estimated_codec = Some(codec.to_string());
            break;
        }
    }
    
    // If no signature matched, use extension
    if detected_format.is_none() {
        detected_format = Some(extension.to_uppercase());
    }
    
    let info = VideoFileInfo {
        name: file_name.clone(),
        size: bytes.len(),
        mime_type: format!("video/{}", extension),
        extension,
        is_supported: SUPPORTED_VIDEO_EXTENSIONS.contains(&detected_format.as_ref().unwrap().to_lowercase().as_str()),
        estimated_codec,
    };
    
    serde_wasm_bindgen::to_value(&info).unwrap_or(JsValue::NULL)
}

/// Validate a batch of video files
#[wasm_bindgen]
pub fn validate_video_batch(files_js: JsValue) -> JsValue {
    let files: Vec<VideoFileInfo> = serde_wasm_bindgen::from_value(files_js).unwrap_or_default();
    
    let total = files.len();
    let supported = files.iter().filter(|f| f.is_supported).count();
    let unsupported = total - supported;
    let total_size = files.iter().map(|f| f.size).sum();
    
    let result = BatchValidationResult {
        total,
        supported,
        unsupported,
        total_size,
        files,
    };
    
    serde_wasm_bindgen::to_value(&result).unwrap_or(JsValue::NULL)
}

/// Convert bytes to human-readable size
#[wasm_bindgen]
pub fn format_file_size(bytes: usize) -> String {
    if bytes < 1024 {
        format!("{} B", bytes)
    } else if bytes < 1024 * 1024 {
        format!("{:.1} KB", bytes as f64 / 1024.0)
    } else if bytes < 1024 * 1024 * 1024 {
        format!("{:.2} MB", bytes as f64 / (1024.0 * 1024.0))
    } else {
        format!("{:.2} GB", bytes as f64 / (1024.0 * 1024.0 * 1024.0))
    }
}

/// Check if video format is web-compatible (can be played in browser)
#[wasm_bindgen]
pub fn is_web_compatible(extension: String) -> bool {
    matches!(extension.to_lowercase().as_str(), "mp4" | "webm" | "ogg" | "ogv")
}

/// Get recommended output format based on codec support
#[wasm_bindgen]
pub fn get_recommended_format(has_h264: bool, has_vp9: bool, has_av1: bool) -> String {
    if has_av1 {
        "webm".to_string() // Modern browsers with AV1
    } else if has_vp9 {
        "webm".to_string() // VP9 support
    } else if has_h264 {
        "mp4".to_string() // H.264 fallback
    } else {
        "mp4".to_string() // Safe default
    }
}

// Helper function to check if bytes start with a pattern
fn starts_with_pattern(bytes: &[u8], pattern: &[u8]) -> bool {
    if bytes.len() < pattern.len() {
        return false;
    }
    
    for i in 0..pattern.len() {
        // Skip wildcard bytes (represented as 0xFF in some patterns)
        if pattern[i] != 0xFF && bytes[i] != pattern[i] {
            return false;
        }
    }
    
    true
}

/// Validate and normalize trim parameters
#[wasm_bindgen]
pub fn validate_trim(start: f64, end: f64, video_duration: f64) -> JsValue {
    let mut is_valid = true;
    let mut error = None;
    
    // Validate start time
    if start < 0.0 {
        is_valid = false;
        error = Some("Start time cannot be negative".to_string());
    } else if start >= video_duration {
        is_valid = false;
        error = Some("Start time exceeds video duration".to_string());
    }
    
    // Validate end time
    if end <= start {
        is_valid = false;
        error = Some("End time must be greater than start time".to_string());
    } else if end > video_duration {
        is_valid = false;
        error = Some("End time exceeds video duration".to_string());
    }
    
    let duration = if is_valid { end - start } else { 0.0 };
    
    let params = TrimParams {
        start_time: start,
        end_time: end,
        duration,
        is_valid,
        error,
    };
    
    serde_wasm_bindgen::to_value(&params).unwrap_or(JsValue::NULL)
}

/// Validate and normalize crop parameters
#[wasm_bindgen]
pub fn validate_crop(x: u32, y: u32, width: u32, height: u32, video_width: u32, video_height: u32) -> JsValue {
    let mut is_valid = true;
    let mut error = None;
    
    // Must have even dimensions for H.264 encoding
    let adjusted_width = if width % 2 != 0 { width - 1 } else { width };
    let adjusted_height = if height % 2 != 0 { height - 1 } else { height };
    
    // Validate crop region is within video bounds
    if x + adjusted_width > video_width {
        is_valid = false;
        error = Some("Crop region exceeds video width".to_string());
    }
    
    if y + adjusted_height > video_height {
        is_valid = false;
        error = Some("Crop region exceeds video height".to_string());
    }
    
    // Minimum crop size (avoid tiny dimensions)
    if adjusted_width < 64 || adjusted_height < 64 {
        is_valid = false;
        error = Some("Crop dimensions too small (minimum 64x64)".to_string());
    }
    
    let params = CropParams {
        x,
        y,
        width: adjusted_width,
        height: adjusted_height,
        is_valid,
        error,
    };
    
    serde_wasm_bindgen::to_value(&params).unwrap_or(JsValue::NULL)
}

/// Calculate optimal crop dimensions maintaining aspect ratio
#[wasm_bindgen]
pub fn calculate_crop_with_aspect_ratio(
    original_width: u32,
    original_height: u32,
    target_aspect_num: u32,
    target_aspect_den: u32,
) -> JsValue {
    let original_aspect = original_width as f64 / original_height as f64;
    let target_aspect = target_aspect_num as f64 / target_aspect_den as f64;
    
    let (width, height, x, y) = if original_aspect > target_aspect {
        // Video is wider, crop width
        let new_width = (original_height as f64 * target_aspect).round() as u32;
        let new_width = new_width - (new_width % 2); // Ensure even
        let x_offset = (original_width - new_width) / 2;
        (new_width, original_height, x_offset, 0)
    } else {
        // Video is taller, crop height
        let new_height = (original_width as f64 / target_aspect).round() as u32;
        let new_height = new_height - (new_height % 2); // Ensure even
        let y_offset = (original_height - new_height) / 2;
        (original_width, new_height, 0, y_offset)
    };
    
    let params = CropParams {
        x,
        y,
        width,
        height,
        is_valid: true,
        error: None,
    };
    
    serde_wasm_bindgen::to_value(&params).unwrap_or(JsValue::NULL)
}

/// Generate FFmpeg filter string for crop and trim
#[wasm_bindgen]
pub fn generate_ffmpeg_filters(crop_js: JsValue, scale_width: Option<u32>, scale_height: Option<u32>) -> String {
    let mut filters = Vec::new();
    
    // Add crop filter if provided
    if !crop_js.is_null() && !crop_js.is_undefined() {
        if let Ok(crop) = serde_wasm_bindgen::from_value::<CropParams>(crop_js) {
            if crop.is_valid {
                filters.push(format!("crop={}:{}:{}:{}", crop.width, crop.height, crop.x, crop.y));
            }
        }
    }
    
    // Add scale filter if provided
    if let (Some(w), Some(h)) = (scale_width, scale_height) {
        // Ensure even dimensions
        let w = if w % 2 != 0 { w - 1 } else { w };
        let h = if h % 2 != 0 { h - 1 } else { h };
        filters.push(format!("scale={}:{}", w, h));
    }
    
    if filters.is_empty() {
        "null".to_string()
    } else {
        filters.join(",")
    }
}

/// Build complete video processing parameters
#[wasm_bindgen]
pub fn build_processing_params(
    trim_js: JsValue,
    crop_js: JsValue,
    scale_width: Option<u32>,
    scale_height: Option<u32>,
) -> JsValue {
    let mut errors = Vec::new();
    let mut is_valid = true;
    
    // Parse trim params
    let trim: Option<TrimParams> = if !trim_js.is_null() && !trim_js.is_undefined() {
        match serde_wasm_bindgen::from_value(trim_js.clone()) {
            Ok(t) => {
                let trim: TrimParams = t;
                if !trim.is_valid {
                    is_valid = false;
                    if let Some(err) = &trim.error {
                        errors.push(format!("Trim error: {}", err));
                    }
                }
                Some(trim)
            }
            Err(_) => {
                errors.push("Invalid trim parameters".to_string());
                is_valid = false;
                None
            }
        }
    } else {
        None
    };
    
    // Parse crop params
    let crop: Option<CropParams> = if !crop_js.is_null() && !crop_js.is_undefined() {
        match serde_wasm_bindgen::from_value(crop_js.clone()) {
            Ok(c) => {
                let crop: CropParams = c;
                if !crop.is_valid {
                    is_valid = false;
                    if let Some(err) = &crop.error {
                        errors.push(format!("Crop error: {}", err));
                    }
                }
                Some(crop)
            }
            Err(_) => {
                errors.push("Invalid crop parameters".to_string());
                is_valid = false;
                None
            }
        }
    } else {
        None
    };
    
    // Generate FFmpeg filter string
    let ffmpeg_filters = generate_ffmpeg_filters(crop_js, scale_width, scale_height);
    
    let params = VideoProcessingParams {
        trim,
        crop,
        ffmpeg_filters,
        is_valid,
        errors,
    };
    
    serde_wasm_bindgen::to_value(&params).unwrap_or(JsValue::NULL)
}

/// Format time in seconds to HH:MM:SS.mmm
#[wasm_bindgen]
pub fn format_timestamp(seconds: f64) -> String {
    let hours = (seconds / 3600.0).floor() as u32;
    let minutes = ((seconds % 3600.0) / 60.0).floor() as u32;
    let secs = seconds % 60.0;
    
    if hours > 0 {
        format!("{:02}:{:02}:{:06.3}", hours, minutes, secs)
    } else {
        format!("{:02}:{:06.3}", minutes, secs)
    }
}

/// Parse timestamp string (HH:MM:SS.mmm or MM:SS.mmm or SS.mmm) to seconds
#[wasm_bindgen]
pub fn parse_timestamp(timestamp: String) -> f64 {
    let parts: Vec<&str> = timestamp.split(':').collect();
    
    match parts.len() {
        1 => {
            // Just seconds
            parts[0].parse::<f64>().unwrap_or(0.0)
        }
        2 => {
            // MM:SS
            let minutes = parts[0].parse::<f64>().unwrap_or(0.0);
            let seconds = parts[1].parse::<f64>().unwrap_or(0.0);
            minutes * 60.0 + seconds
        }
        3 => {
            // HH:MM:SS
            let hours = parts[0].parse::<f64>().unwrap_or(0.0);
            let minutes = parts[1].parse::<f64>().unwrap_or(0.0);
            let seconds = parts[2].parse::<f64>().unwrap_or(0.0);
            hours * 3600.0 + minutes * 60.0 + seconds
        }
        _ => 0.0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_format_file_size() {
        assert_eq!(format_file_size(500), "500 B");
        assert_eq!(format_file_size(1536), "1.5 KB");
        assert_eq!(format_file_size(2_097_152), "2.00 MB");
        assert_eq!(format_file_size(3_221_225_472), "3.00 GB");
    }
    
    #[test]
    fn test_web_compatibility() {
        assert!(is_web_compatible("mp4".to_string()));
        assert!(is_web_compatible("webm".to_string()));
        assert!(!is_web_compatible("avi".to_string()));
        assert!(!is_web_compatible("mkv".to_string()));
    }
    
    #[test]
    fn test_format_timestamp() {
        assert_eq!(format_timestamp(65.5), "01:05.500");
        assert_eq!(format_timestamp(3665.123), "01:01:05.123");
        assert_eq!(format_timestamp(0.0), "00:00.000");
    }
    
    #[test]
    fn test_parse_timestamp() {
        assert_eq!(parse_timestamp("65.5".to_string()), 65.5);
        assert_eq!(parse_timestamp("01:05.5".to_string()), 65.5);
        assert_eq!(parse_timestamp("01:01:05.5".to_string()), 3665.5);
    }
}
