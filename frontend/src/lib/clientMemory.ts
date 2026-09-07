/* Local-only memory of the client's own contact details.
   Never leaves the browser — used to prefill booking / waitlist / request forms
   so a returning client doesn't retype name + phone + email every time. */

const KEY = "rz_client";

export interface RememberedClient {
  name: string;
  phone: string;
  email: string;
}

const EMPTY: RememberedClient = { name: "", phone: "", email: "" };

export function loadClient(): RememberedClient {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const p = JSON.parse(raw) as Partial<RememberedClient>;
    return {
      name: typeof p.name === "string" ? p.name : "",
      phone: typeof p.phone === "string" ? p.phone : "",
      email: typeof p.email === "string" ? p.email : "",
    };
  } catch {
    return EMPTY;
  }
}

export function saveClient(c: Partial<RememberedClient>): void {
  try {
    const merged = { ...loadClient(), ...c };
    if (!merged.name && !merged.phone && !merged.email) return;
    localStorage.setItem(KEY, JSON.stringify(merged));
  } catch {
    /* private mode / quota — ignore, prefill is a convenience only */
  }
}
