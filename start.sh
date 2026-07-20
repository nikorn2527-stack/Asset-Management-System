#!/bin/bash
cd /home/z/my-project
while true; do
  node node_modules/.bin/next dev -p 3000 2>&1
  echo "Server crashed, restarting in 2s..."
  sleep 2
done
