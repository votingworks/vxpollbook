#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

sudo apt install avahi-daemon avahi-utils avahi-autoipd strongswan -y

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

# --- New prompts for IPSec passphrase and Machine ID ---
read -s -p "Enter IPSec Secret Passphrase (leave empty to keep unchanged): " IPSecSecret
if [ -n "$IPSecSecret" ]; then
    echo ": PSK \"$IPSecSecret\"" | sudo tee /etc/ipsec.secrets > /dev/null
fi

read -p "Enter Machine ID (leave empty to keep unchanged): " MACHINE_ID
if [ -n "$MACHINE_ID" ]; then
    sudo mkdir -p /vx/config
    echo "$MACHINE_ID" | sudo tee /vx/config/machine-id > /dev/null
fi
# --- End of new prompts ---

# --- New iptables firewall configuration ---
echo "Setting up iptables firewall rules..."
# Allow IPsec ESP traffic
sudo iptables -A INPUT -i mesh0 -p esp -j ACCEPT
# Allow IKE and NAT-T from IPsec subnet (UDP 500 & 4500)
sudo iptables -A INPUT -i mesh0 -p udp --dport 500 -s 169.254.0.0/16 -j ACCEPT
sudo iptables -A INPUT -i mesh0 -p udp --dport 4500 -s 169.254.0.0/16 -j ACCEPT
# Allow mDNS for Avahi (UDP 5353)
sudo iptables -A INPUT -i mesh0 -p udp --dport 5353 -j ACCEPT
# Allow pollbook HTTP traffic on port 3002 from IPsec subnet
sudo iptables -A INPUT -i mesh0 -p tcp --dport 3002 -s 169.254.0.0/16 -j ACCEPT
sudo iptables -A INPUT -i mesh0 -p udp --dport 3002 -s 169.254.0.0/16 -j ACCEPT
# Drop any other traffic coming in on mesh0
sudo iptables -A INPUT -i mesh0 -j DROP

sudo udevadm control --reload-rules
sudo systemctl daemon-reload
sudo systemctl enable join-mesh-network
sudo systemctl enable avahi-daemon
sudo systemctl enable avahi-autoipd

sudo systemctl start avahi-autoipd
sudo systemctl start join-mesh-network
