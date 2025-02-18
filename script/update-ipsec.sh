#!/bin/bash

# Pull the current mesh0 IP (assuming it's IPv4)
MESH_IP=$(ip -4 addr show mesh0 | awk '/inet / {print $2}' | cut -d/ -f1)

if [[ -z "$MESH_IP" ]]; then
    echo "No IPv4 address found on mesh0; cannot update IPsec."
    exit 1
fi

echo "Updating IPsec config with mesh0 IP: $MESH_IP"

# Update /etc/ipsec.conf:
#   - Replaces the line starting with "left=" in the "meshvpn" connection
sudo sed -i "s/^[[:space:]]*left=.*$/    left=$MESH_IP/" /etc/ipsec.conf

# Restart strongSwan so it picks up the new IP
sudo ipsec restart

exit 0
