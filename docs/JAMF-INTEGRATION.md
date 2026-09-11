# Jamf-School-Identität

Die App übernimmt eine verwaltete Schüleridentität aus der Start-URL. Für den aktuellen Jamf-School-Test werden Name und Gerätegruppe getrennt übergeben:

- `studentId` → stabile Schüler-ID
- `firstName` → Vorname
- `lastName` → Nachname
- `deviceGroups` → Gerätegruppen des iPads; daraus wird `M1`–`M16` bzw. `Lehrer` als Klasse erkannt

Jamf School stellt `%UserId%`, `%FirstName%`, `%LastName%` als Benutzervariablen bereit. `%DeviceGroups%` ist eine Gerätevariable und enthält die Gruppen, denen das Gerät angehört.

## Konkrete Webclip-URL für den aktuellen Test

Die Ziel-URL des Jamf-School-Webclips muss sinngemäß so aussehen:

```text
https://abi15punkte.github.io/Einmaleins/?studentId=%UserId%&firstName=%FirstName%&lastName=%LastName%&deviceGroups=%DeviceGroups%
```

Für einen Test ohne Klassenwert kann `deviceGroups` auch weggelassen werden; der Name wird trotzdem aus den Besitzerdaten übernommen. Für den aktuellen Test mit der Gerätegruppe `M1` muss `%DeviceGroups%` enthalten sein.

Die App akzeptiert zusätzlich `DeviceGroups`, `deviceGroup` und `DeviceGroup`, damit unterschiedliche Schreibweisen der URL-Konfiguration toleriert werden.

## Erwartetes Ergebnis

Wenn das Test-iPad in Jamf School Mitglied der Gerätegruppe `M1` ist und der Webclip die Variablen ersetzt, sollte die Startseite so beginnen:

```text
Hallo, <Vorname>!
```

und die erkannte verwaltete Identität wird intern mit

```text
Name: <Vorname> <Nachname>
Klasse: M1
Quelle: Jamf
```

gespeichert. Die Klasse muss nicht auf der Startseite angezeigt werden; sie steht für die spätere Highscore-Zuordnung zur Verfügung.

## Fallback

Wenn keine verwaltete Identität mit mindestens `UserId` und einem lesbaren Namen erkannt wird, erscheint weiterhin nur dann `Spielerprofil bearbeiten` als manueller Fallback.

## Wichtiger Punkt für den Test

Die App kann die Mitgliedschaft des iPads in einer Jamf-School-Gerätegruppe nicht selbst aus Jamf abrufen. Die Information muss von Jamf School über `%DeviceGroups%` in den Webclip-URL-Parametern eingesetzt werden. Ein neuer App-Build allein ändert die URL des bereits verteilten Webclips nicht.
