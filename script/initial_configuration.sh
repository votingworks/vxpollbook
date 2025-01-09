#!/bin/bash

sudo apt install avahi-daemon avahi-utils
sudo systemctl stop NetworkManager
sudo systemctl stop firewalld

cp setup_basic_mesh.sh /vx/scripts/.
cp join-mesh-network.service /etc/systemd/system/.
cp 99-mesh-network.rules /etc/udev/rules.d/.

sudo udevadm control --reload-rules
sudo bash /vx/scripts/setup_basic_mesh.sh
sudo systemctl enable avahi-daemon