import { effectiveReviewStatus } from '../utils/listingKyl';

/**
 * Land verification document catalog (KYL — Know Your Land).
 *
 * One listing holds at most one submission per category (`documentKey`), keyed by
 * `(listingId, documentKey)`. Each category lists several accepted *type* labels;
 * the landowner uploads a single file and declares which type it is.
 *
 * Required categories must be satisfied before the listing can leave `draft`.
 * Optional categories improve completeness but do not block submission.
 */

/** Logical group for UI / reporting (ordering follows `DOCUMENT_GROUPS`). */
export type DocumentCatalogGroup =
  | 'ownership_chain'
  | 'records_survey'
  | 'encumbrance_tax'
  | 'use_conversion'
  | 'access_utility'
  | 'mutation_legal'
  | 'environment_layout'
  | 'litigation_rera'
  | 'history_government'
  | 'closure_certification';

/** Human-readable group titles (stable `group` id → label). */
export const DOCUMENT_GROUP_LABELS: Record<DocumentCatalogGroup, string> = {
  ownership_chain: 'Ownership & title chain',
  records_survey: 'Records & survey',
  encumbrance_tax: 'Encumbrance & tax',
  use_conversion: 'Zoning, use & conversion',
  access_utility: 'Access & utilities',
  mutation_legal: 'Mutation & legal diligence',
  environment_layout: 'Environment & layout',
  litigation_rera: 'Litigation & RERA',
  history_government: 'History & government process',
  closure_certification: 'Approvals & deal readiness',
};

export type LandDocumentCatalogRow = {
  /** Stable API / DB key; never change once in production (existing listings reference it). */
  documentKey: string;
  /** Short label shown in UI. */
  category: string;
  /** What this category establishes for verification. */
  description: string;
  group: DocumentCatalogGroup;
  /** Sort order within the full catalog (ascending). */
  sortOrder: number;
  /** Accepted document type labels; the owner picks exactly one per upload. */
  allowedTypes: readonly string[];
  /** If true, not required for listing submission. */
  optional: boolean;
};

/**
 * Single source of truth for all land-listing document categories.
 * Exactly one upload per `documentKey` per listing (replace = upsert).
 */
export const LAND_DOCUMENT_CATALOG: readonly LandDocumentCatalogRow[] = [
  {
    documentKey: 'ownership-title',
    category: 'Ownership & Title',
    description: 'Establishes current ownership and root of title.',
    group: 'ownership_chain',
    sortOrder: 10,
    allowedTypes: ['Sale Deed', 'Gift Deed', 'Partition Deed'],
    optional: false,
  },
  {
    documentKey: 'title-continuity',
    category: 'Title Continuity',
    description: 'Demonstrates an unbroken chain of transfers where applicable.',
    group: 'ownership_chain',
    sortOrder: 20,
    allowedTypes: ['30-Year Chain of Title Documents'],
    optional: false,
  },
  {
    documentKey: 'land-records',
    category: 'Land Records',
    description: 'Official revenue / survey extracts for the parcel.',
    group: 'records_survey',
    sortOrder: 30,
    allowedTypes: ['RTC', '7-12 Extract', 'Patta'],
    optional: false,
  },
  {
    documentKey: 'survey-demarcation',
    category: 'Survey & Demarcation',
    description: 'Maps and sketches showing boundaries and survey identity.',
    group: 'records_survey',
    sortOrder: 40,
    allowedTypes: ['Survey Number Map', 'Sub-division Sketch'],
    optional: false,
  },
  {
    documentKey: 'encumbrance',
    category: 'Encumbrance',
    description: 'Encumbrance certificate to show charges, mortgages, or claims.',
    group: 'encumbrance_tax',
    sortOrder: 50,
    allowedTypes: ['Encumbrance Certificate (EC)'],
    optional: false,
  },
  {
    documentKey: 'tax-compliance',
    category: 'Tax Compliance',
    description: 'Evidence that property tax obligations are addressed.',
    group: 'encumbrance_tax',
    sortOrder: 60,
    allowedTypes: ['Property Tax Receipts'],
    optional: false,
  },
  {
    documentKey: 'zoning-land-use',
    category: 'Zoning & Land Use',
    description: 'Permitted use under planning / master plan.',
    group: 'use_conversion',
    sortOrder: 70,
    allowedTypes: ['Master Plan Extract', 'Land Use Certificate'],
    optional: false,
  },
  {
    documentKey: 'land-conversion',
    category: 'Land Conversion',
    description: 'Agricultural to non-agricultural conversion, if applicable.',
    group: 'use_conversion',
    sortOrder: 80,
    allowedTypes: ['NA Conversion Certificate (Agri → Non-Agri)'],
    optional: false,
  },
  {
    documentKey: 'local-body-clearance',
    category: 'Local Body Clearance',
    description: 'NOC or clearance from local authority where required.',
    group: 'use_conversion',
    sortOrder: 90,
    allowedTypes: ['Panchayat NOC', 'Municipality NOC'],
    optional: false,
  },
  {
    documentKey: 'access-rights',
    category: 'Access Rights',
    description: 'Legal access to public road or documented easement.',
    group: 'access_utility',
    sortOrder: 100,
    allowedTypes: ['Road Access Proof', 'Right of Way Documents'],
    optional: false,
  },
  {
    documentKey: 'utility-access',
    category: 'Utility Access',
    description: 'Availability or connection of basic utilities if claimed.',
    group: 'access_utility',
    sortOrder: 110,
    allowedTypes: ['Electricity Availability Proof', 'Water Availability Proof'],
    optional: false,
  },
  {
    documentKey: 'mutation-records',
    category: 'Mutation Records',
    description: 'Revenue records updated to reflect current ownership.',
    group: 'mutation_legal',
    sortOrder: 120,
    allowedTypes: ['Mutation Certificate'],
    optional: false,
  },
  {
    documentKey: 'legal-due-diligence',
    category: 'Legal Due Diligence',
    description: 'Professional legal review of title and risks.',
    group: 'mutation_legal',
    sortOrder: 130,
    allowedTypes: ['Advocate Due Diligence Report'],
    optional: false,
  },
  {
    documentKey: 'environmental-clearance',
    category: 'Environmental Clearance',
    description: 'Environmental approvals where the parcel or use requires them.',
    group: 'environment_layout',
    sortOrder: 140,
    allowedTypes: ['Environmental NOC'],
    optional: true,
  },
  {
    documentKey: 'layout-approval',
    category: 'Layout Approval',
    description: 'Approved layout when selling as plotted / developed land.',
    group: 'environment_layout',
    sortOrder: 150,
    allowedTypes: ['Approved Layout Plan'],
    optional: true,
  },
  {
    documentKey: 'litigation-check',
    category: 'Litigation Check',
    description: 'Status of court cases or disputes affecting the parcel.',
    group: 'litigation_rera',
    sortOrder: 160,
    allowedTypes: ['Court Case Status Report'],
    optional: false,
  },
  {
    documentKey: 'rera',
    category: 'RERA',
    description: 'RERA registration or exemption reference for applicable projects.',
    group: 'litigation_rera',
    sortOrder: 170,
    allowedTypes: ['RERA Registration Reference'],
    optional: true,
  },
  {
    documentKey: 'historical-records',
    category: 'Historical Records',
    description: 'Prior use, old maps, or supplementary historical evidence.',
    group: 'history_government',
    sortOrder: 180,
    allowedTypes: ['Prior Land Use Certificates', 'Old Maps'],
    optional: false,
  },
  {
    documentKey: 'govt-application-proofs',
    category: 'Govt Application Proofs',
    description: 'Acknowledgements for applications submitted to authorities.',
    group: 'history_government',
    sortOrder: 190,
    allowedTypes: ['Acknowledgement Receipts'],
    optional: false,
  },
  {
    documentKey: 'objection-responses',
    category: 'Objection Responses',
    description: 'Responses to objections raised during approval processes.',
    group: 'history_government',
    sortOrder: 200,
    allowedTypes: ['Clarification Letters'],
    optional: false,
  },
  {
    documentKey: 'final-approval-letters',
    category: 'Final Approval Letters',
    description: 'Final sanctions or clearances from competent authorities.',
    group: 'closure_certification',
    sortOrder: 210,
    allowedTypes: ['Sanction Letters', 'Clearance Letters'],
    optional: false,
  },
  {
    documentKey: 'deal-ready-certification',
    category: 'Deal-Ready Certification',
    description: 'Platform-issued readiness or verification certificate.',
    group: 'closure_certification',
    sortOrder: 220,
    allowedTypes: ['Platform Issued Readiness Certificate'],
    optional: false,
  },
] as const;

/** Legacy export shape — prefer `LAND_DOCUMENT_CATALOG`. */
export const documents = {
  documents: LAND_DOCUMENT_CATALOG.map((row) => ({
    category: row.category,
    types: [...row.allowedTypes],
    optional: row.optional,
  })),
};

/**
 * API / persistence view of one catalog row (includes resolved group label).
 * One row per category; landowner submits one file per category for KYL scoring.
 */
export interface CatalogDocumentEntry {
  documentKey: string;
  category: string;
  description: string;
  group: DocumentCatalogGroup;
  groupLabel: string;
  sortOrder: number;
  allowedTypes: string[];
  optional: boolean;
}

let catalogCache: CatalogDocumentEntry[] | null = null;
let catalogKeySet: Set<string> | null = null;
let requiredKeySet: Set<string> | null = null;

const rowToEntry = (row: LandDocumentCatalogRow): CatalogDocumentEntry => ({
  documentKey: row.documentKey,
  category: row.category,
  description: row.description,
  group: row.group,
  groupLabel: DOCUMENT_GROUP_LABELS[row.group],
  sortOrder: row.sortOrder,
  allowedTypes: [...row.allowedTypes],
  optional: row.optional,
});

export const getDocumentCatalog = (): CatalogDocumentEntry[] => {
  if (catalogCache) {
    return catalogCache;
  }
  catalogCache = [...LAND_DOCUMENT_CATALOG]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(rowToEntry);
  return catalogCache;
};

export const getCatalogDocumentKeys = (): Set<string> => {
  if (catalogKeySet) {
    return catalogKeySet;
  }
  catalogKeySet = new Set(getDocumentCatalog().map((d) => d.documentKey));
  return catalogKeySet;
};

/** Keys for categories that must be uploaded before listing submission. */
export const getRequiredDocumentKeys = (): Set<string> => {
  if (requiredKeySet) {
    return requiredKeySet;
  }
  requiredKeySet = new Set(
    getDocumentCatalog()
      .filter((e) => !e.optional)
      .map((e) => e.documentKey),
  );
  return requiredKeySet;
};

export const getCatalogEntryByKey = (documentKey: string): CatalogDocumentEntry | undefined =>
  getDocumentCatalog().find((d) => d.documentKey === documentKey);

export const isValidDocumentKey = (documentKey: string): boolean =>
  getCatalogDocumentKeys().has(documentKey);

export const isValidTypeForKey = (documentKey: string, typeLabel: string): boolean => {
  const entry = getCatalogEntryByKey(documentKey);
  return entry ? entry.allowedTypes.includes(typeLabel) : false;
};

/** Documents with admin scores that count toward KYL (required categories only). */
export interface ListingKYLMetrics {
  /** Average of admin scores on required categories only; null if none scored yet. */
  kylScore: number | null;
  /** How many required categories have a non-null admin score. */
  scoredRequiredCount: number;
  /** Total required categories in catalog. */
  requiredCategoryCount: number;
}

/**
 * KYL score: average of `adminScore` over **required** categories that are **approved** only.
 * Rejected or pending documents do not count until approved.
 */
export const computeListingKYLMetrics = (
  docs: Array<{
    documentKey: string;
    adminScore?: number | null;
    reviewStatus?: string | null;
  }>,
): ListingKYLMetrics => {
  const requiredKeys = getRequiredDocumentKeys();
  const requiredCategoryCount = requiredKeys.size;
  const scored = docs.filter((d) => {
    if (!requiredKeys.has(d.documentKey)) return false;
    if (effectiveReviewStatus(d) !== 'approved') return false;
    return d.adminScore != null && !Number.isNaN(d.adminScore as number);
  });
  if (scored.length === 0) {
    return { kylScore: null, scoredRequiredCount: 0, requiredCategoryCount };
  }
  const sum = scored.reduce((acc, d) => acc + (d.adminScore as number), 0);
  return {
    kylScore: Math.round((sum / scored.length) * 10) / 10,
    scoredRequiredCount: scored.length,
    requiredCategoryCount,
  };
};

/**
 * True when every required category is **approved** with a numeric score.
 */
export const allRequiredCategoriesScored = (
  docs: Array<{
    documentKey: string;
    adminScore?: number | null;
    reviewStatus?: string | null;
  }>,
): boolean => {
  const requiredKeys = [...getRequiredDocumentKeys()];
  const byKey = new Map(docs.map((d) => [d.documentKey, d]));
  return requiredKeys.every((k) => {
    const d = byKey.get(k);
    if (!d) return false;
    return (
      effectiveReviewStatus(d) === 'approved' &&
      d.adminScore != null &&
      !Number.isNaN(d.adminScore as number)
    );
  });
};
