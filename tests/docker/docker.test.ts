import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('Docker Configuration: validates production Dockerfile multi-stage setup', () => {
  const dockerfilePath = path.resolve(process.cwd(), 'Dockerfile')
  assert.ok(fs.existsSync(dockerfilePath), 'Dockerfile must exist')

  const content = fs.readFileSync(dockerfilePath, 'utf-8')
  assert.ok(content.includes('FROM node:22-alpine AS deps'), 'Must have deps stage')
  assert.ok(content.includes('FROM node:22-alpine AS builder'), 'Must have builder stage')
  assert.ok(content.includes('FROM node:22-alpine AS runner'), 'Must have runner stage')
  assert.ok(content.includes('USER nextjs'), 'Must run as non-root user')
  assert.ok(content.includes('node_modules/prisma'), 'Must include prisma CLI in runner container')
  assert.ok(content.includes('CMD ["node", "server.js"]'), 'Must launch standalone Next.js server')
})

test('Docker Configuration: validates docker-compose.yml stack definition', () => {
  const composePath = path.resolve(process.cwd(), 'docker-compose.yml')
  assert.ok(fs.existsSync(composePath), 'docker-compose.yml must exist')

  const content = fs.readFileSync(composePath, 'utf-8')
  assert.ok(content.includes('app:'), 'Must define app service')
  assert.ok(content.includes('postgres:'), 'Must define postgres service')
  assert.ok(content.includes('nginx:'), 'Must define nginx service')
  assert.ok(content.includes('postgres_data:'), 'Must define persistent postgres volume')
  assert.ok(content.includes('pg_isready'), 'Must include postgres healthcheck')
})

test('Docker Configuration: validates Nginx reverse-proxy and security headers', () => {
  const nginxPath = path.resolve(process.cwd(), 'nginx/nginx.conf')
  assert.ok(fs.existsSync(nginxPath), 'nginx.conf must exist')

  const content = fs.readFileSync(nginxPath, 'utf-8')
  assert.ok(content.includes('proxy_pass http://app:3000'), 'Must reverse-proxy to Next.js')
  assert.ok(content.includes('X-Frame-Options'), 'Must include X-Frame-Options header')
  assert.ok(content.includes('X-Content-Type-Options'), 'Must include X-Content-Type-Options header')
  assert.ok(content.includes('gzip on;'), 'Must have gzip compression enabled')

  // Bug 6: Port 443 SSL server block & TLS 1.2/1.3
  assert.ok(content.includes('listen 443 ssl'), 'Must configure port 443 SSL')
  assert.ok(content.includes('TLSv1.2 TLSv1.3'), 'Must support TLS 1.2 and TLS 1.3')
  assert.ok(content.includes('/etc/letsencrypt'), 'Must configure certbot SSL certificates')
})

test('Deployment Scripts: validates backup and deployment automation', () => {
  const backupScript = path.resolve(process.cwd(), 'scripts/backup-db.sh')
  const deployScript = path.resolve(process.cwd(), 'scripts/deploy.sh')

  assert.ok(fs.existsSync(backupScript), 'scripts/backup-db.sh must exist')
  assert.ok(fs.existsSync(deployScript), 'scripts/deploy.sh must exist')

  const backupContent = fs.readFileSync(backupScript, 'utf-8')
  assert.ok(backupContent.includes('pg_dump'), 'Backup script must use pg_dump')
  assert.ok(backupContent.includes('docker exec -i'), 'Backup script must use non-tty flag for cron')
  assert.ok(backupContent.includes('gzip'), 'Backup script must compress dumps')

  const deployContent = fs.readFileSync(deployScript, 'utf-8')
  assert.ok(deployContent.includes('docker compose'), 'Deploy script must call docker compose')
  assert.ok(deployContent.includes('prisma migrate deploy'), 'Deploy script must apply migrations')
})
