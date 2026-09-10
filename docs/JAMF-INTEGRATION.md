# Jamf-School-Identität

Die App unterstützt eine verwaltete Schüleridentität über die Start-URL. Die App liest folgende Werte aus URL-Fragment oder Query-String:

- `studentId` → stabile Schüler-ID
- `studentName` → Anzeigename
- `className` → optionale Klassenangabe

Für eine Jamf-School-Web-Clip-/Web-App-Verteilung kann die Ziel-URL sinngemäß so konfiguriert werden:

```text
https://abi15punkte.github.io/Einmaleins/#studentId=%UserId%&studentName=%FullName%&className=%ManagedGrade%
```

`%UserId%`, `%FullName%` und `%ManagedGrade%` sind dokumentierte Jamf-School-Payload-Variablen. `%ManagedGrade%` liefert die Klassenstufe; wenn die Schule eine genauere Klassenbezeichnung benötigt, sollte dafür der passende Jamf-Wert bzw. ein vorhandenes Attribut verwendet werden.

Die Fragment-Variante wird bevorzugt, weil der Teil nach `#` nicht als HTTP-Anfrage an den Webserver gesendet wird. Die App schreibt eine erkannte Jamf-Identität zusätzlich lokal in ihr Profil.

## Fallback auf privaten Geräten

Ohne verwaltete Identität erkennt die App keine Jamf-Quelle. Dann bleibt die manuelle Profilmaske verfügbar. Damit kann die App auf einem normalen Laptop vollständig getestet werden, ohne eine Jamf-Umgebung zu simulieren.

## Wichtiger manueller Test in Jamf

Die tatsächliche Ersetzung der Variablen in der konkret verwendeten Jamf-School-Verteilung muss einmal in der Zielumgebung geprüft werden. Die App behauptet keine erfolgreiche externe Jamf-Integration, solange diese Prüfung nicht durchgeführt wurde.
