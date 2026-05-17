# GCP / GKE Deployment Guide

## Prerequisites

| Tool | Version |
|---|---|
| `gcloud` CLI | Latest |
| `kubectl` | 1.29+ |
| `docker` | 24+ |
| `kustomize` | 5+ (or use `kubectl apply -k`) |

---

## Step 0 — Configuration Variables

Replace these values everywhere before applying manifests.
All placeholders appear as `REGION`, `PROJECT_ID`, `APP_DOMAIN`, `KEYCLOAK_DOMAIN`, `GRAFANA_DOMAIN`.

| Variable | Example | Description |
|---|---|---|
| `REGION` | `us-central1` | GCP region for Artifact Registry and cluster |
| `PROJECT_ID` | `my-gcp-project` | GCP project ID |
| `CLUSTER_NAME` | `myapp-cluster` | GKE cluster name |
| `APP_DOMAIN` | `app.example.com` | Publicly routable domain for the frontend |
| `KEYCLOAK_DOMAIN` | `keycloak.example.com` | Publicly routable domain for Keycloak |
| `GRAFANA_DOMAIN` | `grafana.example.com` | Publicly routable domain for Grafana |

### Search-and-replace all placeholders at once

```bash
# Run from k8s_gcp/ directory
REGION=us-central1
PROJECT_ID=my-gcp-project
APP_DOMAIN=app.example.com
KEYCLOAK_DOMAIN=keycloak.example.com
GRAFANA_DOMAIN=grafana.example.com

grep -rl 'REGION\|PROJECT_ID\|APP_DOMAIN\|KEYCLOAK_DOMAIN\|GRAFANA_DOMAIN' . \
  | xargs sed -i \
      -e "s|REGION|${REGION}|g" \
      -e "s|PROJECT_ID|${PROJECT_ID}|g" \
      -e "s|APP_DOMAIN|${APP_DOMAIN}|g" \
      -e "s|KEYCLOAK_DOMAIN|${KEYCLOAK_DOMAIN}|g" \
      -e "s|GRAFANA_DOMAIN|${GRAFANA_DOMAIN}|g"
```

---

## Step 1 — GCP Infrastructure Setup

```bash
# Authenticate
gcloud auth login
gcloud config set project PROJECT_ID

# Enable required APIs
gcloud services enable \
  container.googleapis.com \
  artifactregistry.googleapis.com \
  compute.googleapis.com \
  certificatemanager.googleapis.com

# Create Artifact Registry repository
gcloud artifacts repositories create myapp \
  --repository-format=docker \
  --location=REGION \
  --description="MyApp container images"

# Configure Docker auth for Artifact Registry
gcloud auth configure-docker REGION-docker.pkg.dev

# Create GKE Standard cluster (Autopilot also works — remove --num-nodes)
gcloud container clusters create CLUSTER_NAME \
  --region=REGION \
  --num-nodes=3 \
  --machine-type=e2-standard-4 \
  --disk-size=50 \
  --enable-ip-alias \
  --enable-autoscaling \
  --min-nodes=2 \
  --max-nodes=6 \
  --release-channel=regular

# Fetch cluster credentials
gcloud container clusters get-credentials CLUSTER_NAME --region=REGION

# Reserve a global static IP for the Ingress
gcloud compute addresses create myapp-static-ip --global

# Print the reserved IP — point DNS A records here
gcloud compute addresses describe myapp-static-ip --global --format="get(address)"
```

---

## Step 2 — DNS Setup

Create these DNS A records at your domain registrar, all pointing to the static IP printed above:

| Record | Type | Target |
|---|---|---|
| `APP_DOMAIN` | A | `<static-ip>` |
| `KEYCLOAK_DOMAIN` | A | `<static-ip>` |
| `GRAFANA_DOMAIN` | A | `<static-ip>` |

DNS must propagate before Google-managed certificates can be provisioned (can take up to 60 minutes).

---

## Step 3 — Build & Push Images to Artifact Registry

```bash
# Run from the repository root
scripts/01-build-push.sh REGION PROJECT_ID
```

See `scripts/01-build-push.sh` for the full build matrix.

---

## Step 4 — Update Secrets (IMPORTANT)

Edit `01-secrets.yaml` and replace all base64-encoded values with strong random passwords:

```bash
# Generate a strong password and base64-encode it
echo -n "$(openssl rand -base64 32)" | base64
```

Secrets to change:
- `KC_DB_PASSWORD`
- `KEYCLOAK_ADMIN_PASSWORD`
- `USER_DB_PASSWORD`
- `PRODUCT_DB_PASSWORD`
- `ORDER_DB_PASSWORD`
- `ORDER_SERVICE_CLIENT_SECRET` — must also match the value in `04-keycloak-realm-cm.yaml`
- `CONFIG_SERVER_PASSWORD`
- `GF_SECURITY_ADMIN_PASSWORD`

> **Production recommendation:** Replace K8s Secrets with Google Secret Manager + the
> [External Secrets Operator](https://external-secrets.io/). K8s Secrets are base64-encoded,
> not encrypted at rest unless you enable GKE Application-layer Secret Encryption.

---

## Step 5 — Deploy

```bash
kubectl apply -k k8s_gcp/
```

### Startup order (enforced by init containers)

1. PostgreSQL instances (all 4 in parallel)
2. Keycloak (waits for postgres-keycloak)
3. Config Server (waits for nothing — starts independently)
4. API Gateway (waits for config-server + keycloak)
5. User/Product/Order services (wait for their postgres + config-server)
6. Observability stack (parallel)
7. Frontend (starts immediately)

---

## Step 6 — Post-Deployment Verification

```bash
# Watch rollout
kubectl rollout status deployment --namespace=myapp

# Check Ingress (wait for GCP LB to finish provisioning — up to 10 min)
kubectl get ingress -n myapp

# Check ManagedCertificate status (wait for Active)
kubectl describe managedcertificate myapp-cert -n myapp

# Check all pods
kubectl get pods -n myapp

# Tail microservice logs
kubectl logs -n myapp deployment/user-service -f
```

---

## Service URLs (GCP)

| Service | URL |
|---|---|
| Frontend | `https://APP_DOMAIN` |
| Keycloak Admin Console | `https://KEYCLOAK_DOMAIN/admin` |
| Grafana | `https://GRAFANA_DOMAIN` |
| API Gateway (via Ingress) | `https://APP_DOMAIN/api/` |

---

## Key GCP Differences from the Local k8s/ Manifests

| Concern | Local (`k8s/`) | GCP (`k8s_gcp/`) |
|---|---|---|
| Image registry | `myapp/<service>:1.0.0` (local) | `REGION-docker.pkg.dev/PROJECT_ID/myapp/<service>:1.0.0` |
| Storage class | cluster default | `standard-rwo` (GKE pd-standard RWO) |
| Ingress class | `nginx` | `gce` (Google Cloud HTTP(S) LB) |
| Ingress backends | ClusterIP services | NodePort services (required by GKE Ingress) |
| Health checks | nginx ingress defaults | `BackendConfig` CRDs per service |
| HTTPS | Not configured | `ManagedCertificate` + `FrontendConfig` (HTTPS redirect) |
| Static IP | `*.local` DNS entries | Reserved global IP + DNS A records |
| Keycloak proxy | Not set | `KC_PROXY=edge` (GCP LB terminates TLS) |
| Keycloak hostname | `keycloak` (internal) | `KEYCLOAK_DOMAIN` (external HTTPS) |
| Issuer URI | `http://keycloak:8080/...` | `https://KEYCLOAK_DOMAIN/...` |
| Autoscaling | None | HPA on all microservices |
| Disruption budgets | None | PDB on all critical services |

---

## Horizontal Pod Autoscaler (HPA)

The HPA in `scaling/26-hpa.yaml` requires the GKE Metrics Server to be enabled (it is by default on GKE Standard and Autopilot).

Verify:
```bash
kubectl top pods -n myapp
```

---

## Updating Images

```bash
# Rebuild and push a single service
docker build -t REGION-docker.pkg.dev/PROJECT_ID/myapp/user-service:1.0.1 ./user-service
docker push REGION-docker.pkg.dev/PROJECT_ID/myapp/user-service:1.0.1

# Update the image tag in 13-user-service.yaml, then
kubectl apply -f k8s_gcp/microservices/13-user-service.yaml
kubectl rollout status deployment/user-service -n myapp
```

---

## Teardown

```bash
# Delete all app resources
kubectl delete -k k8s_gcp/

# Delete the GKE cluster (this also releases PD disks)
gcloud container clusters delete CLUSTER_NAME --region=REGION

# Release the static IP
gcloud compute addresses delete myapp-static-ip --global
```
