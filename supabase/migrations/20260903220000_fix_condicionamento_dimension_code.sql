-- "Condicionamento específico" está codificado como "MUAY_CONDICIONAMENTO", que não contém
-- "_FISICO"/"FISICO_" — a lógica de fallback em dimensionCodeToGeneralDimension() (lib/performance-utils.ts)
-- por isso agrupa-o no pilar "Técnico" em vez de "Físico" (radar geral e âncoras de nota).
UPDATE public."GeneralDimension"
SET code = 'MUAY_FISICO_CONDICIONAMENTO'
WHERE code = 'MUAY_CONDICIONAMENTO';
