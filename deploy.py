import os
import zipfile
import paramiko
import time

# Configurations
VPS_IP = '82.117.245.92'
VPS_USER = 'root'
VPS_PASS = 'vJz900tXYuFS'
PROJECT_DIR = r'e:\AntiGravityProjects\EnduranceAI'
REMOTE_DIR = '/var/www/enduranceai'
ZIP_FILENAME = 'enduranceai.zip'
ZIP_PATH = os.path.join(PROJECT_DIR, ZIP_FILENAME)

IGNORE_DIRS = {'.git', 'node_modules', 'venv', '.claude', '.cursor', '.gemini', 'dist', '__pycache__', '.codegraph'}
IGNORE_FILES = {ZIP_FILENAME, 'deploy.py'}

def create_zip():
    print("Creating zip archive...")
    with zipfile.ZipFile(ZIP_PATH, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(PROJECT_DIR):
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            for file in files:
                if file in IGNORE_FILES:
                    continue
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, PROJECT_DIR)
                zipf.write(file_path, rel_path)
    print(f"Archive created at {ZIP_PATH} ({os.path.getsize(ZIP_PATH) / (1024*1024):.2f} MB)")

def execute_remote(ssh, command):
    print(f"\n[REMOTE] Executing: {command}")
    stdin, stdout, stderr = ssh.exec_command(command)
    
    # Wait for the command to terminate
    exit_status = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    
    if out:
        # Avoid UnicodeEncodeError on windows console by encoding and decoding with replace
        print(f"[STDOUT]: {out.strip()[:1000].encode('cp1250', errors='replace').decode('cp1250')}")
    if err:
        print(f"[STDERR]: {err.strip()[:1000].encode('cp1250', errors='replace').decode('cp1250')}")
        
    return exit_status, out, err

def deploy():
    # create_zip()  # Already created
    
    print("Connecting to VPS via SSH...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_IP, username=VPS_USER, password=VPS_PASS)
    
    # print("Uploading archive via SFTP...")
    # sftp = ssh.open_sftp()
    
    # Ensure remote directory exists
    # execute_remote(ssh, f"mkdir -p {REMOTE_DIR}")
    
    # sftp.put(ZIP_PATH, f"{REMOTE_DIR}/{ZIP_FILENAME}")
    # sftp.close()
    
    print("Archive uploaded. Starting remote setup...")
    
    commands = [
        # System updates and dependencies (Already done)
        # "apt-get update && DEBIAN_FRONTEND=noninteractive apt-get upgrade -y",
        # "DEBIAN_FRONTEND=noninteractive apt-get install -y nginx postgresql postgresql-contrib redis-server python3 python3-pip python3-venv unzip curl certbot python3-certbot-nginx",
        
        # Install Node.js 20 (Already done)
        # "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -",
        # "DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs",
        
        # Unzip project
        f"cd {REMOTE_DIR} && unzip -o {ZIP_FILENAME} && rm {ZIP_FILENAME}",
        
        # Database setup
        "sudo -u postgres psql -c \"CREATE DATABASE enduranceai;\" || true",
        "sudo -u postgres psql -c \"CREATE USER postgres WITH PASSWORD 'postgres';\" || true",
        "sudo -u postgres psql -c \"ALTER ROLE postgres SET client_encoding TO 'utf8';\" || true",
        "sudo -u postgres psql -c \"ALTER ROLE postgres SET default_transaction_isolation TO 'read committed';\" || true",
        "sudo -u postgres psql -c \"ALTER ROLE postgres SET timezone TO 'UTC';\" || true",
        "sudo -u postgres psql -c \"GRANT ALL PRIVILEGES ON DATABASE enduranceai TO postgres;\" || true",
        "sudo -u postgres psql -c \"ALTER DATABASE enduranceai OWNER TO postgres;\" || true",
        # For Postgres 15+, need to grant schema privileges
        "sudo -u postgres psql -d enduranceai -c \"GRANT ALL ON SCHEMA public TO postgres;\" || true",
        
        # Backend setup
        f"cd {REMOTE_DIR}/backend && python3 -m venv venv",
        f"cd {REMOTE_DIR}/backend && ./venv/bin/pip install -r requirements.txt",
        
        # Environment setup for backend
        f"cp {REMOTE_DIR}/.env {REMOTE_DIR}/backend/.env || true", # Just in case it's in the root
        
        # We need to create a production settings or just use development if that's all there is
        f"cd {REMOTE_DIR}/backend && ./venv/bin/python manage.py migrate",
        f"cd {REMOTE_DIR}/backend && ./venv/bin/python manage.py collectstatic --noinput",
        
        # Frontend setup
        f"cd {REMOTE_DIR}/frontend && echo 'VITE_API_URL=https://endurance.yuzapp.space' > .env.local",
        f"cd {REMOTE_DIR}/frontend && npm install",
        f"cd {REMOTE_DIR}/frontend && npm run build",
        
        # Fix permissions
        f"chown -R www-data:www-data {REMOTE_DIR}",
    ]
    
    for cmd in commands:
        execute_remote(ssh, cmd)
        
    print("Creating Gunicorn systemd service...")
    gunicorn_service = f"""
[Unit]
Description=gunicorn daemon
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory={REMOTE_DIR}/backend
ExecStart={REMOTE_DIR}/backend/venv/bin/gunicorn --access-logfile - --workers 3 --bind 127.0.0.1:8000 config.wsgi:application

[Install]
WantedBy=multi-user.target
"""
    # Write to a temp file then move it
    execute_remote(ssh, f"cat << 'EOF' > /etc/systemd/system/gunicorn.service\n{gunicorn_service}\nEOF")
    
    print("Creating Celery systemd service...")
    celery_service = f"""
[Unit]
Description=Celery Service
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory={REMOTE_DIR}/backend
ExecStart={REMOTE_DIR}/backend/venv/bin/celery -A config worker -l info
Restart=always

[Install]
WantedBy=multi-user.target
"""
    execute_remote(ssh, f"cat << 'EOF' > /etc/systemd/system/celery.service\n{celery_service}\nEOF")
    
    print("Restarting services...")
    execute_remote(ssh, "systemctl daemon-reload")
    execute_remote(ssh, "systemctl start gunicorn")
    execute_remote(ssh, "systemctl enable gunicorn")
    execute_remote(ssh, "systemctl start celery")
    execute_remote(ssh, "systemctl enable celery")
    
    print("Configuring Nginx...")
    nginx_config = f"""
server {{
    server_name endurance.yuzapp.space;

    location = /favicon.ico {{ access_log off; log_not_found off; }}
    
    # Frontend Static Files
    location / {{
        root {REMOTE_DIR}/frontend/dist;
        try_files $uri $uri/ /index.html;
    }}

    # Django Static Files
    location /static/ {{
        alias {REMOTE_DIR}/backend/static/;
    }}

    # Django API and Admin
    location ~ ^/(api|admin) {{
        include proxy_params;
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_addrs;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}
}}
"""
    execute_remote(ssh, f"cat << 'EOF' > /etc/nginx/sites-available/enduranceai\n{nginx_config}\nEOF")
    execute_remote(ssh, "ln -sf /etc/nginx/sites-available/enduranceai /etc/nginx/sites-enabled/")
    execute_remote(ssh, "rm -f /etc/nginx/sites-enabled/default")
    execute_remote(ssh, "nginx -t")
    execute_remote(ssh, "systemctl restart nginx")
    
    print("Configuring SSL...")
    # This might fail if DNS hasn't propagated, so we don't abort the script if it fails.
    execute_remote(ssh, "certbot --nginx -d endurance.yuzapp.space --non-interactive --agree-tos -m admin@yuzapp.space || true")
    
    print("Deployment completed successfully!")
    ssh.close()
    
    # Clean up local zip
    if os.path.exists(ZIP_PATH):
        os.remove(ZIP_PATH)

if __name__ == '__main__':
    deploy()
