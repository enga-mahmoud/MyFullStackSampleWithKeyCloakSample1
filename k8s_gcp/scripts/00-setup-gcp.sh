#!/usr/bin/env bash
# GCP infrastructure setup script.
# Run once before deploying the application.
# Usage: bash 00-setup-gcp.sh
set -euo pipefail

# ──────────────────────────────────────────────
# CONFIGURE THESE BEFORE RUNNING
# ──────────────────────────────────────────────
PROJECT_ID="your-gcp-project-id"
REGION="us-central1"
CLUSTER_NAME="myapp-cluster"
MACHINE_TYPE="e2-standard-4"
MIN_NODES=2
MAX_NODES=6
DISK_SIZE_GB=50
# ──────────────────────────────────────────────

echo "==> Authenticating and setting project"
gcloud auth login
gcloud config set project "${PROJECT_ID}"

echo "==> Enabling required GCP APIs"
gcloud services enable \
  container.googleapis.com \
  artifactregistry.googleapis.com \
  compute.googleapis.com \
  certificatemanager.googleapis.com \
  cloudresourcemanager.googleapis.com

echo "==> Creating Artifact Registry repository 'myapp'"
gcloud artifacts repositories create myapp \
  --repository-format=docker \
  --location="${REGION}" \
  --description="MyApp container images" \
  || echo "Repository already exists, skipping."

echo "==> Configuring Docker authentication for Artifact Registry"
gcloud auth configure-docker "${REGION}-docker.pkg.dev"

echo "==> Creating GKE Standard cluster: ${CLUSTER_NAME}"
gcloud container clusters create "${CLUSTER_NAME}" \
  --region="${REGION}" \
  --num-nodes=2 \
  --machine-type="${MACHINE_TYPE}" \
  --disk-size="${DISK_SIZE_GB}" \
  --enable-ip-alias \
  --enable-autoscaling \
  --min-nodes="${MIN_NODES}" \
  --max-nodes="${MAX_NODES}" \
  --release-channel=regular \
  --workload-pool="${PROJECT_ID}.svc.id.goog"

echo "==> Fetching cluster credentials"
gcloud container clusters get-credentials "${CLUSTER_NAME}" --region="${REGION}"

echo "==> Reserving a global static IP address for the Ingress"
gcloud compute addresses create myapp-static-ip --global \
  || echo "Static IP already reserved, skipping."

STATIC_IP=$(gcloud compute addresses describe myapp-static-ip --global --format="get(address)")
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Static IP reserved: ${STATIC_IP}"
echo ""
echo "  Create DNS A records pointing to this IP:"
echo "    app.example.com       →  ${STATIC_IP}"
echo "    keycloak.example.com  →  ${STATIC_IP}"
echo "    grafana.example.com   →  ${STATIC_IP}"
echo ""
echo "  DNS must propagate before ManagedCertificate can"
echo "  be provisioned (up to 60 minutes)."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
