#!/bin/sh

echo "Starting application..."
echo "PORT from environment: $PORT"

# Update nginx config to use the PORT from Cloud Run
sed -i "s/listen 8080;/listen $PORT;/" /etc/nginx/conf.d/default.conf
echo "Updated nginx config to listen on port $PORT"

# Start the Node.js server in the background on port 4000
cd /app/server
echo "Starting Node.js server..."
node index.js &
NODE_PID=$!
echo "Node.js server started with PID $NODE_PID"

# Wait a moment for server to start
echo "Waiting for server to start..."
sleep 3

# Test if server is running
echo "Testing server health..."
curl -f http://localhost:4000/health || echo "Server health check failed"

# Start nginx in the foreground
echo "Starting nginx..."
nginx -g "daemon off;"
