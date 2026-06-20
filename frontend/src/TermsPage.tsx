import type { CSSProperties } from "react";
import { navigate } from "./App";

const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,system-ui,sans-serif";
const ACC = "#7c3aed";

export default function TermsPage() {
  return (
    <div style={S.page}>
      <div style={S.wrap}>
        <button style={S.back} onClick={() => navigate("/")}>← Rezerwo</button>
        <h1 style={S.h1}>Regulamin serwisu Rezerwo</h1>
        <p style={S.meta}>Wersja 1.0 · Obowiązuje od 1 stycznia 2025</p>

        <Section title="§1. Postanowienia ogólne">
          <p>Serwis Rezerwo (dalej: „Serwis") jest platformą rezerwacji online dla branży beauty, umożliwiającą klientom umawianie wizyt bez rejestracji oraz właścicielom salonów zarządzanie rezerwacjami.</p>
          <p>Właścicielem i operatorem Serwisu jest Adam Borshenko.</p>
          <p>Korzystanie z Serwisu oznacza akceptację niniejszego Regulaminu.</p>
        </Section>

        <Section title="§2. Rodzaje użytkowników">
          <p><strong>Właściciel salonu</strong> — osoba fizyczna lub prawna prowadząca działalność w branży beauty, która rejestruje konto i zarządza profilem firmy, usługami oraz rezerwacjami.</p>
          <p><strong>Klient</strong> — osoba fizyczna korzystająca z systemu rezerwacji bez konieczności rejestracji, podająca jedynie imię i numer telefonu.</p>
        </Section>

        <Section title="§3. Rejestracja i konto właściciela">
          <p>Konto może założyć wyłącznie właściciel lub upoważniony przedstawiciel salonu beauty.</p>
          <p>Właściciel jest odpowiedzialny za prawdziwość danych podanych w profilu firmy.</p>
          <p>Zabronione jest tworzenie kont dla firm, których użytkownik nie reprezentuje.</p>
        </Section>

        <Section title="§4. Rezerwacje">
          <p>Rezerwacje dokonywane są przez klientów bez rejestracji. Klient podaje imię i numer telefonu.</p>
          <p>Właściciel salonu może wymagać ręcznego potwierdzenia każdej rezerwacji. Status „oczekująca" oznacza, że wizyta nie jest jeszcze potwierdzona.</p>
          <p>Rezerwo nie ponosi odpowiedzialności za niewykonanie usługi przez salon.</p>
        </Section>

        <Section title="§5. Dane osobowe">
          <p>Serwis przetwarza dane osobowe klientów (imię, telefon, email) wyłącznie w celu realizacji rezerwacji.</p>
          <p>Szczegółowe informacje zawarte są w <span style={{color:ACC,cursor:"pointer",fontWeight:600}} onClick={()=>navigate("/prywatnosc")}>Polityce prywatności</span>.</p>
        </Section>

        <Section title="§6. Odpowiedzialność">
          <p>Serwis pełni rolę pośrednika. Nie jest stroną umowy między klientem a salonem.</p>
          <p>Rezerwo nie odpowiada za jakość usług świadczonych przez salony.</p>
          <p>Operator zastrzega sobie prawo do usunięcia kont naruszających Regulamin lub przepisy prawa.</p>
        </Section>

        <Section title="§7. Opinie">
          <p>Klienci mogą dodawać opinie o salonach po odbyciu wizyty.</p>
          <p>Zabronione jest dodawanie fałszywych opinii, treści obraźliwych lub niezwiązanych z wizytą.</p>
          <p>Właściciel może zgłosić opinię do moderacji. Operator może ukryć opinię naruszającą Regulamin.</p>
        </Section>

        <Section title="§8. Zmiany Regulaminu">
          <p>Operator zastrzega sobie prawo do zmiany Regulaminu z powiadomieniem użytkowników z 14-dniowym wyprzedzeniem.</p>
          <p>Dalsze korzystanie z Serwisu po zmianach oznacza ich akceptację.</p>
        </Section>

        <Section title="§9. Postanowienia końcowe">
          <p>W sprawach nieuregulowanych niniejszym Regulaminem stosuje się przepisy prawa polskiego.</p>
          <p>Wszelkie spory rozstrzygane są przez sąd właściwy dla siedziby Operatora.</p>
          <p>Kontakt: support@rezerwo.app</p>
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
