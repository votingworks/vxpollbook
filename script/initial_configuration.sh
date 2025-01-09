#!/bin/bash

sudo apt install avahi-daemon avahi-utils avahi-autoipd
sudo systemctl disable NetworkManager
sudo systemctl disable firewalld
sudo systemctl stop NetworkManager
sudo systemctl stop firewalld

sudo cp setup_basic_mesh.sh /vx/scripts/.
sudo cp join-mesh-network.service /etc/systemd/system/.
sudo cp 99-mesh-network.rules /etc/udev/rules.d/.

sudo udevadm control --reload-rules
sudo systemctl daemon-reload
sudo systemctl enable join-mesh-network

sudo bash /vx/scripts/setup_basic_mesh.sh
sudo systemctl enable avahi-daemon