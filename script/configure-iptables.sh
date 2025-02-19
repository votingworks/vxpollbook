#!/bin/bash
# Flush existing rules
iptables -F
iptables -X

# Set default policies to DROP
iptables -P INPUT DROP
iptables -P OUTPUT DROP
iptables -P FORWARD DROP

# Allow all loopback traffic
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established and related traffic
iptables -A INPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
iptables -A OUTPUT -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

# ----- IPsec Negotiation and Tunnel Traffic -----
# Allow IKE (UDP 500) and NAT-T (UDP 4500)
iptables -A INPUT -p udp --dport 500 -j ACCEPT
iptables -A INPUT -p udp --dport 4500 -j ACCEPT
iptables -A OUTPUT -p udp --sport 500 -j ACCEPT
iptables -A OUTPUT -p udp --sport 4500 -j ACCEPT

# Allow ESP protocol (IPsec)
iptables -A INPUT -p esp -j ACCEPT
iptables -A OUTPUT -p esp -j ACCEPT

# ----- mDNS (Avahi) -----
iptables -A INPUT -p udp --dport 5353 -j ACCEPT
iptables -A OUTPUT -p udp --dport 5353 -j ACCEPT
# ----- Enforce IPsec Protection for HTTP (port 3002) -----
# Allow new connections and established ones to TCP port 3002 on INPUT from 169.254.0.0/16
iptables -A INPUT -p tcp --dport 3002 -s 169.254.0.0/16 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
# Allow established responses from TCP port 3002 on OUTPUT to 169.254.0.0/16
iptables -A OUTPUT -p tcp --sport 3002 -d 169.254.0.0/16 -m conntrack --ctstate ESTABLISHED -j ACCEPT

# If your setup also initiates connections to port 3002 (bidirectional service), you might add:
iptables -A OUTPUT -p tcp --dport 3002 -d 169.254.0.0/16 -m conntrack --ctstate NEW,ESTABLISHED -j ACCEPT
iptables -A INPUT -p tcp --sport 3002 -s 169.254.0.0/16 -m conntrack --ctstate ESTABLISHED -j ACCEPT

# Allow basic pings for troubleshooting
iptables -A INPUT -p icmp -j ACCEPT
iptables -A OUTPUT -p icmp -j ACCEPT

# Allow IGMP for multicast traffic
iptables -A INPUT -p igmp -j ACCEPT
iptables -A OUTPUT -p igmp -j ACCEPT

# Log anything that is still seen for debugging purposes.
sudo iptables -A INPUT -m limit --limit 2/min -j LOG --log-prefix "HAKUNA:INPUT " --log-level 4
sudo iptables -A OUTPUT -m limit --limit 2/min -j LOG --log-prefix "HAKUNA:OUTPUT " --log-level 4
sudo iptables -A FORWARD -m limit --limit 2/min -j LOG --log-prefix "HAKUNA:FORWARD " --log-level 4
