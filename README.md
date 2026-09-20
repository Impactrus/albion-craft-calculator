# ⚔️ Albion Online Crafting & Profit Calculator

Zaawansowany, w 100% darmowy kalkulator i planner rzemiosła (crafting / refining / profit scanner) dla gry **Albion Online**, z wbudowanym modułem **przechwytywania pakietów sieciowych na żywo (Photon Protocol 18 Sniffer)**.

---

## 🌟 Główne Funkcje

1. **🛠️ Kalkulator Craftingu (Craft Planner)**:
   - Dokładne obliczanie kosztów wytwarzania i czystego zysku (Net Profit).
   - Wsparcie dla wszystkich tierów (T3 – T8) oraz poziomów zaklęcia (.0, .1, .2, .3, .4).
   - Jakości przedmiotów (Q1 Normalna – Q5 Arcydzieło).
   - Zwrot surowców (RRR - Resource Return Rate) z uwzględnieniem bonusów miast i Skupienia (Focus).
   - Koszty żywności / podatek stanowiska rzemieślniczego, prowizje rynkowe (Premium 4% / Bez Premium 8%, Setup Fee 2.5%).
   - Obsługa dzienników rzemieślniczych (Laborer Journals) oraz wagi transportu.
   - Pamięć podręczna (localStorage) — pamięta ostatnio wybrany przedmiot i ustawienia.

2. **🪵 Przetwórstwo Surowców (Refining)**:
   - Kalkulator przetapiania rudy, obróbki skór, desek, tkanin i kamienia.
   - Uwzględnienie zużycia surowców niższego tieru i bonusów miast królewskich.

3. **📊 Skaner Zysku (Profit Scanner)**:
   - Automatyczny skan bazy przedmiotów pod kątem najwyższego zysku, marży (%) lub srebra na punkt skupienia (Silver/Focus).

4. **📡 Przechwytywanie Pakietów na Żywo (Live Sniffer)**:
   - Integracja z `albiondata-client` (dekodowanie protokołu Photon P18).
   - Wystarczy przeglądać rynek w grze, a ceny automatycznie wpadają do aplikacji przez Server-Sent Events (SSE).
   - Automatyczne dobieranie najniższej ceny składnika ze wszystkich przechwyconych rynków.
   - Dedykowana zakładka do podglądu przechwyconych ofert.

---

## 🚀 Szybki Start (Windows)

1. Upewnij się, że masz zainstalowany **[Node.js](https://nodejs.org)** (wersja 18+) oraz **[Npcap](https://npcap.com/)** (do nasłuchiwania pakietów sieciowych).
2. Zainstaluj zależności aplikacji:
   ```bash
   cd albion-craft-calculator
   npm install
   ```
3. Kliknij dwukrotnie plik:
   ```
   URUCHOM_ALBION_CRAFTING.bat
   ```
   Skrypt automatycznie:
   - Uruchomi mostek pakietów (`bridge.cjs` na porcie `5050`)
   - Uruchomi sniffer pakietów (`albiondata-client.exe`)
   - Wystartuje serwer deweloperski Vite (`localhost:5173`)
   - Otworzy aplikację w domyślnej przeglądarce

> 💡 **Wskazówka dotycząca sniffera**: Po wejściu do gry przejdź przez bramę strefy (zmień mapę), aby sniffer zarejestrował Twoją lokalizację (`LocationId`). Następnie otwórz rynek — ceny zaczną pojawiać się automatycznie!

---

## 🏗️ Architektura Projektu

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
- **Mostek SSE (`bridge.cjs`)**: Lokalny serwer Node.js odbierający pakiety od sniffera i rozsyłający je do przeglądarki w czasie rzeczywistym.
- **Sniffer (`albion-sniffer/`)**: Klient `albiondata-client` do przechwytywania i dekodowania ruchu UDP Photon Protocol 18.
- **Baza danych przedmiotów**: Wyekstrahowana z oficjalnych plików gry (`ao-bin-dumps`) zawierająca przepisy, wartości przedmiotów i nazwy wielojęzyczne (PL / EN).

---

## 📄 Licencja

Projekt stworzony na własny użytek społeczności Albion Online. Dane rynkowe wspierane przez The Albion Online Data Project.
