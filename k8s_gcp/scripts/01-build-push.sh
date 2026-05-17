#!/usr/bin/env bash
# Build all service images and push them to GCP Artifact Registry.
# Run from the repository root.
# Usage: bash k8s_gcp/scripts/01-build-push.sh <REGION> <PROJECT_ID> [TAG]
#
# IMPORTANT — Angular production build:
#   Before running this script, update frontend/src/environments/environment.prod.ts:
#     keycloakUrl: 'https://YOUR_KEYCLOAK_DOMAIN'
#   This value is baked into the Angular bundle at build time.
set -euo pipefail

REGION="${1:?Usage: $0 <REGION> <PROJECT_ID> [TAG]}"
PROJECT_ID="${2:?Usage: $0 <REGION> <PROJECT_ID> [TAG]}"
TAG="${3:-1.0.0}"

REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/myapp"

echo "==> Registry : ${REGISTRY}"
echo "==> Image tag: ${TAG}"
echo ""

services=(
  "config-server"
  "api-gateway"
  "user-service"
  "product-service"
  "order-service"
  "frontend"
)

for svc in "${services[@]}"; do
  image="${REGISTRY}/${svc}:${TAG}"
  echo "──────────────────────────────────────────"
  echo "  Building: ${image}"
  echo "──────────────────────────────────────────"

  if [[ "${svc}" == "frontend" ]]; then
    docker build \
      --platform linux/amd64 \
      --build-arg BUILD_CONFIGURATION=production \
      -t "${image}" \
      ./frontend
  else
    docker build \
      --platform linux/amd64 \
      -t "${image}" \
      "./${svc}"
  fi

  echo "  Pushing: ${image}"
  docker push "${image}"
  echo "  Done: ${image}"
  echo ""
done

echo "All images pushed successfully."
echo ""
echo "Next step: update image tags in k8s_gcp manifests if TAG != 1.0.0, then run:"
echo "  bash k8s_gcp/scripts/02-deploy.sh"
