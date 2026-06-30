# PWA — Notatki dla dewelopera

## Jak sprawdzić (Lighthouse)

1. Otwórz stronę w Chrome (nie localhost — musi być HTTPS, np. getrezerwo.pl)
2. DevTools → Lighthouse → wybierz kategorię **Progressive Web App** → kliknij Analyze
3. Wymagane oceny: Installable ✅, PWA optimized ✅
4. Najczęstsze przyczyny fail: brak ikonki 512px, manifest bez `start_url`, brak HTTPS

Szybsza alternatywa: Chrome DevTools → Application → Manifest / Service Workers

---

## Jak użytkownik instaluje na Androidzie

1. Otwórz getrezerwo.pl w Chrome
2. Po chwili pojawi się baner "Zainstaluj aplikację Rezerwo" na dole ekranu
3. Kliknij **Zainstaluj** → pojawi się natywny dialog → potwierdź
4. Aplikacja trafia na ekran główny i do listy aplikacji
5. Działa w trybie standalone (bez paska Chrome)

Alternatywnie: menu ⋮ → "Dodaj do ekranu głównego"

---

## Jak użytkownik instaluje na iPhonie / iPad (Safari)

1. Otwórz getrezerwo.pl w **Safari** (Chrome/Firefox na iOS nie obsługują instalacji PWA)
2. Na dole pojawi się podpowiedź: "Naciśnij Udostępnij ⬆️ → Dodaj do ekranu początk."
3. Kliknij ikonkę **Udostępnij** (kwadrat ze strzałką w górę) na dole Safari
4. Przewiń listę akcji i wybierz **Dodaj do ekranu głównego**
5. Potwierdź nazwę "Rezerwo" → kliknij **Dodaj**

> Ważne: iOS nie obsługuje `beforeinstallprompt`, dlatego podpowiedź jest tylko tekstowa.

---

## Jak wymusić aktualizację jeśli klient ma zalany cache

Service Worker jest skonfigurowany z `skipWaiting: true` + `clientsClaim: true`, więc
nowy SW przejmuje kontrolę natychmiast po pobraniu — bez czekania na zamknięcie kart.

Jeśli mimo to użytkownik widzi starą wersję:

**Opcja 1 — użytkownik sam:**
- Chrome → Ustawienia → Więcej narzędzi → Narzędzia deweloperskie → Application → Storage → Clear storage → Clear site data
- Lub: Hard reload (Ctrl+Shift+R / Cmd+Shift+R)

**Opcja 2 — z poziomu aplikacji (jeśli kiedyś dodamy):**
```ts
// Nasłuchuj na nowy SW i reload po aktualizacji
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload());
}
```

**Opcja 3 — natychmiastowe (deweloper):**
- DevTools → Application → Service Workers → zaznacz "Update on reload" → odśwież

---

## Buforowanie API

API (`/api/*`) jest wykluczone z cache SW przez `navigateFallbackDenylist`.
Dane są zawsze świeże. Tylko statyka (JS, CSS, HTML, obrazki, fonty) jest cachowana.
