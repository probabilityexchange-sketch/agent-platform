#!/bin/bash
# setup-iptables.sh - Network policies for agent containers
# Run on the host machine to restrict container network access
#
# Assumes container subnet is 172.18.0.0/16 (traefik-net default)
# Adjust CONTAINER_SUBNET if your Docker network uses a different range

set -euo pipefail

CONTAINER_SUBNET="172.18.0.0/16"

echo "Setting up iptables rules for container network isolation..."

# Block SSH outbound from containers
iptables -I DOCKER-USER -s "$CONTAINER_SUBNET" -p tcp --dport 22 -j DROP
echo "  Blocked port 22 (SSH) outbound"

# Block SMTP outbound from containers (prevent spam)
iptables -I DOCKER-USER -s "$CONTAINER_SUBNET" -p tcp --dport 25 -j DROP
iptables -I DOCKER-USER -s "$CONTAINER_SUBNET" -p tcp --dport 587 -j DROP
iptables -I DOCKER-USER -s "$CONTAINER_SUBNET" -p tcp --dport 465 -j DROP
echo "  Blocked ports 25/587/465 (SMTP) outbound"

# Block Docker API access from containers
iptables -I DOCKER-USER -s "$CONTAINER_SUBNET" -p tcp --dport 2375 -j DROP
iptables -I DOCKER-USER -s "$CONTAINER_SUBNET" -p tcp --dport 2376 -j DROP
echo "  Blocked ports 2375/2376 (Docker API) outbound"

# Block access to common internal services
iptables -I DOCKER-USER -s "$CONTAINER_SUBNET" -p tcp --dport 5432 -j DROP
echo "  Blocked port 5432 (PostgreSQL) outbound"

echo "Done. Current DOCKER-USER rules:"
iptables -L DOCKER-USER -n --line-numbers
