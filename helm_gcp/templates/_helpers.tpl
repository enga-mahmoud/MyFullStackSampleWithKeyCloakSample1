{{/*
Expand the name of the chart.
*/}}
{{- define "myapp.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Chart label (chart name + version), used in helm.sh/chart label.
*/}}
{{- define "myapp.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels added to every resource.
*/}}
{{- define "myapp.labels" -}}
helm.sh/chart: {{ include "myapp.chart" . }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Values.image.tag | quote }}
{{- end }}

{{/*
Pod selector labels for a named component.
Usage: {{ include "myapp.selectorLabels" (dict "component" "user-service" "root" .) }}
*/}}
{{- define "myapp.selectorLabels" -}}
app: {{ .component }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- end }}

{{/*
Build the full Artifact Registry image path for a service.
Usage: {{ include "myapp.image" (dict "service" "user-service" "root" .) }}
Result: REGION-docker.pkg.dev/PROJECT_ID/myapp/user-service:1.0.0
*/}}
{{- define "myapp.image" -}}
{{- printf "%s-docker.pkg.dev/%s/%s/%s:%s" .root.Values.gcp.region .root.Values.gcp.projectId .root.Values.gcp.artifactRegistry.repository .service .root.Values.image.tag -}}
{{- end }}

{{/*
External HTTPS Keycloak issuer URI — used for JWT iss claim validation in all
Spring Boot services and must match what Keycloak puts in the iss claim.
With KC_HOSTNAME=domain.keycloak and KC_PROXY=edge, Keycloak sets
iss = https://<keycloak-domain>/realms/<realm>.
*/}}
{{- define "myapp.keycloakIssuerUri" -}}
{{- printf "https://%s/realms/%s" .Values.domain.keycloak .Values.keycloak.realm -}}
{{- end }}

{{/*
Internal Keycloak token URI — used by order-service for client_credentials
token fetches. Uses the in-cluster service name to avoid the public LB roundtrip.
The resulting token still carries the correct external iss claim.
*/}}
{{- define "myapp.keycloakTokenUri" -}}
{{- printf "http://keycloak:8080/realms/%s/protocol/openid-connect/token" .Values.keycloak.realm -}}
{{- end }}

{{/*
Config Server URI with embedded K8s env var substitution for the password.
$(CONFIG_SERVER_PASSWORD) is resolved by Kubernetes at runtime, not by Helm.
*/}}
{{- define "myapp.configServerUri" -}}
http://configuser:$(CONFIG_SERVER_PASSWORD)@config-server:8888
{{- end }}
