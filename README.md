# opticsbydom · Foto-Selecter

Lokale React-Web-App zum Aussortieren von RAW- und JPEG-Fotos. Läuft komplett clientseitig im Browser — es gibt keinen Server-Upload, alle Dateien und Vorschaubilder bleiben auf deinem Rechner.

## Ablauf

1. **Upload** — RAW-Dateien (`.CR2`, `.CR3`, `.NEF`, `.ARW`, `.RAF`, `.DNG`) oder JPEGs per Drag & Drop oder Dateiauswahl hinzufügen.
2. **Einstellungen** — Zielanzahl Fotos und Verwendungszweck (Instagram / Kunde / Portfolio / Sonstiges) festlegen.
3. **Analyse** — pro Foto werden automatisch berechnet:
   - **Schärfe** (Laplacian-Varianz auf dem Vorschaubild)
   - **Belichtung** (Histogramm-Clipping in Schatten/Lichtern + mittlere Helligkeit)
   - **Serien-/Duplikat-Erkennung** (Perceptual Hash + Aufnahmezeit-Nähe), um Serienbilder zu gruppieren
   - Ein gewichteter **Gesamt-Score**, dessen Gewichtung sich je nach Verwendungszweck unterscheidet (siehe `src/lib/scoring.ts`)
4. **Auswahl** — die Top-N Fotos werden vorgeschlagen (ein Bild pro Serie, außer die Zielanzahl übersteigt die Anzahl unterschiedlicher Serien). Für jedes vorausgewählte Foto gibt es konkrete **Lightroom-Regler-Empfehlungen** (englische Reglernamen) passend zum Verwendungszweck (`src/lib/lightroomSuggestions.ts`).
5. **Export** — Auswahl als `.txt` oder `.csv` exportieren, zum Abgleich mit Lightroom/Capture One.

Jeder Schritt lässt sich über die klickbare Schritt-Anzeige oben rechts oder die Zurück-/Abbrechen-Buttons rückgängig machen, ohne bereits hochgeladene Fotos zu verlieren — ein erneuter Analyse-Lauf verarbeitet nur noch neue Fotos, bereits ausgewertete werden übersprungen. Die Sprache (Deutsch/Englisch) lässt sich oben rechts umschalten und wird im Browser gespeichert.

## RAW-Vorschau-Extraktion

Browser können RAW-Sensordaten nicht dekodieren. Die App extrahiert daher das in der RAW-Datei eingebettete JPEG-Vorschaubild über [`exifr`](https://github.com/MikeKovarik/exifr). JPEGs werden direkt angezeigt. Die Extraktion funktioniert zuverlässig für CR2/NEF/ARW/RAF/DNG. **CR3** (neuere Canon-RAWs) nutzt einen anderen Container; die Extraktion ist Best-Effort — schlägt sie fehl, wird die Datei mit Fehlermeldung angezeigt und bleibt von der Bewertung ausgeschlossen, blockiert aber nicht den Rest des Batches.

## Entwicklung

```bash
npm install
npm run dev      # Dev-Server
npm run build    # Produktions-Build nach dist/
npm run lint     # oxlint
```

## Bekannte Grenzen

- Da diese Entwicklungsumgebung keine echten Kamera-RAW-Dateien enthält, wurde die Pipeline mit synthetischen JPEGs (unterschiedlich scharf/belichtet, simulierte Serienbilder) end-to-end getestet. Die exifr-basierte RAW-Extraktion selbst solltest du einmal mit ein paar echten RAWs aus deinem Workflow gegenprüfen, insbesondere für CR3.
- Duplikat-Gruppierung nutzt die EXIF-Aufnahmezeit als Zeitfenster; Dateien ganz ohne EXIF-Zeitstempel werden stattdessen nach Upload-Reihenfolge verglichen.
