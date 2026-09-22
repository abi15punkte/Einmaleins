# Jamf-School-Identität

Die App liest die verwaltete Identität **bei jedem App-Start** erneut aus der aktuellen Webclip-URL. Zusätzlich wird die Identität erneut geprüft, wenn die App aus dem Hintergrund sichtbar wird.

Für den Webclip werden diese Jamf-School-Variablen verwendet:

- `%UserId%` → stabile Schüler-ID
- `%FirstName%` → Vorname
- `%LastName%` → Nachname
- `%DeviceGroups%` → Gerätegruppen des iPads
- `%UserGroups%` → Benutzergruppen des Schülers

## Webclip-URL

Die Ziel-URL des Jamf-School-Webclips muss sinngemäß so aussehen:

```text
https://abi15punkte.github.io/Einmaleins/?studentId=%UserId%&firstName=%FirstName%&lastName=%LastName%&deviceGroups=%DeviceGroups%&userGroups=%UserGroups%
```

Jamf School dokumentiert `%UserId%`, `%FirstName%`, `%LastName%` und `%UserGroups%` als Benutzervariablen sowie `%DeviceGroups%` als Gerätevariable. citeturn598073search0turn598073search1

## Erkennung einer Klassenänderung

Beim Start liest die App die URL erneut. Wenn sich gegenüber dem bisher gespeicherten Profil beispielsweise

```text
Klasse: M3
```

auf

```text
Klasse: M7
```

geändert hat, wird das lokale verwaltete Profil unmittelbar auf `M7` aktualisiert.

Bei konkurrierenden Angaben gilt:

1. `%UserGroups%` mit `M1`–`M16` bzw. `Lehrer`
2. `%DeviceGroups%` mit `M1`–`M16` bzw. `Lehrer`
3. expliziter `className`-/`class`-Parameter

Damit kann eine aktuelle Benutzerklassenzuordnung eine veraltete Geräteklassenzuordnung überstimmen.

## Wichtige technische Grenze

Die App kann nur die Werte prüfen, die ihr über die aktuelle URL zur Verfügung stehen. Jamf School dokumentiert die Variablen als Werte, die in Payloads eingesetzt werden; Webclips werden über ein Profil verteilt und bei einer erneuten Bereitstellung des geänderten Profils aktualisiert. citeturn598073search0turn598073search6

**Ein iPad-Neustart kann die App daher zuverlässig erneut prüfen lassen, aber er kann nicht selbst eine noch nicht aktualisierte Jamf-Payload erzwingen.** Wenn Jamf auf dem iPad weiterhin eine alte, bereits eingesetzte Webclip-URL mit alten Werten hinterlegt hat, sieht die App beim nächsten Start ebenfalls diese alten Werte.

Für die gewünschte kurzfristige Klassenänderung muss deshalb die Jamf-Payload mit den Variablen verwendet und von Jamf School auf dem Gerät aktualisiert werden. Danach erkennt die App die Änderung beim nächsten Start sofort.

## Test

Beispiel für zwei aufeinanderfolgende Starts:

```text
Start 1:
studentId=jamf-42
deviceGroups=M3
userGroups=M3
→ Klasse M3

Start 2:
studentId=jamf-42
deviceGroups=M3
userGroups=M7
→ Klasse M7
```

Die App speichert den neuen Datensatz beim zweiten Start und verwendet die neue Klasse anschließend auch für Highscore-Zuordnungen.

