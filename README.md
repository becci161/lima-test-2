# DB Timetables Dashboard (Next.js + Supabase)

## Setup
1. `npm install`
2. `.env.example` nach `.env.local` kopieren und ausfüllen
3. SQL in `supabase/migrations/01_init.sql` im Supabase SQL Editor ausführen
4. `npm run dev`

## Env
Siehe `.env.example`. `STATION_EVA` steuert den Cron, `STATION_NAME` das Header-Label via `/api/meta`.

## Cron
- Route: `GET /api/cron/check-station` mit `Authorization: Bearer <CRON_SECRET>`
- Vercel Cron: `vercel.json` alle 5 Minuten
- Manuell: Dashboard-Button (CRON_SECRET eingeben) oder:
  `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/check-station`

## Hinweis 403 von DB API
- Keys vertauscht? `DB-Client-Id` kurz, `DB-Api-Key` lang
- Keine Leerzeichen beim Kopieren
- Im DB Developer Portal muss das Produkt **Timetables v1** unter Subscriptions aktiv sein
