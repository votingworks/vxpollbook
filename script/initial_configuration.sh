#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

sudo apt install avahi-daemon avahi-utils avahi-autoipd strongswan iptables-persistent -y

sudo cp "$SCRIPT_DIR/mesh-ipsec.conf" /etc/ipsec.conf
sudo cp "$SCRIPT_DIR/avahi-autoipd.action" /etc/avahi/avahi-autoipd.action
sudo cp "$SCRIPT_DIR/run-vxpollbook.sh" /vx/scripts/.
sudo cp "$SCRIPT_DIR/update-vxpollbook.sh" /vx/scripts/.
sudo cp "$SCRIPT_DIR/update-ipsec.sh" /vx/scripts/.
sudo cp "$SCRIPT_DIR/run-vxpollbook.desktop" /usr/share/applications/.
sudo cp "$SCRIPT_DIR/update-vxpollbook.desktop" /usr/share/applications/.
gsettings set org.gnome.shell favorite-apps "['run-vxpollbook.desktop', 'update-vxpollbook.desktop', 'org.gnome.Screenshot.desktop', 'firefox-esr.desktop', 'org.gnome.Nautilus.desktop', 'org.gnome.Terminal.desktop']"

sudo systemctl disable NetworkManager
sudo systemctl disable firewalld
sudo systemctl stop NetworkManager
sudo systemctl stop firewalld

sudo cp "$SCRIPT_DIR/setup_basic_mesh.sh" /vx/scripts/.
sudo cp "$SCRIPT_DIR/join-mesh-network.service" /etc/systemd/system/.
sudo cp "$SCRIPT_DIR/avahi-autoipd.service" /etc/systemd/system/.
sudo cp "$SCRIPT_DIR/99-mesh-network.rules" /etc/udev/rules.d/.

read -s -p "Enter IPSec Secret Passphrase (leave empty to keep unchanged): " IPSecSecret
if [ -n "$IPSecSecret" ]; then
    echo ": PSK \"$IPSecSecret\"" | sudo tee /etc/ipsec.secrets > /dev/null
fi

read -p "Enter Machine ID (leave empty to keep unchanged): " MACHINE_ID
if [ -n "$MACHINE_ID" ]; then
    sudo mkdir -p /vx/config
    echo "$MACHINE_ID" | sudo tee /vx/config/machine-id > /dev/null
fi

sudo udevadm control --reload-rules
sudo systemctl daemon-reload
sudo systemctl enable join-mesh-network
sudo systemctl enable avahi-daemon
sudo systemctl enable avahi-autoipd

sudo systemctl start avahi-autoipd
sudo systemctl start join-mesh-network
