#!/bin/bash

echo "Restarting network and checking for connection"

# Turn on the network
sudo systemctl start NetworkManager

IS_CONNECTED=0
# Test every second for 15 seconds if we are connected to the internet.
for i in {1..15}; do
  if ping -c 1 google.com &> /dev/null; then
    echo "Connected to the internet."
    IS_CONNECTED=1
    break
  else
    sleep 1
  fi
done

if [ $IS_CONNECTED -eq 0 ]; then
  echo "Could not establish internet connection. Connect to the internet and try again."
  echo "Terminal will close in 5 seconds."
  sleep 5
  exit 1
fi

# Update the code.
cd /home/vx/code/vxpollbook
# If there is no .env.local file, create one.
if [ ! -f .env.local ]; then
  cp .env .env.local
fi
PRESERVE_POLLBOOK=0
if [ -f libs/usb-drive/dev-workspace/mock-usb-data/pollbook-package.zip ]; then
  cp libs/usb-drive/dev-workspace/mock-usb-data/pollbook-package.zip /tmp/pollbook-package.zip
  PRESERVE_POLLBOOK=1
fi
cp .env.local /tmp/.env.local
git restore .
git clean -xfd > /dev/null
git checkout main
git pull
cp /tmp/.env.local .env.local
if [ $PRESERVE_POLLBOOK -eq 1 ]; then
  mkdir -p libs/usb-drive/dev-workspace/mock-usb-data
  cp /tmp/pollbook-package.zip libs/usb-drive/dev-workspace/mock-usb-data/pollbook-package.zip
fi
pnpm install
cd frontend && pnpm type-check

# Turn off the network and renable the mesh network.
sudo systemctl stop NetworkManager
sleep 1
sudo systemctl start join-mesh-network

echo "Code updated. Rerun VxPollbook to see changes."
echo "Terminal will close in 5 seconds."
sleep 5
