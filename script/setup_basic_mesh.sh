#!/bin/bash
# This script creates a basic mesh network assuming that there is a external wireless adapter plugged in with the mode "mesh point" supported.
# Note this will only work after disabling NetworkManager which conflicts with the setup here. That can be disabled with:
# sudo systemctl stop NetworkManager

# Check if mesh0 interface already exists
if iw dev | grep -q "mesh0"; then
    force=false
    if [[ " $@ " == *" --force "* ]]; then
        force=true
    fi
    mesh_type=$(iw dev mesh0 info 2>/dev/null | grep "type" | awk '{print $2" "$3}')
    if [ "$force" = true ] || [ "$mesh_type" != "mesh point" ]; then
        echo "Deleting existing interface mesh0 due to mismatched type or --force flag."
        sudo ip link delete mesh0
        sleep 1
    else
        mesh_status=$(ip link show mesh0 | grep -o "state [A-Z]*" | awk '{print $2}')
        if [ "$mesh_status" = "DOWN" ]; then
            echo "mesh0 is DOWN. Bringing it up..."
            sudo ip link set mesh0 up
            echo "Successfully brought up the interface."
            exit 0
        fi
        echo "mesh0 already exists. Joining pollbook_mesh."
        sudo iw dev mesh0 mesh join pollbook_mesh
        echo "Successfully joined the network."
        exit 0
    fi
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
