export const pl = {
  // marketplace
  searchTitle: "Zarezerwuj wizytę online",
  searchSub: "Barbershopy, manicure, fryzjerzy i więcej — bez dzwonienia, w 30 sekund.",
  allCities: "Wszystkie miasta",
  allDistricts: "Wszystkie dzielnice",
  allCategories: "Wszystkie",
  search: "Szukaj",
  noResults: "Nie znaleziono salonów pasujących do kryteriów.",
  noResultsSub: "Spróbuj zmienić miasto lub kategorię.",
  found: (n: number) => `Znaleziono ${n} ${n === 1 ? "salon" : "salonów"}`,
  book: "Zarezerwuj",
  panelOwner: "Panel właściciela",
  searching: "Szukam…",
  pickCity: "Wybierz miasto i kliknij Szukaj",

  // business page
  back: "Rezerwo",
  hours: "Godziny pracy",
  services: "Usługi",
  noServices: "Salon nie dodał jeszcze listy usług.",
  bookVisit: "Zarezerwuj wizytę",
  noSlot: "Brak terminu? Daj mi znać, gdy będzie wolne",
  askService: "Nie widzę usługi, którą szukam",
  reviews: "Opinie",
  noReviews: "Brak opinii. Bądź pierwszy/a!",
  addReview: "★ Dodaj opinię",
  yourReview: "Twoja opinia",
  rating: "Ocena",
  firstName: "Imię *",
  comment: "Komentarz (opcjonalnie)",
  commentPlaceholder: "Podziel się wrażeniami…",
  sendReview: "Wyślij opinię",
  cancel: "Anuluj",
  thankReview: "✓ Dziękujemy za opinię!",
  notFound: "Nie znaleziono salonu",
  backToSearch: "← Wróć do wyszukiwania",

  // wizard
  chooseService: "Wybierz usługę",
  chooseDate: "Wybierz datę",
  chooseTime: "Wybierz godzinę",
  yourData: "Twoje dane",
  noSlots: "Brak wolnych terminów na ten dzień.",
  changeDayLink: "← Wybierz inny dzień",
  checkingSlots: "Sprawdzam dostępność…",
  fullName: "Imię i nazwisko *",
  phone: "Numer telefonu *",
  email: "Email (opcjonalnie)",
  commentSalon: "Komentarz dla salonu (opcjonalnie)",
  commentSalonPlaceholder: "Alergie, preferencje, szczegóły…",
  confirmBooking: "Potwierdź rezerwację",
  bookingHint: "Nie wymagamy rejestracji. Twoje dane są bezpieczne.",
  done: "Gotowe!",
  pendingMsg: (name: string) => `Twoja rezerwacja w ${name} oczekuje na potwierdzenie. Salon skontaktuje się z Tobą wkrótce.`,
  confirmedMsg: (name: string, date: string, time: string) => `Wizyta w ${name} potwierdzona! Do zobaczenia ${date} o ${time}.`,
  backToProfile: "Wróć do profilu",
  step: (n: number, t: number) => `Krok ${n} z ${t}`,

  // waitlist
  waitlistTitle: "Lista oczekujących",
  waitlistSub: (svc?: string) => svc ? `Brak wolnych terminów na ${svc}? Zostaw dane — powiadomimy Cię, gdy pojawi się wolne miejsce.` : "Salon jest zajęty? Zostaw dane — powiadomimy Cię.",
  waitlistSuccess: "Zostałeś/aś dodany/a do listy oczekujących. Powiadomimy Cię, gdy pojawi się wolny termin.",
  preferredDate: "Preferowana data (opcjonalnie)",
  notifyBtn: "Daj mi znać, gdy będzie wolne",
  close: "Zamknij",

  // service request
  askTitle: "Zapytaj o usługę",
  askSub: "Nie znalazłeś/aś interesującej usługi? Napisz — salon oddzwoni.",
  phoneField: "Twój numer telefonu *",
  whatLooking: "Czego szukasz? *",
  askPlaceholder: "np. Henna brwi + stylizacja, koloryzacja pasemkami…",
  sendAsk: "Wyślij zapytanie",
  askSuccess: "Wiadomość wysłana! Salon oddzwoni do Ciebie.",

  // days
  days: { mon:"Pon",tue:"Wt",wed:"Śr",thu:"Czw",fri:"Pt",sat:"Sob",sun:"Nd" },
  months: ["","sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"],
  dayNames: ["Nd","Pn","Wt","Śr","Cz","Pt","Sb"],

  // support
  supportTitle: "Kontakt i pomoc",
  supportSub: "Masz pytanie lub problem? Napisz do nas.",
  emailField: "Twój email *",
  subject: "Temat *",
  message: "Wiadomość *",
  send: "Wyślij",
  supportSuccess: "Wiadomość wysłana! Odpiszemy wkrótce.",

  // legal
  terms: "Regulamin",
  privacy: "Polityka prywatności",
  footer: "Polska platforma rezerwacji beauty",

  // nav
  help: "Pomoc",

  // categories (translated labels)
  catLabels: {
    nails:       "Manicure",
    barber:      "Barber",
    hair:        "Fryzjer",
    brows:       "Brwi",
    tattoo:      "Tatuaż",
    beauty:      "Salon kosmetyczny",
    laser:       "Depilacja laserowa",
    sugaring:    "Sugaring",
    lashes:      "Przedłużanie rzęs",
    massage:     "Masaż",
    spa:         "SPA",
    cosmetology: "Kosmetolog",
    makeup:      "Wizaż",
    aesthetic:   "Medycyna estetyczna",
    podology:    "Podolog",
  } as Record<string, string>,

  // feedback widget
  feedbackBtn:     "Zgłoś błąd / pomysł",
  feedbackTitle:   "Zgłoszenie",
  feedbackKindBug: "Błąd",
  feedbackKindIdea:"Pomysł",
  feedbackKindOther:"Inne",
  feedbackMsg:     "Opis *",
  feedbackEmail:   "Twój email (opcjonalnie)",
  feedbackSend:    "Wyślij",
  feedbackSent:    "Dziękujemy za zgłoszenie!",

  // password strength
  pwTooShort:    "Min. 9 znaków",
  pwNeedLower:   "Dodaj małą literę",
  pwNeedUpper:   "Dodaj wielką literę",
  pwNeedDigit:   "Dodaj cyfrę",
  pwNeedSpecial: "Dodaj znak specjalny (!@#$%)",
  pwStrong:      "Silne hasło ✓",

  // loading / errors
  loading:       "Ładowanie…",
  errorFetch:    "Błąd połączenia. Spróbuj ponownie.",
  retry:         "Spróbuj ponownie",
};

export type T = typeof pl;
