import os
import json
import urllib.request
import ssl

# Configuration
MODEL_ID = "Llama-3.2-1B-Instruct-q4f32_1-MLC"
BASE_URL = f"https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f32_1-MLC/resolve/main"
TARGET_DIR = f"./Llama-3.2-1B-Instruct-q4f32_1-MLC"
TOKEN = "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"

if not os.path.exists(TARGET_DIR):
    os.makedirs(TARGET_DIR)

def download_file(filename):
    url = f"{BASE_URL}/{filename}"
    output_path = os.path.join(TARGET_DIR, filename)
    
    print(f"Downloading {filename}...")
    headers = {"Authorization": f"Bearer {TOKEN}"}
    req = urllib.request.Request(url, headers=headers)
    context = ssl._create_unverified_context()

    try:
        with urllib.request.urlopen(req, context=context) as response, open(output_path, 'wb') as out_file:
            out_file.write(response.read())
        print(f"Saved to {output_path}")
        return True
    except Exception as e:
        print(f"Error downloading {filename}: {e}")
        return False

def main():
    # 1. Download basic configs first
    files = ["mlc-chat-config.json", "ndarray-cache.json", "tokenizer.json", "tokenizer_config.json"]
    for f in files:
        download_file(f)

    # 2. Parse ndarray-cache.json for shards
    cache_path = os.path.join(TARGET_DIR, "ndarray-cache.json")
    if os.path.exists(cache_path):
        with open(cache_path, 'r') as f:
            try:
                data = json.load(f)
                records = data.get("records", [])
                for record in records:
                    path = record.get("dataPath")
                    if path:
                        download_file(path)
            except Exception as e:
                print(f"Failed to parse cache: {e}")

if __name__ == "__main__":
    main()
