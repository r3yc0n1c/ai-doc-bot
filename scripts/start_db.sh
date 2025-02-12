#!/bin/bash

CONTAINER_NAME="chroma"
IMAGE_NAME="chromadb/chroma"

if sudo docker inspect "$CONTAINER_NAME" > /dev/null 2>&1; then
  echo "Container '$CONTAINER_NAME' exists."

  if [ "$(sudo docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME")" == "true" ]; then
    echo "Container '$CONTAINER_NAME' is already running."
  else
    echo "Container '$CONTAINER_NAME' exists but is not running. Starting it..."
    sudo docker start "$CONTAINER_NAME"
  fi
else
  echo "Container '$CONTAINER_NAME' does not exist. Creating and running it..."
  sudo docker run -d --name "$CONTAINER_NAME" -p 8000:8000 "$IMAGE_NAME"
fi
