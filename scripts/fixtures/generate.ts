/**
 * Fixtures generator — SYNTHETIC seed data for the District Plans prototype.
 *
 *   node scripts/fixtures/generate.ts            # writes fixtures/out/*.json
 *   node scripts/fixtures/generate.ts --seed 7   # different deterministic world
 *   node scripts/fixtures/generate.ts --date 2026-10-01  # pin "today" for reproducible slot times
 *
 * Deterministic (seeded PRNG) so demos are reproducible. Nothing here is real:
 * names, phones, venues and events are invented. In production, taste signals
 * come from District/Zomato history (PRD §6.4); this file stands in for that.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
  Area, BudgetBand, City, Dietary, DiningSlot, DiningVenue, FixtureBundle, LiveEvent,
  MovieShowtime, SocialEdge, SyntheticUser, TasteProfile, Vibe,
} from "../../src/lib/fixtures/types.ts";

// ---------- deterministic randomness ----------
const argSeed = process.argv.indexOf("--seed");
const SEED = argSeed > -1 ? Number(process.argv[argSeed + 1]) : 2026;
let s = SEED >>> 0;
const rand = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = <T,>(a: readonly T[]): T => a[Math.floor(rand() * a.length)];
const pickN = <T,>(a: readonly T[], n: number): T[] => [...a].sort(() => rand() - 0.5).slice(0, n);
const between = (lo: number, hi: number) => lo + rand() * (hi - lo);
const int = (lo: number, hi: number) => Math.floor(between(lo, hi + 1));
const uuid = () => { const h = () => Math.floor(rand() * 0xffffffff).toString(16).padStart(8, "0"); const a = h() + h() + h() + h(); return `${a.slice(0, 8)}-${a.slice(8, 12)}-4${a.slice(13, 16)}-a${a.slice(17, 20)}-${a.slice(20, 32)}`; };

// ---------- world ----------
const argDate = process.argv.indexOf("--date");
const NOW = new Date(`${argDate > -1 ? process.argv[argDate + 1] : new Date().toISOString().slice(0, 10)}T10:00:00+05:30`); // "today" 10:00 IST; pass --date YYYY-MM-DD to pin
const day = (d: number, h: number, m = 0) => { const x = new Date(NOW); x.setDate(x.getDate() + d); x.setHours(h, m, 0, 0); return x.toISOString(); };

const AREAS: Area[] = [
  { city: "Bengaluru", name: "Indiranagar", lat: 12.9784, lng: 77.6408 },
  { city: "Bengaluru", name: "Koramangala", lat: 12.9352, lng: 77.6245 },
  { city: "Bengaluru", name: "HSR Layout", lat: 12.9116, lng: 77.6389 },
  { city: "Bengaluru", name: "Whitefield", lat: 12.9698, lng: 77.7500 },
  { city: "Bengaluru", name: "MG Road", lat: 12.9756, lng: 77.6066 },
  { city: "Mumbai", name: "Bandra West", lat: 19.0596, lng: 72.8295 },
  { city: "Mumbai", name: "Lower Parel", lat: 18.9960, lng: 72.8300 },
  { city: "Mumbai", name: "Andheri West", lat: 19.1364, lng: 72.8296 },
  { city: "Mumbai", name: "Powai", lat: 19.1176, lng: 72.9060 },
  { city: "Mumbai", name: "Colaba", lat: 18.9067, lng: 72.8147 },
  { city: "Delhi NCR", name: "Hauz Khas", lat: 28.5494, lng: 77.2001 },
  { city: "Delhi NCR", name: "Connaught Place", lat: 28.6315, lng: 77.2167 },
  { city: "Delhi NCR", name: "Cyber Hub", lat: 28.4950, lng: 77.0890 },
  { city: "Delhi NCR", name: "Saket", lat: 28.5245, lng: 77.2066 },
  { city: "Delhi NCR", name: "Sector 29 Gurugram", lat: 28.4691, lng: 77.0625 },
];
const CITIES: City[] = ["Bengaluru", "Mumbai", "Delhi NCR"];
const areasIn = (c: City) => AREAS.filter((a) => a.city === c);
const jitter = (a: Area) => ({ lat: a.lat + between(-0.006, 0.006), lng: a.lng + between(-0.006, 0.006) });

const CUISINES = ["north-indian", "south-indian", "asian", "japanese", "italian", "continental", "mediterranean", "mexican", "street-food", "cafe", "bar-food", "seafood", "chinese", "korean", "dessert"];
const GENRES = ["comedy", "live-music", "indie", "bollywood", "hollywood", "thriller", "drama", "theatre", "techno", "hip-hop", "sports", "activity", "rom-com", "horror", "animation"];
const BANDS: BudgetBand[] = ["₹", "₹₹", "₹₹₹", "₹₹₹₹"];
const BAND_COST: Record<BudgetBand, [number, number]> = { "₹": [300, 600], "₹₹": [600, 1100], "₹₹₹": [1100, 2000], "₹₹₹₹": [2000, 4000] };
const VIBES: Vibe[] = ["chill", "loud", "fancy", "cheap-and-cheerful", "date-ish", "big-group"];
const DIETARY: Dietary[] = ["none", "none", "none", "veg", "veg", "jain", "halal", "no-beef", "vegan"];

const FIRST = ["Aarav", "Ananya", "Rohan", "Priya", "Kabir", "Ishita", "Vikram", "Sneha", "Arjun", "Meera", "Dev", "Tara", "Nikhil", "Zoya", "Aditya", "Riya", "Karan", "Nandini", "Siddharth", "Aisha", "Rahul", "Diya", "Varun", "Kavya", "Yash", "Sara", "Manav", "Pooja", "Aryan", "Neha", "Rishi", "Ira", "Shreyas", "Anika", "Tanmay", "Mira"];
const LAST = ["Sharma", "Iyer", "Mehta", "Reddy", "Kapoor", "Nair", "Singh", "Bose", "Desai", "Rao", "Khan", "Joshi", "Menon", "Gupta", "Pillai", "Verma", "Chopra", "Das", "Jadhav", "Bhatt"];

const DINING_NAMES = ["Toit", "Byg Brewski", "Naru", "Burma Burma", "Fatty Bao", "Smoke House Deli", "Olive", "Bastian", "The Bombay Canteen", "Koko", "Yauatcha", "Pa Pa Ya", "Big Chill", "Indian Accent", "Sly Granny", "Farzi", "Social", "Mamagoto", "Nasi and Mee", "Truffles", "Salt", "Jamavar", "The Permit Room", "Kopitiam Lah", "Misu", "Hoppipola", "Cafe Noir", "Windmills", "Muro", "Bombay Vintage", "Gigi", "Ping's Cafe Orient", "Zen", "Carnatic Cafe", "Rooh", "Comorin", "Dhaba Estd 1986", "Sidecar", "Kimono", "The Fatty Bao Rooftop"];
const COMEDIANS = ["Anubhav Singh Bassi", "Aakash Gupta", "Zakir Khan", "Kenny Sebastian", "Prashasti Singh", "Abhishek Upmanyu", "Urooj Ashfaq", "Rahul Dua", "Sumukhi Suresh", "Biswa Kalyan Rath"];
const BANDS_ARTISTS = ["Peter Cat Recording Co.", "When Chai Met Toast", "Parekh & Singh", "Prateek Kuhad", "The F16s", "Seedhe Maut", "Ritviz", "Lifafa", "Thaikkudam Bridge", "Anuv Jain"];
const PLAYS = ["Bombay Talkies", "Barff", "The Vagina Monologues", "Dekh Behen", "Chinese Coffee", "Piya Behrupiya", "Sir Sir Sarla", "Hamlet: The Clown Prince"];
const ACTIVITIES = ["Go-karting Grand Prix", "Bowling & arcade night", "Trampoline park slot", "Pottery + wine", "Escape room: The Heist", "Sunset sailing", "Axe throwing", "Karaoke room"];
const MOVIES: Array<[string, string[], string, number]> = [
  ["Dhurandhar 2", ["bollywood", "thriller"], "Hindi", 165], ["Love Hostel", ["drama", "bollywood"], "Hindi", 130],
  ["Avengers: Doomsday", ["hollywood", "action"], "English", 155], ["The Pale Season", ["drama", "indie"], "English", 118],
  ["Kantara: Chapter 2", ["drama", "thriller"], "Kannada", 150], ["Toy Story 5", ["animation"], "English", 105],
  ["Meri Patni Ka Remake", ["rom-com", "bollywood"], "Hindi", 140], ["Coolie 2", ["action", "thriller"], "Tamil", 160],
  ["Tumbbad Returns", ["horror"], "Hindi", 125], ["Wake Up Dead Man", ["thriller", "hollywood"], "English", 140],
];
const CINEMAS = ["PVR INOX", "Cinepolis", "Miraj", "Movietime"];

// ---------- users + taste + graph ----------
const users: SyntheticUser[] = [];
const tastes: TasteProfile[] = [];
const edges: SocialEdge[] = [];
const usedNames = new Set<string>();

for (const city of CITIES) {
  const cityAreas = areasIn(city);
  // 3 friend "crews" per city, 4–6 people each, so group curation is demonstrable
  for (let crew = 0; crew < 3; crew++) {
    const size = int(4, 6);
    const crewHome = pick(cityAreas);
    const crewBand = pick(BANDS.slice(0, 3)) as BudgetBand;
    const persona = crew === 0 ? "metro-pro" : crew === 1 ? "genz-flaky" : pick(["metro-pro", "genz-flaky"] as const);
    const members: string[] = [];
    for (let i = 0; i < size; i++) {
      let name = `${pick(FIRST)} ${pick(LAST)}`;
      while (usedNames.has(name)) name = `${pick(FIRST)} ${pick(LAST)}`;
      usedNames.add(name);
      const id = uuid();
      const home = rand() < 0.7 ? crewHome : pick(cityAreas);
      users.push({ id, phone: `+91 9${int(100000000, 999999999)}`, name, city, home_area: home.name, persona, created_at: day(-int(30, 400), 12) });
      const favC = pickN(CUISINES, 4); const favG = pickN(GENRES, 4);
      tastes.push({
        user_id: id,
        cuisine_vec: Object.fromEntries(CUISINES.map((c) => [c, +(favC.includes(c) ? between(0.6, 1) : between(0, 0.4)).toFixed(2)])),
        genre_vec: Object.fromEntries(GENRES.map((g) => [g, +(favG.includes(g) ? between(0.6, 1) : between(0, 0.4)).toFixed(2)])),
        price_band: rand() < 0.75 ? crewBand : pick(BANDS),
        fav_areas: pickN(cityAreas.map((a) => a.name), 2).concat(home.name).filter((v, i, a) => a.indexOf(v) === i),
        dietary: pick(DIETARY),
        time_pattern: { preferred_days: persona === "metro-pro" ? [5, 6] : [4, 5, 6, 0], preferred_start_hour: persona === "metro-pro" ? int(19, 21) : int(20, 23) },
        travel_tolerance_km: persona === "metro-pro" ? int(4, 8) : int(6, 15),
        last_built_at: NOW.toISOString(),
        source: "synthetic",
      });
      members.push(id);
    }
    for (const a of members) for (const b of members) if (a !== b) edges.push({ user_id: a, friend_id: b, source: rand() < 0.7 ? "contacts" : "co-attendance", status: "active" });
  }
}
// a few cross-crew bridges within a city (realistic graph, enables invite spillover story)
for (const city of CITIES) {
  const ids = users.filter((u) => u.city === city).map((u) => u.id);
  for (let i = 0; i < 4; i++) { const [a, b] = pickN(ids, 2); if (!edges.some((e) => e.user_id === a && e.friend_id === b)) { edges.push({ user_id: a, friend_id: b, source: "contacts", status: "active" }); edges.push({ user_id: b, friend_id: a, source: "contacts", status: "active" }); } }
}

// ---------- inventory ----------
const dining: DiningVenue[] = [];
const events: LiveEvent[] = [];
const movies: MovieShowtime[] = [];
let nameIdx = 0;

for (const city of CITIES) {
  const cityAreas = areasIn(city);
  for (let i = 0; i < 14; i++) {
    const area = pick(cityAreas); const { lat, lng } = jitter(area);
    const band = pick(BANDS); const [lo, hi] = BAND_COST[band];
    const id = uuid();
    const cuisines = pickN(CUISINES, int(1, 3));
    const dietaryOk: Dietary[] = ["none", ...(rand() < 0.8 ? ["veg" as Dietary] : []), ...(rand() < 0.35 ? ["jain" as Dietary] : []), ...(rand() < 0.5 ? ["halal" as Dietary] : []), ...(rand() < 0.6 ? ["no-beef" as Dietary] : []), ...(rand() < 0.3 ? ["vegan" as Dietary] : [])];
    const slots: DiningSlot[] = [];
    for (let d = 0; d < 14; d++) for (const h of [19, 20, 21, 22]) { if (rand() < 0.15) continue; const cap = rand() < 0.08 ? 0 : int(2, 12); slots.push({ id: uuid(), venue_id: id, starts_at: day(d, h, pick([0, 30])), capacity_left: cap, status: cap === 0 ? "sold_out" : "available" }); }
    dining.push({ id, kind: "dining", city, area: area.name, lat, lng, name: `${DINING_NAMES[nameIdx++ % DINING_NAMES.length]}${nameIdx > DINING_NAMES.length ? ` ${area.name}` : ""}`, cuisines, price_band: band, avg_cost_per_head: Math.round(between(lo, hi) / 50) * 50, dietary_ok: dietaryOk, rating: +between(3.6, 4.8).toFixed(1), vibe_tags: pickN(VIBES, 2), slots });
  }
  // events: ~24 per city across the next 14 days
  for (let i = 0; i < 24; i++) {
    const area = pick(cityAreas); const { lat, lng } = jitter(area);
    const cat = pick(["comedy", "comedy", "live-music", "live-music", "theatre", "nightlife", "activity", "activity", "sports"] as const);
    const title = cat === "comedy" ? `${pick(COMEDIANS)} Live` : cat === "live-music" ? `${pick(BANDS_ARTISTS)} — ${city} show` : cat === "theatre" ? pick(PLAYS) : cat === "nightlife" ? `${pick(["Techno Tuesday", "Bollywood Night", "Hip-hop Sundays", "Disco Deewane"])} at ${pick(["Kitty Ko", "Koko", "Sunburn Union", "Privee", "Bonobo"])}` : cat === "activity" ? pick(ACTIVITIES) : `${pick(["RCB", "MI", "DC"])} fan screening`;
    const tags = cat === "comedy" ? ["comedy"] : cat === "live-music" ? ["live-music", pick(["indie", "hip-hop", "techno"])] : cat === "theatre" ? ["theatre", "drama"] : cat === "nightlife" ? ["techno", "bollywood"] : cat === "activity" ? ["activity"] : ["sports"];
    const left = rand() < 0.1 ? 0 : int(6, 120);
    events.push({ id: uuid(), kind: "event", city, area: area.name, lat, lng, title, category: cat, genre_tags: tags, starts_at: day(int(0, 13), cat === "nightlife" ? int(21, 23) : int(17, 21), pick([0, 30])), duration_min: cat === "nightlife" ? 240 : cat === "activity" ? 90 : int(75, 150), price_per_ticket: Math.round(between(cat === "activity" ? 400 : 499, cat === "live-music" ? 3500 : 1800) / 50) * 50, tickets_left: left, status: left === 0 ? "sold_out" : "available", vibe_tags: cat === "nightlife" ? ["loud", "big-group"] : cat === "theatre" ? ["chill", "date-ish"] : pickN(VIBES, 2) });
  }
  // movies: each title, a couple of showtimes at a couple of cinemas
  for (const [title, tags, lang, dur] of MOVIES) {
    for (let k = 0; k < 2; k++) {
      const area = pick(cityAreas); const { lat, lng } = jitter(area);
      const left = rand() < 0.08 ? 0 : int(4, 90);
      movies.push({ id: uuid(), kind: "movie", city, area: area.name, lat, lng, title, genre_tags: tags, language: lang, cinema: `${pick(CINEMAS)} ${area.name}`, starts_at: day(int(0, 13), pick([16, 18, 19, 21, 22]), pick([0, 15, 30, 45])), duration_min: dur, price_per_ticket: pick([250, 300, 350, 450, 600]), seats_left: left, status: left === 0 ? "sold_out" : "available" });
    }
  }
}

// ---------- write ----------
const bundle: FixtureBundle = {
  generated_at: new Date().toISOString(),
  anchor_date: NOW.toISOString().slice(0, 10), // the "today" all inventory dates are relative to; the store re-bases to real today
  seed: SEED,
  note: "SYNTHETIC. All people, phones, venues, events and prices are invented for the District Plans prototype. Production reads District/Zomato stores (PRD §6.4).",
  areas: AREAS, users, taste_profiles: tastes, social_edges: edges, dining, events, movies,
};
const out = join(process.cwd(), "fixtures", "out");
mkdirSync(out, { recursive: true });
for (const [k, v] of Object.entries(bundle)) if (Array.isArray(v)) writeFileSync(join(out, `${k}.json`), JSON.stringify(v, null, 2));
writeFileSync(join(out, "bundle.json"), JSON.stringify(bundle));
writeFileSync(join(out, "README.md"), `# Fixtures (SYNTHETIC)\n\nGenerated ${bundle.generated_at} with seed ${SEED} by \`scripts/fixtures/generate.ts\`.\n\n| file | rows |\n|---|--:|\n${Object.entries(bundle).filter(([, v]) => Array.isArray(v)).map(([k, v]) => `| ${k}.json | ${(v as unknown[]).length} |`).join("\n")}\n\nEverything here is invented. Do not treat as District data.\n`);

const slotCount = dining.reduce((n, d) => n + d.slots.length, 0);
console.log(`seed=${SEED} users=${users.length} taste=${tastes.length} edges=${edges.length} dining=${dining.length} (slots=${slotCount}) events=${events.length} movies=${movies.length}`);
console.log(`wrote ${out}`);
