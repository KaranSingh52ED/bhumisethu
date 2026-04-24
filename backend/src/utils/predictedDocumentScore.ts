import { getCatalogEntryByKey } from '../data/documents';

type PredictDocumentScoreInput = {
  documentKey: string;
  selectedType: string;
  mimeType: string;
  sizeBytes: number;
};

const clampScore = (score: number): number => Math.max(0, Math.min(100, Math.round(score)));

const stableHash = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 997;
  }
  return hash;
};

export const predictDocumentScore = ({
  documentKey,
  selectedType,
  mimeType,
  sizeBytes,
}: PredictDocumentScoreInput): number => {
  const entry = getCatalogEntryByKey(documentKey);
  const baseScore = entry?.optional ? 72 : 78;
  const fileTypeBonus = mimeType === 'application/pdf' ? 6 : mimeType.startsWith('image/') ? 2 : -4;
  const sizeKb = sizeBytes / 1024;
  const sizeBonus = sizeKb >= 50 && sizeKb <= 10_000 ? 5 : sizeKb < 50 ? -8 : -3;
  const selectedTypeKnown = entry?.allowedTypes.includes(selectedType) ?? false;
  const selectedTypeBonus = selectedTypeKnown ? 4 : -6;
  const variation = (stableHash(`${documentKey}:${selectedType}`) % 9) - 4;

  return clampScore(baseScore + fileTypeBonus + sizeBonus + selectedTypeBonus + variation);
};
