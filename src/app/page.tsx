import { tokens } from "@/lib/theme/tokens";

// Phase 0 smoke page: proves the theme tokens render. Replaced by real screens in Phase 2.
export default function Home() {
  const swatches: [string, string][] = [
    ["Brand", tokens.dark.brand],
    ["Button", tokens.dark.brandButton],
    ["Pink", tokens.palette.districtPink],
    ["Movie", tokens.dark.verticalMovie],
    ["Event", tokens.dark.verticalEvent],
    ["Dining", tokens.dark.verticalDining],
    ["Success", tokens.dark.textSuccess],
    ["Error", tokens.dark.textError],
  ];
  return (
    <main className="phone-shell px-4 py-8 flex flex-col gap-6">
      <div>
        <p className="t-button3 uppercase tracking-wider text-brand">District Plans · Phase 0</p>
        <h1 className="font-serif text-[40px] leading-[44px] mt-2">
          The plan, <span className="italic text-fg-2">not just the ticket.</span>
        </h1>
        <p className="t-body2 text-fg-2 mt-3">
          Theme tokens loaded from <code className="text-offer">src/lib/theme/tokens.ts</code>. Brand values
          verified against district.in production CSS; type stand-in for Passenger Serif is provisional.
        </p>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {swatches.map(([name, hex]) => (
          <div key={name} className="flex flex-col gap-1.5">
            <div className="aspect-square rounded-lg border border-line" style={{ background: hex }} />
            <span className="t-caption text-fg-3">{name}</span>
          </div>
        ))}
      </div>
      <div className="rounded-xl bg-surface border border-line p-4 flex flex-col gap-3">
        <p className="t-title1">Saturday night, Indiranagar</p>
        <p className="t-body2 text-fg-2">Comedy at 8, ramen after. ₹1,400 a head. All within 3 km.</p>
        <div className="flex gap-2">
          <span className="t-button3 rounded-full px-2.5 py-1 bg-surface-2 text-v-event">Comedy</span>
          <span className="t-button3 rounded-full px-2.5 py-1 bg-surface-2 text-v-dining">Asian</span>
        </div>
        <button className="t-button1 mt-1 h-12 rounded-lg bg-brand-btn text-fg active:scale-[0.98] transition-transform">
          I&apos;m in
        </button>
        <button className="t-button2 h-11 rounded-lg bg-surface-sel text-fg-2">None of these — browse instead</button>
      </div>
    </main>
  );
}
