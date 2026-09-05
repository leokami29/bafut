#!/usr/bin/env bash
set -euo pipefail
for i in $(seq 1 30); do
  status=$(docker inspect --format '{{.State.Status}}' gmaps-scraper-agent 2>/dev/null || echo missing)
  count=0
  if [ -f /tmp/gmaps-sports-validation-output/results.json ]; then
    count=$(wc -l < /tmp/gmaps-sports-validation-output/results.json)
  fi
  echo "poll $i: status=$status results=$count"
  if [ "$status" = "exited" ] || [ "$status" = "missing" ]; then
    docker inspect --format 'exit={{.State.ExitCode}}' gmaps-scraper-agent 2>/dev/null || true
    break
  fi
  sleep 5
done
