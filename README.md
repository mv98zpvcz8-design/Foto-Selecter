# opticsbydom · Foto-Selecter

Lokale React-Web-App zum Aussortieren von RAW- und JPEG-Fotos. Läuft komplett clientseitig im Browser — es gibt keinen Server-Upload, alle Dateien und Vorschaubilder bleiben auf deinem Rechner. Die App ist als PWA installierbar und funktioniert auch ganz ohne Internetverbindung (z. B. direkt am Shooting-Ort).

## Ablauf

1. **Upload** — RAW-Dateien (`.CR2`, `.CR3`, `.NEF`, `.ARW`, `.RAF`, `.DNG`) oder JPEGs per Drag & Drop oder Dateiauswahl hinzufügen (ein ganzer Ordner lässt sich im systemeigenen Dateiauswahl-Dialog ebenso markieren wie im Drag & Drop). Alternativ direkt aus einem Lightroom-Album importieren, siehe Abschnitt "Lightroom-Anbindung" unten.
2. **Einstellungen** — Verwendungszweck/Auswahlprofil (Instagram / Kunde / Portfolio / Action-Serie / Presse / Event / Sport / Favoriten / Sonstiges) sowie den Auswahl-Modus festlegen:
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
4. **Auswahl** — je nach Modus die Top-N Fotos oder die Sichtungs-Einstufung (ein Bild pro Serie, außer die Zielanzahl übersteigt die Anzahl unterschiedlicher Serien). Für jedes vorausgewählte Foto gibt es konkrete **Lightroom-Regler-Empfehlungen** (englische Reglernamen) passend zum Verwendungszweck (`src/lib/lightroomSuggestions.ts`), einen Vorher/Nachher-Vergleich der besten Serienbilder mit manueller Override-Möglichkeit, sowie bei Instagram eine vorgeschlagene, per Drag & Drop änderbare **Carousel-Reihenfolge**. Die Detailansicht (Doppelklick aufs Foto) unterstützt Zoom/Pan sowie Tastatur- und Wisch-Navigation zwischen Fotos. Ein Klick auf ein Bild **im Carousel** öffnet dieselbe Zoom-/Navigations-Ansicht bewusst ohne das Score-/Tag-/Lightroom-Feedback-Panel — dort geht es nur um die visuelle Bildreihenfolge, nicht ums erneute Sichten der Analyse.
5. **Export** — Auswahl als `.txt` oder `.csv` exportieren, zum Abgleich mit Lightroom/Capture One.

Jeder Schritt lässt sich über die klickbare Schritt-Anzeige oben rechts oder die Zurück-/Abbrechen-Buttons rückgängig machen, ohne bereits hochgeladene Fotos zu verlieren — ein erneuter Analyse-Lauf verarbeitet nur noch neue Fotos, bereits ausgewertete werden übersprungen. Ein laufender Durchgang wird automatisch in IndexedDB zwischengespeichert; nach einem versehentlichen Reload/Tab-Schließen bietet die App an, die Sitzung wiederherzustellen. Die Sprache (Deutsch/Englisch) lässt sich oben rechts umschalten und wird im Browser gespeichert.

## RAW-Vorschau-Extraktion

Browser können RAW-Sensordaten nicht dekodieren. Die App extrahiert daher das in der RAW-Datei eingebettete JPEG-Vorschaubild über [`exifr`](https://github.com/MikeKovarik/exifr). JPEGs werden direkt angezeigt. Die Extraktion funktioniert zuverlässig für CR2/NEF/ARW/RAF/DNG. **CR3** (neuere Canon-RAWs) nutzt einen anderen Container; falls exifr fehlschlägt, greift ein Byte-Scan-Fallback, der eigenständig nach eingebetteten JPEG-Markern sucht. Schlägt auch das fehl, wird die Datei mit Fehlermeldung angezeigt und bleibt von der Bewertung ausgeschlossen, blockiert aber nicht den Rest des Batches.

## Offline-Nutzung (PWA)

Die App lässt sich über den Browser installieren (z. B. "Zum Startbildschirm hinzufügen") und danach komplett offline nutzen — App-Shell, Styles und die Gesichtserkennungs-Modelle werden von einem Service Worker vorab zwischengespeichert. Praktisch für den Einsatz direkt am Shooting-Ort ohne WLAN. Beim ersten Laden mit Internetverbindung muss die App einmal vollständig geöffnet werden, damit der Service Worker installieren und alles cachen kann.

## Semantische Filter je Auswahlprofil

Jedes Auswahlprofil (Kunde, Instagram, Portfolio, Action-Serie, Presse, Event, Sport, Favoriten, Sonstiges) hat in der Ergebnisansicht eine eigene, kuratierte Filterleiste — Filter sind kein globales, profilunabhängiges Panel, sondern gehören zum jeweils aktiven Profil. Filter lassen sich per Klick kombinieren (UND/ODER umschaltbar), zeigen die Trefferanzahl je Chip, und lassen sich einzeln oder komplett zurücksetzen. Eine natürliche Suchleiste ("zeige scharfe Schwarz-Weiß-Bilder") übersetzt die Eingabe über eine feste Stichwort-Zuordnung (kein Sprachmodell) in die passenden Filter-Chips des aktiven Profils; nicht erkannte Wörter werden ehrlich als "nicht erkannt" angezeigt statt ignoriert.

Alle Filter basieren auf tatsächlich lokal gemessenen Signalen:

- **Farbe/Stil**: Schwarz-Weiß/Farbe (Sättigung), starke Farben, warme/kalte Farbgebung, hoher/niedriger Kontrast, hell/dunkel, Low-Light, Gegenlicht, Bewegungsunschärfe/Freeze Motion (gerichtete Gradient-Energie-Analyse)
- **Technisch**: Schärfegrade, über-/unterbelichtet, Augen/Gesicht/Hauptmotiv scharf, keine geschlossenen Augen, Hoch-/Quer-/Quadratformat, RAW/JPEG, einzigartiges Motiv (keine große Serie)
- **Personen & Emotion**: Emotion/Freude/Trauer/Überraschung/Aggression (Gesichtsausdruck-Modell), Einzelperson/mehrere Personen, Publikum/Porträt/Gruppenfoto (grobe Heuristik aus Gesichtsanzahl/-größe)
- **Score**: hoher Score im aktuell aktiven Profil, nur Favoriten

Bewusst **nicht** enthalten sind Filter, die echte Objekt-/Szenen-Erkennung bräuchten (Sportart, Ball sichtbar, Bühne, Sponsoren-Branding, bekannte Personen, spezifische Gesten wie Jubel/Zweikampf) — dafür gibt es hier kein zuverlässiges, lokal laufendes Modell, und erfundene Confidence-Werte wären irreführend.

## Shot Analytics & Shooting-Resümee

Über den Button "Shot Analytics" in der Ergebnisansicht öffnet sich eine Analyse-Seite mit:

- Grundlegenden Kennzahlen (Anzahl, Auswahlquote, Serien, Durchschnitts-Scores, Format-/Farbanteile)
- Technischer Analyse nach Brennweite/ISO/Objektiv (nur Buckets mit ausreichend Bildern, mind. 3)
- Gated Erkenntnissen ("Bei 200mm waren X% der Bilder unscharf") — nur wenn die Differenz zum Durchschnitt deutlich genug ist
- Bestenlisten je Kategorie (technisch stärkste, emotionalste, Publikums-, Action-, Schwarz-Weiß-Bilder), die direkt in eine gefilterte Profilansicht springen
- Einem regelbasierten **Shooting-Resümee** (Gesamtfazit, Stärken, Schwächen, bis zu drei priorisierte Übungsfelder, Vergleich zu früheren Shootings) — komplett aus den oben berechneten Kennzahlen zusammengesetzt, ohne Sprachmodell; jede Aussage ist auf eine Kennzahl zurückführbar und nur bei ausreichender Datenlage sichtbar

Für den Vergleich zu früheren Shootings speichert die App **ausschließlich aggregierte Kennzahlen** (Zähler, Anteile, Durchschnittswerte) pro abgeschlossenem Durchgang in einer eigenen IndexedDB — nie Fotos, Vorschaubilder oder Gesichtsdaten. Ein "Shooting-Verlauf löschen"-Button auf der Analytics-Seite entfernt diesen Verlauf vollständig und sofort.

**Wichtige methodische Einschränkung**: Der Schärfe-Score wird pro Batch perzentil-normalisiert (relativ zum eigenen 5./95. Perzentil dieses Durchgangs) — zwei Shootings mit demselben Schärfe-Score-Durchschnitt sind dadurch nicht zwangsläufig absolut gleich scharf. Deshalb vergleicht das Resümee bewusst **keinen** Schärfe-Trend über mehrere Shootings hinweg (nur Belichtung, Emotion-Anteil und Hochformat-Anteil, die auf festen/absoluten Maßstäben beruhen).

## Große Shootings (100–1000+ Fotos)

Für den tatsächlichen Einsatzfall (Event-/Sportshootings mit mehreren hundert bis über tausend Bildern) gibt es gezielte Performance-Maßnahmen:

- **Thumbnails statt Vollbild-Vorschau in der Galerie**: Die Analyse-Pipeline erzeugt ohnehin einen herunterskalierten Canvas (max. 480px) für Schärfe-/Farbanalyse — genau dieser wird als JPEG-Thumbnail wiederverwendet (`photo.thumbnailUrl`), ohne zusätzlichen Dekodier-Aufwand. Die Foto-Kacheln in Galerie, Carousel und Bestenlisten nutzen dieses Thumbnail; Detailansicht und Serien-Vergleich zeigen weiterhin die volle Vorschau (dort ist Bildqualität für den Vergleich wichtig).
- **Grid-Virtualisierung** (`VirtualizedGrid.tsx`): Ab 60 Fotos in einer Ansicht werden nur die sichtbaren Zeilen (plus Overscan) tatsächlich als DOM-Knoten gemountet, der Rest wird durch Platzhalter-Elemente ersetzt. Verifiziert mit einem 80-Foto-Batch: nur ~24–40 Karten gleichzeitig im DOM statt aller 80.
- **Object-URL-Leak behoben**: Vorschau- und Thumbnail-Blob-URLs wurden bisher nur beim kompletten Zurücksetzen freigegeben, nicht beim Entfernen einzelner Fotos oder "Alle entfernen" — das ist jetzt korrigiert (`revokePhotoUrls` in `AppState.tsx`).
- **Wiederaufnahme nach Absturz/Tab-Schließen** (`src/lib/analysisCache.ts`): Die teuren, rein foto-bezogenen Messwerte (Schärfe, Belichtung, Gesichts-/Emotionserkennung, EXIF, Hash) werden direkt nach Abschluss pro Foto in einer eigenen IndexedDB zwischengespeichert — keyed nach Dateiname+Größe, ohne Vorschaubilder oder Rohdaten. Wird die Analyse eines großen Shootings unterbrochen (Tab geschlossen, Browser abgestürzt) und danach dieselben Dateien erneut hinzugefügt, überspringt die Pipeline für bereits analysierte Fotos die teure Gesichtserkennung/Pixelanalyse komplett und regeneriert nur das (günstige) Thumbnail. Gemessen an einem 10-Foto-Testlauf: ~19x schneller beim zweiten Durchgang. Ein "Analyse-Cache leeren"-Button im Upload-Screen löscht diesen Cache vollständig; er verfällt außerdem automatisch nach 2 Wochen und ist auf die letzten ~3000 Fotos begrenzt.
- Die eigentliche Bildanalyse lief bereits vorher parallel in Web Workern (siehe oben).

**Wichtig — was das nicht ist**: Das ist eine lokale Wiederaufnahme, kein Hintergrund-Job. Die Analyse läuft weiterhin nur, solange der Tab offen und aktiv ist; sie läuft nicht weiter, während die App im Hintergrund ist oder der Browser komplett geschlossen wurde. Ein echter, vom Tab unabhängiger Hintergrund-Job (aus der Anfrage: "Analyse darf nicht ausschließlich von einem offenen Browser-Tab abhängen") würde einen Server voraussetzen, den es in dieser Architektur bewusst nicht gibt — siehe "Architektur-Grenze" unten.

## Lokales Dashboard, Learn My Style & Backup

Ein neuer "Dashboard"-Button im Header öffnet eine geräteweite Übersicht über alle bisherigen Shootings, unabhängig vom aktuell offenen Durchgang:

- **Kennzahlen**: Anzahl gespeicherter Shootings, Anzahl aufgezeichneter Lern-Entscheidungen, belegter Speicherplatz (`navigator.storage.estimate()`, sofern vom Browser unterstützt), Hinweis auf einen noch nicht abgeschlossenen Auto-Speicherungs-Stand.
- **Letzte Shootings** und **Trends je Profil** (Belichtung, Hochformat-Anteil, Emotionsanteil — ab 2 Shootings desselben Verwendungszwecks) — nutzt dafür das bereits vorhandene `purpose`-Feld aus dem Shooting-Verlauf, es gibt bewusst kein zweites, paralleles Kategorie-/Metadaten-System.
- **Learn My Style**: Ein leichtgewichtiges, erklärbares Präferenzmodell (`src/lib/preferenceLearning.ts`) — **kein** trainiertes neuronales Netz. Pro Auswahlprofil (Kunde/Instagram/Portfolio/Sport/Event/Allgemein) wird ein laufender Mittelwert-Merkmalsvektor (Schärfe, Belichtung, Format, Farbe, Emotion, Personenanzahl, …) für "angenommene" und "abgelehnte" Fotos geführt. Jede manuelle Auswahl/Ablehnung, jeder Favorit, jede Serien-Vergleichs-Entscheidung und die Instagram-Carousel-Titelbild-Wahl fließt automatisch als Lernsignal ein. Ein Präferenz-Score (0–100) je Foto ergibt sich aus der Kosinus-Ähnlichkeit zum "angenommen"- vs. "abgelehnt"-Zentroid. Die Anzeige ist immer an einen Status gekoppelt (`insufficient` / `early` / `usable` / `wellPersonalized`, je nach Anzahl bisheriger Entscheidungen: 10/30/100) — ein dünnes Profil wird nie als sicher dargestellt. Jedes Profil lässt sich einzeln und vollständig zurücksetzen.
- **Lokale Datensicherung**: Export/Import als versionierte JSON-Datei (Presets, Shooting-Verlauf, Learn-My-Style-Daten). Fotos, Vorschaubilder und der Analyse-Cache sind **bewusst nicht** enthalten (siehe Kommentar in `src/lib/localBackup.ts`) — Fotos werden grundsätzlich nie dauerhaft gespeichert, und der Analyse-Cache ist reine Performance-Optimierung und aus den Quellfotos jederzeit neu erzeugbar. Vor dem eigentlichen Import zeigt die App eine Vorschau (Anzahl Presets/Shootings/Lern-Events) und lässt zwischen **Zusammenführen** (id-basiertes Upsert, keine Duplikate bei mehrfachem Import derselben Datei) und **Ersetzen** (bestehende Daten werden vorher gelöscht) wählen.

## Lightroom-Anbindung (optional, in Arbeit)

Auf ausdrücklichen Wunsch entsteht gerade eine direkte Adobe-Lightroom-Anbindung — eine bewusste Ausnahme von der sonst 100% clientseitigen Architektur, da Adobes Lightroom-API einen Client Secret voraussetzt, der niemals im Browser liegen darf. Wichtig: das ist ein **optionaler Zusatz-Baustein**, nicht ein Umbau der bestehenden App — wer keine Lightroom-Anbindung nutzt, braucht nichts davon einzurichten, alles andere (Upload, Analyse, Dashboard, Learn My Style, Backup) bleibt unverändert 100% clientseitig.

**Architektur:** ein minimaler Server-Baustein (Vercel Edge Functions unter `api/`) übernimmt ausschließlich drei Dinge: OAuth-Code-Austausch, Refresh-Token-Handling und das Weiterreichen der Lightroom-API-Calls — keine Datenbank, keine gespeicherten Fotos, kein Business-Logik dort. Tokens liegen serverseitig AES-256-GCM-verschlüsselt in einem `HttpOnly`/`Secure`-Cookie (Schlüssel aus `SESSION_SECRET`, nie im Client sichtbar).

**Bisheriger Stand:**
- ✅ OAuth-Login/Callback/Status/Logout (`api/auth/*`) — verifiziert per Unit-Tests für die Verschlüsselungslogik.
- ⏳ Album-Liste abrufen, Fotos daraus in die bestehende Analyse-Pipeline einspeisen — in Arbeit.

**Einrichtung (für eigenen Adobe-Zugang):**
1. Eigene Adobe-ID + Projekt in der [Adobe Developer Console](https://console.adobe.io) anlegen, API "Lightroom Services" hinzufügen, Credential-Typ "Web App".
2. `.env.example` nach `.env.local` kopieren (bereits in `.gitignore`) und `ADOBE_CLIENT_ID`, `ADOBE_CLIENT_SECRET`, `ADOBE_REDIRECT_URI`, `SESSION_SECRET` eintragen.
3. Redirect-URI in der Adobe Console muss exakt mit `ADOBE_REDIRECT_URI` übereinstimmen — Adobe verlangt HTTPS auch für localhost.

## Architektur-Grenze: was ohne Backend nicht geht

Diese App ist bewusst 100% clientseitig (keine Server-Uploads, kein Backend, keine Datenbank) — eine explizite Datenschutz-Entscheidung, da Event-/Sportfotos echte Personen zeigen. Das bedeutet aber auch, dass bestimmte Anfragen technisch nicht umsetzbar sind, unabhängig vom Aufwand:

- **Analyse/Jobs unabhängig vom offenen Browser-Tab**: Es gibt keinen Hintergrund-Prozess, der weiterläuft, während der Tab geschlossen oder die App im Hintergrund ist. iOS Safari unterstützt zudem keine Background-Sync-API für PWAs. Das ginge nur mit einem Server.
- **Update:** Die Lightroom-API ließ sich über eine zweite, private Adobe-ID doch ohne Partner-Freigabe registrieren (siehe "Lightroom-Anbindung" oben) — die Einschätzung weiter unten war also zu pessimistisch. Diese eine Anbindung ist entsprechend die einzige bewusste Ausnahme von "100% clientseitig" in dieser App, mit eigenem, minimalem Server-Baustein nur für den OAuth-Secret-Austausch. Der Rest dieses Abschnitts (Hintergrund-Jobs, generelle Backend-Grenzen) gilt weiterhin uneingeschränkt.
- **Serverseitig generierte Vorschaubilder, Datenbank-Constraints, verschlüsselte Übertragung, Zugriffskontrolle**: setzen alle einen Server voraus, den es hier nicht gibt.
- **"Resumierbare, chunked Uploads"** im klassischen Sinn entfallen, weil nichts hochgeladen wird — Dateien bleiben immer auf dem Gerät. Was stattdessen gebaut wurde: eine lokale Wiederaufnahme des *Analyse*-Fortschritts nach einer unterbrochenen Sitzung (siehe oben).

Eine Umstellung auf ein echtes Backend (inkl. Adobe-API-Integration) wäre ein separates, größeres Vorhaben mit Hosting-Kosten, einer echten Datenbank und einer bewussten Änderung des Datenschutz-Modells — und würde eine explizite Entscheidung dazu voraussetzen, nicht eine stillschweigende Umsetzung einzelner Punkte aus einer langen Anforderungsliste.

## Entwicklung

```bash
npm install
npm run dev      # Dev-Server
npm run build    # Produktions-Build nach dist/
npm run lint     # oxlint
npm run test     # vitest — Unit-Tests für die reine Logik
```

Die Unit-Tests (`src/lib/*.test.ts`, via [vitest](https://vitest.dev/)) decken die Kernlogik ab, die sich ohne echten Browser/DOM testen lässt: Scoring (Schärfe-Normalisierung, Belichtung, Serien-Auswahl, Triage), Filter-Matching, Profil-Gewichtung, Shot-Analytics-Kennzahlen/Insight-Gating, Learn-My-Style (Merkmals-Extraktion, Präferenz-Score, Profil-Isolation, Zurücksetzen) und das Backup-Format (Validierung, Merge-/Replace-Import inkl. Duplikat-Vermeidung). `fake-indexeddb` steht dabei für die echten IndexedDB-Aufrufe ein, ein minimaler `localStorage`-Stub für das Presets/Sprache-Storage. UI-Komponenten, Web-Worker-Pfade und die Pipeline-Orchestrierung selbst sind weiterhin nur per manueller/Playwright-End-to-End-Prüfung abgedeckt, nicht durch Unit-Tests.

## Bekannte Grenzen

- Da diese Entwicklungsumgebung keine echten Kamera-RAW-Dateien enthält, wurde die gesamte Pipeline (Schärfe, Belichtung, Gruppierung, Scoring, Gesichts-/Augenerkennung, Carousel, Auto-Speicherung, Worker, PWA/Offline) mit synthetischen JPEGs end-to-end via Playwright getestet, nicht mit echten Fotos aus einem realen Shooting. Die exifr-basierte RAW-Extraktion, Gesichtserkennung an echten Personen und das Scoring-Verhalten insgesamt solltest du einmal an eigenem Bildmaterial gegenprüfen, bevor du dich im Business-Alltag darauf verlässt — insbesondere für CR3.
- Duplikat-Gruppierung nutzt die EXIF-Aufnahmezeit als Zeitfenster; Dateien ganz ohne EXIF-Zeitstempel werden stattdessen nach Upload-Reihenfolge verglichen.
- Die Gesichts-/Augen-geschlossen-Erkennung (`@vladmandic/face-api`, tiny-Modelle) läuft nur mit synthetischen Test-Platzhaltern getestet, nicht mit echten Portraitfotos; Erkennungsgenauigkeit, Erkennungswinkel-Toleranz und die Eye-Aspect-Ratio-Schwellwerte für "geschlossene Augen" sind an echten Gesichtern noch nicht kalibriert.
- Die Unterscheidung "gewolltes Bokeh/selektiver Fokus" vs. "unbeabsichtigte Unschärfe" basiert auf Gesichtsschärfe bzw. Kachel-Schärfe-Ausreißern (`src/lib/pipeline.ts`) — ein plausibles, aber heuristisches Signal ohne Tiefenschärfe-Information; bei ungewöhnlichen Kompositionen (kein Gesicht, kein klarer Schärfe-Kontrast) kann die Einstufung danebenliegen.
- Die Triage-Schwellwerte (`TIER_EDIT_THRESHOLD`/`TIER_POTENTIAL_THRESHOLD` in `src/lib/scoring.ts`) sind pauschal gesetzt und nicht an echten Shootings validiert; bei Bedarf über ein Preset oder direkt im Code anpassen.
- Web-Worker-Parallelisierung setzt `Worker`, `OffscreenCanvas` und `createImageBitmap` voraus; fehlt eines davon (ältere Browser), fällt die App automatisch auf die langsamere Einzelthread-Analyse zurück — funktional identisch, nur ohne Parallelisierung.
- Offline-Fähigkeit (Service Worker/Workbox-Precaching inkl. Modell-Dateien) wurde lokal per Playwright verifiziert (Laden, Offline schalten, Reload, App-Shell + Modelle weiterhin aus dem Cache erreichbar). Verhalten bei App-Updates (neue Version verfügbar, während alte Version offline geöffnet ist) sowie plattformspezifisches Installationsverhalten (iOS/Android/Desktop) wurden nicht in einer echten Hosting-Umgebung getestet. Dashboard, Learn My Style und die lokale Datensicherung greifen ausschließlich auf IndexedDB/localStorage zu (keine Netzwerk-Requests) und funktionieren dadurch offline identisch zum Rest der App — der Service Worker muss dafür nichts Zusätzliches cachen, da keine neuen Netzwerk-Ressourcen hinzukamen.
- Auto-Speicherung/Wiederherstellung liegt in IndexedDB im Browser desselben Geräts/Profils; bei privatem/inkognito Modus oder gelöschten Browserdaten geht der Zwischenstand verloren.
- Die semantischen Filter/Bestenlisten decken bewusst nur real messbare Signale ab (Farbe, Kontrast, Schärfe, Belichtung, Gesichtsausdruck, grobe Gesichtsanzahl-Heuristiken). Motiv-/Szenen-spezifische Filter aus der ursprünglichen Anfrage (Fußball, Judo, Bühne, Jubel, Zweikampf, Sponsoren-Branding, bekannte Personen …) sind **nicht implementiert**, da dafür ein echtes, lokal laufendes Objekt-/Szenen-Erkennungsmodell nötig wäre, das es hier nicht gibt — diese Filter zu erfinden hätte falsche Confidence-Werte bedeutet.
- Die Blickkontakt-Heuristik ("facesLookingAtCamera") ist eine grobe geometrische Symmetrie-Prüfung der Augen-Landmarks, keine echte Kopfpose-/Blickrichtungs-Schätzung — bei Profilaufnahmen oder ungewöhnlichen Kamerawinkeln kann sie danebenliegen.
- Die Bewegungsunschärfe-Erkennung vergleicht horizontale vs. vertikale Gradienten-Energie und erkennt damit *gerichtete* Unschärfe recht zuverlässig (mit synthetischen Bildern verifiziert), kann aber bei Motiven mit stark gerichteter Eigentextur (Jalousien, Zäune, Architektur-Linien) falsch anschlagen, da diese ebenfalls ein Energie-Ungleichgewicht erzeugen.
- Shot Analytics/Resümee: Die "Vergleich zu früheren Shootings"-Funktion vergleicht bewusst nur Belichtung, Emotionsanteil und Hochformat-Anteil über Shootings hinweg (siehe Abschnitt oben) — **nicht** die Schärfequote, weil diese pro Batch perzentil-normalisiert und daher nicht absolut vergleichbar ist. Die Auswahlquote wird ebenfalls nicht über Shootings verglichen, da sie im Zielanzahl-Modus nur die vom Nutzer eingegebene Zahl widerspiegelt, keine Qualitätsaussage.
- "Top-Bilder für Kunde/Instagram/Portfolio" in Shot Analytics basieren auf dem Score des **aktuell aktiven** Profils — es gibt noch keinen separaten, gleichzeitig berechneten Instagram-/Kunden-/Portfolio-Score (das ist erst mit einem künftigen "Instagram Coach"-Modul geplant). Für eine andere Gewichtung Profil wechseln und neu analysieren.
- Alle neuen Module (Filter, Shot Analytics, Résumé) wurden mit synthetischen Testbildern per Playwright end-to-end verifiziert (inkl. Mehrfach-Shootings zur Verlaufs-/Vergleichsprüfung), nicht mit echten Fotos/Gesichtern aus einem realen Shooting.
- Die Grid-Virtualisierung schätzt die Kartenhöhe pauschal (kein exaktes Messen pro Karte); bei stark unterschiedlich hohen Karten (z. B. sehr lange Lightroom-Empfehlungslisten) kann die Scroll-Position minimal abweichen — das führt höchstens zu etwas zu früh/spät gemounteten Karten, nicht zu einem kaputten Layout. Getestet mit einem 80-Foto-Batch; das Verhalten bei echten 1000+-Foto-Shootings mit sehr unterschiedlichen Karteninhalten wurde nicht separat verifiziert.
- Alle Analyse- und Worker-Schritte laufen ausschließlich, solange der Browser-Tab offen und aktiv ist — es gibt keinen Hintergrund-Job, der unabhängig vom Tab weiterläuft (dafür bräuchte es einen Server; siehe Architektur-Hinweis unten). Wird der Tab geschlossen oder der Browser beendet, bevor die Analyse fertig ist, muss sie neu gestartet werden (die Foto-Auswahl selbst bleibt dank Auto-Speicherung erhalten, der Analyse-Fortschritt nicht).
- **"Progressive Analyse" (Ergebnisse schon während des Laufs sehen) wurde bewusst nicht als eigenes Phasen-System (Phase A/B/C) umgesetzt.** Der Grund: `scorePhotos` normalisiert die Schärfe-Werte perzentil-basiert relativ zum gesamten aktuellen Batch (siehe "Shot Analytics"-Abschnitt oben) — ein Score, der nur auf Basis der bereits fertigen Fotos berechnet würde, würde sich noch verschieben, sobald weitere Fotos dazukommen, und wäre daher irreführend, wenn er zu früh angezeigt wird. Eine echte Phasen-Architektur (z. B. "günstige Vorprüfung zuerst, teure Gesichtserkennung später") hätte die Nutzeroberfläche und Score-Bedeutung an mehreren Stellen verändert, ohne einen tatsächlichen Mehrwert zu bringen, solange der finale Score ohnehin erst nach dem letzten Foto stabil ist. Was es stattdessen bereits gibt: der Live-Fortschrittsbalken während der Analyse, und die Wiederaufnahme bereits analysierter Fotos aus dem Analyse-Cache nach einer Unterbrechung (siehe "Große Shootings" oben) — echte, aber andere Verbesserungen an derselben Stelle.
