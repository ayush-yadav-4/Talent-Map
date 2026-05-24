# Deploy Backend on AWS EC2 (Amazon Linux) + Connect Vercel Frontend

This runbook deploys the FastAPI backend from this repository to an AWS EC2 instance running Amazon Linux, then connects your Vercel-hosted frontend to it.

It uses:
- `systemd` to keep backend running
- `nginx` as reverse proxy
- optional HTTPS with Let's Encrypt

---

## 1) Architecture (recommended)

- **Backend app process**: Uvicorn on `127.0.0.1:8001`
- **Public entry**: `nginx` on ports `80/443`
- **Frontend**: Vercel (Next.js) calling backend over HTTPS
- **Database**: your external Postgres/Supabase via `DATABASE_URL`

---

## 2) Prerequisites

Before you start, ensure you have:
- AWS account and an EC2 instance (Amazon Linux 2023 preferred)
- A domain or subdomain for API, e.g. `api.yourdomain.com` (recommended)
- Security group allowing inbound:
  - `22` (SSH, restricted to your IP)
  - `80` (HTTP)
  - `443` (HTTPS)
- Outbound internet access from EC2 (for package install + DB access)

---

## 3) Launch EC2 and basic setup

SSH into EC2:

```bash
ssh -i /path/to/your-key.pem ec2-user@<EC2_PUBLIC_IP>
```

Update system and install packages:

```bash
sudo dnf update -y
sudo dnf install -y git nginx
sudo dnf install -y python3.12 python3.12-pip
```

If `python3.12` is unavailable in your AMI, use:

```bash
sudo dnf install -y python3.11 python3.11-pip
```

---

## 4) Clone project and prepare backend

```bash
cd /home/ec2-user
git clone <YOUR_REPO_URL> TalentMap
cd TalentMap/backend
```

Create virtual environment and install dependencies:

```bash
python3.12 -m venv .venv || python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

Create environment file:

```bash
cp .env.example .env
```

Edit `backend/.env`:

```bash
nano .env
```

Set at minimum these variables (example):

```env
APP_ENV=production
APP_ENABLE_DOCS=false
APP_LOG_LEVEL=INFO

DATABASE_URL=postgresql+psycopg_async://<user>:<password>@<host>:<port>/<db>

APP_SECRET_KEY=<minimum-32-char-secret>
JWT_SECRET_KEY=<minimum-32-char-secret>
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# Replace with your Vercel origins (comma separated)
APP_ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://www.yourdomain.com
APP_CORS_INCLUDE_LOCALHOST=false

# For invite links and login redirects in backend
APP_LOGIN_URL=https://your-frontend.vercel.app/login

# Keep backend internal behind nginx
BACKEND_HOST=127.0.0.1
BACKEND_PORT=8001
BACKEND_RELOAD=false
```

If you use AI features, also set keys in `.env` (for example `OPENAI_API_KEY`, `GEMINI_API_KEY`, `PINECONE_API_KEY`, etc. as needed).

Run DB migrations:

```bash
cd /home/ec2-user/TalentMap/backend
source .venv/bin/activate
alembic upgrade head
```

---

## 5) Create systemd service for backend

Create service file:

```bash
sudo tee /etc/systemd/system/talentmap-backend.service > /dev/null <<'EOF'
[Unit]
Description=TalentMap FastAPI Backend
After=network.target

[Service]
User=ec2-user
Group=ec2-user
WorkingDirectory=/home/ec2-user/TalentMap/backend
Environment=PYTHONUNBUFFERED=1
ExecStart=/home/ec2-user/TalentMap/backend/.venv/bin/python run_backend.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable talentmap-backend
sudo systemctl start talentmap-backend
sudo systemctl status talentmap-backend --no-pager
```

View logs:

```bash
journalctl -u talentmap-backend -f
```

---

## 6) Configure nginx reverse proxy

Create nginx config:

```bash
sudo tee /etc/nginx/conf.d/talentmap-backend.conf > /dev/null <<'EOF'
server {
    listen 80;
    server_name api.yourdomain.com;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
    }
}
EOF
```

Test and reload nginx:

```bash
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
```

Point DNS:
- Create `A` record: `api.yourdomain.com -> <EC2_PUBLIC_IP>`

Verify HTTP:

```bash
curl http://api.yourdomain.com/health
```

Expected response:

```json
{"status":"ok","version":"1.0.0"}
```

---

## 7) Enable HTTPS (Let's Encrypt)

Install Certbot:

```bash
sudo dnf install -y certbot python3-certbot-nginx
```

Issue certificate:

```bash
sudo certbot --nginx -d api.yourdomain.com
```

Test auto-renew:

```bash
sudo certbot renew --dry-run
```

After this, backend base URL should be:
- `https://api.yourdomain.com`

---

## 8) Connect Vercel frontend to EC2 backend

In Vercel Project -> Settings -> Environment Variables, set:

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
INTERNAL_API_URL=https://api.yourdomain.com
API_PROXY_TARGET=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://your-frontend.vercel.app
```

Important notes for this repository:
- `frontend/lib/api.ts` uses `NEXT_PUBLIC_API_URL` in production browser requests.
- `frontend/lib/api.ts` uses `INTERNAL_API_URL` for server-side requests.
- `frontend/next.config.mjs` expects `API_PROXY_TARGET` (set it in Vercel to avoid rewrite issues).

Re-deploy Vercel after setting env vars.

---

## 9) Backend CORS for Vercel frontend

In `backend/.env`, set:

```env
APP_ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://www.yourdomain.com
APP_CORS_INCLUDE_LOCALHOST=false
```

Then restart backend:

```bash
sudo systemctl restart talentmap-backend
```

---

## 10) Deployment verification checklist

Run these checks after deployment:

1. Backend health:

```bash
curl https://api.yourdomain.com/health
```

2. API docs (if enabled):

```text
https://api.yourdomain.com/docs
```

3. Backend service:

```bash
sudo systemctl status talentmap-backend --no-pager
```

4. Nginx status:

```bash
sudo systemctl status nginx --no-pager
```

5. Frontend network call from browser:
- Open Vercel app
- Perform login/API call
- Confirm request URL points to `https://api.yourdomain.com/api/v1/...`
- Confirm no CORS errors in browser console

---

## 11) Update workflow (new backend release)

```bash
cd /home/ec2-user/TalentMap
git pull origin <branch>
cd backend
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
sudo systemctl restart talentmap-backend
sudo systemctl status talentmap-backend --no-pager
```

---

## 12) If you must use EC2 public IP instead of domain

You can temporarily use:
- `NEXT_PUBLIC_API_URL=http://<EC2_PUBLIC_IP>`
- `INTERNAL_API_URL=http://<EC2_PUBLIC_IP>`
- `API_PROXY_TARGET=http://<EC2_PUBLIC_IP>`

And backend:
- `APP_ALLOWED_ORIGINS=https://your-frontend.vercel.app`

But this is not recommended for production because:
- IP can change (unless Elastic IP is used)
- No trusted HTTPS certificate on raw IP in most setups
- Harder long-term maintenance

---

## 13) Security hardening (recommended)

- Restrict SSH (`22`) to your office/home IP only
- Keep app behind nginx (`BACKEND_HOST=127.0.0.1`)
- Use strong random secrets for `APP_SECRET_KEY` and `JWT_SECRET_KEY`
- Disable docs in production (`APP_ENABLE_DOCS=false`)
- Add AWS CloudWatch/log shipping if needed
- Consider AWS WAF + ALB for larger production environments

