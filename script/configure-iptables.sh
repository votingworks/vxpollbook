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
# Allow outgoing HTTP on port 3002 only if it is IPsec-protected
iptables -A OUTPUT -p tcp --dport 3002 -m policy --pol ipsec --dir out -j ACCEPT
# Allow incoming HTTP responses on port 3002 only if they are IPsec-protected
iptables -A INPUT -p tcp --sport 3002 -m policy --pol ipsec --dir in -j ACCEPT

# Allow traffic only if it is sourced/destined to the 169.254.0.0/16 subnet:
iptables -A OUTPUT -p tcp --dport 3002 -d 169.254.0.0/16 -j ACCEPT
iptables -A INPUT -p tcp --sport 3002 -s 169.254.0.0/16 -j ACCEPT

# Log anything else that is about to be dropped
iptables -A INPUT -p tcp --sport 3002 -j LOG --log-prefix "DROP-HTTP-IN: "
iptables -A OUTPUT -p tcp --dport 3002 -j LOG --log-prefix "DROP-HTTP-OUT: "

# Finally, drop any HTTP (port 3002) traffic that isn’t matched by the above rules
iptables -A INPUT -p tcp --sport 3002 -j DROP
iptables -A OUTPUT -p tcp --dport 3002 -j DROP
