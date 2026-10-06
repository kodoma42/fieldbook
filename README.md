# Work Companion Fieldbook (PWA)

Diese App wurde vollständig mit KI erstellt, die Ideen kamen von einem Menschen. Details: `KI-HINWEIS.md`.

Angezeigt wird "Work Companion Fieldbook", unter dem Icon auf dem Home-Bildschirm kurz "Fieldbook".
Repository und Web-Adresse heißen `fieldbook`. Die Adresse sollte später nicht mehr geändert werden: Daten und
Face ID hängen an ihr, bei einer neuen Adresse wäre die App leer (Daten nur per Backup übertragbar).

Verschlüsselte Erfassung von Kunde, Kunden-ID, Datum, Fahrzeit, Arbeitszeit,
Seriennummer und 10 frei benennbaren Messwerten. Alle Daten bleiben lokal auf dem Gerät.

## Installation (iPhone)

Die App muss über **HTTPS** erreichbar sein (Voraussetzung für Passkey und Offline-Betrieb).
Eine lokal geöffnete Datei reicht nicht.

Einfachste Wege, alle Dateien dieses Ordners zu hosten:

1. **GitHub Pages**: Neues Repository anlegen, alle Dateien hochladen, unter
   Settings > Pages den Branch `main` aktivieren.
2. **Cloudflare Pages / Netlify**: Ordner per Drag & Drop hochladen.
3. **Eigener Server**: Ordner in das Webroot von nginx/Caddy legen, HTTPS aktivieren.

Auf dem Server liegen nur der App-Code, keine Daten. Es ist also unkritisch, dass die Seite öffentlich erreichbar ist.

Danach in Safari die Adresse öffnen, auf **Teilen > Zum Home-Bildschirm** tippen und die App von dort starten.

## Hochladen per iPad (nur Safari, ohne Computer)

1. ZIP in der Dateien-App antippen, sie wird entpackt. Es entsteht der Ordner `fieldbook`.
2. Auf github.com ein kostenloses Konto anlegen und oben rechts **+ > New repository** wählen.
   Name `fieldbook`, Sichtbarkeit **Public** (kostenloses GitHub Pages geht nur mit öffentlichen Repositories), **Create repository**.
3. Im leeren Repository **uploading an existing file** (oder **Add file > Upload files**) wählen, dann **choose your files**
   und alle Dateien aus dem entpackten Ordner auswählen. Sie müssen direkt im Hauptverzeichnis des Repositories liegen,
   nicht in einem Unterordner. Unten **Commit changes**.
4. **Settings > Pages**: Source "Deploy from a branch", Branch `main`, Ordner `/ (root)`, **Save**.
   Bei kleinem Display hilft "Desktop-Website anfordern" (Symbol "aA" in der Adressleiste).
5. Nach ein bis zwei Minuten ist die App unter `https://DEINNAME.github.io/fieldbook/` erreichbar.
   In Safari öffnen, **Teilen > Zum Home-Bildschirm**, und erst danach Passwort und Face ID einrichten.

Updates später: Datei im Repository öffnen, Stift-Symbol, Inhalt ersetzen, committen. Oder über **Upload files** mit gleichem
Dateinamen überschreiben. Alternative für häufige Updates: die iPad-App "Working Copy" (Git-Client).

Hinweis: Bei einem öffentlichen Repository sind Code und `KI-HINWEIS.md` für alle sichtbar. Die Daten in der App sind davon nicht betroffen.

## Hochladen per Git (Linux/Mac)

```bash
unzip work-companion.zip && cd fieldbook
git init -b main
git add .
git commit -m "Fieldbook PWA"

# Variante A: mit GitHub CLI (pacman -S github-cli, dann: gh auth login)
gh repo create fieldbook --public --source=. --push

# Variante B: Repository vorher im Browser anlegen, dann:
git remote add origin https://github.com/DEINNAME/fieldbook.git
git push -u origin main
```

Danach auf GitHub unter Settings > Pages den Branch `main` mit Ordner `/ (root)` aktivieren.
Die App ist dann unter `https://DEINNAME.github.io/fieldbook/` erreichbar.

Updates später: geänderte Dateien ersetzen, dann `git add . && git commit -m "Update" && git push`.

## Wichtig

- Der Passkey ist an die **Domain** gebunden. Wird die Adresse später geändert, funktioniert er nicht mehr
  (das Passwort und Backups funktionieren weiterhin).
- Es gibt **keine Passwort-Wiederherstellung**. Regelmäßig ein verschlüsseltes Backup erstellen
  (Einstellungen > Verschlüsseltes Backup) und an einem sicheren Ort ablegen.
- Die CSV-Datei ist unverschlüsselt (für Excel/Numbers, Trennzeichen Semikolon).

## Sicherheitsmodell

- Zufälliger 256-Bit-Datenschlüssel, AES-GCM für alle Einträge.
- Der Datenschlüssel wird eingepackt mit dem Passwort (PBKDF2-SHA256, 600.000 Runden)
  und optional mit dem Passkey (WebAuthn-PRF + HKDF). Beides funktioniert parallel.
- Automatische Sperre nach einstellbarer Zeit, der Schlüssel liegt nur im Arbeitsspeicher.

## Dateien

`index.html`, `app.js`, `crypto.js`, `sw.js`, `manifest.webmanifest`, `icon-180.png`, `icon-512.png`
(Pflicht), dazu `README.md` und `KI-HINWEIS.md`.
