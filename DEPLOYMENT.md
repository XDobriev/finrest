# Руководство по развёртыванию FinRest на российском VPS (152-ФЗ)

Данное руководство описывает запуск и эксплуатацию сервиса **FinRest** в полном соответствии с Федеральным законом РФ № 152-ФЗ «О персональных данных».

---

## 1. Рекомендуемые хостинг-провайдеры (Tier III в РФ)
* **Selectel** (ЦОД в Москве / Санкт-Петербурге)
* **Timeweb Cloud** (ЦОД в Санкт-Петербурге)
* **Yandex Cloud** (Регионы ru-central1-a/b/c)

### Минимальные системные требования:
* 1–2 vCPU (x86_64 или ARM)
* 2–4 ГБ RAM
* 30–50 ГБ NVMe SSD
* ОС: Ubuntu 22.04 LTS / 24.04 LTS

---

## 2. Быстрый запуск в 3 шага

### Шаг 1. Клонирование репозитория на сервер
```bash
git clone <URL_РЕПОЗИТОРИЯ> finrest
cd finrest
```

### Шаг 2. Настройка переменных окружения
Создайте файл `.env.production`:
```bash
cp .env.example .env.production
nano .env.production
```
Задайте надёжные пароли:
```env
NODE_ENV=production
POSTGRES_USER=finrest_admin
POSTGRES_PASSWORD=Сгенерируйте_Случайный_Сложный_Пароль
POSTGRES_DB=finrest_prod
JWT_SECRET=Сгенерируйте_Случайный_Ключ_Длиной_Не_Менее_32_Символов
```

### Шаг 3. Запуск автоматического скрипта деплоя
```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```
Скрипт автоматически соберёт контейнеры, поднимет PostgreSQL 17, применит миграции Prisma и запустит Nginx на порту 80.

---

## 3. Настройка SSL-сертификата (HTTPS) через Certbot
1. Направьте ваш домен (например, `app.finrest.ru`) на IP-адрес вашего VPS в DNS (A-запись).
2. Выпустите бесплатный сертификат Let's Encrypt:
```bash
docker run -it --rm \
  -v "$(pwd)/nginx/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/nginx/certbot/www:/var/www/certbot" \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d app.finrest.ru
```
3. Nginx автоматически подхватит сертификаты из директории `./nginx/certbot/conf`.

---

## 4. Автоматическое резервное копирование (Cron)
Скрипт [scripts/backup-db.sh](file:///Users/fatima/Desktop/Khamzat/finrest/scripts/backup-db.sh) создаёт дамп базы данных и хранит только последние 7 дней.

Добавьте задачу в cron:
```bash
crontab -e
```
Добавьте строку для ежедневного бэкапа в 03:00 ночи:
```cron
0 3 * * * /home/ubuntu/finrest/scripts/backup-db.sh >> /home/ubuntu/finrest_backup.log 2>&1
```

---

## 5. Чек-лист соответствия 152-ФЗ
- [x] **Локализация баз данных:** База данных PostgreSQL и файловые выписки хранятся исключительно на серверах, физически расположенных в РФ.
- [x] **Изоляция данных:** Использована схема Multi-tenancy с привязкой заведений и транзакций к аккаунту владельца.
- [x] **Шифрование паролей:** Пароли хешируются с использованием `bcrypt` (10 раундов соли), открытые пароли никогда не сохраняются.
- [x] **Безопасные сессии:** JWT-токены передаются только через `httpOnly`, `sameSite: lax` cookie-файлы с алгоритмом `HS256`.
- [x] **Шифрование трафика:** Поддержка TLS 1.2 / TLS 1.3 с заголовками HSTS и CSP через Nginx.
