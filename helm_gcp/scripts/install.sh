#!/usr/bin/env bash
# Full first-time install of the myapp Helm chart onto a GKE cluster.
#
# Prerequisites (run once before this script):
#   1. helm_gcp/scripts/00-setup-gcp.sh  — creates cluster, AR repo, static IP
#   2. helm_gcp/scripts/01-build-push.sh — builds and pushes all images
#
# Usage:
#   cd helm_gcp
#   bash scripts/install.sh
set -euo pipefail

# ──────────────────────────────────────────────────────────────────
# CONFIGURE THESE BEFORE RUNNING
# ──────────────────────────────────────────────────────────────────
PROJECT_ID="your-gcp-project-id"
REGION="us-central1"
CLUSTER_NAME="myapp-cluster"
RELEASE_NAME="myapp"
NAMESPACE="myapp"
CHART_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Path to your secrets override file (copy from values.secrets.yaml.example)
SECRETS_FILE="${CHART_DIR}/values.secrets.yaml"
# ──────────────────────────────────────────────────────────────────

echo "==> Fetching GKE cluster credentials"
gcloud container clusters get-credentials "${CLUSTER_NAME}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}"

echo "==> Verifying kubectl context"
kubectl config current-context

echo "==> Checking Helm version"
helm version --short

# Validate secrets file exists
if [[ ! -f "${SECRETS_FILE}" ]]; then
  echo ""
  echo "ERROR: Secrets file not found: ${SECRETS_FILE}"
  echo "       Copy values.secrets.yaml.example → values.secrets.yaml"
  echo "       and fill in your real secret values before running this script."
  exit 1
fi

echo ""
echo "==> Linting chart before install"
helm lint "${CHART_DIR}" --values "${SECRETS_FILE}"

echo ""
echo "==> Installing Helm release '${RELEASE_NAME}' into namespace '${NAMESPACE}'"
helm install "${RELEASE_NAME}" "${CHART_DIR}" \
  --namespace "${NAMESPACE}" \
  --create-namespace \
  --values "${SECRETS_FILE}" \
  --timeout 15m \
  --wait \
  --atomic

echo ""
echo "==> Helm release status"
helm status "${RELEASE_NAME}" --namespace "${NAMESPACE}"

STATIC_IP=$(gcloud compute addresses describe myapp-static-ip --global \
  --format="get(address)" --project="${PROJECT_ID}" 2>/dev/null || echo "<check gcloud>")

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Install complete!"
echo ""
echo "  Static IP: ${STATIC_IP}"
echo ""
echo "  Create DNS A records pointing ALL three domains to this IP:"
echo "    app.example.com       →  ${STATIC_IP}"
echo "    keycloak.example.com  →  ${STATIC_IP}"
echo "    grafana.example.com   →  ${STATIC_IP}"
echo ""
echo "  After DNS propagates (5–60 min), ManagedCertificate provisions."
echo "  Check cert status:"
echo "    kubectl describe managedcertificate myapp-cert -n ${NAMESPACE}"
echo ""
echo "  Monitor pod startup:"
echo "    kubectl get pods -n ${NAMESPACE} -w"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
