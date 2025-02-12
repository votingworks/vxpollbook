#!/bin/bash

sudo cp run-vxpollbook.sh /vx/scripts/.
sudo cp run-vxpollbook.desktop /usr/share/applications/.
gsettings set org.gnome.shell favorite-apps "['run-vxpollbook.desktop', 'update-vxdev.desktop', 'org.gnome.Screenshot.desktop', 'firefox-esr.desktop', 'org.gnome.Nautilus.desktop', 'org.gnome.Terminal.desktop']"

sudo apt install avahi-daemon avahi-utils avahi-autoipd
sudo systemctl disable NetworkManager
sudo systemctl disable firewalld
sudo systemctl stop NetworkManager
sudo systemctl stop firewalld

sudo cp setup_basic_mesh.sh /vx/scripts/.
sudo cp join-mesh-network.service /etc/systemd/system/.
sudo cp avahi-autoipd.service /etc/systemd/system/.
sudo cp 99-mesh-network.rules /etc/udev/rules.d/.

sudo udevadm control --reload-rules
sudo systemctl daemon-reload
sudo systemctl enable join-mesh-network
sudo systemctl enable avahi-daemon
sudo systemctl enable avahi-autoipd

sudo systemctl start avahi-autoipd
sudo systemctl start join-mesh-network