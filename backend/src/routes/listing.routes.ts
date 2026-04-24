import fs from 'fs/promises';
import path from 'path';
import { Router } from 'express';
import mongoose from 'mongoose';
import {
  allRequiredCategoriesScored,
  computeListingKYLMetrics,
  getCatalogEntryByKey,
  getDocumentCatalog,
  getRequiredDocumentKeys,
  isValidDocumentKey,
  isValidTypeForKey,
} from '../data/documents';
import { getUploadsDir } from '../config/multerLandDocs';
import { listingDocumentUpload } from '../config/multerListingDocs';
import {
  requireAuth,
  requireApproved,
  requireRegistrationComplete,
  requireRole,
} from '../middleware/auth';
import { ListingModel } from '../models/listing.model';
import {
  countKylUploads,
  effectiveReviewStatus,
  kylMapToRecord,
  kylRecordToScoreRows,
  type ListingKylItem,
} from '../utils/listingKyl';
import { predictDocumentScore } from '../utils/predictedDocumentScore';

const router = Router();

const landOwnerChain = [
  requireAuth,
  requireRegistrationComplete,
  requireApproved,
  requireRole(['land_owner']),
] as const;

const adminChain = [requireAuth, requireRegistrationComplete, requireRole(['admin'])] as const;

const landCategories = [
  'residential',
  'commercial',
  'industrial',
  'agricultural',
  'mixed',
] as const;

type LandListingLean = {
  _id: mongoose.Types.ObjectId;
  landOwnerGoogleId: string;
  status: string;
  title?: string;
  kylDocuments?: Map<string, ListingKylItem> | Record<string, ListingKylItem>;
};

const paramStr = (value: string | string[] | undefined): string | undefined => {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
};

/** Stable `id` for clients = `documentKey` (single embedded bundle per listing). */
const toListingDocDto = (documentKey: string, item: ListingKylItem) => {
  const entry = getCatalogEntryByKey(documentKey);
  return {
    id: documentKey,
    documentKey,
    category: entry?.category ?? documentKey,
    typeLabel: item.typeLabel,
    optional: entry?.optional ?? false,
    originalFileName: item.originalFileName,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    predictedScore: item.predictedScore ?? null,
    adminScore: item.adminScore ?? null,
    adminNote: item.adminNote ?? '',
    reviewStatus: effectiveReviewStatus(item),
    reviewedAt: item.reviewedAt ?? null,
    createdAt: item.uploadedAt ?? undefined,
    updatedAt: item.reviewedAt ?? item.uploadedAt ?? undefined,
  };
};

/** Next catalog-ordered document for this listing that is still pending review. */
const getNextPendingDocumentKey = (
  kyl: Record<string, ListingKylItem>,
  afterDocumentKey: string | null,
): string | null => {
  const catalog = getDocumentCatalog();
  let start = 0;
  if (afterDocumentKey) {
    const ix = catalog.findIndex((e) => e.documentKey === afterDocumentKey);
    start = ix >= 0 ? ix + 1 : 0;
  }
  for (let i = start; i < catalog.length; i++) {
    const key = catalog[i].documentKey;
    const item = kyl[key];
    if (!item) continue;
    if (effectiveReviewStatus(item) === 'pending') return key;
  }
  return null;
};

const getFirstPendingDocumentKey = (kyl: Record<string, ListingKylItem>): string | null =>
  getNextPendingDocumentKey(kyl, null);

/** Sync listing status from KYL completeness (submitted vs reviewed). */
const syncListingReviewStatus = async (
  listingOid: mongoose.Types.ObjectId,
  kylRaw: LandListingLean['kylDocuments'],
): Promise<void> => {
  const allDocs = kylRecordToScoreRows(kylMapToRecord(kylRaw));
  const nextStatus =
    allDocs.length > 0 && allRequiredCategoriesScored(allDocs) ? 'reviewed' : 'submitted';
  await ListingModel.findByIdAndUpdate(listingOid, { status: nextStatus });
};

/** KYL (Know Your Land) score: average of admin scores on required categories only. */
const kylFromDocs = (
  docs: Array<{ documentKey: string; adminScore?: number | null; reviewStatus?: string | null }>,
) => {
  const m = computeListingKYLMetrics(docs);
  return { cumulativeScore: m.kylScore, scoredCount: m.scoredRequiredCount };
};

const predictedKylFromDocs = (docs: Record<string, ListingKylItem>) => {
  const requiredKeys = getRequiredDocumentKeys();
  const scored: number[] = [];
  for (const [documentKey, item] of Object.entries(docs)) {
    if (!requiredKeys.has(documentKey)) continue;
    if (effectiveReviewStatus(item) === 'rejected') continue;
    const score = item.adminScore ?? item.predictedScore;
    if (score != null && !Number.isNaN(score)) scored.push(score);
  }

  if (scored.length === 0) {
    return { predictedKylScore: null, predictedScoredDocCount: 0 };
  }

  const sum = scored.reduce((acc, score) => acc + score, 0);
  return {
    predictedKylScore: Math.round((sum / scored.length) * 10) / 10,
    predictedScoredDocCount: scored.length,
  };
};

const assertListingOwner = async (
  listingId: string,
  googleId: string,
): Promise<
  { ok: true; listing: LandListingLean } | { ok: false; status: number; message: string }
> => {
  if (!mongoose.Types.ObjectId.isValid(listingId)) {
    return { ok: false, status: 400, message: 'Invalid listing id.' };
  }
  const listing = await ListingModel.findById(listingId).lean();
  if (!listing) {
    return { ok: false, status: 404, message: 'Listing not found.' };
  }
  if (listing.landOwnerGoogleId !== googleId) {
    return { ok: false, status: 403, message: 'You do not own this listing.' };
  }
  return { ok: true, listing: listing as LandListingLean };
};

// ─── Land-owner: create listing ──────────────────────────────────────────────

router.post('/', ...landOwnerChain, async (req, res) => {
  const googleId = req.user!.sub;
  const { title, surveyLabel, location, areaDescription, landCategory, description } =
    req.body ?? {};

  if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 200) {
    return res.status(400).json({ message: 'Title must be between 3 and 200 characters.' });
  }
  if (
    typeof surveyLabel !== 'string' ||
    surveyLabel.trim().length < 1 ||
    surveyLabel.trim().length > 120
  ) {
    return res.status(400).json({ message: 'Survey / plot reference is required.' });
  }
  if (typeof location !== 'string' || location.trim().length < 2 || location.trim().length > 200) {
    return res.status(400).json({ message: 'Location is required.' });
  }
  if (
    typeof areaDescription !== 'string' ||
    areaDescription.trim().length < 1 ||
    areaDescription.trim().length > 80
  ) {
    return res.status(400).json({ message: 'Area description is required (e.g. 4.2 acres).' });
  }
  if (!landCategories.includes(landCategory)) {
    return res.status(400).json({ message: 'Invalid land category.' });
  }
  const desc = typeof description === 'string' ? description.trim().slice(0, 2000) : '';

  const listing = await ListingModel.create({
    landOwnerGoogleId: googleId,
    title: title.trim(),
    surveyLabel: surveyLabel.trim(),
    location: location.trim(),
    areaDescription: areaDescription.trim(),
    landCategory,
    description: desc,
    status: 'draft',
  });

  return res.status(201).json({
    listing: {
      id: String(listing._id),
      title: listing.title,
      surveyLabel: listing.surveyLabel,
      location: listing.location,
      areaDescription: listing.areaDescription,
      landCategory: listing.landCategory,
      description: listing.description,
      status: listing.status,
      createdAt: listing.createdAt,
    },
  });
});

// ─── Land-owner: my listings with scores ─────────────────────────────────────

router.get('/mine', ...landOwnerChain, async (req, res) => {
  const googleId = req.user!.sub;
  const rows = await ListingModel.find({ landOwnerGoogleId: googleId })
    .sort({ createdAt: -1 })
    .lean();

  if (rows.length === 0) {
    return res.json({ listings: [] });
  }

  const scoreByListing = new Map<string, ReturnType<typeof kylFromDocs>>();
  const predictedScoreByListing = new Map<string, ReturnType<typeof predictedKylFromDocs>>();
  for (const row of rows) {
    const id = String(row._id);
    const kyl = kylMapToRecord(
      (row as { kylDocuments?: LandListingLean['kylDocuments'] }).kylDocuments,
    );
    const docs = kylRecordToScoreRows(kyl);
    scoreByListing.set(id, kylFromDocs(docs));
    predictedScoreByListing.set(id, predictedKylFromDocs(kyl));
  }

  return res.json({
    listings: rows.map((l) => {
      const id = String(l._id);
      const score = scoreByListing.get(id);
      const predictedScore = predictedScoreByListing.get(id);
      return {
        id,
        title: l.title,
        surveyLabel: l.surveyLabel,
        location: l.location,
        areaDescription: l.areaDescription,
        landCategory: l.landCategory,
        description: l.description,
        status: l.status,
        cumulativeScore: score?.cumulativeScore ?? null,
        scoredDocCount: score?.scoredCount ?? 0,
        predictedKylScore: predictedScore?.predictedKylScore ?? null,
        predictedScoredDocCount: predictedScore?.predictedScoredDocCount ?? 0,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      };
    }),
  });
});

// ─── Marketplace (public): submitted + reviewed listings (no owner PII) ─────

router.get('/public', async (_req, res) => {
  const rows = await ListingModel.find({ status: { $in: ['submitted', 'reviewed'] } })
    .sort({ updatedAt: -1 })
    .lean();

  const listings = rows.map((row) => {
    const id = String(row._id);
    const docs = kylRecordToScoreRows(
      (row as { kylDocuments?: LandListingLean['kylDocuments'] }).kylDocuments,
    );
    const score = kylFromDocs(docs);
    const l = row as LandListingLean & {
      title?: string;
      surveyLabel?: string;
      location?: string;
      areaDescription?: string;
      landCategory?: string;
      description?: string;
    };
    return {
      id,
      title: l.title,
      surveyLabel: l.surveyLabel,
      location: l.location,
      areaDescription: l.areaDescription,
      landCategory: l.landCategory,
      description: (l.description ?? '').slice(0, 280),
      status: l.status,
      cumulativeScore: score.cumulativeScore,
      scoredDocCount: score.scoredCount,
      updatedAt: row.updatedAt,
    };
  });

  return res.json({ listings });
});

router.get('/public/:listingId', async (req, res) => {
  const listingId = paramStr(req.params.listingId);
  if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
    return res.status(400).json({ message: 'Invalid listing id.' });
  }

  const row = await ListingModel.findById(listingId).lean();
  if (!row || !['submitted', 'reviewed'].includes(row.status)) {
    return res.status(404).json({ message: 'Listing not found.' });
  }

  const l = row as LandListingLean & {
    title?: string;
    surveyLabel?: string;
    location?: string;
    areaDescription?: string;
    landCategory?: string;
    description?: string;
  };

  const docs = kylRecordToScoreRows(row.kylDocuments);
  const metrics = computeListingKYLMetrics(docs);
  const kyl = kylMapToRecord(row.kylDocuments);
  const catalog = getDocumentCatalog();

  const categoryScores = catalog.map((e) => {
    const item = kyl[e.documentKey];
    return {
      documentKey: e.documentKey,
      category: e.category,
      optional: e.optional,
      score: item?.adminScore ?? null,
      reviewStatus: item ? effectiveReviewStatus(item) : null,
    };
  });

  return res.json({
    listing: {
      id: String(row._id),
      title: l.title,
      surveyLabel: l.surveyLabel,
      location: l.location,
      areaDescription: l.areaDescription,
      landCategory: l.landCategory,
      description: l.description ?? '',
      status: l.status,
      cumulativeScore: metrics.kylScore,
      scoredRequiredCount: metrics.scoredRequiredCount,
      requiredCategoryCount: metrics.requiredCategoryCount,
      updatedAt: row.updatedAt,
    },
    categoryScores,
  });
});

// ─── Land-owner: single listing (for review step) ────────────────────────────

router.get('/:listingId', ...landOwnerChain, async (req, res) => {
  const googleId = req.user!.sub;
  const listingId = paramStr(req.params.listingId);
  if (!listingId) {
    return res.status(400).json({ message: 'listingId is required.' });
  }
  if (!mongoose.Types.ObjectId.isValid(listingId)) {
    return res.status(400).json({ message: 'Invalid listing id.' });
  }

  const check = await assertListingOwner(listingId, googleId);
  if (!check.ok) {
    return res.status(check.status).json({ message: check.message });
  }

  const full = await ListingModel.findById(listingId).lean();
  if (!full) {
    return res.status(404).json({ message: 'Listing not found.' });
  }

  return res.json({
    listing: {
      id: String(full._id),
      title: full.title,
      surveyLabel: full.surveyLabel,
      location: full.location,
      areaDescription: full.areaDescription,
      landCategory: full.landCategory,
      description: full.description ?? '',
      status: full.status,
      createdAt: full.createdAt,
      updatedAt: full.updatedAt,
    },
  });
});

// ─── Land-owner: submit listing for admin review (after documents + review) ─

router.post('/:listingId/submit', ...landOwnerChain, async (req, res) => {
  const googleId = req.user!.sub;
  const listingId = paramStr(req.params.listingId);
  if (!listingId) {
    return res.status(400).json({ message: 'listingId is required.' });
  }
  if (!mongoose.Types.ObjectId.isValid(listingId)) {
    return res.status(400).json({ message: 'Invalid listing id.' });
  }

  const check = await assertListingOwner(listingId, googleId);
  if (!check.ok) {
    return res.status(check.status).json({ message: check.message });
  }

  const listing = await ListingModel.findById(listingId).lean();
  if (!listing) {
    return res.status(404).json({ message: 'Listing not found.' });
  }

  if (listing.status !== 'draft') {
    return res.status(400).json({
      message:
        listing.status === 'submitted'
          ? 'This listing has already been submitted for admin review.'
          : 'This listing cannot be submitted in its current state.',
    });
  }

  const kyl = kylMapToRecord((listing as LandListingLean).kylDocuments);
  const requiredKeys = [...getRequiredDocumentKeys()];
  const missing = requiredKeys.filter((k) => !kyl[k]);
  if (missing.length > 0) {
    return res.status(400).json({
      message:
        'Upload all required document categories before submitting. You can go back to step 2 to add missing files.',
      missingRequiredCount: missing.length,
    });
  }

  const updated = await ListingModel.findByIdAndUpdate(
    listingId,
    { status: 'submitted' },
    { new: true },
  ).lean();

  return res.status(200).json({
    listing: {
      id: String(updated!._id),
      title: updated!.title,
      surveyLabel: updated!.surveyLabel,
      location: updated!.location,
      areaDescription: updated!.areaDescription,
      landCategory: updated!.landCategory,
      description: updated!.description ?? '',
      status: updated!.status,
      createdAt: updated!.createdAt,
      updatedAt: updated!.updatedAt,
    },
  });
});

// ─── Land-owner: document checklist for a listing ────────────────────────────

router.get('/:listingId/documents', ...landOwnerChain, async (req, res) => {
  const googleId = req.user!.sub;
  const listingId = paramStr(req.params.listingId);
  if (!listingId) {
    return res.status(400).json({ message: 'listingId is required.' });
  }

  const check = await assertListingOwner(listingId, googleId);
  if (!check.ok) {
    return res.status(check.status).json({ message: check.message });
  }

  const kyl = kylMapToRecord(check.listing.kylDocuments);
  const scoreRows = kylRecordToScoreRows(kyl);
  const kylMetrics = computeListingKYLMetrics(scoreRows);
  const predictedMetrics = predictedKylFromDocs(kyl);
  const catalog = getDocumentCatalog();

  const items = catalog.map((entry) => {
    const sub = kyl[entry.documentKey];
    return {
      documentKey: entry.documentKey,
      category: entry.category,
      description: entry.description,
      group: entry.group,
      groupLabel: entry.groupLabel,
      sortOrder: entry.sortOrder,
      allowedTypes: entry.allowedTypes,
      optional: entry.optional,
      submission: sub ? toListingDocDto(entry.documentKey, sub) : null,
    };
  });

  res.json({
    listingId,
    listingStatus: check.listing.status,
    cumulativeScore: kylMetrics.kylScore,
    scoredDocCount: kylMetrics.scoredRequiredCount,
    predictedKylScore: predictedMetrics.predictedKylScore,
    predictedScoredDocCount: predictedMetrics.predictedScoredDocCount,
    kylRequiredTotal: kylMetrics.requiredCategoryCount,
    totalUploaded: countKylUploads(check.listing.kylDocuments),
    items,
  });
});

// ─── Land-owner: upload a document for a listing ─────────────────────────────

router.post(
  '/:listingId/documents/upload',
  ...landOwnerChain,
  (req, res, next) => {
    listingDocumentUpload.single('file')(req, res, (err: unknown) => {
      if (err instanceof Error) {
        return res.status(400).json({ message: err.message });
      }
      next(err);
    });
  },
  async (req, res) => {
    const googleId = req.user!.sub;
    const listingId = paramStr(req.params.listingId);
    const documentKey =
      typeof req.body?.documentKey === 'string' ? req.body.documentKey.trim() : '';
    const selectedType =
      typeof req.body?.selectedType === 'string' ? req.body.selectedType.trim() : '';

    const cleanup = async () => {
      if (req.file?.path) await fs.unlink(req.file.path).catch(() => undefined);
    };

    if (!listingId) {
      await cleanup();
      return res.status(400).json({ message: 'listingId is required.' });
    }

    const check = await assertListingOwner(listingId, googleId);
    if (!check.ok) {
      await cleanup();
      return res.status(check.status).json({ message: check.message });
    }

    if (!documentKey || !isValidDocumentKey(documentKey)) {
      await cleanup();
      return res.status(400).json({ message: 'Valid documentKey is required.' });
    }

    const entry = getCatalogEntryByKey(documentKey);
    if (!entry) {
      await cleanup();
      return res.status(400).json({ message: 'Unknown document category.' });
    }

    if (!selectedType || !isValidTypeForKey(documentKey, selectedType)) {
      await cleanup();
      return res.status(400).json({
        message: `selectedType must be one of: ${entry.allowedTypes.join(', ')}`,
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'File is required (field name: file).' });
    }

    const storedFileName = path.basename(req.file.filename || req.file.path);
    const uploadsDir = getUploadsDir();
    const absolutePath = path.join(uploadsDir, storedFileName);

    const kylBefore = kylMapToRecord(check.listing.kylDocuments);
    const existing = kylBefore[documentKey];
    if (existing?.storedFileName) {
      const oldPath = path.join(uploadsDir, path.basename(existing.storedFileName));
      await fs.unlink(oldPath).catch(() => undefined);
    }

    const now = new Date();
    const predictedScore = predictDocumentScore({
      documentKey,
      selectedType,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    });
    const newItem: ListingKylItem = {
      typeLabel: selectedType,
      storedFileName,
      originalFileName: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      predictedScore,
      adminScore: null,
      adminNote: '',
      reviewedAt: null,
      uploadedAt: now,
      reviewStatus: 'pending',
    };

    const updated = await ListingModel.findByIdAndUpdate(
      check.listing._id,
      { $set: { [`kylDocuments.${documentKey}`]: newItem } },
      { new: true },
    ).lean();

    if (!updated) {
      await fs.unlink(absolutePath).catch(() => undefined);
      return res.status(500).json({ message: 'Failed to save document record.' });
    }

    const kylAfter = kylMapToRecord(updated.kylDocuments);
    const allDocs = kylRecordToScoreRows(kylAfter);

    const { cumulativeScore, scoredCount } = kylFromDocs(allDocs);
    const predictedMetrics = predictedKylFromDocs(kylAfter);

    return res.status(201).json({
      submission: toListingDocDto(documentKey, newItem),
      totalUploaded: Object.keys(kylAfter).length,
      listingStatus: updated.status,
      cumulativeScore,
      scoredDocCount: scoredCount,
      predictedKylScore: predictedMetrics.predictedKylScore,
      predictedScoredDocCount: predictedMetrics.predictedScoredDocCount,
    });
  },
);

// ─── Land-owner: view a document file ────────────────────────────────────────

router.get('/:listingId/documents/file/:documentKey', ...landOwnerChain, async (req, res) => {
  const googleId = req.user!.sub;
  const listingId = paramStr(req.params.listingId);
  const documentKey = paramStr(req.params.documentKey);

  if (!listingId || !documentKey) {
    return res.status(400).json({ message: 'listingId and documentKey are required.' });
  }

  const check = await assertListingOwner(listingId, googleId);
  if (!check.ok) {
    return res.status(check.status).json({ message: check.message });
  }

  if (!isValidDocumentKey(documentKey)) {
    return res.status(400).json({ message: 'Invalid document key.' });
  }

  const kyl = kylMapToRecord(check.listing.kylDocuments);
  const item = kyl[documentKey];
  if (!item) {
    return res.status(404).json({ message: 'Document not found.' });
  }

  const safeName = path.basename(item.storedFileName);
  const filePath = path.join(getUploadsDir(), safeName);

  res.setHeader('Content-Type', item.mimeType);
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(item.originalFileName)}"`,
  );
  return res.sendFile(filePath, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ message: 'File missing on server.' });
    }
  });
});

// ─── Admin: list all submitted listings ──────────────────────────────────────

router.get('/admin/submitted', ...adminChain, async (_req, res) => {
  const listings = await ListingModel.find({ status: { $in: ['submitted', 'reviewed'] } })
    .sort({ updatedAt: -1 })
    .lean();

  if (listings.length === 0) {
    return res.json({ listings: [] });
  }

  const scoreByListing = new Map<string, ReturnType<typeof kylFromDocs>>();
  const docCountByListing = new Map<string, number>();
  for (const listing of listings) {
    const id = String(listing._id);
    const row = listing as LandListingLean;
    const docs = kylRecordToScoreRows(row.kylDocuments);
    scoreByListing.set(id, kylFromDocs(docs));
    docCountByListing.set(id, countKylUploads(row.kylDocuments));
  }

  return res.json({
    listings: listings.map((l) => {
      const id = String(l._id);
      const score = scoreByListing.get(id);
      return {
        id,
        title: l.title,
        surveyLabel: l.surveyLabel,
        location: l.location,
        areaDescription: l.areaDescription,
        landCategory: l.landCategory,
        status: l.status,
        landOwnerGoogleId: l.landOwnerGoogleId,
        docCount: docCountByListing.get(id) ?? 0,
        cumulativeScore: score?.cumulativeScore ?? null,
        scoredDocCount: score?.scoredCount ?? 0,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      };
    }),
  });
});

// ─── Admin: get all docs for a specific listing ───────────────────────────────

router.get('/admin/:listingId/docs', ...adminChain, async (req, res) => {
  const listingId = paramStr(req.params.listingId);
  if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
    return res.status(400).json({ message: 'Invalid listingId.' });
  }

  const listing = await ListingModel.findById(listingId).lean();
  if (!listing) {
    return res.status(404).json({ message: 'Listing not found.' });
  }

  const row = listing as LandListingLean;
  const kyl = kylMapToRecord(row.kylDocuments);
  const sortMap = new Map(getDocumentCatalog().map((e) => [e.documentKey, e.sortOrder]));
  const docs = Object.entries(kyl)
    .map(([documentKey, item]) => toListingDocDto(documentKey, item))
    .sort((a, b) => (sortMap.get(a.documentKey) ?? 999) - (sortMap.get(b.documentKey) ?? 999));
  const scoreRows = kylRecordToScoreRows(kyl);
  const { cumulativeScore, scoredCount } = kylFromDocs(scoreRows);

  return res.json({
    listingId,
    listingTitle: listing.title,
    listingStatus: listing.status,
    landOwnerGoogleId: listing.landOwnerGoogleId,
    cumulativeScore,
    scoredDocCount: scoredCount,
    totalDocs: docs.length,
    firstPendingDocumentKey: getFirstPendingDocumentKey(kyl),
    docs,
  });
});

// ─── Admin: view a listing document file ─────────────────────────────────────

router.get('/admin/:listingId/docs/file/:documentKey', ...adminChain, async (req, res) => {
  const listingId = paramStr(req.params.listingId);
  const documentKey = paramStr(req.params.documentKey);

  if (!listingId || !documentKey) {
    return res.status(400).json({ message: 'listingId and documentKey are required.' });
  }
  if (!mongoose.Types.ObjectId.isValid(listingId)) {
    return res.status(400).json({ message: 'Invalid listing id.' });
  }
  if (!isValidDocumentKey(documentKey)) {
    return res.status(400).json({ message: 'Invalid document key.' });
  }

  const listing = await ListingModel.findById(listingId).lean();
  if (!listing) {
    return res.status(404).json({ message: 'Listing not found.' });
  }

  const kyl = kylMapToRecord((listing as LandListingLean).kylDocuments);
  const item = kyl[documentKey];
  if (!item) {
    return res.status(404).json({ message: 'Document not found.' });
  }

  const safeName = path.basename(item.storedFileName);
  const filePath = path.join(getUploadsDir(), safeName);

  res.setHeader('Content-Type', item.mimeType);
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${encodeURIComponent(item.originalFileName)}"`,
  );
  return res.sendFile(filePath, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ message: 'File missing on server.' });
    }
  });
});

// ─── Admin: approve or reject a listing document (single-step KYL review) ───

router.patch('/admin/:listingId/docs/:documentKey/review', ...adminChain, async (req, res) => {
  const listingId = paramStr(req.params.listingId);
  const documentKey = paramStr(req.params.documentKey);

  if (!listingId || !documentKey) {
    return res.status(400).json({ message: 'listingId and documentKey are required.' });
  }
  if (!mongoose.Types.ObjectId.isValid(listingId)) {
    return res.status(400).json({ message: 'Invalid listing id.' });
  }
  if (!isValidDocumentKey(documentKey)) {
    return res.status(400).json({ message: 'Invalid document key.' });
  }

  const { action, score, note } = req.body ?? {};
  if (action !== 'approve' && action !== 'reject') {
    return res.status(400).json({ message: 'action must be "approve" or "reject".' });
  }

  const listingOid = new mongoose.Types.ObjectId(listingId);
  const listingBefore = await ListingModel.findById(listingOid).lean();
  if (!listingBefore) {
    return res.status(404).json({ message: 'Listing not found.' });
  }

  const kylBefore = kylMapToRecord((listingBefore as LandListingLean).kylDocuments);
  if (!kylBefore[documentKey]) {
    return res.status(404).json({ message: 'Document not found.' });
  }

  const reviewedAt = new Date();

  if (action === 'reject') {
    const noteStr = typeof note === 'string' ? note.trim() : '';
    if (noteStr.length < 3) {
      return res.status(400).json({
        message: 'A rejection note (at least 3 characters) is required for the landowner.',
      });
    }
    await ListingModel.findByIdAndUpdate(listingOid, {
      $set: {
        [`kylDocuments.${documentKey}.reviewStatus`]: 'rejected',
        [`kylDocuments.${documentKey}.adminScore`]: null,
        [`kylDocuments.${documentKey}.adminNote`]: noteStr.slice(0, 2000),
        [`kylDocuments.${documentKey}.reviewedAt`]: reviewedAt,
      },
    });
  } else {
    let scoreNum: number;
    if (score === undefined || score === null || score === '') {
      scoreNum = kylBefore[documentKey].predictedScore ?? 80;
    } else {
      scoreNum = Number(score);
      if (Number.isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
        return res.status(400).json({ message: 'score must be a number between 0 and 100.' });
      }
    }
    const noteStr = typeof note === 'string' ? note.trim().slice(0, 2000) : '';
    await ListingModel.findByIdAndUpdate(listingOid, {
      $set: {
        [`kylDocuments.${documentKey}.reviewStatus`]: 'approved',
        [`kylDocuments.${documentKey}.adminScore`]: scoreNum,
        [`kylDocuments.${documentKey}.adminNote`]: noteStr,
        [`kylDocuments.${documentKey}.reviewedAt`]: reviewedAt,
      },
    });
  }

  const listingAfter = await ListingModel.findById(listingOid).lean();
  if (!listingAfter) {
    return res.status(500).json({ message: 'Failed to load listing after update.' });
  }

  await syncListingReviewStatus(listingOid, (listingAfter as LandListingLean).kylDocuments);

  const listingFinal = await ListingModel.findById(listingOid).lean();
  const kylFinal = kylMapToRecord((listingFinal as LandListingLean)?.kylDocuments);
  const allDocs = kylRecordToScoreRows(kylFinal);
  const { cumulativeScore, scoredCount } = kylFromDocs(allDocs);
  const nextPendingDocumentKey = getNextPendingDocumentKey(kylFinal, documentKey);

  const item = kylFinal[documentKey];
  if (!item) {
    return res.status(500).json({ message: 'Failed to load updated document.' });
  }

  return res.json({
    doc: toListingDocDto(documentKey, item),
    cumulativeScore,
    scoredDocCount: scoredCount,
    totalDocs: Object.keys(kylFinal).length,
    nextPendingDocumentKey,
    firstPendingDocumentKey: getFirstPendingDocumentKey(kylFinal),
    listingStatus: listingFinal?.status ?? 'submitted',
  });
});

// ─── Admin: score a listing document ─────────────────────────────────────────

router.patch('/admin/:listingId/docs/:documentKey/score', ...adminChain, async (req, res) => {
  const listingId = paramStr(req.params.listingId);
  const documentKey = paramStr(req.params.documentKey);

  if (!listingId || !documentKey) {
    return res.status(400).json({ message: 'listingId and documentKey are required.' });
  }
  if (!mongoose.Types.ObjectId.isValid(listingId)) {
    return res.status(400).json({ message: 'Invalid listing id.' });
  }
  if (!isValidDocumentKey(documentKey)) {
    return res.status(400).json({ message: 'Invalid document key.' });
  }

  const { score, note } = req.body ?? {};

  const scoreNum = score === undefined || score === null || score === '' ? null : Number(score);

  if (scoreNum == null || Number.isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
    return res.status(400).json({ message: 'score must be a number between 0 and 100.' });
  }

  const listingOid = new mongoose.Types.ObjectId(listingId);
  const listingBefore = await ListingModel.findById(listingOid).lean();
  if (!listingBefore) {
    return res.status(404).json({ message: 'Listing not found.' });
  }

  const kylBefore = kylMapToRecord((listingBefore as LandListingLean).kylDocuments);
  if (!kylBefore[documentKey]) {
    return res.status(404).json({ message: 'Document not found.' });
  }

  const noteStr = typeof note === 'string' ? note.slice(0, 2000) : '';
  const reviewedAt = new Date();

  await ListingModel.findByIdAndUpdate(listingOid, {
    $set: {
      [`kylDocuments.${documentKey}.adminScore`]: scoreNum,
      [`kylDocuments.${documentKey}.adminNote`]: noteStr,
      [`kylDocuments.${documentKey}.reviewedAt`]: reviewedAt,
      [`kylDocuments.${documentKey}.reviewStatus`]: 'approved',
    },
  });

  const listingAfter = await ListingModel.findById(listingOid).lean();
  const allDocs = kylRecordToScoreRows(
    kylMapToRecord((listingAfter as LandListingLean)?.kylDocuments),
  );
  const { cumulativeScore, scoredCount } = kylFromDocs(allDocs);

  await syncListingReviewStatus(listingOid, (listingAfter as LandListingLean)?.kylDocuments);

  const listingSynced = await ListingModel.findById(listingOid).lean();
  const item = kylMapToRecord((listingSynced as LandListingLean)?.kylDocuments)[documentKey];
  if (!item) {
    return res.status(500).json({ message: 'Failed to load updated document.' });
  }

  return res.json({
    doc: toListingDocDto(documentKey, item),
    cumulativeScore,
    scoredDocCount: scoredCount,
    totalDocs: Object.keys(kylMapToRecord((listingSynced as LandListingLean)?.kylDocuments)).length,
  });
});

export { router as listingRouter };
