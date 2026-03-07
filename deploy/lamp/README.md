# LAMP-deploy: Mordet på Sveavägen

PHP/MySQL-version för deployment på en LAMP-server (Linux, Apache, MySQL, PHP).

## Krav

- PHP 8.0+ med `pdo_mysql` och `curl`
- MySQL 8.0+ (eller MariaDB 10.5+)
- Apache med `mod_rewrite`
- Node.js (bara för att bygga frontend)

## Steg-för-steg

### 1. Bygg frontend

```bash
cd deploy/lamp
./build.sh
```

Detta skapar mappen `public/` med allt som behövs.

### 2. Skapa MySQL-databas

```bash
mysql -u root -p < sql/schema.sql
```

### 3. Konfigurera

Redigera `public/api/config.php`:

```php
define('DB_HOST', 'localhost');
define('DB_NAME', 'palme_game');
define('DB_USER', 'din_user');
define('DB_PASS', 'ditt_lösenord');
define('OPENROUTER_API_KEY', 'din_nyckel');
```

Alternativt kan du sätta miljövariabler istället:

```bash
export DB_HOST=localhost
export DB_NAME=palme_game
export DB_USER=din_user
export DB_PASS=ditt_lösenord
export OPENROUTER_API_KEY=din_nyckel
```

### 4. Seeda databasen

```bash
cd public
php ../sql/seed.php
```

### 5. Ladda upp

Kopiera innehållet i `public/` till din webbroot (t.ex. `/var/www/html/`).

### 6. Apache-konfiguration

Se till att `mod_rewrite` är aktiverat och att `.htaccess` tillåts:

```apache
<Directory /var/www/html>
    AllowOverride All
</Directory>
```

```bash
sudo a2enmod rewrite
sudo systemctl restart apache2
```

## Filstruktur efter deploy

```
/var/www/html/
  index.html          — React SPA
  assets/             — JS/CSS (Vite-byggt)
  images/             — Platser, karaktärer, ledtrådar
  music/              — 10 musikspår
  api/
    index.php         — API-router
    config.php        — Databaskonfiguration
    routes/           — PHP API-endpoints
  .htaccess           — Apache rewrite-regler
```

## Felsökning

- **500-fel**: Kontrollera PHP error log (`/var/log/apache2/error.log`)
- **404 på API**: Verifiera att `mod_rewrite` är aktiverat
- **Databaskoppling**: Testa med `php -r "new PDO('mysql:host=localhost;dbname=palme_game', 'user', 'pass');"`
- **CORS-problem**: `.htaccess` och `api/index.php` hanterar CORS-headers
