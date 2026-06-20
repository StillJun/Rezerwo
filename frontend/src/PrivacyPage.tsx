import type { CSSProperties } from "react";
import { navigate } from "./App";

const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,system-ui,sans-serif";
const ACC = "#7c3aed";

export default function PrivacyPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <button style={S.back} onClick={() => navigate("/")}>← Rezerwo</button>
        <h1 style={S.h1}>Polityka prywatności</h1>
        <p style={S.meta}>RODO / GDPR · Wersja 1.0 · Obowiązuje od 1 stycznia 2025</p>

        <Section title="1. Administrator danych">
          <p>Administratorem danych osobowych jest Adam Borshenko, operator serwisu Rezerwo (dalej: „Administrator").</p>
          <p>Kontakt: <strong>privacy@rezerwo.app</strong></p>
        </Section>

        <Section title="2. Jakie dane przetwarzamy">
          <p><strong>Klienci:</strong> imię i nazwisko, numer telefonu, adres email (opcjonalny), komentarz do wizyty. Dane podawane dobrowolnie w formularzu rezerwacji.</p>
          <p><strong>Właściciele salonów:</strong> adres email, hasło (przechowywane jako hash bcrypt), dane firmy (nazwa, adres, telefon, instagram).</p>
          <p>Nie przetwarzamy szczególnych kategorii danych osobowych.</p>
        </Section>

        <Section title="3. Cel i podstawa prawna przetwarzania">
          <p><strong>Rezerwacja wizyty</strong> — art. 6 ust. 1 lit. b RODO (wykonanie umowy): imię, telefon klienta używane wyłącznie do identyfikacji rezerwacji i kontaktu przez salon.</p>
          <p><strong>Konto właściciela</strong> — art. 6 ust. 1 lit. b RODO (wykonanie umowy o korzystanie z serwisu).</p>
          <p><strong>Napomnienia e-mail</strong> — art. 6 ust. 1 lit. b RODO (na życzenie klienta przy podaniu emaila).</p>
          <p><strong>Opinie</strong> — art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes).</p>
        </Section>

        <Section title="4. Jak długo przechowujemy dane">
          <p>Dane rezerwacji: 2 lata od daty wizyty, następnie automatyczne usunięcie.</p>
          <p>Dane konta właściciela: do czasu usunięcia konta lub przez okres 5 lat od ostatniego logowania.</p>
          <p>Opinie: bezterminowo, chyba że zostanie złożone żądanie usunięcia.</p>
        </Section>

        <Section title="5. Komu udostępniamy dane">
          <p>Dane klientów są udostępniane wyłącznie właścicielowi salonu, do którego klient się zapisał.</p>
          <p>Korzystamy z następujących podprocesurów:</p>
          <ul style={{margin:"8px 0 0 20px",lineHeight:2}}>
            <li><strong>Neon Inc.</strong> — hosting bazy danych (USA, zgodność z SCCs)</li>
            <li><strong>Render Inc.</strong> — hosting serwera aplikacji (USA, zgodność z SCCs)</li>
            <li><strong>Vercel Inc.</strong> — hosting frontendu (USA, zgodność z SCCs)</li>
            <li><strong>Resend Inc.</strong> — wysyłka emaili (USA, zgodność z SCCs)</li>
          </ul>
          <p style={{marginTop:8}}>Nie sprzedajemy danych osobowych osobom trzecim.</p>
        </Section>

        <Section title="6. Twoje prawa (RODO)">
          <ul style={{margin:"8px 0 0 20px",lineHeight:2.2}}>
            <li><strong>Prawo dostępu</strong> — możesz zażądać kopii swoich danych</li>
            <li><strong>Prawo sprostowania</strong> — możesz poprawić nieprawidłowe dane</li>
            <li><strong>Prawo do usunięcia</strong> — możesz żądać usunięcia danych („prawo do bycia zapomnianym")</li>
            <li><strong>Prawo do ograniczenia przetwarzania</strong></li>
            <li><strong>Prawo do przenoszenia danych</strong></li>
            <li><strong>Prawo sprzeciwu</strong></li>
          </ul>
          <p style={{marginTop:8}}>Aby skorzystać z praw, skontaktuj się: <strong>privacy@rezerwo.app</strong>. Odpowiemy w ciągu 30 dni.</p>
          <p>Masz prawo złożyć skargę do Prezesa Urzędu Ochrony Danych Osobowych (PUODO).</p>
        </Section>

        <Section title="7. Pliki cookie i localStorage">
          <p>Serwis używa <strong>localStorage</strong> do przechowywania tokenu uwierzytelniającego właściciela (sesja panelu). Brak plików cookie śledzących lub marketingowych.</p>
          <p>Preferencja języka przechowywana jest lokalnie w przeglądarce (klucz <code>rz_lang</code>).</p>
        </Section>

        <Section title="8. Bezpieczeństwo">
          <p>Hasła właścicieli przechowywane są wyłącznie jako skróty bcrypt (salt=12).</p>
          <p>Komunikacja z serwerem odbywa się przez HTTPS (TLS 1.2+).</p>
          <p>Dane w bazie szyfrowane na poziomie infrastruktury (Neon).</p>
        </Section>

        <Section title="9. Zmiany polityki">
          <p>O istotnych zmianach powiadomimy właścicieli salonów emailem z 14-dniowym wyprzedzeniem.</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={S.section}>
      <h2 style={S.h2}>{title}</h2>
      <div style={S.content}>{children}</div>
    </div>
  );
}

const S: Record<string, CSSProperties> = {
  page:    { minHeight:"100vh", background:"#faf8fb", fontFamily:font, padding:"0 20px 60px" },
  wrap:    { maxWidth:720, margin:"0 auto", paddingTop:20 },
  back:    { border:"none", background:"transparent", color:ACC, fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:font, padding:0, marginBottom:24 },
  h1:      { fontSize:"clamp(22px,4vw,32px)", fontWeight:900, letterSpacing:-0.5, color:"#1b1420", margin:"0 0 6px" },
  meta:    { fontSize:13, color:"#a8a2b0", marginBottom:32 },
  section: { marginBottom:28 },
  h2:      { fontSize:16, fontWeight:800, color:"#1b1420", margin:"0 0 10px" },
  content: { fontSize:14.5, color:"#52525b", lineHeight:1.75 },
};
