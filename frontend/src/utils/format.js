export function formatKsh(value) {
  const n = Number(value || 0);
  return `KSh ${n.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Only Tablets/Capsules are dispensed as "packs of N units" with per-tablet
// pricing and pack-conversion math. Every other dosage form (syrups,
// inhalers, creams, drops, injectables) is stocked and priced as a single
// whole unit — no pack breakdown makes sense for those.
const TABLET_FORMS = ["Tablets", "Capsules"];

export function isPackForm(dosageForm) {
  return TABLET_FORMS.includes(dosageForm);
}

const UNIT_LABELS = {
  Tablets: ["tablet", "tablets"],
  Capsules: ["capsule", "capsules"],
  "Syrup/Suspension": ["bottle", "bottles"],
  Inhaler: ["inhaler", "inhalers"],
  "Ointment/Cream": ["tube", "tubes"],
  Drops: ["bottle", "bottles"],
  Injectable: ["vial", "vials"],
};

export function unitLabel(dosageForm, count = 2) {
  const [singular, plural] = UNIT_LABELS[dosageForm] || ["unit", "units"];
  return Math.abs(Number(count)) === 1 ? singular : plural;
}

export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-KE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
