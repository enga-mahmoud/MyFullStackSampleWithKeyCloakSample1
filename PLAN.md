# Full-Stack Angular + Spring Boot Microservices
## With Keycloak, Grafana & OpenTelemetry
### Deployment: Docker Compose + Kubernetes

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│               Docker Compose / Kubernetes: app-network / myapp ns                │
│                                                                                  │
│  ┌──────────┐   ┌─────────────┐   ┌──────────────┐  ┌────────────────┐         │
│  │ Angular  │──▶│ API Gateway │──▶│ user-service │──│ postgres-user  │         │
│  │ :4200    │   │   :8090     │ │ │    :8081     │  │   :5433        │         │
│  └──────────┘   └─────────────┘ │ └──────────────┘  └────────────────┘         │
│        │              │         │                                                │
│        │       ┌──────▼──────┐  │ ┌──────────────┐  ┌────────────────┐         │
│        │       │Config Server│  ├▶│product-service│──│postgres-product│         │
│        │       │   :8888     │  │ │    :8082     │  │   :5434        │         │
│        │       └─────────────┘  │ └──────────────┘  └────────────────┘         │
│        │                        │                                                │
│        │                        │ ┌──────────────┐  ┌────────────────┐         │
│        │                        └▶│order-service │──│ postgres-order │         │
│        │                          │    :8083     │  │   :5435        │         │
│        │                          └──────┬───────┘  └────────────────┘         │
│        │                                 │                                      │
│        │          order-service calls user-service & product-service            │
│        │          via client_credentials JWT (order-service-client)             │
│        │                                                                        │
│        ▼                                                                        │
│  ┌──────────┐   ┌──────────────────────────────────────────────────────────┐   │
│  │Keycloak  │   │                  Observability Stack                      │   │
│  │  :8080   │   │  OTel Collector → Tempo  → Grafana :3000                 │   │
│  │ (prod)   │   │  Spring Actuator → Prometheus → Grafana                  │   │
│  └──────────┘   │  Loki Appender → Loki → Grafana                         │   │
│        │        └──────────────────────────────────────────────────────────┘   │
│  ┌─────▼──────┐                                                                 │
│  │postgres-kc │                                                                 │
│  │   :5432    │                                                                 │
│  └────────────┘                                                                 │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Component | Technology | Version |
|---|---|---|
| Frontend | Angular | 17+ |
| Frontend Auth | keycloak-angular | 16 / keycloak-js 24 |
| API Gateway | Spring Cloud Gateway (reactive) | Spring Cloud 2023.0.x |
| Config Server | Spring Cloud Config Server | Spring Cloud 2023.0.x |
| Microservices | Spring Boot | 3.3.4 |
| Auth Server | Keycloak | 24.0.4 (production mode) |
| Databases | PostgreSQL | 16-alpine |
| Metrics | Prometheus + Micrometer | Latest |
| Tracing | OpenTelemetry Collector + Tempo | Latest |
| Logs | Loki 3.0 + Loki-Logback Appender | Latest |
| Visualization | Grafana | 11.0.0 |
| Container Runtime | Docker Compose v2 **or** Kubernetes | — |

---

## Project Structure

```
MyFullStackSampleWithKeyCloackSample1/
├── docker-compose.yml                      # Docker Compose — all 14 services
├── .env                                    # Secrets for Docker Compose
├── PLAN.md                                 # This file
├── cmd.txt                                 # All start / deploy commands
├── docs.txt                                # Per-file documentation
│
├── config-repo/                            # Spring Cloud Config source
│   ├── application.yml                     # Shared config (all services)
│   ├── user-service.yml                    # User service overrides
│   └── product-service.yml                 # Product service overrides
│
├── infrastructure/                         # Docker Compose config mounts
│   ├── keycloak/realm-export.json          # myapp-realm auto-import
│   ├── otel/otel-collector-config.yaml
│   ├── prometheus/prometheus.yml
│   ├── loki/loki-config.yaml
│   ├── tempo/tempo.yaml
│   └── grafana/provisioning/
│       ├── datasources/datasources.yaml
│       └── dashboards/dashboards.yaml
│
├── config-server/                          # Spring Cloud Config Server (:8888)
├── api-gateway/                            # Spring Cloud Gateway (:8090)
├── user-service/                           # Microservice 1 — User CRUD (:8081)
├── product-service/                        # Microservice 2 — Product CRUD (:8082)
├── order-service/                          # Microservice 3 — Order Fulfillment (:8083)
├── frontend/                               # Angular 17 SPA (:4200)
│
└── k8s/                                    # Kubernetes manifests
    ├── kustomization.yaml                  # kubectl apply -k k8s/
    ├── 00-namespace.yaml                   # Namespace: myapp
    ├── 01-secrets.yaml                     # All K8s Secrets
    ├── configmaps/
    │   ├── 02-config-repo-cm.yaml          # config-repo as ConfigMap
    │   ├── 03-infra-configs-cm.yaml        # Prometheus/OTel/Loki/Tempo/Grafana/nginx configs
    │   └── 04-keycloak-realm-cm.yaml       # Realm JSON as ConfigMap
    ├── storage/
    │   └── 05-pvcs.yaml                    # 7 PersistentVolumeClaims
    ├── databases/
    │   ├── 06-postgres-keycloak.yaml       # StatefulSet + headless Service
    │   ├── 07-postgres-user.yaml
    │   ├── 08-postgres-product.yaml
    │   └── 09-postgres-order.yaml
    ├── auth/
    │   └── 09-keycloak.yaml               # Deployment + Service
    ├── spring-cloud/
    │   ├── 10-config-server.yaml
    │   └── 11-api-gateway.yaml
    ├── microservices/
    │   ├── 12-user-service.yaml
    │   ├── 13-product-service.yaml
    │   └── 14-order-service.yaml
    ├── observability/
    │   ├── 14-otel-collector.yaml
    │   ├── 15-prometheus.yaml
    │   ├── 16-loki.yaml
    │   ├── 17-tempo.yaml
    │   └── 18-grafana.yaml
    ├── frontend/
    │   └── 19-frontend.yaml
    └── 20-ingress.yaml                     # Hostname-based Ingress
```

---

## Port Map

### Docker Compose (host ports)

| Service | Host Port |
|---|---|
| Angular (nginx) | 4200 |
| API Gateway | 8090 |
| Config Server | 8888 |
| User Service | 8081 |
| Product Service | 8082 |
| Order Service | 8083 |
| Keycloak | 8080 |
| Grafana | 3000 |
| Prometheus | 9090 |
| Loki | 3100 |
| Tempo | 3110 |
| OTel Collector gRPC | 4317 |
| OTel Collector HTTP | 4318 |
| PostgreSQL (Keycloak) | 5432 |
| PostgreSQL (user-service) | 5433 |
| PostgreSQL (product-service) | 5434 |
| PostgreSQL (order-service) | 5435 |

### Kubernetes (in-cluster service ports, all ClusterIP)

| Service | K8s Port | External Access |
|---|---|---|
| frontend | 80 | Ingress → `myapp.local` |
| api-gateway | 8090 | Ingress → `myapp.local/api` |
| keycloak | 8080 | Ingress → `keycloak.local` |
| grafana | 3000 | Ingress → `grafana.local` |
| config-server | 8888 | Internal only |
| user-service | 8081 | Internal only |
| product-service | 8082 | Internal only |
| postgres-keycloak | 5432 | Internal only (headless) |
| postgres-user | 5433 | Internal only (headless) |
| postgres-product | 5434 | Internal only (headless) |
| otel-collector | 4317 / 4318 | Internal only |
| prometheus | 9090 | port-forward for debugging |
| loki | 3100 | Internal only |
| tempo | 3100 | Internal only |

---

## Keycloak Setup (Production Mode)

- **Mode**: `start` (not `start-dev`) + `--import-realm`
- **Database**: PostgreSQL (`postgres-keycloak`)
- **Realm**: `myapp-realm` — auto-imported from:
  - Docker Compose: `infrastructure/keycloak/realm-export.json` (bind-mount)
  - Kubernetes: `k8s/configmaps/04-keycloak-realm-cm.yaml` (ConfigMap mount)
- **Clients**:
  - `angular-client` — Public SPA, Authorization Code + PKCE
  - `api-gateway` — Bearer-only confidential client
  - `order-service-client` — Confidential client, `client_credentials` grant only; service account has `ROLE_USER` + `ROLE_ADMIN`
- **Realm Roles**: `ROLE_USER`, `ROLE_ADMIN`
- **JWT Claim**: roles mapped to `roles` array via Protocol Mapper
- **Test Users**:
  | Username | Password | Roles |
  |---|---|---|
  | user1 | User@1234! | ROLE_USER |
  | admin1 | Admin@1234! | ROLE_USER + ROLE_ADMIN |

---

## Security Flow

### User-facing flow (Authorization Code + PKCE)
```
Browser → Angular app loads, Keycloak.init() checks SSO session
       → No session → redirected to Keycloak login page (:8080)
       → User logs in → Keycloak issues JWT with "roles" claim
       → Redirect back to Angular with token

Angular → every /api request → authInterceptor adds Bearer JWT
       → API Gateway validates JWT (Keycloak JWKS endpoint)
       → TokenRelay= filter copies JWT to downstream request
       → Microservice validates JWT independently (defense in depth)
       → @PreAuthorize checks role from JWT → allows or 403
```

### Service-to-service flow (client_credentials — order-service only)
```
POST /api/orders (user Bearer JWT) → API Gateway → order-service
  order-service validates incoming JWT as resource server
  order-service.ServiceTokenProvider calls Keycloak token endpoint:
    POST /realms/myapp-realm/protocol/openid-connect/token
         grant_type=client_credentials
         client_id=order-service-client
         client_secret=<secret>
    → Keycloak issues a JWT for the service account
      (contains ROLE_USER + ROLE_ADMIN from service account roles)
  order-service calls user-service:
    GET /api/users/{userId}  Authorization: Bearer <service-account-JWT>
    user-service validates JWT independently → ROLE_USER satisfies hasAnyRole
  order-service calls product-service:
    GET /api/products/{productId}  Authorization: Bearer <service-account-JWT>
    PUT /api/products/{productId}  Authorization: Bearer <service-account-JWT>
    product-service validates JWT independently → ROLE_ADMIN satisfies hasRole
  order-service persists Order entity → returns 201 Created
```

---

## API Endpoints

### User Service (`/api/users/**`)
| Method | Path | Role Required |
|---|---|---|
| GET | /api/users | ROLE_USER |
| GET | /api/users/{id} | ROLE_USER |
| POST | /api/users | ROLE_ADMIN |
| PUT | /api/users/{id} | ROLE_ADMIN |
| DELETE | /api/users/{id} | ROLE_ADMIN |

### Product Service (`/api/products/**`)
| Method | Path | Role Required |
|---|---|---|
| GET | /api/products | ROLE_USER |
| GET | /api/products/{id} | ROLE_USER |
| POST | /api/products | ROLE_ADMIN |
| PUT | /api/products/{id} | ROLE_ADMIN |
| DELETE | /api/products/{id} | ROLE_ADMIN |

### Order Service (`/api/orders/**`)
| Method | Path | Role Required | Notes |
|---|---|---|---|
| GET | /api/orders | ROLE_USER | All orders |
| GET | /api/orders/{id} | ROLE_USER | Single order |
| GET | /api/orders/user/{userId} | ROLE_USER | Orders for a user |
| POST | /api/orders | ROLE_USER | Create order — checks stock, decrements, persists |

**Internal calls made by order-service** (authenticated via `client_credentials`):
- `GET user-service/api/users/{userId}` — verify user exists
- `GET product-service/api/products/{productId}` — read stock & price
- `PUT product-service/api/products/{productId}` — decrement stock

---

## Angular Pages

| Route | Component | Guard | Minimum Role |
|---|---|---|---|
| / | — | redirects to /dashboard | — |
| /dashboard | DashboardComponent | authGuard | any authenticated |
| /users | UsersComponent | authGuard | ROLE_USER |
| /products | ProductsComponent | authGuard | ROLE_USER |
| /admin | AdminComponent | authGuard | ROLE_ADMIN |

---

## Observability Pipeline

| Signal | Producer | Transport | Storage | Visualization |
|---|---|---|---|---|
| Metrics | Spring Actuator `/actuator/prometheus` | Prometheus scrape (pull) | Prometheus TSDB | Grafana |
| Traces | Micrometer OTel bridge | OTel Collector gRPC (push) | Tempo | Grafana |
| Logs | Loki Logback Appender | HTTP push to Loki | Loki chunks | Grafana |

**Cross-signal correlation** (all wired in Grafana datasources):
- Log line traceId → jump to Tempo trace
- Tempo trace → jump to Loki logs for that time window
- Tempo service graph → Prometheus metrics

---

## Kubernetes Architecture

### Resource Types Used

| K8s Resource | Used For |
|---|---|
| Namespace | Isolate all workloads under `myapp` |
| Secret | Passwords (DB, Keycloak admin, Grafana) |
| ConfigMap | All config files (config-repo, infra configs, realm JSON, nginx) |
| PersistentVolumeClaim | Durable storage for Postgres, Prometheus, Loki, Tempo, Grafana |
| StatefulSet | Postgres databases (stable network identity + ordered rollout) |
| Deployment | All stateless services (Keycloak, Spring Boot, observability, frontend) |
| Service (ClusterIP) | Internal service discovery by name |
| Service (headless) | Postgres StatefulSet DNS: `postgres-user.myapp.svc.cluster.local` |
| Ingress | External hostname routing to frontend, Keycloak, Grafana |
| initContainer | Enforce startup ordering (replaces Docker Compose `depends_on`) |

### Startup Ordering (enforced via initContainers)

```
[PVCs + Secrets + ConfigMaps]  ← applied first, no Pods
        │
        ▼
[postgres-keycloak]  [postgres-user]  [postgres-product]
  readinessProbe: pg_isready
        │
        ▼
   [keycloak]  ← initContainer waits for postgres-keycloak TCP
  readinessProbe: /health/ready
        │
        ├────────────────────────┐
        ▼                        ▼
[config-server]          [observability stack]
  readinessProbe:        (otel, prometheus, loki, tempo, grafana)
  /actuator/health
        │
        ├──────────────────────────┐
        ▼                          ▼
[api-gateway]          [user-service]  [product-service]
initContainers:        initContainers:
  wait-for-config        wait-for-postgres
  wait-for-keycloak      wait-for-config-server
        │
        ▼
   [frontend]
```

### K8s vs Docker Compose — Key Differences

| Concern | Docker Compose | Kubernetes |
|---|---|---|
| Startup ordering | `depends_on` + healthcheck | initContainers polling endpoints |
| Config files | Host bind-mounts (`./infrastructure/`) | ConfigMap volume mounts |
| Secrets | `.env` file | K8s Secret + `secretKeyRef` |
| Persistent data | Named Docker volumes | PersistentVolumeClaims |
| Service discovery | Container name (e.g. `keycloak`) | K8s Service name (same names kept) |
| External access | Host port mapping | Ingress Controller + hostnames |
| Postgres topology | Regular container | StatefulSet with headless Service |
| Image source | Local build via `docker build` | Pre-built + loaded/pushed to registry |

### Custom Image Build & Load (Kubernetes)

```bash
# Build all custom images
docker build -t myapp/config-server:1.0.0   ./config-server
docker build -t myapp/api-gateway:1.0.0     ./api-gateway
docker build -t myapp/user-service:1.0.0    ./user-service
docker build -t myapp/product-service:1.0.0 ./product-service
docker build -t myapp/frontend:1.0.0        ./frontend

# For minikube — load directly (no registry needed)
minikube image load myapp/config-server:1.0.0
minikube image load myapp/api-gateway:1.0.0
minikube image load myapp/user-service:1.0.0
minikube image load myapp/product-service:1.0.0
minikube image load myapp/frontend:1.0.0
```

### Ingress Hostnames

```
myapp.local      →  frontend:80       (Angular SPA)
                 →  api-gateway:8090  (path /api/*)
keycloak.local   →  keycloak:8080     (Admin Console + OIDC)
grafana.local    →  grafana:3000      (Dashboards)
```

Add to hosts file (`C:\Windows\System32\drivers\etc\hosts` on Windows):
```
<minikube-ip>  myapp.local keycloak.local grafana.local
```
Get minikube IP with: `minikube ip`

---

## Quick Start — Docker Compose

```bash
# Start all 14 services (first run ~5-10 min for Maven builds)
docker compose up --build -d

# Watch logs
docker compose logs -f

# Verify all healthy
docker compose ps

# Open app (redirects to Keycloak login)
# http://localhost:4200

# Grafana
# http://localhost:3000  (admin / grafana_pass)

# Test API
TOKEN=$(curl -s -X POST http://localhost:8080/realms/myapp-realm/protocol/openid-connect/token \
  -d "grant_type=password&client_id=angular-client&username=user1&password=User@1234!" \
  | jq -r .access_token)
curl -H "Authorization: Bearer $TOKEN" http://localhost:8090/api/users
curl -H "Authorization: Bearer $TOKEN" http://localhost:8090/api/products
```

## Quick Start — Kubernetes

```bash
# 1. Build and load images (minikube example)
docker build -t myapp/config-server:1.0.0   ./config-server
docker build -t myapp/api-gateway:1.0.0     ./api-gateway
docker build -t myapp/user-service:1.0.0    ./user-service
docker build -t myapp/product-service:1.0.0 ./product-service
docker build -t myapp/frontend:1.0.0        ./frontend
minikube image load myapp/config-server:1.0.0
minikube image load myapp/api-gateway:1.0.0
minikube image load myapp/user-service:1.0.0
minikube image load myapp/product-service:1.0.0
minikube image load myapp/frontend:1.0.0

# 2. Enable Ingress (minikube)
minikube addons enable ingress

# 3. Deploy everything
kubectl apply -k k8s/

# 4. Watch pods come up
kubectl get pods -n myapp -w

# 5. Add hosts entries (replace IP from: minikube ip)
# <minikube-ip>  myapp.local keycloak.local grafana.local

# 6. Access
# http://myapp.local        Angular app
# http://keycloak.local/admin  Keycloak Admin Console
# http://grafana.local      Grafana dashboards

# 7. Tear down
kubectl delete -k k8s/
```

---

## Credentials Reference

| Service | URL (Docker Compose) | URL (Kubernetes) | Username | Password |
|---|---|---|---|---|
| Keycloak Admin | http://localhost:8080/admin | http://keycloak.local/admin | admin | Admin@1234! |
| Grafana | http://localhost:3000 | http://grafana.local | admin | grafana_pass |
| Config Server | http://localhost:8888 | internal only | configuser | config_pass |
| Test user | — | — | user1 | User@1234! |
| Test admin | — | — | admin1 | Admin@1234! |

> All passwords are defined in `.env` (Docker Compose) and `k8s/01-secrets.yaml` (Kubernetes).

---

## Files Reference

| File | Purpose |
|---|---|
| `docker-compose.yml` | Orchestrates all 14 services locally |
| `.env` | Secrets for Docker Compose |
| `PLAN.md` | This architecture document |
| `cmd.txt` | All operational commands (Docker + K8s) |
| `docs.txt` | Per-file documentation for every file in the project |
| `infrastructure/` | Config files mounted by Docker Compose containers |
| `config-repo/` | Spring Cloud Config native config source |
| `k8s/` | Kubernetes manifests (22 files, apply with `kubectl apply -k k8s/`) |
