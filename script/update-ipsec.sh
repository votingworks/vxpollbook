#!/bin/bash

if [ -z "$1" ]; then
    echo "No IP address provided; cannot update IPsec."
    exit 1
fi

MESH_IP="$1"
echo "Updating IPsec config with new IP: $MESH_IP"

# Update /etc/ipsec.conf:
#   - Replaces the line starting with "left=" in the "meshvpn" connection
sudo sed -i "s/^[[:space:]]*left=.*$/    left=$MESH_IP/" /etc/ipsec.conf

# Restart strongSwan so it picks up the new IP
sudo ipsec restart

exit 0
