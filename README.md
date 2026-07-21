# opticsbydom · Foto-Selecter

Lokale React-Web-App zum Aussortieren von RAW- und JPEG-Fotos. Läuft komplett clientseitig im Browser — es gibt keinen Server-Upload, alle Dateien und Vorschaubilder bleiben auf deinem Rechner. Die App ist als PWA installierbar und funktioniert auch ganz ohne Internetverbindung (z. B. direkt am Shooting-Ort).

## Ablauf

1. **Upload** — RAW-Dateien (`.CR2`, `.CR3`, `.NEF`, `.ARW`, `.RAF`, `.DNG`) oder JPEGs per Drag & Drop oder Dateiauswahl hinzufügen.
2. **Einstellungen** — Verwendungszweck (Instagram / Kunde / Portfolio / Video-Frame-Auswahl / Sonstiges) sowie den Auswahl-Modus festlegen:
   - **Zielanzahl**: eine feste Anzahl Fotos wird vorgeschlagen.
   - **Sichtung/Triage**: der ganze Batch wird ohne feste Zielzahl in "Bearbeiten" / "Hat Potenzial" / "Nicht empfohlen" eingestuft — gedacht für die Sichtung eines kompletten Shootings vor dem eigentlichen Editing.
   Eigene **Kunden-Presets** mit individuellen Scoring-Gewichtungen lassen sich speichern und wiederverwenden.
3. **Analyse** — pro Foto werden automatisch berechnet:
   - **Schärfe** (Laplacian-Varianz auf dem Vorschaubild), inkl. Prüfung, ob eine unscharfe Bildregion ein bewusstes Stilmittel (Bokeh/selektiver Fokus) statt eines unbeabsichtigten Verwacklers ist
   - **Belichtung** (Histogramm-Clipping in Schatten/Lichtern + mittlere Helligkeit)
   - **Gesichts- und Augen-Erkennung**: erkannte Gesichter, geschlossene Augen (Eye-Aspect-Ratio) sowie Schärfe im Gesichtsbereich fließen in den Score ein
   - **Serien-/Duplikat-Erkennung** (Perceptual Hash + Aufnahmezeit-Nähe, adaptiv für schnelle Serienaufnahmen), um Serienbilder zu gruppieren
   - Ein gewichteter **Gesamt-Score**, dessen Gewichtung sich je nach Verwendungszweck oder gewähltem Preset unterscheidet (siehe `src/lib/scoring.ts`) — die genaue Gewichts-Aufschlüsselung inkl. Hinweis auf besonderes Potenzial ist per Klick auf den Score einsehbar
   - Die rechenintensive Bildanalyse läuft parallel in Web Workern (sofern vom Browser unterstützt), damit auch große Batches (100+ Fotos) die Oberfläche nicht blockieren
4. **Auswahl** — je nach Modus die Top-N Fotos oder die Sichtungs-Einstufung (ein Bild pro Serie, außer die Zielanzahl übersteigt die Anzahl unterschiedlicher Serien). Für jedes vorausgewählte Foto gibt es konkrete **Lightroom-Regler-Empfehlungen** (englische Reglernamen) passend zum Verwendungszweck (`src/lib/lightroomSuggestions.ts`), einen Vorher/Nachher-Vergleich der besten Serienbilder mit manueller Override-Möglichkeit, sowie bei Instagram eine vorgeschlagene, per Drag & Drop änderbare **Carousel-Reihenfolge**. Die Detailansicht (Doppelklick aufs Foto) unterstützt Zoom/Pan sowie Tastatur- und Wisch-Navigation zwischen Fotos.
5. **Export** — Auswahl als `.txt` oder `.csv` exportieren, zum Abgleich mit Lightroom/Capture One.

Jeder Schritt lässt sich über die klickbare Schritt-Anzeige oben rechts oder die Zurück-/Abbrechen-Buttons rückgängig machen, ohne bereits hochgeladene Fotos zu verlieren — ein erneuter Analyse-Lauf verarbeitet nur noch neue Fotos, bereits ausgewertete werden übersprungen. Ein laufender Durchgang wird automatisch in IndexedDB zwischengespeichert; nach einem versehentlichen Reload/Tab-Schließen bietet die App an, die Sitzung wiederherzustellen. Die Sprache (Deutsch/Englisch) lässt sich oben rechts umschalten und wird im Browser gespeichert.

## RAW-Vorschau-Extraktion

Browser können RAW-Sensordaten nicht dekodieren. Die App extrahiert daher das in der RAW-Datei eingebettete JPEG-Vorschaubild über [`exifr`](https://github.com/MikeKovarik/exifr). JPEGs werden direkt angezeigt. Die Extraktion funktioniert zuverlässig für CR2/NEF/ARW/RAF/DNG. **CR3** (neuere Canon-RAWs) nutzt einen anderen Container; falls exifr fehlschlägt, greift ein Byte-Scan-Fallback, der eigenständig nach eingebetteten JPEG-Markern sucht. Schlägt auch das fehl, wird die Datei mit Fehlermeldung angezeigt und bleibt von der Bewertung ausgeschlossen, blockiert aber nicht den Rest des Batches.

## Offline-Nutzung (PWA)

Die App lässt sich über den Browser installieren (z. B. "Zum Startbildschirm hinzufügen") und danach komplett offline nutzen — App-Shell, Styles und die Gesichtserkennungs-Modelle werden von einem Service Worker vorab zwischengespeichert. Praktisch für den Einsatz direkt am Shooting-Ort ohne WLAN. Beim ersten Laden mit Internetverbindung muss die App einmal vollständig geöffnet werden, damit der Service Worker installieren und alles cachen kann.

## Entwicklung

```bash
npm install
npm run dev      # Dev-Server
npm run build    # Produktions-Build nach dist/
npm run lint     # oxlint
```

## Bekannte Grenzen

- Da diese Entwicklungsumgebung keine echten Kamera-RAW-Dateien enthält, wurde die gesamte Pipeline (Schärfe, Belichtung, Gruppierung, Scoring, Gesichts-/Augenerkennung, Carousel, Auto-Speicherung, Worker, PWA/Offline) mit synthetischen JPEGs end-to-end via Playwright getestet, nicht mit echten Fotos aus einem realen Shooting. Die exifr-basierte RAW-Extraktion, Gesichtserkennung an echten Personen und das Scoring-Verhalten insgesamt solltest du einmal an eigenem Bildmaterial gegenprüfen, bevor du dich im Business-Alltag darauf verlässt — insbesondere für CR3.
- Duplikat-Gruppierung nutzt die EXIF-Aufnahmezeit als Zeitfenster; Dateien ganz ohne EXIF-Zeitstempel werden stattdessen nach Upload-Reihenfolge verglichen.
- Die Gesichts-/Augen-geschlossen-Erkennung (`@vladmandic/face-api`, tiny-Modelle) läuft nur mit synthetischen Test-Platzhaltern getestet, nicht mit echten Portraitfotos; Erkennungsgenauigkeit, Erkennungswinkel-Toleranz und die Eye-Aspect-Ratio-Schwellwerte für "geschlossene Augen" sind an echten Gesichtern noch nicht kalibriert.
- Die Unterscheidung "gewolltes Bokeh/selektiver Fokus" vs. "unbeabsichtigte Unschärfe" basiert auf Gesichtsschärfe bzw. Kachel-Schärfe-Ausreißern (`src/lib/pipeline.ts`) — ein plausibles, aber heuristisches Signal ohne Tiefenschärfe-Information; bei ungewöhnlichen Kompositionen (kein Gesicht, kein klarer Schärfe-Kontrast) kann die Einstufung danebenliegen.
- Die Triage-Schwellwerte (`TIER_EDIT_THRESHOLD`/`TIER_POTENTIAL_THRESHOLD` in `src/lib/scoring.ts`) sind pauschal gesetzt und nicht an echten Shootings validiert; bei Bedarf über ein Preset oder direkt im Code anpassen.
- Web-Worker-Parallelisierung setzt `Worker`, `OffscreenCanvas` und `createImageBitmap` voraus; fehlt eines davon (ältere Browser), fällt die App automatisch auf die langsamere Einzelthread-Analyse zurück — funktional identisch, nur ohne Parallelisierung.
- Offline-Fähigkeit (Service Worker/Workbox-Precaching inkl. Modell-Dateien) wurde lokal per Playwright verifiziert (Laden, Offline schalten, Reload, App-Shell + Modelle weiterhin aus dem Cache erreichbar). Verhalten bei App-Updates (neue Version verfügbar, während alte Version offline geöffnet ist) sowie plattformspezifisches Installationsverhalten (iOS/Android/Desktop) wurden nicht in einer echten Hosting-Umgebung getestet.
- Auto-Speicherung/Wiederherstellung liegt in IndexedDB im Browser desselben Geräts/Profils; bei privatem/inkognito Modus oder gelöschten Browserdaten geht der Zwischenstand verloren.
