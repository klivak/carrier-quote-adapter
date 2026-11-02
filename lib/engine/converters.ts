const STATES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const isLeapYear = (year: number) => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

const daysInMonth = (year: number, month: number) => (month === 2 && isLeapYear(year) ? 29 : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]);

const pad = (n: number, width = 2) => String(n).padStart(width, "0");

function parseIso(iso: unknown): { year: number; month: number; day: number } | null {
  if (typeof iso !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

// Dates are handled as strings on purpose: new Date("YYYY-MM-DD") is UTC and can shift a day in local time.
export function isoToCarrierDate(iso: unknown): string | null {
  const date = parseIso(iso);
  return date && `${pad(date.month)}/${pad(date.day)}/${pad(date.year, 4)}`;
}

export function carrierDateToIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return null;
  const iso = `${match[3]}-${match[1]}-${match[2]}`;
  return parseIso(iso) ? iso : null;
}

export function formatLongDate(iso: string): string {
  const date = parseIso(iso);
  return date ? `${MONTHS[date.month - 1]} ${date.day}, ${date.year}` : iso;
}

function birthdayIn(year: number, birth: { month: number; day: number }): string {
  const leapDayMoved = birth.month === 2 && birth.day === 29 && !isLeapYear(year);
  return leapDayMoved ? `${year}-03-01` : `${year}-${pad(birth.month)}-${pad(birth.day)}`;
}

export function ageOn(birthIso: string, todayIso: string): number {
  const birth = parseIso(birthIso);
  const today = parseIso(todayIso);
  if (!birth || !today) throw new Error("ageOn needs valid ISO dates");
  const years = today.year - birth.year;
  return todayIso >= birthdayIn(today.year, birth) ? years : years - 1;
}

export function nextEligibleDate(birthIso: string, minAge: number): string {
  const birth = parseIso(birthIso);
  if (!birth) throw new Error("nextEligibleDate needs a valid ISO date");
  return birthdayIn(birth.year + minAge, birth);
}

export const stateName = (code: unknown): string | null => (typeof code === "string" && STATES[code.toUpperCase()]) || null;

export function nearestOptions(value: number, options: number[]): number[] {
  const sorted = [...options].sort((a, b) => a - b);
  const below = sorted.filter((option) => option < value).at(-1);
  const above = sorted.find((option) => option > value);
  return [below, above].filter((option): option is number => option !== undefined);
}

export const joinList = (items: string[]): string => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`);

export const formatUsd = (amount: number): string => `$${amount.toLocaleString("en-US")}`;
