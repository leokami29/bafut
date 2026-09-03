#!/usr/bin/env bash
set -euo pipefail
for i in $(seq 1 60); do
  status=$(docker inspect --format '{{.State.Status}}' gmaps-scraper-agent 2>/dev/null || echo missing)
  count=0
  if [ -f /tmp/gmaps-bafut-full-output/results.json ]; then
    count=$(wc -l < /tmp/gmaps-bafut-full-output/results.json)
  fi
  echo "poll $i: status=$status results_lines=$count"
  if [ "$status" = "exited" ] || [ "$status" = "missing" ]; then
    docker inspect --format 'exit={{.State.ExitCode}}' gmaps-scraper-agent 2>/dev/null || true
    break
  fi
  sleep 10
done
