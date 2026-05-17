#!/usr/bin/env bash
# Deploy the full stack to GKE.
# Run from the repository root after completing setup and image push.
# Usage: bash k8s_gcp/scripts/02-deploy.sh
set -euo pipefail

MANIFEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Verifying kubectl context"
CURRENT_CONTEXT=$(kubectl config current-context)
echo "    Active context: ${CURRENT_CONTEXT}"
read -rp "    Continue? [y/N] " confirm
[[ "${confirm}" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 1; }

echo ""
echo "==> Applying all manifests via kustomize"
kubectl apply -k "${MANIFEST_DIR}"

echo ""
echo "==> Waiting for databases to be ready"
kubectl rollout status statefulset/postgres-keycloak  -n myapp --timeout=180s
kubectl rollout status statefulset/postgres-user      -n myapp --timeout=180s
kubectl rollout status statefulset/postgres-product   -n myapp --timeout=180s
kubectl rollout status statefulset/postgres-order     -n myapp --timeout=180s

echo ""
echo "==> Waiting for Keycloak (may take 2-3 minutes)"
kubectl rollout status deployment/keycloak -n myapp --timeout=300s

echo ""
echo "==> Waiting for Config Server"
kubectl rollout status deployment/config-server -n myapp --timeout=180s

echo ""
echo "==> Waiting for Spring Cloud services"
kubectl rollout status deployment/api-gateway     -n myapp --timeout=180s
kubectl rollout status deployment/user-service    -n myapp --timeout=180s
kubectl rollout status deployment/product-service -n myapp --timeout=180s
kubectl rollout status deployment/order-service   -n myapp --timeout=180s

echo ""
echo "==> Waiting for observability stack"
kubectl rollout status deployment/otel-collector -n myapp --timeout=120s
kubectl rollout status deployment/prometheus     -n myapp --timeout=120s
kubectl rollout status deployment/loki           -n myapp --timeout=120s
kubectl rollout status deployment/tempo          -n myapp --timeout=120s
kubectl rollout status deployment/grafana        -n myapp --timeout=120s

echo ""
echo "==> Waiting for frontend"
kubectl rollout status deployment/frontend -n myapp --timeout=120s

echo ""
echo "==> Ingress status (GCP LB provisioning can take up to 10 minutes)"
kubectl get ingress -n myapp

echo ""
echo "==> ManagedCertificate status (DNS must resolve; cert takes up to 60 min)"
kubectl describe managedcertificate myapp-cert -n myapp | grep -E "Status|Domain|Certificate"

echo ""
echo "==> All pods"
kubectl get pods -n myapp

echo ""
echo "Deployment complete."
