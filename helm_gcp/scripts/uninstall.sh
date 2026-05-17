#!/usr/bin/env bash
# Uninstall the myapp Helm release from GKE.
#
# By default this deletes all Kubernetes resources managed by the release
# but PRESERVES PersistentVolumeClaims (to protect data).
# Pass --purge-pvcs to also delete PVCs (IRREVERSIBLE — all data is lost).
#
# Usage:
#   bash scripts/uninstall.sh           # keeps PVCs
#   bash scripts/uninstall.sh --purge-pvcs  # deletes PVCs too
set -euo pipefail

# ──────────────────────────────────────────────────────────────────
# CONFIGURE THESE BEFORE RUNNING
# ──────────────────────────────────────────────────────────────────
PROJECT_ID="your-gcp-project-id"
REGION="us-central1"
CLUSTER_NAME="myapp-cluster"
RELEASE_NAME="myapp"
NAMESPACE="myapp"
# ──────────────────────────────────────────────────────────────────

PURGE_PVCS=false
for arg in "$@"; do
  [[ "${arg}" == "--purge-pvcs" ]] && PURGE_PVCS=true
done

echo "==> Fetching GKE cluster credentials"
gcloud container clusters get-credentials "${CLUSTER_NAME}" \
  --region="${REGION}" \
  --project="${PROJECT_ID}"

echo ""
echo "==> Uninstalling Helm release '${RELEASE_NAME}' from namespace '${NAMESPACE}'"
helm uninstall "${RELEASE_NAME}" --namespace "${NAMESPACE}" || true

if [[ "${PURGE_PVCS}" == "true" ]]; then
  echo ""
  echo "WARNING: Deleting all PersistentVolumeClaims in namespace '${NAMESPACE}'."
  echo "         This will permanently destroy all database and observability data."
  read -r -p "Type 'yes' to confirm: " CONFIRM
  if [[ "${CONFIRM}" == "yes" ]]; then
    kubectl delete pvc --all -n "${NAMESPACE}"
    echo "PVCs deleted."
  else
    echo "Aborted PVC deletion."
  fi
else
  echo ""
  echo "PVCs preserved. To delete them manually:"
  echo "  kubectl delete pvc --all -n ${NAMESPACE}"
fi

echo ""
echo "==> Remaining resources in namespace '${NAMESPACE}'"
kubectl get all -n "${NAMESPACE}" 2>/dev/null || echo "(namespace may already be gone)"

echo ""
echo "Note: The GKE cluster, static IP, and Artifact Registry are NOT deleted"
echo "      by this script. To remove them:"
echo "  gcloud container clusters delete ${CLUSTER_NAME} --region=${REGION}"
echo "  gcloud compute addresses delete myapp-static-ip --global"
echo "  gcloud artifacts repositories delete myapp --location=${REGION}"
