#!/bin/sh
set -e

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
wait-for -t 90 mongodb:27017 -- echo "MongoDB is up"

# Wait a bit more for MongoDB to initialize
sleep 5

# Initialize the database
echo "Initializing database..."
node init-db.js

# Start the application
echo "Starting application..."
exec node server.js