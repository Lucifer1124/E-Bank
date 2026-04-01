#!/bin/sh
set -eu

retry_pull() {
  image="$1"
  attempts=3
  count=1

  while [ "$count" -le "$attempts" ]; do
    echo "Pulling $image (attempt $count/$attempts)..."
    if docker pull "$image"; then
      return 0
    fi

    if [ "$count" -lt "$attempts" ]; then
      echo "Pull failed for $image, retrying in 5 seconds..."
      sleep 5
    fi

    count=$((count + 1))
  done

  echo "Unable to pull $image after $attempts attempts."
  return 1
}

retry_pull "maven:3.9.6-eclipse-temurin-21"
retry_pull "eclipse-temurin:21-jdk-alpine"

docker compose up --build
