#!/bin/bash

# Northbound Product Lab - Easy Starter Script

echo "╔════════════════════════════════════════════════╗"
echo "║   Northbound Product Lab - Starting...          ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

echo "📂 Current directory: $(pwd)"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️  Dependencies not installed. Installing now..."
    npm install
    echo ""
fi

# Start the server in the background
echo "🚀 Starting server..."
npm start &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 3

# Check if server is running
if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "✅ Server is running!"
    echo ""
    echo "╔════════════════════════════════════════════════╗"
    echo "║   Opening website in your browser...           ║"
    echo "╚════════════════════════════════════════════════╝"
    echo ""
    echo "🌐 URL: http://localhost:3000/Index.html"
    echo ""

    # Open in default browser
    open http://localhost:3000/Index.html

    echo "✅ Website opened!"
    echo ""
    echo "📝 Tips:"
    echo "   - Form submissions save to: submissions/"
    echo "   - Press Ctrl+C to stop the server"
    echo "   - Check terminal for submission logs"
    echo ""
    echo "Server is running. Do NOT close this terminal."
    echo "Press Ctrl+C to stop the server when done."

    # Wait for user to stop server
    wait $SERVER_PID
else
    echo "❌ Server failed to start!"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check if port 3000 is already in use"
    echo "2. Run 'npm install' to install dependencies"
    echo "3. Check for errors above"
    exit 1
fi
