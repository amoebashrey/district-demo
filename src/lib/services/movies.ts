/**
 * Movie flow content layer. The fixtures give us showtimes; District's movie surfaces need richer
 * metadata (certificate, runtime, synopsis, cast, critics, hype) and several cinemas × times per title.
 * `enrichMovies()` renames fixture titles to real-ish ones, then fills sibling showtimes into the
 * SAME inventory map, so checkout/anchored plans keep booking real inventory refs.
 */
import { store, newId } from "../store/store.ts";
import type { City, MovieShowtime } from "../store/types.ts";

export interface MovieMeta {
  title: string; cert: "A" | "UA" | "U"; langs: string[]; runtime_min: number; released: string; tagline: string;
  synopsis: string; genres: [string, string][]; cast: string[]; critics: [string, number][]; hype: string;
  poster: string; // CSS gradient stand-in for key art
}

const RENAME: Record<string, string> = {
  "Dhurandhar 2": "Mirzapur: The Movie", "Love Hostel": "Daayra", "Kantara: Chapter 2": "Kantara: Chapter 1", "Wake Up Dead Man": "Jolly LLB 3",
  "Meri Patni Ka Remake": "Sunny Sanskari Ki Tulsi Kumari", "Tumbbad Returns": "Ek Din", "The Pale Season": "The Conjuring: Last Rites",
};
const CINEMAS = ["PVR INOX", "City Pride Multiplex", "MovieMax", "Cinepolis"];
const ADDR: Record<string, string[]> = {
  Bengaluru: ["Orion Mall, Rajajinagar", "Forum Mall, Koramangala", "Phoenix Marketcity, Whitefield", "Garuda Mall, MG Road", "Nexus Mall, Koramangala"],
  Mumbai: ["Phoenix Palladium, Lower Parel", "Infiniti Mall, Andheri", "R City, Ghatkopar", "Jio World Drive, BKC"],
  "Delhi NCR": ["Select Citywalk, Saket", "Ambience Mall, Gurugram", "DLF Promenade, Vasant Kunj", "Pacific Mall, Tagore Garden"],
};
const TIMES: [number, number, number][] = [[11, 30, 180], [14, 15, 200], [17, 0, 230], [20, 15, 250], [23, 0, 250]];

export const MOVIE_META: Record<string, Omit<MovieMeta, "title">> = {
  "Mirzapur: The Movie": { cert: "A", langs: ["Hindi", "Tamil"], runtime_min: 197, released: "4th September", tagline: "Now in theatres", synopsis: "The world of Mirzapur comes to the big screen as old rivalries, shifting loyalties, and the relentless pursuit of power ignite a new war for the throne of Purvanchal. Guddu, Golu and Kaleen Bhaiya collide one final time.", genres: [["💥", "Action"], ["🔎", "Crime"], ["😱", "Thriller"]], cast: ["Ali Fazal", "Pankaj Tripathi", "Shweta Tripathi", "Rasika Dugal", "Vijay Varma"], critics: [["Bollywood Hungama", 4.0], ["India Today", 3.0], ["News18", 3.0], ["Taran Adarsh", 4.0]], hype: "113k+", poster: "linear-gradient(160deg,#5a3a14 0%,#2a1a0a 45%,#0a0b0d 100%)" },
  "Daayra": { cert: "A", langs: ["Hindi"], runtime_min: 143, released: "12th September", tagline: "Now showing", synopsis: "A veteran cop and a rookie lawyer are pulled into a case where the line between justice and vengeance blurs. Meghna Gulzar's taut drama asks who gets to draw the circle.", genres: [["⚖️", "Drama"], ["🔎", "Crime"], ["😱", "Thriller"]], cast: ["Kareena Kapoor Khan", "Prithviraj Sukumaran", "Saurabh Sachdeva"], critics: [["Film Companion", 4.0], ["Hindustan Times", 3.5], ["India Today", 3.5]], hype: "48k+", poster: "linear-gradient(160deg,#4a3a1e 0%,#1c1a12 50%,#0a0b0d 100%)" },
  "Kantara: Chapter 1": { cert: "UA", langs: ["Kannada", "Hindi", "Telugu"], runtime_min: 168, released: "2nd October", tagline: "Advance booking open", synopsis: "Before the legend, there was the forest. Rishab Shetty returns to the Kadamba era to trace the divine origins of the Panjurli and the fire that bound a people to their land.", genres: [["🔥", "Action"], ["🌿", "Folklore"], ["🎭", "Drama"]], cast: ["Rishab Shetty", "Rukmini Vasanth", "Jayaram", "Gulshan Devaiah"], critics: [["Times of India", 4.5], ["Bollywood Hungama", 4.0], ["Deccan Herald", 4.0]], hype: "260k+", poster: "linear-gradient(160deg,#7a2a12 0%,#3a1608 45%,#0a0b0d 100%)" },
  "Jolly LLB 3": { cert: "UA", langs: ["Hindi"], runtime_min: 157, released: "19th September", tagline: "Now showing", synopsis: "Two Jollys, one courtroom. Jagdishwar Mishra and Jagdish Tyagi face off in a land-grab case that turns the Kanpur court upside down — with Judge Tripathi refereeing.", genres: [["😂", "Comedy"], ["⚖️", "Drama"]], cast: ["Akshay Kumar", "Arshad Warsi", "Saurabh Shukla", "Huma Qureshi"], critics: [["Bollywood Hungama", 3.5], ["NDTV", 3.0], ["Taran Adarsh", 4.0]], hype: "72k+", poster: "linear-gradient(160deg,#2a2f6a 0%,#151833 50%,#0a0b0d 100%)" },
  "Avengers: Doomsday": { cert: "UA", langs: ["English", "Hindi"], runtime_min: 155, released: "1st May", tagline: "Now showing", synopsis: "The multiverse fractures as Doom rises. Old Avengers and new must decide what they will sacrifice to keep one timeline alive.", genres: [["🦸", "Superhero"], ["💥", "Action"], ["🚀", "Sci-Fi"]], cast: ["Robert Downey Jr.", "Chris Hemsworth", "Anthony Mackie", "Florence Pugh"], critics: [["IGN", 4.0], ["Empire", 4.0], ["Variety", 3.5]], hype: "540k+", poster: "linear-gradient(160deg,#5a1020 0%,#20101a 50%,#0a0b0d 100%)" },
  "Toy Story 5": { cert: "U", langs: ["English", "Hindi"], runtime_min: 105, released: "19th June", tagline: "Now showing", synopsis: "Woody and Buzz meet their strangest rival yet: a tablet. Bonnie's toys stage a comeback for playtime itself.", genres: [["🧸", "Animation"], ["👨‍👩‍👧", "Family"], ["😂", "Comedy"]], cast: ["Tom Hanks", "Tim Allen", "Joan Cusack"], critics: [["Rotten Tomatoes", 4.5], ["Empire", 4.0]], hype: "90k+", poster: "linear-gradient(160deg,#1a5aa8 0%,#10305a 50%,#0a0b0d 100%)" },
  "Coolie 2": { cert: "UA", langs: ["Tamil", "Hindi", "Telugu"], runtime_min: 160, released: "14th August", tagline: "Now showing", synopsis: "Deva is back at the port, and this time the gold isn't the only thing being smuggled. Lokesh Kanagaraj's sequel goes bigger and louder.", genres: [["💥", "Action"], ["🔎", "Crime"]], cast: ["Rajinikanth", "Nagarjuna", "Upendra", "Shruti Haasan"], critics: [["Times of India", 3.5], ["Film Companion", 3.0]], hype: "310k+", poster: "linear-gradient(160deg,#6a4a12 0%,#2a2010 50%,#0a0b0d 100%)" },
  "Ek Din": { cert: "UA", langs: ["Hindi"], runtime_min: 125, released: "26th September", tagline: "Now showing", synopsis: "One day in Mumbai. Six strangers. A single lost bag that changes every one of them.", genres: [["🎭", "Drama"], ["❤️", "Romance"]], cast: ["Vikrant Massey", "Sanya Malhotra", "Jaideep Ahlawat"], critics: [["Film Companion", 4.0], ["Scroll", 3.5]], hype: "21k+", poster: "linear-gradient(160deg,#3a3a3a 0%,#1a1a1a 50%,#0a0b0d 100%)" },
  "The Conjuring: Last Rites": { cert: "A", langs: ["English", "Hindi"], runtime_min: 135, released: "5th September", tagline: "Now showing", synopsis: "The Warrens take their final case. The Smurl haunting pushes Ed and Lorraine further than any before it.", genres: [["👻", "Horror"], ["😱", "Thriller"]], cast: ["Vera Farmiga", "Patrick Wilson", "Mia Tomlinson"], critics: [["IGN", 3.5], ["Empire", 3.0]], hype: "150k+", poster: "linear-gradient(160deg,#1a2a1a 0%,#0e160e 50%,#0a0b0d 100%)" },
  "Sunny Sanskari Ki Tulsi Kumari": { cert: "UA", langs: ["Hindi"], runtime_min: 140, released: "2nd October", tagline: "Advance booking open", synopsis: "Two exes crash the same destination wedding with fake partners. Chaos, choreography and one very long baraat.", genres: [["❤️", "Romance"], ["😂", "Comedy"]], cast: ["Varun Dhawan", "Janhvi Kapoor", "Rohit Saraf", "Sanya Malhotra"], critics: [["Bollywood Hungama", 3.0], ["Pinkvilla", 3.5]], hype: "64k+", poster: "linear-gradient(160deg,#8a1a5a 0%,#3a1030 50%,#0a0b0d 100%)" },
};
const FALLBACK: Omit<MovieMeta, "title"> = { cert: "UA", langs: ["Hindi"], runtime_min: 140, released: "this month", tagline: "Now showing", synopsis: "A big-screen night out.", genres: [["🎬", "Drama"]], cast: ["Ensemble cast"], critics: [["Times of India", 3.5]], hype: "12k+", poster: "linear-gradient(160deg,#2a2a3a,#0a0b0d)" };

const hash = (s: string) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16).padStart(8, "0"); };
const startOfDayIST = (offsetDays: number) => { const d = new Date(Date.now() + 5.5 * 3_600_000); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() + offsetDays); return d; };
const atIST = (day: Date, h: number, m: number) => new Date(day.getTime() + (h - 5.5) * 3_600_000 + m * 60_000).toISOString();

/** Idempotent: rename fixture titles and fill 3 cinemas × 3 days × 5 shows per title per city. */
export function enrichMovies() {
  store.flags ??= {}; // store may predate this field under dev HMR
  if (store.flags.movies_enriched) return;
  for (const m of store.inventory.movies.values()) { if (RENAME[m.title]) m.title = RENAME[m.title]; }
  const byCityTitle = new Map<string, MovieShowtime>();
  for (const m of store.inventory.movies.values()) { const k = `${m.city}|${m.title}`; if (!byCityTitle.has(k)) byCityTitle.set(k, m); }
  for (const [k, base] of byCityTitle) {
    const [city, title] = k.split("|"); const meta = MOVIE_META[title] ?? FALLBACK;
    const addrs = ADDR[city] ?? ADDR.Bengaluru;
    CINEMAS.slice(0, 3).forEach((brand, ci) => {
      const cinema = `${brand}, ${addrs[(hash(title).charCodeAt(ci) + ci) % addrs.length]}`;
      for (let d = 0; d < 3; d++) {
        const day = startOfDayIST(d);
        TIMES.forEach(([h, mi, price], ti) => {
          const id = `mv-${hash(`${k}|${brand}|${d}|${ti}`)}-${hash(brand).slice(0, 4)}`;
          if (store.inventory.movies.has(id)) return;
          const starts = atIST(day, h, mi);
          if (new Date(starts).getTime() < Date.now()) return;
          const seed = parseInt(hash(id).slice(0, 4), 16);
          store.inventory.movies.set(id, { id, kind: "movie", city: city as City, area: cinema.split(", ")[1]?.split(", ")[0] ?? base.area, lat: base.lat, lng: base.lng, title, genre_tags: meta.genres.map((g) => g[1].toLowerCase()), language: meta.langs[0], cinema, starts_at: starts, duration_min: meta.runtime_min, price_per_ticket: price + (ci === 1 ? 20 : 0), seats_left: seed % 9 === 0 ? 0 : 8 + (seed % 60), status: seed % 9 === 0 ? "sold_out" : "available" });
        });
      }
    });
  }
  store.flags.movies_enriched = true;
}

export function movieMeta(title: string): MovieMeta { return { title, ...(MOVIE_META[title] ?? FALLBACK) }; }

/** Titles showing in a city (one entry per title), spotlight first. */
export function moviesIn(city: City) {
  enrichMovies();
  const seen = new Map<string, MovieShowtime>();
  for (const m of [...store.inventory.movies.values()].sort((a, b) => a.starts_at.localeCompare(b.starts_at))) if (m.city === city && new Date(m.starts_at).getTime() > Date.now() && !seen.has(m.title)) seen.set(m.title, m);
  const order = Object.keys(MOVIE_META);
  return [...seen.values()].sort((a, b) => (order.indexOf(a.title) === -1 ? 99 : order.indexOf(a.title)) - (order.indexOf(b.title) === -1 ? 99 : order.indexOf(b.title))).map((m) => ({ id: m.id, ...movieMeta(m.title), min_price: Math.min(...[...store.inventory.movies.values()].filter((x) => x.city === city && x.title === m.title).map((x) => x.price_per_ticket)) }));
}

/** Resolve any showtime id → the movie group in that city. */
export function movieByShowtime(id: string) {
  enrichMovies();
  const s = store.inventory.movies.get(id); if (!s) return undefined;
  const shows = [...store.inventory.movies.values()].filter((x) => x.city === s.city && x.title === s.title && new Date(x.starts_at).getTime() > Date.now()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const days = [...new Set(shows.map((x) => istDay(x.starts_at)))].slice(0, 3);
  return { id: s.id, city: s.city, meta: movieMeta(s.title), shows, days, min_price: Math.min(...shows.map((x) => x.price_per_ticket)) };
}
export const istDay = (iso: string) => new Date(new Date(iso).getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10);

/** Cinemas for one day, each with its showtimes. */
export function showtimesByCinema(shows: MovieShowtime[], day: string) {
  const out = new Map<string, MovieShowtime[]>();
  for (const s of shows) if (istDay(s.starts_at) === day) (out.get(s.cinema) ?? out.set(s.cinema, []).get(s.cinema)!).push(s);
  return [...out.entries()].map(([cinema, list]) => ({ cinema, brand: cinema.split(",")[0], address: cinema.split(", ").slice(1).join(", "), rating: (4.1 + (parseInt(hash(cinema).slice(0, 2), 16) % 8) / 10).toFixed(1), km: (1.8 + (parseInt(hash(cinema).slice(2, 4), 16) % 60) / 10).toFixed(1), cancellation: parseInt(hash(cinema).slice(4, 5), 16) % 2 === 0, shows: list.sort((a, b) => a.starts_at.localeCompare(b.starts_at)) }));
}
export const seatLabel = (id: string, qty: number) => { const row = "DEFGH"[parseInt(hash(id).slice(0, 1), 16) % 5]; const start = 4 + (parseInt(hash(id).slice(1, 2), 16) % 8); return Array.from({ length: qty }, (_, i) => `${row}${start + i}`).join(", "); };
export const shortId = newId;
