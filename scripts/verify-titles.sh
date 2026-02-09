#!/bin/bash
PORT=3005
BASE_URL="http://localhost:$PORT"

# Function to check title
check_title() {
  url="$1"
  expected="$2"
  echo "Checking $url..."
  content=$(curl -s "$url")
  title=$(echo "$content" | grep -o '<title>.*</title>' | sed 's/<title>\(.*\)<\/title>/\1/')
  
  if [[ "$title" == *"$expected"* ]]; then
    echo "✅ PASS: '$title' matches '$expected'"
  else
    echo "❌ FAIL: Got '$title', expected '$expected'"
  fi
}

# Start server in background
echo "Starting production server on port $PORT..."
npm start -- -p $PORT > /dev/null 2>&1 &
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server to start..."
sleep 5

# Run checks
echo "--- Verifying Metadata Titles ---"
check_title "$BASE_URL" "/kur/ Build Worlds"
check_title "$BASE_URL/app" "/kur/ Dashboard"
check_title "$BASE_URL/login" "/kur/ Sign In"
# Note: Project pages might redirect or need auth, but metadata should still be present in initial HTML if server rendered
check_title "$BASE_URL/app/test-project/storyteller" "/kur/ Storyteller"
check_title "$BASE_URL/app/test-project/world-gen" "/kur/ Infinite Canvas"
check_title "$BASE_URL/app/test-project/loop-creator" "/kur/ Loop Designer"
check_title "$BASE_URL/app/test-project/asset-exporter" "/kur/ Asset Exporter"
check_title "$BASE_URL/app/test-project/deduction-puzzle" "/kur/ Deduction Puzzle"
check_title "$BASE_URL/app/test-project/evals" "/kur/ Evaluations"
check_title "$BASE_URL/app/test-project/interior-design" "/kur/ Interior Design"

# Kill server
echo "Stopping server..."
kill $SERVER_PID
