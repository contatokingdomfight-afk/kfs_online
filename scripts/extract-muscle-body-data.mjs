#!/usr/bin/env node
/**
 * Gera `components/physical-assessment/generated/muscle-body-data.ts` a partir dos ficheiros
 * `assets/body*.ts` do repositório react-native-body-highlighter (licença MIT).
 *
 * Uso: node scripts/extract-muscle-body-data.mjs <pasta-com-bodyFront.ts,bodyBack.ts,bodyFemaleFront.ts,bodyFemaleBack.ts>
 */
import fs from "node:fs";
import path from "node:path";

const srcDir = process.argv[2];
if (!srcDir) {
  console.error("Indica a pasta com os ficheiros body*.ts");
  process.exit(1);
}

const keys = ["bodyFront", "bodyBack", "bodyFemaleFront", "bodyFemaleBack"];
const data = {};
for (const k of keys) {
  const t = fs.readFileSync(path.join(srcDir, `${k}.ts`), "utf8");
  const parts = [];
  const re = /slug:\s*"([^"]+)"[\s\S]*?path:\s*\{([\s\S]*?)\n\s{4}\},/g;
  let m;
  while ((m = re.exec(t))) {
    const paths = [];
    for (const g of m[2].matchAll(/(left|right|common):\s*\[([\s\S]*?)\]/g)) {
      for (const p of g[2].matchAll(/"([^"]{10,})"/g)) paths.push(p[1]);
    }
    parts.push([m[1], paths]);
  }
  data[k] = parts;
}

const out = `/* eslint-disable max-len -- ficheiro gerado */
/**
 * Caminhos SVG da «Visão muscular» do mapa corporal.
 * Gerado por \`scripts/extract-muscle-body-data.mjs\` — não editar à mão.
 *
 * Origem: react-native-body-highlighter (https://github.com/HichamELBSI/react-native-body-highlighter)
 * Copyright (c) 2022 ELABBASSI Hicham — licença MIT (ver THIRD_PARTY_NOTICES.md).
 */
export type MuscleBodyKey = "bodyFront" | "bodyBack" | "bodyFemaleFront" | "bodyFemaleBack";
/** [nome da zona muscular, caminhos SVG] */
export type MuscleBodyPart = readonly [string, readonly string[]];

export const MUSCLE_BODY_DATA: Record<MuscleBodyKey, readonly MuscleBodyPart[]> = ${JSON.stringify(data)};
`;

const dest = path.join("components", "physical-assessment", "generated", "muscle-body-data.ts");
fs.writeFileSync(dest, out);
console.log("->", dest, fs.statSync(dest).size, "bytes");
