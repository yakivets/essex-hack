#!/bin/bash
set -euo pipefail

export HOME=/home/opc
export OCI_CONFIG_FILE="$HOME/.oci/config"

chmod 700 "$HOME/.oci"
chmod 600 "$HOME/.oci/oci_api_key.pem" "$HOME/.oci/config"
chmod 600 "$HOME/wallet"/*.pem 2>/dev/null || true

sed -i 's|key_file=.*|key_file=/home/opc/.oci/oci_api_key.pem|' "$HOME/.oci/config"

ENV_FILE="$HOME/essex-hack/backend/.env"
sed -i 's|TNS_ADMIN=.*|TNS_ADMIN=/home/opc/wallet|' "$ENV_FILE"
sed -i 's|\\|/|g' "$ENV_FILE"
sed -i 's|C:/Users/ankit/Documents/hackathon/Wallet_PactPilotAutoDB|/home/opc/wallet|g' "$ENV_FILE"

cd "$HOME/essex-hack/backend"
python3 -m venv .venv
.venv/bin/pip install -q -U pip
.venv/bin/pip install -r requirements.txt

echo "backend venv ready"
