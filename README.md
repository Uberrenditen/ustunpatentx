# ustunpatentx

Automatische X-Posts für Üstün Patent — gleiches Admin wie Tickerlink (`/admin/x`).

## Lokal starten

```bash
npm install
npm run dev
```

Öffnen: [http://localhost:3000/admin/x](http://localhost:3000/admin/x)

Login-Passwort steht in `.env.local` (`ADMIN_PASSWORD`).

1. X-Keys im Admin speichern (Pay-per-use im [Developer Portal](https://developer.x.com/en/portal/dashboard))
2. **Neu generieren** für die Tages-Queue
3. **Aktiv** lassen — Cron postet zur Minute 50 (7:50–22:50 Europe/Berlin)

Die Keys aus einem Screenshot nicht committen. Nach einem Leak im Developer Portal rotieren.

## Deploy

Nach Vercel verbinden und `ADMIN_PASSWORD`, `AUTH_SECRET`, `CRON_SECRET` setzen. Queue-Dateien unter `data/` sind lokal; auf Vercel braucht ihr später eine Datenbank, sonst geht der Stand zwischen Deploys verloren.
