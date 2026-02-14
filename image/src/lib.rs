use image::codecs::jpeg::JpegEncoder;
use image::codecs::png::PngEncoder;
use image::codecs::webp::WebPEncoder;
use image::imageops::{self, FilterType as ImageFilter};
use image::{DynamicImage, ExtendedColorType, ImageEncoder, Rgba, RgbaImage};
use js_sys::Uint8Array;
use wasm_bindgen::prelude::*;

#[cfg(feature = "console_error_panic_hook")]
#[wasm_bindgen(start)]
pub fn init_console_panic_hook() {
    console_error_panic_hook::set_once();
}

fn to_js_error(err: impl std::fmt::Display) -> JsValue {
    JsValue::from_str(&err.to_string())
}

fn decode_rgba(data: &[u8]) -> Result<RgbaImage, JsValue> {
    let img = image::load_from_memory(data).map_err(to_js_error)?;
    Ok(img.to_rgba8())
}

#[derive(Clone, Copy)]
enum EncodeFormat {
    Png,
    Jpeg,
    Webp,
}

fn parse_format(fmt: &str) -> EncodeFormat {
    match fmt.to_ascii_lowercase().as_str() {
        "jpg" | "jpeg" => EncodeFormat::Jpeg,
        "webp" => EncodeFormat::Webp,
        _ => EncodeFormat::Png,
    }
}

fn clamp_quality(q: u8) -> u8 {
    q.clamp(1, 100)
}

fn encode_rgba(img: &RgbaImage, format: EncodeFormat, quality: u8) -> Result<Vec<u8>, JsValue> {
    let mut cursor = std::io::Cursor::new(Vec::new());
    let dyn_img = DynamicImage::ImageRgba8(img.clone());

    match format {
        EncodeFormat::Png => {
            let mut encoder = PngEncoder::new(&mut cursor);
            encoder
                .write_image(
                    img.as_raw(),
                    img.width(),
                    img.height(),
                    ExtendedColorType::Rgba8,
                )
                .map_err(to_js_error)?;
        }
        EncodeFormat::Jpeg => {
            let rgb = dyn_img.to_rgb8();
            let mut encoder = JpegEncoder::new_with_quality(&mut cursor, clamp_quality(quality));
            encoder
                .encode(
                    rgb.as_raw(),
                    rgb.width(),
                    rgb.height(),
                    ExtendedColorType::Rgb8,
                )
                .map_err(to_js_error)?;
        }
        EncodeFormat::Webp => {
            WebPEncoder::new_lossless(&mut cursor)
                .encode(
                    img.as_raw(),
                    img.width(),
                    img.height(),
                    ExtendedColorType::Rgba8,
                )
                .map_err(to_js_error)?;
        }
    }

    Ok(cursor.into_inner())
}

fn pick_filter(name: &str) -> ImageFilter {
    match name.to_ascii_lowercase().as_str() {
        "nearest" => ImageFilter::Nearest,
        "triangle" => ImageFilter::Triangle,
        "catmullrom" | "catmull" => ImageFilter::CatmullRom,
        "gaussian" => ImageFilter::Gaussian,
        _ => ImageFilter::Lanczos3,
    }
}

#[wasm_bindgen]
pub fn crop_image(data: &[u8], x: u32, y: u32, width: u32, height: u32) -> Result<Uint8Array, JsValue> {
    if width == 0 || height == 0 {
        return Err(JsValue::from_str("width and height must be positive"));
    }

    let img = decode_rgba(data)?;
    let (img_w, img_h) = img.dimensions();

    if x >= img_w || y >= img_h {
        return Err(JsValue::from_str("crop origin is outside the image"));
    }

    let crop_w = width.min(img_w.saturating_sub(x));
    let crop_h = height.min(img_h.saturating_sub(y));

    let cropped = imageops::crop_imm(&img, x, y, crop_w, crop_h).to_image();
    let encoded = encode_rgba(&cropped, EncodeFormat::Png, 90)?;
    Ok(Uint8Array::from(encoded.as_slice()))
}

fn warp_point(u: f32, v: f32, pts: [f32; 8]) -> (f32, f32) {
    let (x0, y0) = (pts[0], pts[1]);
    let (x1, y1) = (pts[2], pts[3]);
    let (x2, y2) = (pts[4], pts[5]);
    let (x3, y3) = (pts[6], pts[7]);

    let src_x = (1.0 - u) * (1.0 - v) * x0
        + u * (1.0 - v) * x1
        + u * v * x2
        + (1.0 - u) * v * x3;
    let src_y = (1.0 - u) * (1.0 - v) * y0
        + u * (1.0 - v) * y1
        + u * v * y2
        + (1.0 - u) * v * y3;

    (src_x, src_y)
}

fn sample_bilinear(img: &RgbaImage, x: f32, y: f32) -> Rgba<u8> {
    let max_x = (img.width() - 1) as f32;
    let max_y = (img.height() - 1) as f32;
    let clamped_x = x.clamp(0.0, max_x);
    let clamped_y = y.clamp(0.0, max_y);

    let x0 = clamped_x.floor() as u32;
    let y0 = clamped_y.floor() as u32;
    let x1 = (x0 + 1).min(img.width() - 1);
    let y1 = (y0 + 1).min(img.height() - 1);

    let dx = clamped_x - x0 as f32;
    let dy = clamped_y - y0 as f32;

    let p00 = img.get_pixel(x0, y0).0;
    let p10 = img.get_pixel(x1, y0).0;
    let p01 = img.get_pixel(x0, y1).0;
    let p11 = img.get_pixel(x1, y1).0;

    let mut out = [0u8; 4];
    for i in 0..4 {
        let top = p00[i] as f32 * (1.0 - dx) + p10[i] as f32 * dx;
        let bottom = p01[i] as f32 * (1.0 - dx) + p11[i] as f32 * dx;
        let value = top * (1.0 - dy) + bottom * dy;
        out[i] = value.round().clamp(0.0, 255.0) as u8;
    }

    Rgba(out)
}

#[wasm_bindgen]
pub fn perspective_crop(
    data: &[u8],
    points: &[f32],
    out_width: u32,
    out_height: u32,
) -> Result<Uint8Array, JsValue> {
    if points.len() != 8 {
        return Err(JsValue::from_str("points must contain 8 numbers (x0,y0,x1,y1,x2,y2,x3,y3)"));
    }
    if out_width == 0 || out_height == 0 {
        return Err(JsValue::from_str("output size must be positive"));
    }

    let img = decode_rgba(data)?;
    let pts = [
        points[0], points[1], points[2], points[3], points[4], points[5], points[6], points[7],
    ];

    let mut output = RgbaImage::new(out_width, out_height);
    let w = out_width.max(1);
    let h = out_height.max(1);

    for y in 0..h {
        let v = if h > 1 {
            y as f32 / (h - 1) as f32
        } else {
            0.0
        };
        for x in 0..w {
            let u = if w > 1 {
                x as f32 / (w - 1) as f32
            } else {
                0.0
            };
            let (sx, sy) = warp_point(u, v, pts);
            let sample = sample_bilinear(&img, sx, sy);
            output.put_pixel(x, y, sample);
        }
    }

    let encoded = encode_rgba(&output, EncodeFormat::Png, 90)?;
    Ok(Uint8Array::from(encoded.as_slice()))
}

#[wasm_bindgen]
pub fn resize_image(
    data: &[u8],
    width: u32,
    height: u32,
    filter: &str,
) -> Result<Uint8Array, JsValue> {
    if width == 0 || height == 0 {
        return Err(JsValue::from_str("width and height must be positive"));
    }

    let img = decode_rgba(data)?;
    let filter = pick_filter(filter);
    let resized = imageops::resize(&img, width, height, filter);
    let encoded = encode_rgba(&resized, EncodeFormat::Png, 90)?;
    Ok(Uint8Array::from(encoded.as_slice()))
}

#[wasm_bindgen]
pub fn compress_image(data: &[u8], quality: u8, format: &str) -> Result<Uint8Array, JsValue> {
    let img = decode_rgba(data)?;
    let format = parse_format(format);
    let encoded = encode_rgba(&img, format, quality.max(1))?;
    Ok(Uint8Array::from(encoded.as_slice()))
}

#[wasm_bindgen]
pub fn optimize_image(
    data: &[u8],
    max_width: u32,
    max_height: u32,
    quality: u8,
    format: &str,
    allow_upscale: bool,
) -> Result<Uint8Array, JsValue> {
    if max_width == 0 && max_height == 0 {
        return Err(JsValue::from_str("provide at least one dimension to optimize"));
    }

    let img = decode_rgba(data)?;
    let (w, h) = img.dimensions();
    let format = parse_format(format);

    let mut target_w = if max_width == 0 { w } else { max_width };
    let mut target_h = if max_height == 0 { h } else { max_height };

    let scale_w = target_w as f32 / w as f32;
    let scale_h = target_h as f32 / h as f32;
    let scale = scale_w.min(scale_h);

    if !allow_upscale && scale >= 1.0 {
        let encoded = encode_rgba(&img, format, quality)?;
        return Ok(Uint8Array::from(encoded.as_slice()));
    }

    if scale > 0.0 {
        target_w = ((w as f32) * scale).round().max(1.0) as u32;
        target_h = ((h as f32) * scale).round().max(1.0) as u32;
    }

    let resized = imageops::resize(&img, target_w, target_h, ImageFilter::Lanczos3);
    let encoded = encode_rgba(&resized, format, quality)?;
    Ok(Uint8Array::from(encoded.as_slice()))
}
