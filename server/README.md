# Schulweite Highscore-API

`worker.ts` stellt den `/scores`-Endpunkt bereit.

POST `/scores` nimmt `studentId`, `name`, `className`, `score` und `achievedAt` an. Pro `studentId` bleibt immer der hoechste Score erhalten. Gleiche oder niedrigere Wiederholungen aendern den besseren Eintrag nicht.

GET `/scores?limit=10` liefert die besten Ergebnisse absteigend nach Score. Bei Gleichstand wird nach Zeitpunkt und danach nach Schueler-ID stabil sortiert.

OPTIONS `/scores` erlaubt die Cross-Origin-Kommunikation der GitHub-Pages-App.

Die API ist getrennt vom GitHub-Pages-Frontend. `wrangler.toml.example` zeigt die benoetigte Worker-/D1-Konfiguration. `schema.sql` wird einmal auf der D1-Datenbank ausgefuehrt.

Danach wird die API-URL als `VITE_LEADERBOARD_URL` fuer das Frontend konfiguriert.

Bis ein externer Endpunkt eingerichtet und getestet wurde, bleibt die App auch ohne ihn nutzbar; die persoenliche Highscore-Speicherung funktioniert lokal.
