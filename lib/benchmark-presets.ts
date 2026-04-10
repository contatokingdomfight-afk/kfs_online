export const BENCHMARK_PRESETS = [
  { key: "PUSHUPS_1MIN", labelPt: "Flexões (1 min)", labelEn: "Push-ups (1 min)", unit: "reps" },
  { key: "PLANK_SEC", labelPt: "Prancha", labelEn: "Plank", unit: "s" },
  { key: "RUN_1KM_SEC", labelPt: "Corrida 1 km", labelEn: "1 km run", unit: "s" },
  { key: "VERT_JUMP_CM", labelPt: "Salto vertical", labelEn: "Vertical jump", unit: "cm" },
] as const;

export type BenchmarkKey = (typeof BENCHMARK_PRESETS)[number]["key"];
