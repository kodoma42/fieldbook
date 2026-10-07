# Work Companion Fieldbook (PWA)

Diese App wurde vollständig mit KI erstellt, die Ideen kamen von einem Menschen. Details und bekannte Grenzen: `KI-HINWEIS.md`.

Verschlüsselte Erfassung von Kunde, Kunden-ID, Datum, Art des Einsatzes (Installation, Wartung, Reparatur),
Anfahrt, Abfahrt, Arbeitszeit, Seriennummer, bis zu 50 frei benennbaren Messwerten und einer Notiz mit
einstellbaren Standardtexten. Dazu Kundenansicht, Datumsfilter und ein Kalender mit Spesen-Hinweis.
Alle Daten bleiben lokal auf dem Gerät, es gibt keinen Server und kein Konto.
Angezeigt wird "Work Companion Fieldbook", unter dem Icon auf dem Home-Bildschirm kurz "Fieldbook".

## Nutzung (iPhone)

Die App besteht nur aus statischen Dateien und muss über **HTTPS** erreichbar sein (Voraussetzung für
Passkey und Offline-Betrieb). Eine lokal geöffnete Datei reicht nicht. Jeder Webspace für statische Seiten
genügt, zum Beispiel GitHub Pages, Cloudflare Pages, Netlify oder ein eigener Server mit HTTPS.
Auf dem Server liegen nur der App-Code, keine Daten.

Danach in Safari die Adresse öffnen, auf **Teilen > Zum Home-Bildschirm** tippen und die App von dort starten.
Erst dann Passwort und Face ID einrichten.

## Versionen

- **1.5.4** (07.10.2026): Spesen in Violett (Marke an den Einträgen, Hinweis im Eintrag, hinterlegte Tage im Kalender),
  damit sie sich klar vom orangen "Wartung" unterscheiden. Der Backup-Hinweis bleibt orange.
- **1.5.3** (07.10.2026): Korrekturen nach der Prüfung: Spesen-Marke im Dunkelmodus wieder lesbar, Kalenderpunkte
  überdecken die Tageszahl nicht mehr, Einrichtungs- und Sperrbildschirm rutschen nicht unter die Statusleiste,
  Knöpfe und Zeitfelder passen auch auf kleinen iPhones mit großer Schrift, Kopfzeile im Dunkelmodus besser abgesetzt.
- **1.5.2** (07.10.2026): Einsatzarten in neuen Farben (Installation hellblau, Wartung orange, Reparatur türkis).
  Im Kalender zeigt ein kleiner Punkt je Einsatzart in der Ecke des Tages, was dort erledigt wurde (mit Legende).
  Der Spesen-Hinweis ist jetzt eine gefüllte Marke, damit er sich vom orangen "Wartung" unterscheidet.
- **1.5.1** (07.10.2026): Neues Aussehen: Marineblau für Kopfzeile, Überschriften und Haupt-Buttons, eigene Farben für
  Installation, Wartung und Reparatur, Orange für Hinweise (Backup, Spesen) und Rot für Fehler, überarbeiteter
  Dunkelmodus, kräftigere Kontraste, größere Tippflächen, Einstellung "Schriftgröße" (Normal / Groß).
  In der Eintragsansicht klebt nur noch "Speichern" unten.
- **1.5** (07.10.2026): Messwerte schrittweise: Ein neuer Eintrag zeigt zuerst ein Messfeld, weitere kommen
  mit "Messwert hinzufügen". Mehr als 10 Messfelder möglich (bis 50), Name und Einheit zentral in den
  Einstellungen. Updates werden nur noch als Ganzes übernommen.
- **1.4** (07.10.2026): "Art des Einsatzes" mit Standardtexten für die Notiz (in den Einstellungen änderbar),
  Fahrzeit getrennt in Anfahrt und Abfahrt (ältere Einträge behalten ihre Gesamt-Fahrzeit),
  Face ID auf Wunsch automatisch beim Öffnen (Einstellung, kann ausgeschaltet werden).
- **1.3** (07.10.2026): Reiterleiste (Einträge, Kunden, Kalender, Einstellungen), Kundenansicht mit
  Messwert-Verlauf, Datumsfilter für die Liste, Kalender mit Spesen-Hinweis (pro Tag, Grenze einstellbar).
- **1.2** (07.10.2026): "Passwort vergessen": Wiederherstellungscode mit Notfallblatt und optionale
  Sicherheitsfragen. Beide Wege öffnen auch Backups.
- **1.1** (06.10.2026): Startet ohne Netz sofort aus dem Speicher (vorher weißer Bildschirm im Flugmodus).
  Versionsnummer auf Start- und Sperrbildschirm und in der Fußzeile.
- **1.0** (06.10.2026): Erste Version.

## Wichtig

- Der Passkey und die Daten sind an die **Adresse (Domain)** gebunden. Wird die Adresse später geändert,
  ist die App dort leer und der Passkey funktioniert nicht mehr (Passwort und Backups funktionieren weiterhin).
- Es gibt **keinen Server, der das Passwort zurücksetzen kann**. Wer Passwort, Passkey und
  Wiederherstellungscode verliert, verliert die Daten. Deshalb den Wiederherstellungscode erzeugen
  (Einstellungen > Wiederherstellung) und zu Hause aufbewahren, und regelmäßig ein verschlüsseltes Backup
  erstellen (Einstellungen > Verschlüsseltes Backup).
- Getestet wurde nur auf dem iPhone (Safari / Home-Bildschirm) und in Chromium am Computer.
  Android und andere Browser sind nicht getestet; ob dort der Passkey mit der Verschlüsselung (PRF) funktioniert,
  ist offen. Das Passwort funktioniert immer.
- Die Spesen-Anzeige ist nur ein Hinweis (Fahrzeit plus Arbeitszeit pro Tag über der eingestellten Grenze),
  keine Abrechnung und keine steuerliche Beratung.
- Die CSV-Datei ist unverschlüsselt (für Excel/Numbers, Trennzeichen Semikolon).

## Sicherheitsmodell

- Zufälliger 256-Bit-Datenschlüssel, AES-GCM für alle Einträge.
- Der Datenschlüssel wird eingepackt mit dem Passwort (PBKDF2-SHA256, 600.000 Runden)
  und optional mit dem Passkey (WebAuthn-PRF + HKDF), einem Wiederherstellungscode (20 Zeichen, 100 Bit Zufall,
  PBKDF2) und den Antworten auf selbst gewählte Sicherheitsfragen (PBKDF2, schwächer als der Code).
  Alle Wege funktionieren parallel und öffnen auch die Backups.
- Automatische Sperre nach einstellbarer Zeit, der Schlüssel liegt nur im Arbeitsspeicher.
- Die Verschlüsselung wurde nicht von unabhängigen Fachleuten geprüft (siehe `KI-HINWEIS.md`).

## Dateien

`index.html`, `app.js`, `crypto.js`, `sw.js`, `manifest.webmanifest`, `icon-180.png`, `icon-512.png`
(Pflicht), dazu `README.md` und `KI-HINWEIS.md`.
