# Manuelle Abnahmetests

Diese Liste ist für die Abnahme gedacht, sobald der aktuelle Stand auf GitHub Pages erreichbar ist.

## Browser-Abnahme

1. Startseite öffnen und prüfen, dass Begrüßung, Profil und beide Spielmodi sichtbar sind.
2. Runde im Modus „Üben mit Highscore“ starten.
3. Mehrere Aufgaben richtig lösen und prüfen, dass Punkte, Serie, Multiplikator, Zeit und Fortschritt aktualisiert werden.
4. Eine falsche Ziffer eingeben und prüfen, dass die Aufgabe als Fehler gewertet und die Serie zurückgesetzt wird.
5. Eine Aufgabe bewusst überspringen und prüfen, dass der Aufgabenfluss weiterläuft.
6. Ein Spiel bis zum Ende bzw. bis zum Zeitablauf spielen und prüfen, dass das Ergebnis angezeigt wird.
7. Eine neue persönliche Bestleistung erzeugen und prüfen, dass sie ausdrücklich angezeigt wird.
8. Dasselbe auch im Modus „Üben ohne Highscore“ prüfen: Die persönliche Rekordprüfung findet trotzdem statt.
9. Nach einem neuen persönlichen Rekord prüfen, dass die Eintragung in die schulweite Liste nur auf ausdrückliche Zustimmung erfolgt.
10. Browser-Netzwerkzugriff deaktivieren, eine Runde spielen und prüfen, dass das Spiel weiterläuft und der persönliche Highscore lokal erhalten bleibt.
11. Netzwerk wieder aktivieren und prüfen, dass eine zuvor freiwillig angestoßene ausstehende Highscore-Eintragung automatisch synchronisiert wird.

## PWA-/iPad-Vorbereitung

1. Die veröffentlichte App zum Home-Bildschirm hinzufügen.
2. Die App über das Icon im Standalone-Modus starten.
3. Prüfen, dass die App im Querformat arbeitet bzw. die vom Manifest vorgegebene Querformat-Ausrichtung verwendet.
4. Netzwerk deaktivieren.
5. Eine Runde starten und mehrere Aufgaben lösen.
6. Die App in den Hintergrund schicken und zurückkehren.
7. Ergebnis, persönlichen Highscore und ausstehende Synchronisation prüfen.

## Jamf-School-Abnahme

Dieser Test wird erst nach der vollständigen Browser-Abnahme durchgeführt.

1. App über die tatsächlich verwendete Jamf-School-Verteilung öffnen.
2. Prüfen, dass Schüler-ID, Name und Klasse korrekt übernommen werden.
3. Prüfen, dass kein manueller Profilfallback erforderlich ist.
4. Einen neuen persönlichen Highscore erzeugen.
5. Prüfen, dass die schulweite Eintragung weiterhin freiwillig ist.

Die Jamf-Variablen und die tatsächliche Ersetzung in der Schulumgebung werden nicht als erfolgreich betrachtet, bevor dieser Test auf dem Zielgerät durchgeführt wurde.
