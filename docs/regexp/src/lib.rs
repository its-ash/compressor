use wasm_bindgen::prelude::*;
use grex::RegExpBuilder;

#[wasm_bindgen]
pub fn generate_regex(match_strings: JsValue) -> String {
    let matches: Vec<String> = serde_wasm_bindgen::from_value(match_strings).unwrap_or_default();
    
    // Filter empty strings if present
    let valid_matches: Vec<&str> = matches.iter()
        .map(|s| s.as_str())
        .filter(|s| !s.is_empty())
        .collect();

    if valid_matches.is_empty() {
        return String::from("");
    }

    let mut builder = RegExpBuilder::from(&valid_matches);
    builder.with_conversion_of_digits()
           .with_conversion_of_words()
           .with_conversion_of_repetitions(); // This might be default or explicit
    
    // Attempt to use conversion of other tokens if possible, but standard builder has digits/words/repetitions as main token types.

    builder.build()
}
