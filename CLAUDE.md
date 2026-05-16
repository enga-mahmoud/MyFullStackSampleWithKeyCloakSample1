# CLAUDE.md — Project Context for Claude Code

## Project Overview

Full-stack microservices application with:
- **Angular 17** frontend secured via Keycloak
- **Spring Boot 3.3.4** microservices (user-service, product-service)
- **Spring Cloud Gateway** as the single API entry point
- **Spring Cloud Config Server** for centralized configuration
- **Keycloak 24.0.4** in production mode (PostgreSQL-backed) for all auth
- **Grafana + OTel + Prometheus + Loki + Tempo** for observability
- Two deployment targets: **Docker Compose** and **Kubernetes**

---

## Repository Layout

```
.
├── docker-compose.yml        # All 14 services — primary local runtime
├── .env                      # Docker Compose secrets (never commit real values)
├── PLAN.md                   # Architecture diagram + full design reference
├── cmd.txt                   # All operational commands (Docker + K8s)
├── docs.txt                  # Per-file documentation for every file
├── config-repo/              # Spring Cloud Config native source
├── infrastructure/           # Bind-mounted config files for Docker Compose
├── config-server/            # Spring Boot app — port 8888
├── api-gateway/              # Spring Boot reactive gateway — port 8090
├── user-service/             # Spring Boot microservice — port 8081
├── product-service/          # Spring Boot microservice — port 8082
├── frontend/                 # Angular 17 SPA — served on port 4200
└── k8s/                      # Kubernetes manifests (kubectl apply -k k8s/)
```

---

## Key Versions

| Component | Version |
|---|---|
| Java | 21 |
| Spring Boot | 3.3.4 |
| Spring Cloud | 2023.0.3 |
| Angular CLI | 17.3.x |
| keycloak-angular | 16 |
| keycloak-js | 24.0.4 |
| Keycloak image | quay.io/keycloak/keycloak:24.0.4 |
| PostgreSQL image | postgres:16-alpine |
| Grafana | 11.0.0 |
| Loki | 3.0.0 |

---

## Service URLs (Docker Compose)

| Service | URL |
|---|---|
| Angular app | http://localhost:4200 |
| API Gateway | http://localhost:8090 |
| Config Server | http://localhost:8888 |
| User Service | http://localhost:8081 |
| Product Service | http://localhost:8082 |
| Keycloak | http://localhost:8080 |
| Grafana | http://localhost:3000 |
| Prometheus | http://localhost:9090 |

## Service URLs (Kubernetes / Ingress)

| Service | URL |
|---|---|
| Angular app | http://myapp.local |
| Keycloak | http://keycloak.local |
| Grafana | http://grafana.local |

---

## Credentials

| Service | Username | Password |
|---|---|---|
| Keycloak Admin | admin | Admin@1234! |
| Test user | user1 | User@1234! |
| Test admin | admin1 | Admin@1234! |
| Grafana | admin | grafana_pass |
| Config Server | configuser | config_pass |

All passwords are in `.env` (Docker Compose) and `k8s/01-secrets.yaml` (Kubernetes).

---

## Keycloak Realm

- **Realm name**: `myapp-realm`
- **Realm export**: `infrastructure/keycloak/realm-export.json` (Docker) / `k8s/configmaps/04-keycloak-realm-cm.yaml` (K8s)
- **Roles**: `ROLE_USER`, `ROLE_ADMIN`
- **JWT claim**: roles are in the `roles` array claim (mapped via Protocol Mapper)
- **Angular client**: `angular-client` (public, PKCE)

---

## Java Package Conventions

| Module | Base package |
|---|---|
| config-server | `com.myapp.configserver` |
| api-gateway | `com.myapp.gateway` |
| user-service | `com.myapp.userservice` |
| product-service | `com.myapp.productservice` |

All Spring Boot apps use the same internal package structure:
`controller/` · `service/` · `repository/` · `model/` · `config/`

---

## Security Pattern

Every Spring Boot service (gateway + both microservices) validates JWTs independently:

```java
// SecurityConfig.java — same pattern in all three services
converter.setJwtGrantedAuthoritiesConverter(jwt -> {
    List<String> roles = jwt.getClaimAsStringList("roles");
    return roles.stream()
        .map(role -> role.startsWith("ROLE_") ? role : "ROLE_" + role)
        .map(SimpleGrantedAuthority::new)
        .collect(Collectors.toList());
});
```

- API Gateway uses `ReactiveJwtAuthenticationConverterAdapter` (WebFlux)
- Microservices use `JwtAuthenticationConverter` (Servlet/MVC)
- Write endpoints protected with `@PreAuthorize("hasRole('ADMIN')")`
- `@EnableMethodSecurity` required in microservice `SecurityConfig`

---

## Observability Pattern

Every microservice (user-service, product-service) has:
- `micrometer-registry-prometheus` → `/actuator/prometheus` scraped by Prometheus
- `micrometer-tracing-bridge-otel` + `opentelemetry-exporter-otlp` → traces to OTel Collector
- `loki-logback-appender` in `logback-spring.xml` → logs pushed to Loki
- Trace IDs injected into log lines via `%X{traceId:-},%X{spanId:-}` pattern

Config Server URI for tracing: `http://otel-collector:4317` (gRPC)

---

## Config Server Pattern

Services import config at startup:
```yaml
spring:
  config:
    import: "optional:configserver:${SPRING_CLOUD_CONFIG_URI:http://configuser:config_pass@localhost:8888}"
```

Config resolution order (highest wins):
1. Environment variables passed to the container
2. Service-specific file in `config-repo/` (e.g. `user-service.yml`)
3. Shared file `config-repo/application.yml`
4. Service's own `src/main/resources/application.yml`

---

## Kubernetes Notes

- All K8s resources in namespace `myapp`
- Apply everything: `kubectl apply -k k8s/`
- Startup ordering enforced by `initContainers` (no `depends_on` in K8s)
- Postgres runs as **StatefulSet** with headless Service
- All other services run as **Deployment**
- Configs injected via ConfigMap volume mounts (not host bind-mounts)
- Secrets injected via `secretKeyRef` env vars
- Custom image names: `myapp/<service>:1.0.0`
- Ingress hostnames: `myapp.local`, `keycloak.local`, `grafana.local`

---

## Docker Compose Notes

- `docker compose up --build -d` — starts everything (first run ~5–10 min)
- `docker compose ps` — check health status of all containers
- Health checks gate startup order (Keycloak waits for postgres, services wait for Keycloak)
- `config-repo/` is bind-mounted into the config-server container at `/config-repo`
- `infrastructure/` directories are bind-mounted into observability containers

---

## Angular Notes

- Standalone components (no NgModule)
- Lazy-loaded routes via `loadComponent`
- Auth interceptor: `src/app/interceptors/auth.interceptor.ts` — adds Bearer token to all `/api/` requests
- Route guard: `src/app/guards/auth.guard.ts` — checks login + roles
- API service: `src/app/services/api.service.ts` — all HTTP calls
- Dev proxy: `proxy.conf.json` forwards `/api` to `http://localhost:8090`
- Production: nginx proxies `/api/` to `http://api-gateway:8090`

---

## Common Tasks

**Add a new API endpoint to user-service:**
1. Add method to `UserController.java` with `@PreAuthorize`
2. Add business logic to `UserService.java`
3. Rebuild: `docker compose up --build -d user-service`

**Add a new Angular page:**
1. Create component in `frontend/src/app/pages/<name>/`
2. Add route to `app.routes.ts` with `canActivate: [authGuard]`
3. Add nav link to `navbar.component.ts` if needed

**Change shared Spring configuration:**
1. Edit `config-repo/application.yml`
2. In Docker Compose: restart affected services (`docker compose restart user-service product-service api-gateway`)
3. In K8s: update ConfigMap and rollout restart (`kubectl rollout restart deployment/user-service -n myapp`)

**Rotate a secret:**
1. Update `.env` (Docker Compose) or `k8s/01-secrets.yaml` (Kubernetes)
2. Restart affected services

---

## Do Not

- Do not run Keycloak with `start-dev` — this project uses production mode (`start`)
- Do not add `@CrossOrigin` to controllers — CORS is handled centrally by the API Gateway
- Do not add session management to microservices — they are stateless (JWT only)
- Do not commit `.env` with real credentials to version control
- Do not change `config-repo/` filenames — they must match `spring.application.name` values exactly
