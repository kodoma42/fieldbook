# Hinweis: Entstehung mit KI

Die App **Work Companion Fieldbook** wurde vollständig mit künstlicher Intelligenz erstellt
("Vibe Coding").

**Von einem Menschen** (dem Ideengeber) stammen:
- die Idee zur App und der Zweck,
- die Anforderungen: welche Daten erfasst werden, Verschlüsselung, Backup, Erinnerungen,
- alle Ideen und Wünsche für die weiteren Versionen und das Design,
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

- **Kein Zurücksetzen per Server.** Es gibt kein Konto und keinen Server. Wer Passwort, Passkey **und**
  Wiederherstellungscode (bzw. Antworten auf die Sicherheitsfragen) verliert, kommt nicht mehr an die
  Daten. Der Wiederherstellungscode wird nur einmal angezeigt und muss vom Nutzer selbst sicher aufbewahrt
  werden. Die Sicherheitsfragen sind schwächer als der Code (Antworten lassen sich raten, die Fragen stehen
  lesbar im Gerätespeicher) und sind nur eine Ergänzung. Ein Backup trägt die Hüllen, die zum Zeitpunkt
  des Backups galten: ein später erneuerter Code öffnet ältere Backups nicht, ein alter Code oder ein altes
  Passwort öffnet sie dagegen weiterhin. Nach "Alles ersetzen" gelten wieder Code und Sicherheitsfragen aus
  dem Backup; die App weist darauf hin und bietet an, gleich einen neuen Code zu erzeugen.
- **Daten liegen nur auf diesem einen Gerät.** Kein Abgleich zwischen Geräten, keine Cloud. Geht das
  iPhone verloren oder kaputt, sind die Daten ohne Backup weg.
- **Nur als Home-Bildschirm-App zuverlässig.** In einem normalen Safari-Tab kann iOS ungenutzte
  Daten nach einiger Zeit löschen. Daher die App über "Zum Home-Bildschirm" installieren.
- **Löscht man die Home-Bildschirm-App, sind auch ihre Daten weg.** Vorher ein Backup machen.
- **Der CSV-Export ist unverschlüsselt.** Wer die Datei hat, kann alles lesen.
- **Die Einstellungen sind nicht verschlüsselt** (Firmenname, Namen der Messfelder, Standardtexte, Spesen-Grenze
  usw.), weder im Speicher noch im Backup. Deshalb dort keine vertraulichen Angaben eintragen.
- **Face ID / Passkey ist an die Web-Adresse gebunden.** Zieht die App auf eine andere Adresse um,
  muss der Passkey neu eingerichtet werden (die Daten selbst nur per Backup).
- **Begrenzter Speicher** (ca. 5 MB im Browser), reicht für mehrere tausend Einträge.
- **Ungespeicherte Eingaben:** Ein geänderter, noch nicht gespeicherter Eintrag wird als verschlüsselter
  Entwurf gesichert (kurz nach jeder Eingabe, beim Verlassen der App und beim Sperren) und nach dem Entsperren
  wieder geöffnet. Was in den letzten Sekunden vor einem Absturz getippt wurde, kann trotzdem fehlen. Nach dem
  Entsperren landet man sonst bei der Eintragsliste, nicht auf der zuletzt geöffneten Seite.
- **Face ID automatisch beim Öffnen** kann auf manchen iPhones von iOS abgelehnt werden (iOS verlangt
  teils eine Berührung vor dem Passkey). Dann erscheint nur der gewohnte Button. Die Funktion lässt sich
  in den Einstellungen ausschalten.
- **Android und andere Browser** sind nicht getestet. Ob dort der Passkey mit der Verschlüsselung (PRF)
  funktioniert, hängt von System und Browser ab. Das Passwort funktioniert immer.
- **Spesen-Hinweis:** Er rechnet pro Tag Fahrzeit plus Arbeitszeit aller Einträge und vergleicht mit einer
  einstellbaren Grenze. Pausen, Wartezeiten und steuerliche Regeln sind nicht berücksichtigt; es ist keine
  Abrechnung und keine Beratung.
- **Getestet** wurde mit automatischen Tests in Chromium und im Alltagstest durch den Ideengeber (läuft noch), nicht
  systematisch auf verschiedenen iPhone-Modellen und iOS-Versionen.

Stand: 08.10.2026
