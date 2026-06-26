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

  // ── masters table (stage 1/5: multi-master support) ─────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS masters (
      id          BIGSERIAL PRIMARY KEY,
      business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      photo       TEXT,
      bio         TEXT,
      is_active   BOOLEAN NOT NULL DEFAULT TRUE,
      sort        INT NOT NULL DEFAULT 0,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_masters_biz ON masters(business_id)`).catch(() => {});

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
  // multi-categories: new column, migrate existing single category, GIN index for ANY() filter
  await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS categories text[] DEFAULT '{}'`).catch(() => {});
  await pool.query(`UPDATE businesses SET categories = ARRAY[category] WHERE (categories IS NULL OR array_length(categories, 1) IS NULL) AND category IS NOT NULL AND category != ''`).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_biz_categories ON businesses USING GIN(categories)`).catch(() => {});
  // visibility flag: hide from marketplace without deleting
  await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT TRUE`).catch(() => {});

  // ── masters stage 1: default master per existing business (idempotent) ──────
  // For every business that has no master yet, insert one named after the business
  await pool.query(`
    INSERT INTO masters (business_id, name, is_active, sort)
    SELECT b.id, b.name, TRUE, 0
    FROM businesses b
    WHERE NOT EXISTS (
      SELECT 1 FROM masters m WHERE m.business_id = b.id
    )
  `).catch(() => {});

  // Add master_id to services (nullable — NULL = available to all masters)
  await pool.query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS master_id BIGINT REFERENCES masters(id) ON DELETE SET NULL`).catch(() => {});
  // Assign existing services to their business default master
  await pool.query(`
    UPDATE services s
    SET master_id = (
      SELECT m.id FROM masters m
      WHERE m.business_id = s.business_id
      ORDER BY m.id ASC LIMIT 1
    )
    WHERE s.master_id IS NULL
  `).catch(() => {});

  // Add master_id to appointments (nullable — NULL = any available master)
  await pool.query(`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS master_id BIGINT REFERENCES masters(id) ON DELETE SET NULL`).catch(() => {});
  // Assign existing appointments to their business default master
  await pool.query(`
    UPDATE appointments a
    SET master_id = (
      SELECT m.id FROM masters m
      WHERE m.business_id = a.business_id
      ORDER BY m.id ASC LIMIT 1
    )
    WHERE a.master_id IS NULL
  `).catch(() => {});

  // ── contacts / amenities / languages (profile extension) ────────────────────
  await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS contacts  JSONB  DEFAULT '{}'::jsonb`).catch(() => {});
  await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT ARRAY[]::TEXT[]`).catch(() => {});
  await pool.query(`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT ARRAY[]::TEXT[]`).catch(() => {});

  // ── masters stage 2: working_hours + master_services ────────────────────────
  // Same format as businesses.hours: {"mon":["10:00","19:00"],...}
  await pool.query(`ALTER TABLE masters ADD COLUMN IF NOT EXISTS working_hours JSONB NOT NULL DEFAULT '{}'::jsonb`).catch(() => {});
  // Inherit business hours for masters that still have empty schedule (idempotent)
  await pool.query(`
    UPDATE masters m
    SET working_hours = b.hours
    FROM businesses b
    WHERE m.business_id = b.id
      AND m.working_hours = '{}'::jsonb
      AND b.hours IS NOT NULL
      AND b.hours != '{}'::jsonb
  `).catch(() => {});
  // Many-to-many: which services each master can perform
  await pool.query(`
    CREATE TABLE IF NOT EXISTS master_services (
      master_id  BIGINT NOT NULL REFERENCES masters(id) ON DELETE CASCADE,
      service_id BIGINT NOT NULL REFERENCES services(id) ON DELETE CASCADE,
      PRIMARY KEY (master_id, service_id)
    )
  `).catch(() => {});
  // Populate from services.master_id set in stage 1 (ON CONFLICT = idempotent)
  await pool.query(`
    INSERT INTO master_services (master_id, service_id)
    SELECT s.master_id, s.id
    FROM services s
    WHERE s.master_id IS NOT NULL
    ON CONFLICT DO NOTHING
  `).catch(() => {});

  // ── clients table (stage 3: CRM contacts book) ──────────────────────────────
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clients (
      id           BIGSERIAL PRIMARY KEY,
      business_id  BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      name         TEXT NOT NULL,
      phone        TEXT NOT NULL,
      email        TEXT DEFAULT '',
      notes        TEXT DEFAULT '',
      tags         TEXT[] DEFAULT '{}',
      rodo_consent BOOLEAN NOT NULL DEFAULT TRUE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(business_id, phone)
    )
  `).catch(() => {});
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_clients_biz ON clients(business_id)`).catch(() => {});

  console.log("Database ready (tables checked/created)");
}
