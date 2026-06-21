import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set. Create a .env file (see .env.example).");
  process.exit(1);
}
const useSSL = !/localhost|127\.0\.0\.1/.test(connectionString);
export const pool = new pg.Pool({ connectionString, ssl: useSSL ? { rejectUnauthorized: false } : false });
export const q = async (text, params) => (await pool.query(text, params)).rows;

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS owners (
      id                 BIGSERIAL PRIMARY KEY,
      email              TEXT NOT NULL UNIQUE,
      password_hash      TEXT NOT NULL,
      email_verified     BOOLEAN NOT NULL DEFAULT FALSE,
      verification_token TEXT,
      created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS businesses (
      id               BIGSERIAL PRIMARY KEY,
      owner_id         BIGINT NOT NULL UNIQUE REFERENCES owners(id) ON DELETE CASCADE,
      slug             TEXT,
      name             TEXT    NOT NULL,
      category         TEXT    NOT NULL DEFAULT 'barber',
      city             TEXT    DEFAULT '',
      district         TEXT    DEFAULT '',
      address          TEXT    DEFAULT '',
      phone            TEXT    DEFAULT '',
      instagram        TEXT    DEFAULT '',
      about            TEXT    DEFAULT '',
      banner           TEXT    DEFAULT 'violet',
      hours            JSONB   DEFAULT '{}'::jsonb,
      photos           JSONB   DEFAULT '[]'::jsonb,
      confirm_required BOOLEAN NOT NULL DEFAULT TRUE,
      reminder_hours   JSONB   DEFAULT '[24,4]'::jsonb,
      verified         BOOLEAN NOT NULL DEFAULT FALSE,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS services (
      id          BIGSERIAL PRIMARY KEY,
      business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      grp         TEXT    NOT NULL DEFAULT '',
      name        TEXT    NOT NULL,
      description TEXT    DEFAULT '',
      duration    INT     NOT NULL DEFAULT 30,
      price       NUMERIC NOT NULL DEFAULT 0,
      sort        INT     NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_services_biz ON services(business_id);

    CREATE TABLE IF NOT EXISTS appointments (
      id           BIGSERIAL PRIMARY KEY,
      business_id  BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      service_id   BIGINT REFERENCES services(id) ON DELETE SET NULL,
      client_name  TEXT NOT NULL,
      client_phone TEXT NOT NULL,
      client_email TEXT DEFAULT '',
      comment      TEXT DEFAULT '',
      date         DATE NOT NULL,
      start_min    INT  NOT NULL,
      duration     INT  NOT NULL DEFAULT 30,
      status       TEXT NOT NULL DEFAULT 'pending',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_appt_biz_date ON appointments(business_id, date);

    CREATE TABLE IF NOT EXISTS service_requests (
      id           BIGSERIAL PRIMARY KEY,
      business_id  BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      client_phone TEXT NOT NULL,
      text         TEXT NOT NULL,
      handled      BOOLEAN NOT NULL DEFAULT FALSE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS client_notes (
      id           BIGSERIAL PRIMARY KEY,
      business_id  BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      client_phone TEXT NOT NULL,
      note         TEXT NOT NULL DEFAULT '',
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(business_id, client_phone)
    );

    CREATE TABLE IF NOT EXISTS reminders_sent (
      id              BIGSERIAL PRIMARY KEY,
      appointment_id  BIGINT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
      hours_before    INT NOT NULL,
      sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(appointment_id, hours_before)
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id             BIGSERIAL PRIMARY KEY,
      business_id    BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      appointment_id BIGINT REFERENCES appointments(id) ON DELETE SET NULL,
      client_name    TEXT NOT NULL,
      rating         INT NOT NULL CHECK(rating BETWEEN 1 AND 5),
      text           TEXT DEFAULT '',
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      hidden         BOOLEAN NOT NULL DEFAULT FALSE
    );
    CREATE INDEX IF NOT EXISTS idx_reviews_biz ON reviews(business_id);

    CREATE TABLE IF NOT EXISTS reports (
      id         BIGSERIAL PRIMARY KEY,
      review_id  BIGINT NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      owner_id   BIGINT NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
      reason     TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id         BIGSERIAL PRIMARY KEY,
      owner_id   BIGINT REFERENCES owners(id) ON DELETE SET NULL,
      email      TEXT NOT NULL,
      subject    TEXT NOT NULL,
      message    TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'open',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS waitlist (
      id             BIGSERIAL PRIMARY KEY,
      business_id    BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      service_id     BIGINT REFERENCES services(id) ON DELETE SET NULL,
      client_name    TEXT NOT NULL,
      client_phone   TEXT NOT NULL,
      client_email   TEXT DEFAULT '',
      preferred_date DATE,
      notified       BOOLEAN NOT NULL DEFAULT FALSE,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_waitlist_biz ON waitlist(business_id);

    CREATE TABLE IF NOT EXISTS feedback (
      id         BIGSERIAL PRIMARY KEY,
      kind       TEXT NOT NULL DEFAULT 'bug',
      message    TEXT NOT NULL,
      email      TEXT DEFAULT '',
      page       TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // migrations for existing installations
  await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS slug TEXT`).catch(() => {});
  await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug) WHERE slug IS NOT NULL`).catch(() => {});
  await pool.query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE`).catch(() => {});
  await pool.query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS verification_token TEXT`).catch(() => {});
  // grandfather existing owners (created before email verification feature) as already verified
  await pool.query(`UPDATE owners SET email_verified = TRUE WHERE verification_token IS NULL AND email_verified = FALSE`).catch(() => {});
  // role + business status
  await pool.query(`ALTER TABLE owners ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'owner'`).catch(() => {});
  await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'`).catch(() => {});
  // grandfather existing businesses as approved
  await pool.query(`UPDATE businesses SET status='approved' WHERE status IS NULL OR status=''`).catch(() => {});

  console.log("Database ready (tables checked/created)");
}
