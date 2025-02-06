#!/bin/bash
# This script creates a basic mesh network assuming that there is a external wireless adapter plugged in with the mode "mesh point" supported.
# Note this will only work after disabling NetworkManager which conflicts with the setup here. That can be disabled with:
# sudo systemctl stop NetworkManager

# Check if mesh0 interface already exists
if iw dev | grep -q "mesh0"; then
    echo "Deleting existing interface mesh0 due to mismatched type or --force flag."
    sudo iw dev mesh0 del
    sleep 1
fi

wireless_interface=$(iw dev | awk '/Interface/ {print $2}' | grep -v "wlp9s0")
if [ -z "$wireless_interface" ]; then
    echo "No wireless interface found."
    exit 1
fi

echo "Found wireless interface: $wireless_interface"

echo "Bringing down: $wireless_interface"
sudo ip link set "$wireless_interface" down

echo "Creating mesh interface: mesh0"
sudo iw dev "$wireless_interface" interface add mesh0 type mp

sleep 0.1 # the interface gets renamed by udev rules wait for that to happen so we can fix the name
new_interface=$(iw dev | awk '/Interface/ {print $2}' | grep -v "wlp9s0" | grep -v "$wireless_interface")
echo "New interface name: $new_interface"
if [ -n "$new_interface" ] && [ "$new_interface" != "mesh0" ]; then
    echo "Renaming interface from: $new_interface to mesh0"
    sudo ip link set "$new_interface" name mesh0
fi

echo "Bringing up the network and joining pollbook_mesh"
sudo ip link set mesh0 up
sudo iw dev mesh0 mesh join pollbook_mesh

echo "Successfully joined the network."
