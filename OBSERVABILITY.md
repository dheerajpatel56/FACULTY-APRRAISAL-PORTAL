# Observability

Backend exposes endpoints for Prometheus (metrics), Loki (logs), and Grafana (dashboards over both).

## Endpoints (root path, no auth — scrape on internal network only)

| Endpoint | Purpose |
|----------|---------|
| `GET /metrics` | Prometheus exposition — Node defaults (CPU, mem, GC, event loop) + HTTP metrics |
| `GET /health` | Liveness — process up, no DB touch (k8s `livenessProbe`) |
| `GET /health/ready` | Readiness — pings DB (`SELECT 1`); 503 if down (k8s `readinessProbe`) |

> These are at the **root**, not under `/api`. Don't expose `/metrics` publicly — restrict via firewall/ingress or put behind the scrape network.

## Metrics emitted

- `http_request_duration_seconds` — histogram, labels `method,route,status_code`
- `http_requests_total` — counter, same labels
- `http_requests_in_flight` — gauge
- `process_*`, `nodejs_*` — default Node/process metrics
- Route label is the matched Express path (or path with ids collapsed to `:id`) to keep cardinality low.

## Logs (Loki)

Structured JSON via `pino` → **stdout**, one line per request.

- Each request gets an `x-request-id` (honored from inbound header or generated) for correlation.
- `authorization` / `cookie` headers redacted.
- Level: `LOG_LEVEL` env (default `debug` dev, `info` prod). 4xx→warn, 5xx→error.
- `/metrics` and `/health` skipped from access logs.

**How logs reach Loki depends on where the backend runs:**

| Backend runs as | How Promtail gets the logs |
|-----------------|----------------------------|
| Docker container | Promtail scrapes `/var/lib/docker/containers/*/*-json.log` (compose below) |
| `npm run dev` / `npm start` on host | stdout goes to your terminal — Promtail does **not** see it. Pipe to a file: `npm start > logs/app.log 2>&1` and point Promtail at that file, OR run the backend in Docker. |
| Don't want Promtail at all | Add a direct Loki transport: `npm i pino-loki`, then set the pino transport target to `pino-loki` with your Loki URL. |

So the earlier "no app change needed" only holds when the backend is containerized (or file-logged). For the current local `npm run dev` setup, use the file or `pino-loki` route.

## Prometheus scrape config

```yaml
# prometheus.yml
scrape_configs:
  - job_name: faculty-appraisal-api
    metrics_path: /metrics
    static_configs:
      # Docker Desktop (Mac/Windows): host.docker.internal reaches the host.
      # Plain Linux: use the host IP, or add `extra_hosts: ["host.docker.internal:host-gateway"]`
      # to the prometheus service. If backend is also in compose, use its service name:port.
      - targets: ['host.docker.internal:5000']
    scrape_interval: 15s
```

## Sample stack (docker-compose)

```yaml
services:
  prometheus:
    image: prom/prometheus
    volumes: ['./prometheus.yml:/etc/prometheus/prometheus.yml']
    ports: ['9090:9090']
    extra_hosts: ['host.docker.internal:host-gateway']   # so it can scrape host backend on Linux

  loki:
    image: grafana/loki
    command: -config.file=/etc/loki/local-config.yaml     # baked-in default config
    ports: ['3100:3100']

  promtail:
    image: grafana/promtail
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - /var/run/docker.sock:/var/run/docker.sock
      - ./promtail.yml:/etc/promtail/config.yml
    command: -config.file=/etc/promtail/config.yml

  grafana:
    image: grafana/grafana
    ports: ['3000:3000']
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
```

### promtail.yml (required — scrapes Docker container stdout)

```yaml
server:
  http_listen_port: 9080

positions:
  filename: /tmp/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: docker
    docker_sd_configs:
      - host: unix:///var/run/docker.sock
        refresh_interval: 5s
    relabel_configs:
      - source_labels: ['__meta_docker_container_name']
        target_label: container
```

> This captures logs only from **containerized** services. If the backend runs on the host via `npm`, see the logs table above (file scrape or `pino-loki`).

In Grafana: add Prometheus (`http://prometheus:9090`) + Loki (`http://loki:3100`) data sources, then build/import dashboards (e.g. Node Exporter Full, or a custom HTTP RED dashboard from the `http_*` metrics). Query logs in Grafana Explore with `{container=~".*backend.*"}`.

## Env

```env
LOG_LEVEL=info     # trace|debug|info|warn|error
```
