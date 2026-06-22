# Teksty zgód (checkboxy) — Rezerwo

Gotowe teksty do wstawienia przy formularzu rezerwacji i rejestracji.

---

## 1. Checkbox przy REZERWACJI (Klient) — WYMAGANY

> ☐ Zapoznałem/-am się i akceptuję [Regulamin](/regulamin) oraz [Politykę prywatności](/polityka-prywatnosci). Przyjmuję do wiadomości, że moje dane (imię, numer telefonu i szczegóły rezerwacji) zostaną przekazane wybranemu usługodawcy w celu realizacji wizyty.

**Wariant skrócony (jeśli mało miejsca):**

> ☐ Akceptuję [Regulamin](/regulamin) i [Politykę prywatności](/polityka-prywatnosci).

---

## 2. Checkbox przy REJESTRACJI (Usługodawca) — WYMAGANY

> ☐ Akceptuję [Regulamin](/regulamin) oraz potwierdzam zapoznanie się z [Polityką prywatności](/polityka-prywatnosci).

---

## 3. Checkbox marketingowy (opcjonalny, NIE zaznaczony domyślnie)

> ☐ Wyrażam zgodę na otrzymywanie informacji marketingowych na podany adres e-mail. Zgodę mogę wycofać w dowolnym momencie.

⚠️ Ten checkbox **nie może być zaznaczony domyślnie** (RODO — zgoda musi być aktywna). Potrzebny tylko jeśli planujesz wysyłkę marketingową.

---

# Co musisz uzupełnić (placeholdery)

W obu plikach (`regulamin.md`, `polityka-prywatnosci.md`) podmień:

| Placeholder | Co wpisać |
|---|---|
| `[DATA]` | Data wejścia w życie, np. `23.06.2026` |
| `[IMIĘ I NAZWISKO / NAZWA FIRMY]` | Twoje dane jako administratora (osoba fizyczna lub firma) |
| `[ADRES]` | Adres siedziby / korespondencyjny |
| `[NIP]` | NIP (jeśli masz działalność; jeśli nie — usuń linijkę) |
| `[REGON]` | REGON (jeśli masz; jeśli nie — usuń linijkę) |
| `[E-MAIL KONTAKTOWY]` | Adres do kontaktu w sprawach prawnych/RODO |

---

## ⚠️ Ważne — przeczytaj zanim wrzucisz klientów

1. **Status prawny.** Zbieranie danych klientów (imię + telefon) i pośredniczenie między salonami a klientami to działalność, która w Polsce co do zasady wymaga zarejestrowanej **działalności gospodarczej** (lub innej formy). Dopóki to projekt/test bez realnych klientów — ok. Przed realnym startem z prawdziwymi salonami warto to uporządkować (działalność nierejestrowana ma limity przychodu; pośrednictwo + przetwarzanie danych w EU to osobny temat).

2. **To jest solidny szablon, nie porada prawna.** Pokrywa standard RODO + e-usługi i jest gotowy do użycia na starcie. Przy realnej skali (płatności, depozyty, wiele salonów) dokumenty warto dać do przeglądu prawnikowi — szczególnie sekcje o odpowiedzialności i powierzeniu danych.

3. **Umowy powierzenia (DPA).** Vercel, Render, Neon, Resend — każdy z nich udostępnia gotowy Data Processing Agreement. Formalnie powinieneś je zaakceptować/podpisać (zwykle klik w panelu). To domyka łańcuch RODO wymieniony w Polityce.
