# Deployment Guide — Faculty Appraisal System

This guide covers deploying the Faculty Appraisal System to production. The stack consists of:
- **Backend**: Node.js + Express + Prisma (TypeScript)
- **Frontend**: React + Vite (TypeScript)
- **Database**: PostgreSQL
- **File Storage**: Local disk (or S3/object storage)
- **Observability**: Prometheus + Loki + Grafana (optional but recommended)

---

## Prerequisites

- **Node.js** >= 18.x
- **PostgreSQL** >= 14
- **Docker** & **Docker Compose** (for containerized deployment)
- **Git** (for pulling the repo)
- **SSL/TLS certificate** (for HTTPS in production)

---

## Part 1: Environment Setup

### 1.1 Clone the repository

```bash
git clone https://github.com/dheerajpatel56/FACULTY-APPRAISAL-PORTAL.git
cd FACULTY-APPRAISAL-PORTAL
```

### 1.2 Create `.env` files

#### Backend: `backend/.env`

```bash
# Database
DATABASE_URL=postgresql://appraisal_user:secure_password@localhost:5432/faculty_appraisal

# JWT & Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRE=24h

# Email Service (Gmail SMTP example)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
SMTP_FROM=noreply@vnrvjiet.in

# File Upload
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

# Server
PORT=5000
NODE_ENV=production
LOG_LEVEL=info
```

#### Frontend: `frontend/.env`

```bash
# API endpoint (adjust to your domain/IP)
VITE_API_URL=https://your-domain.com/api
```

### 1.3 Create `.env.example` files (safe to commit)

These go into git so your team knows what env vars are needed.

**backend/.env.example**
```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=change-me-in-production
JWT_EXPIRE=24h
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=email@example.com
SMTP_PASSWORD=app-password
SMTP_FROM=noreply@vnrvjiet.in
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads
PORT=5000
NODE_ENV=production
LOG_LEVEL=info
```

**frontend/.env.example**
```bash
VITE_API_URL=https://your-domain.com/api
```

---

## Part 2: Backend Deployment

### 2.1 Install dependencies

```bash
cd backend
npm install
```

### 2.2 Database setup

#### Option A: Local PostgreSQL

```bash
# Create database and user
psql -U postgres
CREATE USER appraisal_user WITH PASSWORD 'secure_password';
CREATE DATABASE faculty_appraisal OWNER appraisal_user;
GRANT ALL PRIVILEGES ON DATABASE faculty_appraisal TO appraisal_user;
\q
```

#### Option B: AWS RDS / Cloud-hosted PostgreSQL

Use your cloud provider's managed PostgreSQL service. The `DATABASE_URL` in `.env` should point to your cloud database.

### 2.3 Run database migrations

```bash
cd backend
npm run prisma:push
```

### 2.4 Seed the database (optional — for initial setup)

```bash
npm run prisma:seed
```

This creates:
- Default admin account
- Sample departments
- Sample academic years
- Seeded test users (see README.md for credentials)

### 2.5 Build backend

```bash
npm run build
```

### 2.6 Start backend

**Development**:
```bash
npm run dev
```

**Production**:
```bash
npm start
```

The backend listens on port `5000` (configurable via `PORT` env var).

---

## Part 3: Frontend Deployment

### 3.1 Install dependencies

```bash
cd frontend
npm install
```

### 3.2 Build frontend

```bash
npm run build
```

This creates a `dist/` directory with static files.

### 3.3 Serve frontend

**Option A: Nginx (recommended)**

```nginx
# /etc/nginx/sites-available/appraisal-portal
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/frontend/dist;
    index index.html;

    # Serve static files with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Fallback to index.html for SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Observability endpoints (internal network only)
    location /health {
        proxy_pass http://localhost:5000;
    }
    location /metrics {
        proxy_pass http://localhost:5000;
        # Restrict access to internal IPs
        allow 10.0.0.0/8;
        allow 172.16.0.0/12;
        deny all;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/appraisal-portal /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Option B: Apache**

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/frontend/dist

    <Directory /path/to/frontend/dist>
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    ProxyPreserveHost On
    ProxyPass /api http://localhost:5000/api
    ProxyPassReverse /api http://localhost:5000/api

    ProxyPass /health http://localhost:5000/health
    ProxyPassReverse /health http://localhost:5000/health
</VirtualHost>
```

**Option C: Node.js (simple serve)**

```bash
npm install -g serve
serve -s dist -l 3000
```

Then reverse-proxy from Nginx/Apache to `:3000`.

---

## Part 4: Docker Deployment (Recommended)

### 4.1 Backend Dockerfile

**backend/Dockerfile**

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma

# Install dependencies
RUN npm ci --only=production

# Copy source
COPY . .

# Build app
RUN npm run build

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "start"]
```

### 4.2 Frontend Dockerfile

**frontend/Dockerfile**

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**frontend/nginx.conf**

```nginx
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        root /usr/share/nginx/html;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }

        location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

### 4.3 Docker Compose

**docker-compose.prod.yml**

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: appraisal_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: faculty_appraisal
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appraisal_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://appraisal_user:${DB_PASSWORD}@postgres:5432/faculty_appraisal
      JWT_SECRET: ${JWT_SECRET}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
      SMTP_FROM: ${SMTP_FROM}
      NODE_ENV: production
      LOG_LEVEL: info
      PORT: 5000
    ports:
      - "5000:5000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./backend/uploads:/app/uploads
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped

  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    restart: unless-stopped

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - loki_data:/loki
    command: -config.file=/etc/loki/local-config.yaml
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: ${GRAFANA_PASSWORD:-admin}
      GF_AUTH_ANONYMOUS_ENABLED: "false"
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus
      - loki
    restart: unless-stopped

volumes:
  postgres_data:
  prometheus_data:
  loki_data:
  grafana_data:
```

### 4.4 Deploy with Docker Compose

```bash
# Create .env for compose
cat > .env << EOF
DB_PASSWORD=your-secure-password
JWT_SECRET=your-jwt-secret-here
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@vnrvjiet.in
GRAFANA_PASSWORD=secure-grafana-password
EOF

# Build and start
docker-compose -f docker-compose.prod.yml up -d

# Run migrations on first startup
docker-compose -f docker-compose.prod.yml exec backend npm run prisma:push

# Seed database (optional)
docker-compose -f docker-compose.prod.yml exec backend npm run prisma:seed
```

---

## Part 5: SSL/TLS (HTTPS)

### Using Let's Encrypt with Certbot

```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --nginx -d your-domain.com

# Update Nginx config
sudo nano /etc/nginx/sites-available/appraisal-portal
```

Add to server block:
```nginx
listen 443 ssl http2;
ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
```

Redirect HTTP to HTTPS:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

Auto-renew:
```bash
sudo certbot renew --dry-run
sudo systemctl enable certbot.timer
```

---

## Part 6: Observability Stack

### 6.1 Prometheus configuration

**prometheus.yml**

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'faculty-appraisal-api'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:5000']
    # Only allow internal scraping
    scrape_interval: 15s
```

### 6.2 Access Grafana

- **URL**: `http://your-domain.com:3000`
- **Default credentials**: `admin` / `admin` (or `$GRAFANA_PASSWORD`)
- **Add Prometheus datasource**: `http://prometheus:9090`
- **Add Loki datasource**: `http://loki:3100`

### 6.3 Create dashboards

Import pre-built dashboards from Grafana marketplace or create custom ones for:
- HTTP request latency histogram
- Error rates by endpoint
- Database query performance
- Server CPU/memory usage

---

## Part 7: Production Checklist

- [ ] Environment variables set securely (`.env` NOT in git)
- [ ] Database backed up before first deployment
- [ ] SSL/TLS certificate installed
- [ ] `/metrics` endpoint restricted to internal IPs only
- [ ] Rate limiting configured in `backend/src/middleware/rateLimit.ts`
- [ ] CORS properly configured for your domain
- [ ] Email service tested (send test email via `/api/emails/test`)
- [ ] File upload directory writable and on persistent storage
- [ ] Database connection pooling configured (Prisma defaults to 10 connections)
- [ ] Logs aggregated and monitored
- [ ] Health checks working (`/health` and `/health/ready`)
- [ ] Backups scheduled (database + uploads folder)
- [ ] Error tracking set up (Sentry optional)
- [ ] Performance monitoring active
- [ ] Admin user created and password changed
- [ ] Test end-to-end flow: login → create appraisal → submit → review

---

## Part 8: Monitoring & Troubleshooting

### Check backend logs

```bash
# Docker
docker-compose -f docker-compose.prod.yml logs -f backend

# Direct
npm start 2>&1 | tee logs/app.log
```

### Database health

```bash
psql -U appraisal_user -d faculty_appraisal -c "SELECT 1;"
curl http://localhost:5000/health/ready
```

### Metrics endpoint

```bash
curl http://localhost:5000/metrics | head -30
```

### Common issues

| Issue | Solution |
|-------|----------|
| `ECONNREFUSED` to database | Verify `DATABASE_URL`, check PostgreSQL is running |
| Email not sending | Verify SMTP credentials, check firewall port 587 |
| Frontend blank page | Check `VITE_API_URL`, verify backend is reachable |
| High memory usage | Check for memory leaks, restart containers |
| `/metrics` accessible from internet | Update Nginx to restrict by IP |

---

## Part 9: Scaling

For high-traffic deployments:

1. **Database**: Use managed PostgreSQL (AWS RDS, Azure Database, etc.)
2. **File storage**: Migrate from local disk to S3/Azure Blob Storage
3. **Backend**: Deploy multiple instances behind a load balancer
4. **Frontend**: Serve from CDN (Cloudflare, AWS CloudFront)
5. **Caching**: Add Redis for session/cache layer
6. **Job queue**: Use Bull/BullMQ for email jobs instead of in-process

---

## Support & Questions

For issues:
1. Check logs: `docker-compose logs backend`
2. Verify health: `curl http://localhost:5000/health/ready`
3. Review OBSERVABILITY.md for monitoring setup
4. Check GitHub issues or contact the development team

---

**Last updated**: 2026-06-16
