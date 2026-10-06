# Hinweis: Entstehung mit KI

Die App **Work Companion Fieldbook** wurde vollständig mit künstlicher Intelligenz erstellt
("Vibe Coding").

**Von einem Menschen** (dem Ideengeber) stammen:
- die Idee zur App und der Zweck,
- die Anforderungen: welche Daten erfasst werden, Verschlüsselung, Backup, Erinnerungen,
- alle Ideen und Wünsche für Version 2 und das Design,
- die Entscheidungen, etwa zu Name, Icon und Aufbau,
- das Testen im Alltag.

**Von der KI** (Claude von Anthropic) stammen:
- der gesamte Programmcode (HTML, CSS, JavaScript),
- die Umsetzung der Verschlüsselung und der übrigen Funktionen,
- das Design der Oberfläche, das App-Icon und die Entwurfsbilder,
- die Texte in der App, die Anleitungen und Listen,
- die automatischen Tests und die Code-Prüfung.

Der Code wurde nicht von einem menschlichen Programmierer geschrieben oder geprüft.
Die Verschlüsselung nutzt die Standardfunktionen des Browsers (Web Crypto API), wurde aber
nicht von unabhängigen Sicherheitsfachleuten überprüft. Nutzung auf eigene Verantwortung;
regelmäßige Backups werden empfohlen.

## Bekannte Grenzen (bitte vor der Nutzung lesen)

- **Kein Zurücksetzen des Passworts.** Wer Passwort und Passkey verliert, kommt nicht mehr an die
  Daten auf dem Gerät. Nur ein Backup mit bekanntem Passwort hilft dann. (Ein Wiederherstellungscode
  ist für Version 2 geplant.)
- **Daten liegen nur auf diesem einen Gerät.** Kein Abgleich zwischen Geräten, keine Cloud. Geht das
  iPhone verloren oder kaputt, sind die Daten ohne Backup weg.
- **Nur als Home-Bildschirm-App zuverlässig.** In einem normalen Safari-Tab kann iOS ungenutzte
  Daten nach einiger Zeit löschen. Daher die App über "Zum Home-Bildschirm" installieren.
- **Löscht man die Home-Bildschirm-App, sind auch ihre Daten weg.** Vorher ein Backup machen.
- **Der CSV-Export ist unverschlüsselt.** Wer die Datei hat, kann alles lesen.
- **Face ID / Passkey ist an die Web-Adresse gebunden.** Zieht die App auf eine andere Adresse um,
  muss der Passkey neu eingerichtet werden (die Daten selbst nur per Backup).
- **Begrenzter Speicher** (ca. 5 MB im Browser), reicht für mehrere tausend Einträge.
- **Ungespeicherte Eingaben:** Sperrt sich die App automatisch, während ein Eintrag noch nicht
  gespeichert ist, gehen diese Eingaben verloren (Entwurfsspeicherung ist für Version 2 geplant).
- **Getestet** wurde mit automatischen Tests in Chromium und im Alltagstest durch den Ideengeber (läuft noch), nicht
  systematisch auf verschiedenen iPhone-Modellen und iOS-Versionen.

Stand: 06.10.2026
