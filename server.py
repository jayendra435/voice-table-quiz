"""Simple HTTPS server to serve the web quiz on localhost.

First time setup:
    python -m pip install pyopenssl
    python generate_cert.py

Then run:
    python server.py

Open https://[your-desktop-ip]:8000 on mobile (accept the security warning)
"""
import http.server
import socketserver
import ssl
import os
import webbrowser
import threading

PORT = 8000
ROOT = os.path.dirname(__file__)
os.chdir(ROOT)

# Check if SSL cert exists
cert_file = 'server.crt'
key_file = 'server.key'
if not os.path.exists(cert_file) or not os.path.exists(key_file):
    print(f"SSL certificate not found. Run: python generate_cert.py")
    exit(1)

Handler = http.server.SimpleHTTPRequestHandler

# Create HTTPS context
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(cert_file, key_file)

class HTTPSServer(socketserver.TCPServer):
    def __init__(self, server_address, RequestHandlerClass):
        super().__init__(server_address, RequestHandlerClass)
        self.socket = context.wrap_socket(self.socket, server_side=True)

url = f'https://localhost:{PORT}/'
print(f"Serving {ROOT} at {url}")
print(f"For mobile on same WiFi, use: https://[your-desktop-ip]:{PORT}/")
print(f"(Accept the security warning in your browser)")

# Open browser in background thread to avoid blocking server
def open_browser():
    try:
        webbrowser.open(url)
    except Exception:
        pass

threading.Thread(target=open_browser, daemon=True).start()

httpd = HTTPSServer(("", PORT), Handler)

try:
    httpd.serve_forever()
except KeyboardInterrupt:
    print('\nServer stopped')
finally:
    httpd.server_close()

