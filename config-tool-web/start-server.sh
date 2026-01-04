#!/bin/bash
echo "Starting local HTTP server..."
echo ""
echo "Open your browser and go to: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
cd "$(dirname "$0")"
python3 -m http.server 8000 2>/dev/null || python -m http.server 8000

