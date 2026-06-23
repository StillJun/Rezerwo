export const legalConfig = {
  effectiveDate: "23.06.2026",
  contactEmail:  "getrezerwo@gmail.com",
  operatorName:  "Adam Borshchenko",
  address:       "",
  nip:           "",
  regon:         "",
};

export function applyLegalConfig(md: string): string {
  let t = md;

  // Remove empty-field phrases gracefully before other substitutions
  if (!legalConfig.address) {
    t = t.replace(/,?\s*z siedzibą pod adresem \*\*\[ADRES\]\*\*/g, "");
  }
  if (!legalConfig.nip) {
    t = t.replace(/,?\s*NIP:\s*\*\*\[NIP\]\*\*/g, "");
  }
  if (!legalConfig.regon) {
    t = t.replace(/,?\s*REGON:\s*\*\*\[REGON\]\*\*/g, "");
  }

  // Substitute filled placeholders
  t = t.replace(/\[DATA\]/g, legalConfig.effectiveDate);
  t = t.replace(/\[E-MAIL KONTAKTOWY\]/g, legalConfig.contactEmail);
  t = t.replace(/\[IMIĘ I NAZWISKO \/ NAZWA FIRMY\]/g, legalConfig.operatorName);

  // Safety net for any remaining placeholders
  t = t.replace(/\[ADRES\]/g,   legalConfig.address);
  t = t.replace(/\[NIP\]/g,     legalConfig.nip);
  t = t.replace(/\[REGON\]/g,   legalConfig.regon);

  return t;
}
