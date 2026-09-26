import os
import sys
import json
import time
from http.server import HTTPServer, BaseHTTPRequestHandler

VERSION = os.getenv("APP_VERSION", "v1.0.0")
APP_MODE = os.getenv("APP_MODE", "normal") # normal, db_failure, oom

print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [INFO] Starting Payment API service version {VERSION} in mode '{APP_MODE}'...")

if APP_MODE == "oom":
    print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [WARN] Memory allocation trigger active. Allocating memory buffer...")
    # Exponential allocation to trigger Linux cgroup OOM killer against 64Mi/128Mi container limit
    buf = []
    try:
        for i in range(100):
            print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [WARN] Allocating block {i} (10MB)...")
            buf.append(b"X" * (10 * 1024 * 1024))
            time.sleep(0.1)
    except MemoryError:
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [FATAL] Python MemoryError: Unable to allocate additional heap memory.")
        sys.exit(137)

class PaymentHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        sys.stdout.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [HTTP] {self.address_string()} - {format%args}\n")
        sys.stdout.flush()

    def do_GET(self):
        if self.path == "/health":
            if APP_MODE == "db_failure":
                self.send_response(503)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                err_msg = {
                    "status": "unhealthy",
                    "error": "Database connectivity failure",
                    "target": "postgres://payment-db.internal:5432/payments",
                    "message": "Connection refused: dial tcp 10.96.120.45:5432: connect: connection refused"
                }
                self.wfile.write(json.dumps(err_msg).encode())
                print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [ERROR] Database connection failed: connection refused to payment-db.internal:5432. All retries exhausted.")
                return

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "healthy",
                "service": "payment-api",
                "version": VERSION,
                "timestamp": time.time(),
                "checks": {
                    "database": "connected",
                    "cache": "connected",
                    "gateway": "ready"
                }
            }).encode())

        elif self.path == "/ready":
            if APP_MODE == "db_failure":
                self.send_response(503)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"ready": false, "reason": "db_unavailable"}')
                return

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ready": true}')

        elif self.path == "/version":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"service": "payment-api", "version": VERSION}).encode())

        elif self.path == "/" or self.path == "":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({
                "name": "Payment API",
                "version": VERSION,
                "description": "Production payment processing workload for Opsara control plane",
                "status": "operational" if APP_MODE == "normal" else "degraded"
            }).encode())

        else:
            self.send_response(404)
            self.end_headers()

server = HTTPServer(("0.0.0.0", 8000), PaymentHandler)
print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [INFO] Payment API HTTP server listening on port 8000...")
sys.stdout.flush()
server.serve_forever()
