#!/usr/bin/env python3
"""
Custom HTTP server with SharedArrayBuffer support for FFmpeg.wasm
Serves files with required COOP/COEP headers for SharedArrayBuffer
"""

import http.server
import socketserver
import os
from urllib.parse import unquote
import mimetypes

class SharedArrayBufferHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add required headers for SharedArrayBuffer support
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        # Also add some other useful headers
        self.send_header('Cross-Origin-Resource-Policy', 'cross-origin')
        super().end_headers()

    def do_GET(self):
        # Handle range requests for video files
        if 'Range' in self.headers:
            self.handle_range_request()
        else:
            super().do_GET()

    def handle_range_request(self):
        """Handle HTTP range requests for video seeking"""
        try:
            path = self.translate_path(self.path)
            if not os.path.exists(path):
                self.send_error(404, "File not found")
                return

            file_size = os.path.getsize(path)
            range_header = self.headers['Range']

            # Parse range header (e.g., "bytes=0-1023")
            if not range_header.startswith('bytes='):
                self.send_error(416, "Invalid range")
                return

            range_spec = range_header[6:]
            if '-' not in range_spec:
                self.send_error(416, "Invalid range")
                return

            start_str, end_str = range_spec.split('-', 1)
            start = int(start_str) if start_str else 0
            end = int(end_str) if end_str else file_size - 1

            if start >= file_size or end >= file_size or start > end:
                self.send_error(416, "Range not satisfiable")
                return

            content_length = end - start + 1

            self.send_response(206)
            self.send_header('Content-Type', self.guess_type(path))
            self.send_header('Accept-Ranges', 'bytes')
            self.send_header('Content-Range', f'bytes {start}-{end}/{file_size}')
            self.send_header('Content-Length', str(content_length))
            # Add SharedArrayBuffer headers
            self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
            self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
            self.send_header('Cross-Origin-Resource-Policy', 'cross-origin')
            self.end_headers()

            with open(path, 'rb') as f:
                f.seek(start)
                self.wfile.write(f.read(content_length))

        except Exception as e:
            self.send_error(500, f"Range request error: {str(e)}")

    def guess_type(self, path):
        """Guess the MIME type of a file"""
        mime_type, _ = mimetypes.guess_type(path)
        if mime_type:
            return mime_type
        # Default MIME types for common web files
        if path.endswith('.js'):
            return 'application/javascript'
        elif path.endswith('.wasm'):
            return 'application/wasm'
        elif path.endswith('.json'):
            return 'application/json'
        elif path.endswith('.webmanifest'):
            return 'application/manifest+json'
        return 'application/octet-stream'

def run_server(port=8080, directory='.'):
    """Run the custom server"""
    os.chdir(directory)

    with socketserver.TCPServer(("", port), SharedArrayBufferHandler) as httpd:
        print(f"🚀 Server running at http://localhost:{port}")
        print("📋 Headers enabled for SharedArrayBuffer:")
        print("   - Cross-Origin-Opener-Policy: same-origin")
        print("   - Cross-Origin-Embedder-Policy: require-corp")
        print("   - Cross-Origin-Resource-Policy: cross-origin")
        print("\nPress Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n👋 Server stopped")

if __name__ == "__main__":
    import sys

    port = 8080
    directory = '.'

    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("Invalid port number")

    if len(sys.argv) > 2:
        directory = sys.argv[2]

    run_server(port, directory)