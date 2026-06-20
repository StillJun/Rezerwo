# Rezerwo — booking platform (Etap 1 + 2)

Marketplace rezerwacji dla branży beauty w Polsce: manicure, barber, fryzjer, brwi, tatuaż.
Ten pakiet zawiera **fundament** (baza + konto właściciela) oraz **kreator usług i profilu**.

## Stack
- **Backend:** Node + Express + PostgreSQL (`pg`), auth: bcrypt + JWT
- **Frontend:** React + TypeScript + Vite (panel właściciela)

## Co działa
- Rejestracja / logowanie właściciela (firma tworzona automatycznie)
- **Kreator usług:** nazwa, opis ("co oznacza"), czas, cena, grupy/kolumny
- **Profil firmy:** baner, kategoria, miasto/dzielnica, adres, kontakt, Instagram, "O nas", portfolio (URL)
- Ustawienia rezerwacji: ręczne potwierdzanie + przypomnienia (24h / 4h / 2h / 1h)

## Uruchomienie lokalne

### 1. Baza danych
Załóż darmową bazę na [Neon](https://neon.tech) i skopiuj connection string.

### 2. Backend
```bash
cd backend
npm install
cp .env.example .env        # wklej DATABASE_URL, ustaw JWT_SECRET
npm start                   # http://localhost:4000  (tabele tworzą się same)
```

### 3. Frontend (drugi terminal)
```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```
Frontend proxuje `/api` na `http://localhost:4000` (skonfigurowane w vite.config.ts).

## Plan (kolejne etapy)
3. Strona klienta: marketplace + rezerwacja z komentarzem + prośba o usługę
4. Potwierdzanie wizyt + notatki o klientach (CRM)
5. Przypomnienia e-mail (scheduler 24h/4h/2h)
6. Opinie + zgłoszenia + moderacja + wsparcie
7. Pełna baza miast/dzielnic PL + i18n (PL/EN/RU/UA)
8. Strony prawne, weryfikacja, lista oczekujących, deploy
