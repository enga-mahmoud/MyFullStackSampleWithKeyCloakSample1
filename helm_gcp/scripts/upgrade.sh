#!/usr/bin/env bash
# Upgrade an existing myapp Helm release (e.g. after pushing new images or
# changing values).
#
# Usage:
#   cd helm_gcp
#   bash scripts/upgrade.sh
#
# To upgrade only a subset of values without touching secrets:
#   helm upgrade myapp . --reuse-values --set image.tag=1.1.0
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
SECRETS_FILE="${CHART_DIR}/values.secrets.yaml"
# ──────────────────────────────────────────────────────────────────

echo "==> Fetching GKE cluster credentials"
gcloud container clusters get-credentials "${CLUSTER_NAME}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}"

if [[ ! -f "${SECRETS_FILE}" ]]; then
  echo "ERROR: Secrets file not found: ${SECRETS_FILE}"
  exit 1
fi

echo ""
echo "==> Linting chart before upgrade"
helm lint "${CHART_DIR}" --values "${SECRETS_FILE}"

echo ""
echo "==> Upgrading Helm release '${RELEASE_NAME}' in namespace '${NAMESPACE}'"
helm upgrade "${RELEASE_NAME}" "${CHART_DIR}" \
  --namespace "${NAMESPACE}" \
  --values "${SECRETS_FILE}" \
  --timeout 15m \
  --wait \
  --atomic \
  --cleanup-on-fail

echo ""
echo "==> Helm release history"
helm history "${RELEASE_NAME}" --namespace "${NAMESPACE}" --max 5

echo ""
echo "==> Pods after upgrade"
kubectl get pods -n "${NAMESPACE}"

echo ""
echo "Upgrade complete. To roll back if needed:"
echo "  helm rollback ${RELEASE_NAME} --namespace ${NAMESPACE}"
