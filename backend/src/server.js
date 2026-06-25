import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { randomBytes } from "crypto";
import { q, initDb } from "./db.js";
import { hashPassword, verifyPassword, signToken, setAuthCookie, clearAuthCookie, requireAuth } from "./auth.js";
import { startReminderScheduler, notifyOwnerNewBooking, sendVerificationEmail } from "./reminders.js";

const app = express();

// Prevent silent crashes from unhandled promise rejections
process.on("unhandledRejection", err => console.error("unhandledRejection", err));
process.on("uncaughtException",  err => console.error("uncaughtException",  err));

// Trust proxy (Render/Vercel)
app.set("trust proxy", 1);

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS — allow all known prod domains + any *.vercel.app preview + localhost
const ALLOWED_ORIGINS = new Set([
  "https://getrezerwo.pl",
  "https://www.getrezerwo.pl",
  "https://rezerwo.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:4173",
  ...(process.env.CLIENT_URL ? [process.env.CLIENT_URL] : []),
]);
app.use(cors({
  origin(origin, cb) {
    // no origin = curl / mobile / server-to-server
    if (!origin) return cb(null, true);
    // exact match OR any *.vercel.app preview deploy
    if (ALLOWED_ORIGINS.has(origin) || /\.vercel\.app$/.test(origin)) return cb(null, true);
    console.warn("[CORS] rejected origin:", origin);
    cb(null, false); // soft-reject: no CORS headers, but don't throw (avoids error-handler spam)
  },
  credentials: true,
}));

app.use(express.json({ limit: "64kb" }));
app.use(cookieParser());

// Rate limiting — general API
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false });
app.use("/api/", limiter);

// Stricter limit for auth endpoints (prevent brute-force)
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
app.use("/api/auth/", authLimiter);

// Register: 20 per hour per IP
const registerLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: "Zbyt wiele prób rejestracji. Spróbuj za godzinę." } });

// Booking: 20 per hour per IP
const bookLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { error: "Zbyt wiele rezerwacji z tego adresu IP. Spróbuj za godzinę." } });

/* ---------- reference data ---------- */
const CATEGORIES = [
  { id: "nails",      pl: "Manicure",              emoji: "💅" },
  { id: "barber",     pl: "Barber",                emoji: "💈" },
  { id: "hair",       pl: "Fryzjer",               emoji: "✂️" },
  { id: "brows",      pl: "Brwi",                  emoji: "👁️" },
  { id: "tattoo",     pl: "Tatuaż",                emoji: "🎨" },
  { id: "beauty",     pl: "Salon kosmetyczny",      emoji: "💄" },
  { id: "laser",      pl: "Depilacja laserowa",     emoji: "🔆" },
  { id: "sugaring",   pl: "Sugaring",               emoji: "🍯" },
  { id: "lashes",     pl: "Przedłużanie rzęs",      emoji: "✨" },
  { id: "massage",    pl: "Masaż",                  emoji: "💆" },
  { id: "spa",        pl: "SPA",                    emoji: "🧖" },
  { id: "cosmetology",pl: "Kosmetolog",             emoji: "🧴" },
  { id: "makeup",     pl: "Wizaż",                  emoji: "💋" },
  { id: "aesthetic",  pl: "Medycyna estetyczna",    emoji: "⚕️" },
  { id: "podology",   pl: "Podolog",                emoji: "🦶" },
];
const VALID_CAT_IDS = new Set(CATEGORIES.map(c => c.id));

/* ---------- password validation ---------- */
function validatePassword(pw) {
  if (typeof pw !== "string" || pw.length < 9) return "Hasło musi mieć co najmniej 9 znaków.";
  if (!/[a-z]/.test(pw)) return "Hasło musi zawierać małą literę.";
  if (!/[A-Z]/.test(pw)) return "Hasło musi zawierać wielką literę.";
  if (!/\d/.test(pw)) return "Hasło musi zawierać cyfrę.";
  if (!/[^A-Za-z0-9]/.test(pw)) return "Hasło musi zawierać znak specjalny (np. !@#$%).";
  return null;
}
const CITIES = {
  "Wrocław":        ["Stare Miasto", "Śródmieście", "Krzyki", "Fabryczna", "Psie Pole", "Jagodno", "Brochów", "Ołtaszyn"],
  "Warszawa":       ["Śródmieście", "Mokotów", "Wola", "Praga-Północ", "Praga-Południe", "Ursynów", "Bemowo", "Żoliborz", "Ochota", "Targówek", "Bielany", "Wilanów"],
  "Kraków":         ["Stare Miasto", "Krowodrza", "Podgórze", "Nowa Huta", "Grzegórzki", "Prądnik Biały", "Prądnik Czerwony", "Bronowice", "Dębniki"],
  "Poznań":         ["Stare Miasto", "Jeżyce", "Wilda", "Grunwald", "Nowe Miasto", "Rataje", "Piątkowo", "Winogrady"],
  "Gdańsk":         ["Śródmieście", "Wrzeszcz", "Oliwa", "Przymorze", "Zaspa", "Siedlce", "Chełm", "Morena"],
  "Łódź":           ["Śródmieście", "Bałuty", "Polesie", "Widzew", "Górna", "Brus", "Retkinia"],
  "Katowice":       ["Śródmieście", "Ligota", "Piotrowice", "Dąb", "Koszutka", "Bogucice"],
  "Szczecin":       ["Śródmieście", "Niebuszewo", "Pogodno", "Gumieńce", "Zawadzkiego-Klonowica"],
  "Bydgoszcz":      ["Śródmieście", "Fordon", "Bartodzieje", "Bielawy", "Wyżyny", "Miedzyń"],
  "Lublin":         ["Śródmieście", "Czuby", "Felin", "Ponikwoda", "LSM", "Kalinowszczyzna"],
  "Białystok":      ["Śródmieście", "Bojary", "Nowe Miasto", "Antoniuk", "Dziesięciny"],
  "Gdynia":         ["Śródmieście", "Orłowo", "Witomino", "Chylonia", "Redłowo", "Dąbrowa"],
  "Częstochowa":    ["Śródmieście", "Raków", "Tysiąclecie", "Błeszno", "Wrzosowiak"],
  "Rzeszów":        ["Śródmieście", "Nowe Miasto", "Drabinianka", "Zalesie", "Staroniwa"],
  "Toruń":          ["Stare Miasto", "Nowe Miasto", "Mokre", "Rubinkowo", "Na Skarpie"],
  "Kielce":         ["Śródmieście", "Herby", "Barwinek", "Artylerzystów", "Czarnów"],
  "Gliwice":        ["Śródmieście", "Łabędy", "Trynek", "Sośnica", "Wilcze Gardło"],
  "Zabrze":         ["Śródmieście", "Biskupice", "Rokitnica", "Makoszowy"],
  "Olsztyn":        ["Śródmieście", "Zatorze", "Pojezierze", "Nagórki", "Gutkowo"],
  "Radom":          ["Śródmieście", "Gołębiów", "Idalin", "Ustronie", "Obozisko"],
  "Sosnowiec":      ["Śródmieście", "Pogoń", "Milowice", "Zagórze", "Klimontów"],
  "Tychy":          ["Śródmieście", "Żwaków", "Stare Tychy", "Paprocany", "Wilkowyje"],
  "Rybnik":         ["Śródmieście", "Niedobczyce", "Boguszowice", "Chwałowice", "Zebrzydowice"],
  "Bytom":          ["Śródmieście", "Rozbark", "Szombierki", "Łagiewniki", "Bobrek"],
  "Dąbrowa Górnicza":["Śródmieście", "Ząbkowice", "Strzemieszyce", "Łęknice", "Ujejsce"],
  "Bielsko-Biała":  ["Śródmieście", "Kamienica", "Wapienica", "Lipnik", "Stare Bielsko"],
  "Opole":          ["Śródmieście", "Zaodrze", "Półwieś", "Malinka", "Wróblin"],
  "Zielona Góra":   ["Śródmieście", "Nowe Miasto", "Łężyca", "Ochla", "Przylep"],
  "Płock":          ["Śródmieście", "Kolegialna", "Łukasiewicza", "Góry", "Podolszyce"],
  "Elbląg":         ["Śródmieście", "Zatorze", "Zawada", "Dębica", "Jeziorna"],
  "Kalisz":         ["Śródmieście", "Rajsków", "Ogrody", "Dobrzec", "Tyniec"],
  "Wałbrzych":      ["Śródmieście", "Sobięcin", "Podgórze", "Biały Kamień", "Nowe Miasto"],
  "Koszalin":       ["Śródmieście", "Rokosowo", "Jamno", "Morskie", "Lubiatowo"],
  "Legnica":        ["Śródmieście", "Tarninów", "Piekary", "Złotoryja", "Piątnica"],
  "Włocławek":      ["Śródmieście", "Południe", "Kazimierz", "Zazamcze", "Wschód"],
  "Tarnów":         ["Śródmieście", "Mościce", "Rzędzin", "Krzyż", "Grabówka"],
};
app.get("/api/meta", (_req, res) => res.json({ categories: CATEGORIES, cities: CITIES }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/* ---------- helpers ---------- */
function toSlugBase(name) {
  return name.toLowerCase()
    .replace(/ą/g,"a").replace(/ć/g,"c").replace(/ę/g,"e").replace(/ł/g,"l")
    .replace(/ń/g,"n").replace(/ó/g,"o").replace(/ś/g,"s").replace(/ź/g,"z").replace(/ż/g,"z")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,50);
}
async function generateSlug(name, excludeId = null) {
  const base = toSlugBase(name) || "biznes";
  let slug = base, i = 1;
  while (true) {
    const rows = excludeId
      ? await q("SELECT id FROM businesses WHERE slug=$1 AND id!=$2", [slug, excludeId])
      : await q("SELECT id FROM businesses WHERE slug=$1", [slug]);
    if (!rows.length) return slug;
    slug = `${base}-${i++}`;
  }
}

function minToTime(min) {
  const h = Math.floor(min / 60).toString().padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function calcSlots(hours, bookedAppts, serviceMin, dateStr) {
  const DAY_KEYS = ["sun","mon","tue","wed","thu","fri","sat"];
  const date = new Date(dateStr + "T00:00:00");
  const dayKey = DAY_KEYS[date.getDay()];
  const dayHours = hours?.[dayKey];
  if (!dayHours || !dayHours[0] || !dayHours[1]) return [];

  const [openH, openM] = dayHours[0].split(":").map(Number);
  const [closeH, closeM] = dayHours[1].split(":").map(Number);
  const openMin = openH * 60 + openM;
  const closeMin = closeH * 60 + closeM;

  const now = new Date();
  const todayStr = now.toISOString().slice(0,10);
  const nowMin = now.getHours() * 60 + now.getMinutes() + 15; // 15-min buffer

  const booked = bookedAppts.map(a => ({ s: a.start_min, e: a.start_min + a.duration }));
  const slots = [];
  for (let s = openMin; s + serviceMin <= closeMin; s += 15) {
    if (dateStr === todayStr && s <= nowMin) continue;
    if (!booked.some(b => s < b.e && b.s < s + serviceMin)) slots.push(s);
  }
  return slots;
}

// Efficient single-slot check used at booking time
function isSlotFree(hours, bookedAppts, serviceMin, dateStr, slotMin) {
  const DAY_KEYS = ["sun","mon","tue","wed","thu","fri","sat"];
  const dayHours = hours?.[DAY_KEYS[new Date(dateStr + "T00:00:00").getDay()]];
  if (!dayHours || !dayHours[0] || !dayHours[1]) return false;
  const [openH, openM] = dayHours[0].split(":").map(Number);
  const [closeH, closeM] = dayHours[1].split(":").map(Number);
  if (slotMin < openH * 60 + openM || slotMin + serviceMin > closeH * 60 + closeM) return false;
  const now = new Date();
  if (dateStr === now.toISOString().slice(0, 10) && slotMin <= now.getHours() * 60 + now.getMinutes() + 15) return false;
  return !bookedAppts.some(a => slotMin < a.start_min + a.duration && a.start_min < slotMin + serviceMin);
}

/* ---------- row → client mappers ---------- */
const toCategories = (b) =>
  (b.categories && b.categories.length > 0) ? b.categories : [b.category].filter(Boolean);

const bizClient = (b) => ({
  id: Number(b.id), slug: b.slug, name: b.name, category: b.category,
  categories: toCategories(b),
  city: b.city, district: b.district, address: b.address, phone: b.phone,
  instagram: b.instagram, about: b.about, banner: b.banner,
  hours: b.hours, photos: b.photos, confirmRequired: b.confirm_required,
  reminderHours: b.reminder_hours, verified: b.verified,
  status: b.status || "approved",
  isVisible: b.is_visible !== false,
});
const publicBizClient = (b) => ({
  id: Number(b.id), slug: b.slug, name: b.name, category: b.category,
  categories: toCategories(b),
  city: b.city, district: b.district, address: b.address, phone: b.phone,
  instagram: b.instagram, about: b.about, banner: b.banner,
  hours: b.hours, photos: b.photos, verified: b.verified,
});
const svcClient = (s) => ({
  id: Number(s.id), grp: s.grp, name: s.name, description: s.description,
  duration: s.duration, price: Number(s.price), sort: s.sort,
});
const apptClient = (a) => ({
  id: Number(a.id),
  businessId: Number(a.business_id),
  serviceId: a.service_id ? Number(a.service_id) : null,
  serviceName: a.service_name || null,
  servicePrice: a.service_price != null ? Number(a.service_price) : null,
  masterId: a.master_id ? Number(a.master_id) : null,
  masterName: a.master_name || null,
  clientName: a.client_name,
  clientPhone: a.client_phone,
  clientEmail: a.client_email || "",
  comment: a.comment || "",
  date: String(a.date).slice(0,10),
  startMin: a.start_min,
  duration: a.duration,
  status: a.status,
  createdAt: a.created_at,
});

/* ---------- auth ---------- */
app.post("/api/auth/register", registerLimiter, async (req, res) => {
  try {
    const { email, password, businessName, categories, category = "barber" } = req.body || {};
    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: "Podaj prawidłowy email" });
    if (!businessName || typeof businessName !== "string" || businessName.trim().length < 2 || businessName.length > 100)
      return res.status(400).json({ error: "Nazwa firmy musi mieć 2-100 znaków" });
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });
    const [exists] = await q("SELECT id FROM owners WHERE email=$1", [email]);
    if (exists) return res.status(409).json({ error: "Ten email jest już zarejestrowany" });

    const rawCats = Array.isArray(categories) && categories.length > 0 ? categories : [category];
    const cats = rawCats.filter(c => typeof c === "string" && VALID_CAT_IDS.has(c));
    if (cats.length === 0) return res.status(400).json({ error: "Wybierz co najmniej jedną prawidłową kategorię." });
    if (cats.length > 10) return res.status(400).json({ error: "Maksymalnie 10 kategorii." });

    const hash = await hashPassword(password);
    const verToken = randomBytes(32).toString("hex");
    const [owner] = await q(
      "INSERT INTO owners (email, password_hash, verification_token) VALUES ($1,$2,$3) RETURNING id, email",
      [email, hash, verToken]
    );
    const slug = await generateSlug(businessName);
    await q("INSERT INTO businesses (owner_id, name, category, categories, slug, status) VALUES ($1,$2,$3,$4,$5,'approved')",
      [owner.id, businessName, cats[0], cats, slug]);
    const safe = { id: Number(owner.id), email: owner.email };
    const token = signToken(safe);
    setAuthCookie(res, token);
    sendVerificationEmail(email, verToken).catch(() => {});
    res.json({ user: safe, token });
  } catch (e) { console.error(e); res.status(500).json({ error: "Błąd serwera" }); }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    const [owner] = await q("SELECT * FROM owners WHERE email=$1", [email]);
    if (!owner || !(await verifyPassword(password, owner.password_hash)))
      return res.status(401).json({ error: "Nieprawidłowy email lub hasło" });
    const safe = { id: Number(owner.id), email: owner.email };
    const token = signToken(safe);
    setAuthCookie(res, token);
    res.json({ user: safe, token });
  } catch (e) { console.error(e); res.status(500).json({ error: "Błąd serwera" }); }
});

app.post("/api/auth/logout", (_req, res) => { clearAuthCookie(res); res.json({ ok: true }); });

app.get("/api/auth/me", requireAuth, async (req, res) => {
  try {
    const [owner] = await q("SELECT id, email, email_verified, role FROM owners WHERE id=$1", [req.user.id]);
    if (!owner) return res.status(401).json({ error: "Sesja wygasła" });
    res.json({ user: { id: Number(owner.id), email: owner.email, emailVerified: owner.email_verified, role: owner.role || "owner" } });
  } catch (e) { console.error(e); res.status(500).json({ error: "Błąd serwera" }); }
});

app.get("/api/auth/verify-email/:token", async (req, res) => {
  try {
    const token = String(req.params.token).replace(/[^a-f0-9]/gi, "").slice(0, 64);
    if (!token) return res.status(400).json({ error: "Nieprawidłowy token" });
    // Token stays in DB after verification so re-clicking the same link works
    const [owner] = await q(
      "UPDATE owners SET email_verified=TRUE WHERE verification_token=$1 RETURNING id",
      [token]
    );
    if (!owner) return res.status(400).json({ error: "Link weryfikacyjny jest nieprawidłowy lub już wykorzystany." });
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Błąd serwera" }); }
});

app.post("/api/auth/resend-verification", requireAuth, async (req, res) => {
  try {
    const [owner] = await q("SELECT id, email, email_verified, verification_token FROM owners WHERE id=$1", [req.user.id]);
    if (!owner) return res.status(401).json({ error: "Nie znaleziono konta" });
    if (owner.email_verified) return res.json({ ok: true });
    // Reuse existing token so old email links stay valid; generate only if missing
    let token = owner.verification_token;
    if (!token) {
      token = randomBytes(32).toString("hex");
      await q("UPDATE owners SET verification_token=$1 WHERE id=$2", [token, owner.id]);
    }
    try {
      await sendVerificationEmail(owner.email, token);
      console.log(`[email] verification email sent to ${owner.email}`);
    } catch (err) {
      console.error("[email] resend-verification failed:", err?.message || err);
      return res.status(500).json({ error: "Nie udało się wysłać emaila. Spróbuj ponownie później." });
    }
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Błąd serwera" }); }
});

/* ---------- owner business helpers ---------- */
async function myBusiness(ownerId) {
  const [b] = await q("SELECT * FROM businesses WHERE owner_id=$1", [ownerId]);
  return b;
}

// Wraps async route handlers so thrown errors reach the global error middleware
const ah = fn => (req, res, next) => fn(req, res, next).catch(next);

// Fetches the owner's business; sends 404 and returns null when not found
async function requireBusiness(req, res) {
  const b = await myBusiness(req.user.id);
  if (!b) { res.status(404).json({ error: "Brak firmy" }); return null; }
  return b;
}

/* ---------- business profile (owner) ---------- */
app.get("/api/business", requireAuth, ah(async (req, res) => {
  const b = await myBusiness(req.user.id);
  if (!b) return res.status(404).json({ error: "Brak firmy" });
  res.json(bizClient(b));
}));

app.post("/api/business", requireAuth, ah(async (req, res) => {
  const existing = await myBusiness(req.user.id);
  if (existing) return res.status(409).json({ error: "Firma już istnieje" });
  const { name, categories, category = "barber" } = req.body || {};
  if (!name || typeof name !== "string" || name.trim().length < 2 || name.length > 100)
    return res.status(400).json({ error: "Nazwa firmy musi mieć 2-100 znaków" });
  const rawCats = Array.isArray(categories) && categories.length > 0 ? categories : [category];
  const cats = rawCats.filter(c => typeof c === "string" && VALID_CAT_IDS.has(c));
  if (cats.length === 0) return res.status(400).json({ error: "Wybierz co najmniej jedną prawidłową kategorię." });
  const slug = await generateSlug(name.trim());
  const [row] = await q(
    "INSERT INTO businesses (owner_id, name, category, categories, slug, status) VALUES ($1,$2,$3,$4,$5,'approved') RETURNING *",
    [req.user.id, name.trim(), cats[0], cats, slug]
  );
  res.json(bizClient(row));
}));

app.put("/api/business", requireAuth, ah(async (req, res) => {
  const b = await myBusiness(req.user.id);
  if (!b) return res.status(404).json({ error: "Brak firmy" });
  const m = { ...bizClient(b), ...req.body };

  // slug: use custom if provided and valid, otherwise regenerate on name change
  let slug = b.slug;
  const customSlug = typeof req.body.slug === "string" ? req.body.slug.trim().toLowerCase() : null;
  if (customSlug) {
    if (!/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(customSlug))
      return res.status(400).json({ error: "Adres URL musi mieć 3-50 znaków (litery a-z, cyfry, myślniki; bez spacji i znaków specjalnych)." });
    const [conflict] = await q("SELECT id FROM businesses WHERE slug=$1 AND id!=$2", [customSlug, b.id]);
    if (conflict) return res.status(409).json({ error: "Ten adres URL jest już zajęty. Wybierz inny." });
    slug = customSlug;
  } else if (m.name !== b.name || !slug) {
    slug = await generateSlug(m.name, b.id);
  }

  const rawCats = Array.isArray(m.categories) && m.categories.length > 0 ? m.categories : [m.category].filter(Boolean);
  const cats = rawCats.filter(c => typeof c === "string" && c.trim().length > 0 && VALID_CAT_IDS.has(c));
  if (cats.length === 0) return res.status(400).json({ error: "Wybierz co najmniej jedną prawidłową kategorię." });
  if (cats.length > 10) return res.status(400).json({ error: "Maksymalnie 10 kategorii." });
  const [row] = await q(`
    UPDATE businesses SET
      slug=$1, name=$2, category=$3, city=$4, district=$5, address=$6, phone=$7, instagram=$8,
      about=$9, banner=$10, hours=$11, photos=$12, confirm_required=$13, reminder_hours=$14, categories=$15
    WHERE owner_id=$16 RETURNING *`,
    [slug, m.name, cats[0], m.city, m.district, m.address, m.phone, m.instagram, m.about, m.banner,
     JSON.stringify(m.hours || {}), JSON.stringify(m.photos || []),
     m.confirmRequired, JSON.stringify(m.reminderHours || [24,4]), cats, req.user.id]);
  res.json(bizClient(row));
}));

/* ---------- services (owner) ---------- */
app.get("/api/services", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  const rows = await q("SELECT * FROM services WHERE business_id=$1 ORDER BY grp, sort, id", [b.id]);
  res.json(rows.map(svcClient));
}));

app.post("/api/services", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  const { grp = "", name, description = "", duration = 30, price = 0, sort = 0 } = req.body || {};
  if (!name) return res.status(400).json({ error: "Nazwa usługi jest wymagana" });
  const [row] = await q(`
    INSERT INTO services (business_id, grp, name, description, duration, price, sort)
    VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [b.id, grp, name, description, duration, price, sort]);
  res.json(svcClient(row));
}));

app.put("/api/services/:id", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  const [cur] = await q("SELECT * FROM services WHERE id=$1 AND business_id=$2", [req.params.id, b.id]);
  if (!cur) return res.status(404).json({ error: "Nie znaleziono" });
  const m = { ...svcClient(cur), ...req.body };
  const [row] = await q(`
    UPDATE services SET grp=$1, name=$2, description=$3, duration=$4, price=$5, sort=$6
    WHERE id=$7 AND business_id=$8 RETURNING *`,
    [m.grp, m.name, m.description, m.duration, m.price, m.sort, cur.id, b.id]);
  res.json(svcClient(row));
}));

app.delete("/api/services/:id", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  await q("DELETE FROM services WHERE id=$1 AND business_id=$2", [req.params.id, b.id]);
  res.json({ ok: true });
}));

/* ---------- masters (public + owner) ---------- */
const masterClient = (m, serviceIds = []) => ({
  id: Number(m.id), businessId: Number(m.business_id),
  name: m.name, photo: m.photo || null, bio: m.bio || null,
  isActive: m.is_active, sort: m.sort,
  workingHours: m.working_hours || {},
  serviceIds: (m.service_ids || serviceIds).map(Number),
});

// Efficient single-query fetch: masters + their service_ids via array_agg
async function fetchMastersWithServices(businessId, activeOnly = false) {
  const cond = activeOnly ? "m.business_id=$1 AND m.is_active=TRUE" : "m.business_id=$1";
  return q(`
    SELECT m.*,
      COALESCE(array_agg(ms.service_id::bigint) FILTER (WHERE ms.service_id IS NOT NULL), ARRAY[]::bigint[]) AS service_ids
    FROM masters m
    LEFT JOIN master_services ms ON ms.master_id = m.id
    WHERE ${cond}
    GROUP BY m.id
    ORDER BY m.sort, m.id
  `, [businessId]);
}

// Public: list active masters + their services + schedule
app.get("/api/p/:slug/masters", ah(async (req, res) => {
  const [biz] = await q(
    "SELECT id FROM businesses WHERE slug=$1 AND status='approved' AND is_visible=TRUE",
    [req.params.slug]
  );
  if (!biz) return res.status(404).json({ error: "Nie znaleziono" });
  const rows = await fetchMastersWithServices(biz.id, true);
  res.json(rows.map(m => masterClient(m)));
}));

// Owner: list all masters (including inactive) + their services + schedule
app.get("/api/masters", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  const rows = await fetchMastersWithServices(b.id, false);
  res.json(rows.map(m => masterClient(m)));
}));

// Owner: add master (inherits business hours as default schedule)
app.post("/api/masters", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  const { name, photo = null, bio = null, sort = 0 } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Imię jest wymagane" });
  const [row] = await q(
    `INSERT INTO masters (business_id, name, photo, bio, sort, is_active, working_hours)
     VALUES ($1,$2,$3,$4,$5,TRUE,$6) RETURNING *`,
    [b.id, String(name).trim(), photo, bio, sort, JSON.stringify(b.hours || {})]
  );
  res.json(masterClient(row));
}));

// Owner: update master metadata (name/photo/bio/sort/isActive)
app.put("/api/masters/:id", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  const [cur] = await q("SELECT * FROM masters WHERE id=$1 AND business_id=$2", [req.params.id, b.id]);
  if (!cur) return res.status(404).json({ error: "Nie znaleziono" });
  const name     = req.body.name     !== undefined ? String(req.body.name).trim() : cur.name;
  const photo    = req.body.photo    !== undefined ? req.body.photo    : cur.photo;
  const bio      = req.body.bio      !== undefined ? req.body.bio      : cur.bio;
  const sort     = req.body.sort     !== undefined ? Number(req.body.sort) : cur.sort;
  // frontend sends is_active (snake_case); accept both forms for robustness
  const rawActive = req.body.is_active !== undefined ? req.body.is_active : req.body.isActive;
  const isActive  = rawActive !== undefined ? Boolean(rawActive) : cur.is_active;
  if (!name) return res.status(400).json({ error: "Imię jest wymagane" });
  const [row] = await q(
    `UPDATE masters SET name=$1, photo=$2, bio=$3, sort=$4, is_active=$5
     WHERE id=$6 AND business_id=$7 RETURNING *`,
    [name, photo, bio, sort, isActive, cur.id, b.id]
  );
  const svcRows = await q("SELECT service_id FROM master_services WHERE master_id=$1", [cur.id]);
  res.json(masterClient(row, svcRows.map(r => r.service_id)));
}));

// Owner: update master's working hours (same format as businesses.hours)
app.put("/api/masters/:id/hours", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  const [cur] = await q("SELECT id FROM masters WHERE id=$1 AND business_id=$2", [req.params.id, b.id]);
  if (!cur) return res.status(404).json({ error: "Nie znaleziono" });
  const hours = req.body?.hours;
  if (!hours || typeof hours !== "object") return res.status(400).json({ error: "Nieprawidłowy format godzin" });
  const [row] = await q(
    "UPDATE masters SET working_hours=$1 WHERE id=$2 RETURNING *",
    [JSON.stringify(hours), cur.id]
  );
  const svcRows = await q("SELECT service_id FROM master_services WHERE master_id=$1", [cur.id]);
  res.json(masterClient(row, svcRows.map(r => r.service_id)));
}));

// Owner: replace service list for a master (PUT replaces all)
app.put("/api/masters/:id/services", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  const [cur] = await q("SELECT id FROM masters WHERE id=$1 AND business_id=$2", [req.params.id, b.id]);
  if (!cur) return res.status(404).json({ error: "Nie znaleziono" });
  const { serviceIds = [] } = req.body || {};
  if (!Array.isArray(serviceIds)) return res.status(400).json({ error: "serviceIds musi być tablicą" });
  // Verify all service IDs belong to this business
  if (serviceIds.length > 0) {
    const owned = await q(
      `SELECT id FROM services WHERE id = ANY($1::bigint[]) AND business_id=$2`,
      [serviceIds, b.id]
    );
    if (owned.length !== serviceIds.length) return res.status(400).json({ error: "Nieznana usługa" });
  }
  // Replace atomically
  await q("DELETE FROM master_services WHERE master_id=$1", [cur.id]);
  if (serviceIds.length > 0) {
    const vals = serviceIds.map((_, i) => `($1,$${i + 2})`).join(",");
    await q(`INSERT INTO master_services (master_id, service_id) VALUES ${vals} ON CONFLICT DO NOTHING`,
      [cur.id, ...serviceIds]);
  }
  res.json({ ok: true, serviceIds: serviceIds.map(Number) });
}));

// Owner: deactivate master (soft-delete via is_active=false)
app.delete("/api/masters/:id", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  const [cur] = await q("SELECT * FROM masters WHERE id=$1 AND business_id=$2", [req.params.id, b.id]);
  if (!cur) return res.status(404).json({ error: "Nie znaleziono" });
  await q("UPDATE masters SET is_active=FALSE WHERE id=$1", [cur.id]);
  res.json({ ok: true });
}));

/* ---------- appointments (owner) ---------- */
app.get("/api/appointments", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  const { date, status } = req.query;
  let sql = `SELECT a.*, s.name as service_name, s.price as service_price, m.name as master_name
    FROM appointments a
    LEFT JOIN services s ON s.id = a.service_id
    LEFT JOIN masters m ON m.id = a.master_id
    WHERE a.business_id = $1`;
  const params = [b.id];
  if (date) { sql += ` AND a.date = $${params.length + 1}`; params.push(date); }
  if (status) { sql += ` AND a.status = $${params.length + 1}`; params.push(status); }
  sql += " ORDER BY a.date, a.start_min";
  const rows = await q(sql, params);
  res.json(rows.map(apptClient));
}));

app.put("/api/appointments/:id", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  const [a] = await q("SELECT * FROM appointments WHERE id=$1 AND business_id=$2", [req.params.id, b.id]);
  if (!a) return res.status(404).json({ error: "Nie znaleziono" });
  const { status } = req.body;
  if (!["pending","confirmed","cancelled","done","no_show"].includes(status))
    return res.status(400).json({ error: "Nieprawidłowy status" });
  const [row] = await q("UPDATE appointments SET status=$1 WHERE id=$2 RETURNING *", [status, a.id]);
  const [svc] = row.service_id ? await q("SELECT name, price FROM services WHERE id=$1", [row.service_id]) : [null];
  const [mst] = row.master_id ? await q("SELECT name FROM masters WHERE id=$1", [row.master_id]) : [null];
  res.json(apptClient({ ...row, service_name: svc?.name || null, service_price: svc?.price || null, master_name: mst?.name || null }));
}));

/* ---------- service requests (owner) ---------- */
app.get("/api/service-requests", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  const rows = await q("SELECT * FROM service_requests WHERE business_id=$1 ORDER BY created_at DESC", [b.id]);
  res.json(rows.map(r => ({ id: Number(r.id), clientPhone: r.client_phone, text: r.text, handled: r.handled, createdAt: r.created_at })));
}));

app.put("/api/service-requests/:id", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  await q("UPDATE service_requests SET handled=TRUE WHERE id=$1 AND business_id=$2", [req.params.id, b.id]);
  res.json({ ok: true });
}));

/* ---------- CRM: client history + notes (owner) ---------- */
app.get("/api/clients/:phone", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  const phone = req.params.phone;
  const history = await q(`
    SELECT a.*, s.name as service_name, s.price as service_price, m.name as master_name
    FROM appointments a
    LEFT JOIN services s ON s.id = a.service_id
    LEFT JOIN masters m ON m.id = a.master_id
    WHERE a.business_id=$1 AND a.client_phone=$2 ORDER BY a.date DESC, a.start_min DESC`,
    [b.id, phone]);
  const [note] = await q("SELECT note FROM client_notes WHERE business_id=$1 AND client_phone=$2", [b.id, phone]);
  res.json({ history: history.map(apptClient), note: note?.note || "" });
}));

app.put("/api/clients/:phone/note", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  const { note = "" } = req.body || {};
  await q(`INSERT INTO client_notes (business_id, client_phone, note, updated_at) VALUES ($1,$2,$3,now())
    ON CONFLICT (business_id, client_phone) DO UPDATE SET note=$3, updated_at=now()`,
    [b.id, req.params.phone, note]);
  res.json({ ok: true });
}));

/* ---------- public marketplace ---------- */
app.get("/api/public/businesses", async (req, res) => {
  try {
    const { city, district, category, q: nameQ } = req.query;
    let sql = `SELECT b.*,
        ROUND(AVG(r.rating)::numeric, 1) AS avg_rating,
        COUNT(r.id)::int AS review_count
      FROM businesses b
      JOIN owners o ON o.id = b.owner_id
      LEFT JOIN reviews r ON r.business_id = b.id AND r.hidden = FALSE
      WHERE b.slug IS NOT NULL
        AND o.email_verified = TRUE
        AND b.status = 'approved'
        AND b.is_visible = TRUE
        AND b.city != ''
        AND EXISTS (SELECT 1 FROM services s WHERE s.business_id = b.id)`;
    const params = [];
    if (city) { sql += ` AND b.city ILIKE $${params.length+1}`; params.push(city); }
    if (district) { sql += ` AND b.district=$${params.length+1}`; params.push(district); }
    if (category) {
      sql += ` AND ($${params.length+1} = ANY(b.categories) OR (COALESCE(array_length(b.categories,1),0)=0 AND b.category=$${params.length+2}))`;
      params.push(category, category);
    }
    if (nameQ) { sql += ` AND b.name ILIKE $${params.length+1}`; params.push(`%${nameQ.trim()}%`); }
    sql += " GROUP BY b.id ORDER BY b.verified DESC, avg_rating DESC NULLS LAST, b.created_at ASC";
    const rows = await q(sql, params);
    res.json(rows.map(r => ({ ...publicBizClient(r), avgRating: r.avg_rating ? Number(r.avg_rating) : null, reviewCount: Number(r.review_count) || 0 })));
  } catch (e) { console.error(e); res.status(500).json({ error: "Błąd serwera" }); }
});

app.get("/api/public/businesses/:slug", async (req, res) => {
  try {
    const [b] = await q("SELECT * FROM businesses WHERE slug=$1", [req.params.slug]);
    if (!b) return res.status(404).json({ error: "Nie znaleziono firmy" });
    const services = await q("SELECT * FROM services WHERE business_id=$1 ORDER BY grp, sort, id", [b.id]);
    res.json({ ...publicBizClient(b), services: services.map(svcClient) });
  } catch (e) { console.error(e); res.status(500).json({ error: "Błąd serwera" }); }
});

app.get("/api/public/businesses/:slug/slots", async (req, res) => {
  try {
    const { date, service_id, master_id } = req.query;
    if (!date || !service_id) return res.status(400).json({ error: "date i service_id są wymagane" });
    const [b] = await q("SELECT * FROM businesses WHERE slug=$1", [req.params.slug]);
    if (!b) return res.status(404).json({ error: "Nie znaleziono" });
    const [svc] = await q("SELECT * FROM services WHERE id=$1 AND business_id=$2", [service_id, b.id]);
    if (!svc) return res.status(404).json({ error: "Usługa nie znaleziona" });

    // Get capable masters (who can perform this service and are active)
    const masters = master_id
      ? await q(`SELECT m.* FROM masters m JOIN master_services ms ON ms.master_id=m.id
                 WHERE m.id=$1 AND m.business_id=$2 AND m.is_active=TRUE AND ms.service_id=$3`,
                [master_id, b.id, service_id])
      : await q(`SELECT m.* FROM masters m JOIN master_services ms ON ms.master_id=m.id
                 WHERE m.business_id=$1 AND m.is_active=TRUE AND ms.service_id=$2
                 ORDER BY m.sort, m.id`,
                [b.id, service_id]);

    if (!masters.length) {
      // Fallback: no master_services data → legacy business-level calculation
      const appts = await q(
        "SELECT start_min, duration FROM appointments WHERE business_id=$1 AND date=$2 AND status IN ('pending','confirmed')",
        [b.id, date]
      );
      const slots = calcSlots(b.hours, appts, svc.duration, date);
      return res.json({ slots, duration: svc.duration, slotTimes: slots.map(minToTime) });
    }

    // Per-master slot calculation → union (slot available if ANY capable master is free)
    const slotSet = new Set();
    await Promise.all(masters.map(async (master) => {
      const appts = await q(
        "SELECT start_min, duration FROM appointments WHERE business_id=$1 AND date=$2 AND master_id=$3 AND status IN ('pending','confirmed')",
        [b.id, date, master.id]
      );
      calcSlots(master.working_hours, appts, svc.duration, date).forEach(s => slotSet.add(s));
    }));
    const slots = Array.from(slotSet).sort((a, b) => a - b);
    res.json({ slots, duration: svc.duration, slotTimes: slots.map(minToTime) });
  } catch (e) { console.error(e); res.status(500).json({ error: "Błąd serwera" }); }
});

app.post("/api/public/businesses/:slug/book", bookLimiter, async (req, res) => {
  try {
    const { service_id, client_name, client_phone, client_email = "", comment = "", date, start_min, master_id: requestedMasterId } = req.body || {};
    if (!service_id || !client_name || !client_phone || !date || start_min == null)
      return res.status(400).json({ error: "Wypełnij wszystkie wymagane pola" });
    if (typeof client_name !== "string" || client_name.trim().length < 2 || client_name.length > 100)
      return res.status(400).json({ error: "Podaj imię i nazwisko (2-100 znaków)" });
    const phone = String(client_phone).replace(/\s/g, "");
    if (!/^\+?[\d]{7,15}$/.test(phone))
      return res.status(400).json({ error: "Podaj prawidłowy numer telefonu" });
    if (comment && comment.length > 500)
      return res.status(400).json({ error: "Komentarz zbyt długi (max 500 znaków)" });
    const [b] = await q("SELECT * FROM businesses WHERE slug=$1", [req.params.slug]);
    if (!b) return res.status(404).json({ error: "Nie znaleziono" });
    const [svc] = await q("SELECT * FROM services WHERE id=$1 AND business_id=$2", [service_id, b.id]);
    if (!svc) return res.status(404).json({ error: "Usługa nie znaleziona" });

    // Get capable masters — use requested master if specified, otherwise all capable
    const masters = requestedMasterId
      ? await q(`SELECT m.* FROM masters m JOIN master_services ms ON ms.master_id=m.id
                 WHERE m.id=$1 AND m.business_id=$2 AND m.is_active=TRUE AND ms.service_id=$3`,
                [requestedMasterId, b.id, service_id])
      : await q(`SELECT m.* FROM masters m JOIN master_services ms ON ms.master_id=m.id
                 WHERE m.business_id=$1 AND m.is_active=TRUE AND ms.service_id=$2
                 ORDER BY m.sort, m.id`,
                [b.id, service_id]);

    let assignedMasterId = null;
    if (!masters.length) {
      // Fallback: no master_services data → legacy business-level overlap check
      const appts = await q(
        "SELECT start_min, duration FROM appointments WHERE business_id=$1 AND date=$2 AND status IN ('pending','confirmed')",
        [b.id, date]
      );
      if (appts.some(a => start_min < a.start_min + a.duration && a.start_min < start_min + svc.duration))
        return res.status(409).json({ error: "Ten termin jest już zajęty. Wybierz inny." });
    } else {
      // Find first capable master who is free at the requested slot
      for (const master of masters) {
        const appts = await q(
          "SELECT start_min, duration FROM appointments WHERE business_id=$1 AND date=$2 AND master_id=$3 AND status IN ('pending','confirmed')",
          [b.id, date, master.id]
        );
        if (isSlotFree(master.working_hours, appts, svc.duration, date, start_min)) {
          assignedMasterId = master.id;
          break;
        }
      }
      if (!assignedMasterId) return res.status(409).json({ error: "Ten termin jest już zajęty. Wybierz inny." });
    }

    const status = b.confirm_required ? "pending" : "confirmed";
    const [appt] = await q(`
      INSERT INTO appointments (business_id, service_id, client_name, client_phone, client_email, comment, date, start_min, duration, status, master_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, status`,
      [b.id, service_id, client_name.trim(), client_phone.trim(), client_email.trim(), comment.trim(), date, start_min, svc.duration, status, assignedMasterId]);
    notifyOwnerNewBooking(appt.id).catch(() => {});
    res.json({ id: Number(appt.id), status: appt.status, confirmRequired: b.confirm_required, businessName: b.name });
  } catch (e) { console.error(e); res.status(500).json({ error: "Błąd serwera" }); }
});

/* ---------- public: reviews ---------- */
app.get("/api/public/businesses/:slug/reviews", async (req, res) => {
  try {
    const [b] = await q("SELECT id FROM businesses WHERE slug=$1", [req.params.slug]);
    if (!b) return res.status(404).json({ error: "Nie znaleziono" });
    const rows = await q(
      "SELECT id, client_name, rating, text, created_at FROM reviews WHERE business_id=$1 AND hidden=FALSE ORDER BY created_at DESC LIMIT 50",
      [b.id]
    );
    const avg = rows.length ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1) : null;
    res.json({ reviews: rows.map(r => ({ id: Number(r.id), clientName: r.client_name, rating: r.rating, text: r.text, createdAt: r.created_at })), avg: avg ? Number(avg) : null, total: rows.length });
  } catch (e) { console.error(e); res.status(500).json({ error: "Błąd serwera" }); }
});

app.post("/api/public/businesses/:slug/reviews", async (req, res) => {
  try {
    const { client_name, rating, text = "" } = req.body || {};
    if (!client_name || !rating || rating < 1 || rating > 5)
      return res.status(400).json({ error: "Imię i ocena (1-5) są wymagane" });
    const [b] = await q("SELECT id FROM businesses WHERE slug=$1", [req.params.slug]);
    if (!b) return res.status(404).json({ error: "Nie znaleziono" });
    const [row] = await q(
      "INSERT INTO reviews (business_id, client_name, rating, text) VALUES ($1,$2,$3,$4) RETURNING id",
      [b.id, client_name.trim(), rating, text.trim()]
    );
    res.json({ ok: true, id: Number(row.id) });
  } catch (e) { console.error(e); res.status(500).json({ error: "Błąd serwera" }); }
});

/* ---------- owner: reviews + reports ---------- */
app.get("/api/reviews", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  const rows = await q(
    "SELECT * FROM reviews WHERE business_id=$1 ORDER BY created_at DESC",
    [b.id]
  );
  res.json(rows.map(r => ({ id: Number(r.id), clientName: r.client_name, rating: r.rating, text: r.text, hidden: r.hidden, createdAt: r.created_at })));
}));

app.post("/api/reviews/:id/report", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  const [review] = await q("SELECT id FROM reviews WHERE id=$1 AND business_id=$2", [req.params.id, b.id]);
  if (!review) return res.status(404).json({ error: "Nie znaleziono" });
  const { reason } = req.body || {};
  if (!reason) return res.status(400).json({ error: "Podaj powód zgłoszenia" });
  const [existing] = await q("SELECT id FROM reports WHERE review_id=$1 AND owner_id=$2", [review.id, req.user.id]);
  if (existing) return res.status(409).json({ error: "Już zgłoszono tę opinię" });
  await q("INSERT INTO reports (review_id, owner_id, reason) VALUES ($1,$2,$3)", [review.id, req.user.id, reason.trim()]);
  res.json({ ok: true });
}));

/* ---------- public: support ticket ---------- */
app.post("/api/support", async (req, res) => {
  try {
    const { email, subject, message } = req.body || {};
    if (!email || !subject || !message) return res.status(400).json({ error: "Wszystkie pola są wymagane" });
    await q("INSERT INTO support_tickets (email, subject, message) VALUES ($1,$2,$3)", [email.trim(), subject.trim(), message.trim()]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Błąd serwera" }); }
});

/* ---------- public: waitlist ---------- */
app.post("/api/public/businesses/:slug/waitlist", async (req, res) => {
  try {
    const { service_id, client_name, client_phone, client_email = "", preferred_date } = req.body || {};
    if (!client_name || !client_phone) return res.status(400).json({ error: "Imię i telefon są wymagane" });
    const [b] = await q("SELECT id FROM businesses WHERE slug=$1", [req.params.slug]);
    if (!b) return res.status(404).json({ error: "Nie znaleziono" });
    await q(
      "INSERT INTO waitlist (business_id, service_id, client_name, client_phone, client_email, preferred_date) VALUES ($1,$2,$3,$4,$5,$6)",
      [b.id, service_id || null, client_name.trim(), client_phone.trim(), client_email.trim(), preferred_date || null]
    );
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Błąd serwera" }); }
});

app.get("/api/waitlist", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  const rows = await q(
    `SELECT w.*, s.name AS service_name FROM waitlist w LEFT JOIN services s ON s.id = w.service_id
     WHERE w.business_id=$1 AND w.notified=FALSE ORDER BY w.created_at DESC`,
    [b.id]
  );
  res.json(rows.map(r => ({ id: Number(r.id), clientName: r.client_name, clientPhone: r.client_phone, clientEmail: r.client_email, serviceName: r.service_name, preferredDate: r.preferred_date ? String(r.preferred_date).slice(0,10) : null, createdAt: r.created_at })));
}));

app.put("/api/waitlist/:id/notify", requireAuth, ah(async (req, res) => {
  const b = await requireBusiness(req, res); if (!b) return;
  await q("UPDATE waitlist SET notified=TRUE WHERE id=$1 AND business_id=$2", [req.params.id, b.id]);
  res.json({ ok: true });
}));

/* ---------- public: feedback ---------- */
app.post("/api/feedback", async (req, res) => {
  try {
    const { kind = "bug", message, email = "", page = "" } = req.body || {};
    if (!message || String(message).trim().length < 5)
      return res.status(400).json({ error: "Opisz problem (min 5 znaków)" });
    const safeKind = ["bug","idea","other"].includes(kind) ? kind : "other";
    const safeMsg = String(message).slice(0, 2000).trim();
    const safeEmail = String(email).slice(0, 200).trim();
    const safePage = String(page).slice(0, 200).trim();
    await q("INSERT INTO feedback (kind, message, email, page) VALUES ($1,$2,$3,$4)", [safeKind, safeMsg, safeEmail, safePage]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Błąd serwera" }); }
});

app.post("/api/public/businesses/:slug/service-request", async (req, res) => {
  try {
    const { client_phone, text } = req.body || {};
    if (!client_phone || !text) return res.status(400).json({ error: "Telefon i opis usługi są wymagane" });
    const [b] = await q("SELECT id FROM businesses WHERE slug=$1", [req.params.slug]);
    if (!b) return res.status(404).json({ error: "Nie znaleziono" });
    await q("INSERT INTO service_requests (business_id, client_phone, text) VALUES ($1,$2,$3)", [b.id, client_phone.trim(), text.trim()]);
    res.json({ ok: true });
  } catch (e) { console.error(e); res.status(500).json({ error: "Błąd serwera" }); }
});

/* ── Admin middleware ── */
async function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Nieautoryzowany" });
  const [owner] = await q("SELECT role FROM owners WHERE id=$1", [req.user.id]);
  if (!owner || owner.role !== "admin") return res.status(403).json({ error: "Brak uprawnień" });
  next();
}

/* ── Admin routes ── */
app.get("/api/admin/businesses", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `SELECT b.*, o.email AS owner_email FROM businesses b JOIN owners o ON o.id=b.owner_id`;
    const params = [];
    if (status) { sql += ` WHERE b.status=$1`; params.push(status); }
    sql += " ORDER BY b.created_at DESC";
    const rows = await q(sql, params);
    res.json(rows.map(r => ({
      id: Number(r.id), slug: r.slug, name: r.name, category: r.category,
      categories: toCategories(r),
      city: r.city, status: r.status, verified: r.verified, isVisible: r.is_visible !== false,
      ownerEmail: r.owner_email, createdAt: r.created_at,
    })));
  } catch (e) { console.error(e); res.status(500).json({ error: "Błąd serwera" }); }
});

app.post("/api/admin/businesses/:id/approve", requireAuth, requireAdmin, ah(async (req, res) => {
  await q("UPDATE businesses SET status='approved' WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
}));
app.post("/api/admin/businesses/:id/reject", requireAuth, requireAdmin, ah(async (req, res) => {
  await q("UPDATE businesses SET status='rejected' WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
}));
app.post("/api/admin/businesses/:id/verify", requireAuth, requireAdmin, ah(async (req, res) => {
  await q("UPDATE businesses SET verified=TRUE WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
}));
app.post("/api/admin/businesses/:id/unverify", requireAuth, requireAdmin, ah(async (req, res) => {
  await q("UPDATE businesses SET verified=FALSE WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
}));
app.post("/api/admin/businesses/:id/show", requireAuth, requireAdmin, ah(async (req, res) => {
  await q("UPDATE businesses SET is_visible=TRUE WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
}));
app.post("/api/admin/businesses/:id/hide", requireAuth, requireAdmin, ah(async (req, res) => {
  await q("UPDATE businesses SET is_visible=FALSE WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
}));
app.delete("/api/admin/businesses/:id", requireAuth, requireAdmin, ah(async (req, res) => {
  await q("DELETE FROM businesses WHERE id=$1", [req.params.id]);
  res.json({ ok: true });
}));

app.get("/api/admin/stats", requireAuth, requireAdmin, async (req, res) => {
  try {
    const [oc] = await q("SELECT COUNT(*) AS cnt FROM owners");
    const statuses = await q("SELECT status, COUNT(*) AS cnt FROM businesses GROUP BY status");
    const [appts7] = await q(
      "SELECT COUNT(*) AS cnt FROM appointments WHERE created_at >= now() - interval '7 days'"
    );
    res.json({
      owners: Number(oc.cnt),
      businesses: Object.fromEntries(statuses.map(r => [r.status, Number(r.cnt)])),
      appointments7d: Number(appts7.cnt),
    });
  } catch (e) { console.error(e); res.status(500).json({ error: "Błąd serwera" }); }
});

app.get("/api/admin/feedback", requireAuth, requireAdmin, async (req, res) => {
  try {
    const rows = await q("SELECT * FROM feedback ORDER BY created_at DESC LIMIT 200");
    res.json(rows.map(r => ({ id: Number(r.id), kind: r.kind, message: r.message, email: r.email, page: r.page, createdAt: r.created_at })));
  } catch (e) { console.error(e); res.status(500).json({ error: "Błąd serwera" }); }
});

// Global Express error handler — catches everything forwarded via next(err)
// MUST be the last middleware registered
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error("Express error:", err);
  if (res.headersSent) return;
  res.status(500).json({ error: "Błąd serwera" });
});

const PORT = process.env.PORT || 4000;
initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`Rezerwo API -> http://localhost:${PORT}`));
    startReminderScheduler();
  })
  .catch((e) => { console.error("DB connection failed:", e.message); process.exit(1); });
