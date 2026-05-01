import { Router } from 'express';
import {
  getCatalogEntryByKey,
  getDocumentCatalog,
  isValidDocumentKey,
  isValidTypeForKey,
} from '../data/documents';
import { landDocumentUpload } from '../config/multerLandDocs';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';
import {
  requireAuth,
  requireApproved,
  requireRegistrationComplete,
  requireRole,
} from '../middleware/auth';
import { LandOwnerDocumentModel } from '../models/land-owner-document.model';
import { predictDocumentScore } from '../utils/predictedDocumentScore';

const router = Router();

const landOwnerChain = [
  requireAuth,
  requireRegistrationComplete,
  requireApproved,
  requireRole(['land_owner']),
] as const;

const computeCumulativeAverage = (
  rows: Array<{ status: string; adminScore?: number | null }>,
): { cumulativeAverageScore: number | null; scoredApprovedCount: number } => {
  const scored = rows.filter(
    (r) => r.status === 'approved' && r.adminScore != null && !Number.isNaN(r.adminScore),
  );
  if (scored.length === 0) {
    return { cumulativeAverageScore: null, scoredApprovedCount: 0 };
  }
  const sum = scored.reduce((acc, r) => acc + (r.adminScore as number), 0);
  return {
    cumulativeAverageScore: Math.round((sum / scored.length) * 10) / 10,
    scoredApprovedCount: scored.length,
  };
};

type SubmissionLean = {
  _id: unknown;
  landOwnerGoogleId: string;
  documentKey: string;
  category: string;
  typeLabel: string;
  optional: boolean;
  storedFileName: string;
  fileUrl: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  predictedScore?: number | null;
  adminScore?: number | null;
  adminNote?: string;
  reviewedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

const toSubmissionDto = (doc: SubmissionLean) => ({
  id: String(doc._id),
  documentKey: doc.documentKey,
  category: doc.category,
  typeLabel: doc.typeLabel,
  optional: doc.optional,
  originalFileName: doc.originalFileName,
  mimeType: doc.mimeType,
  sizeBytes: doc.sizeBytes,
  status: doc.status,
  predictedScore: doc.predictedScore ?? null,
  adminScore: doc.adminScore ?? null,
  adminNote: doc.adminNote ?? '',
  reviewedAt: doc.reviewedAt ?? null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

router.get('/catalog', (_req, res) => {
  res.json({ documents: getDocumentCatalog() });
});

router.get('/my', ...landOwnerChain, async (req, res) => {
  const googleId = req.user!.sub;
  const submissions = await LandOwnerDocumentModel.find({ landOwnerGoogleId: googleId }).lean();
  const { cumulativeAverageScore, scoredApprovedCount } = computeCumulativeAverage(submissions);

  const catalog = getDocumentCatalog();
  const byKey = new Map(submissions.map((s) => [s.documentKey, s]));

  const merged = catalog.map((entry) => {
    const sub = byKey.get(entry.documentKey);
    return {
      ...entry,
      submission: sub ? toSubmissionDto(sub) : null,
    };
  });

  res.json({
    cumulativeAverageScore,
    scoredApprovedCount,
    totalUploaded: submissions.length,
    items: merged,
  });
});

router.post(
  '/upload',
  ...landOwnerChain,
  (req, res, next) => {
    landDocumentUpload.single('file')(req, res, (err: unknown) => {
      if (err instanceof Error) {
        return res.status(400).json({ message: err.message });
      }
      next(err);
    });
  },
  async (req, res) => {
    const googleId = req.user!.sub;
    const documentKey =
      typeof req.body?.documentKey === 'string' ? req.body.documentKey.trim() : '';
    const selectedType =
      typeof req.body?.selectedType === 'string' ? req.body.selectedType.trim() : '';

    if (!documentKey || !isValidDocumentKey(documentKey)) {
      return res.status(400).json({ message: 'Valid documentKey is required.' });
    }

    const entry = getCatalogEntryByKey(documentKey);
    if (!entry) {
      return res.status(400).json({ message: 'Unknown document type.' });
    }

    if (!selectedType || !isValidTypeForKey(documentKey, selectedType)) {
      return res.status(400).json({
        message: `selectedType must be one of: ${entry.allowedTypes.join(', ')}`,
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'File is required (field name: file).' });
    }

    let cloudinaryResult: { secureUrl: string; publicId: string };
    try {
      cloudinaryResult = await uploadToCloudinary(
        req.file.buffer,
        req.file.mimetype,
        'bhumisethu/land-docs',
        'land-doc',
      );
    } catch {
      return res.status(500).json({ message: 'Failed to upload file to storage.' });
    }

    const predictedScore = predictDocumentScore({
      documentKey,
      selectedType,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
    });

    const existing = await LandOwnerDocumentModel.findOne({
      landOwnerGoogleId: googleId,
      documentKey,
    }).lean();

    if (existing?.storedFileName) {
      await deleteFromCloudinary(existing.storedFileName, existing.mimeType);
    }

    const doc = await LandOwnerDocumentModel.findOneAndUpdate(
      { landOwnerGoogleId: googleId, documentKey },
      {
        landOwnerGoogleId: googleId,
        documentKey,
        category: entry.category,
        typeLabel: selectedType,
        optional: entry.optional,
        storedFileName: cloudinaryResult.publicId,
        fileUrl: cloudinaryResult.secureUrl,
        originalFileName: req.file.originalname,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        predictedScore,
        status: 'pending_review',
        adminScore: null,
        adminNote: '',
        reviewedAt: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();

    if (!doc) {
      await deleteFromCloudinary(cloudinaryResult.publicId, req.file.mimetype);
      return res.status(500).json({ message: 'Failed to save document record.' });
    }

    const all = await LandOwnerDocumentModel.find({ landOwnerGoogleId: googleId }).lean();
    const { cumulativeAverageScore, scoredApprovedCount } = computeCumulativeAverage(all);

    return res.status(201).json({
      submission: toSubmissionDto(doc),
      cumulativeAverageScore,
      scoredApprovedCount,
    });
  },
);

/**
 * Redirect clients directly to the Cloudinary-hosted file.
 * Auth is still enforced so only the owner or an admin can access the URL.
 */
router.get('/file/:submissionId', requireAuth, requireRegistrationComplete, async (req, res) => {
  const { submissionId } = req.params;
  const user = req.user!;

  const doc = await LandOwnerDocumentModel.findById(submissionId).lean();
  if (!doc) {
    return res.status(404).json({ message: 'Document not found.' });
  }

  const isOwner = doc.landOwnerGoogleId === user.sub;
  const isAdmin = user.role === 'admin';
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ message: 'You cannot access this file.' });
  }

  if (isOwner && user.role !== 'admin' && !user.isApproved) {
    return res.status(403).json({ message: 'Your account is pending admin approval.' });
  }

  return res.redirect(doc.fileUrl);
});

router.get(
  '/admin/pending',
  requireAuth,
  requireRegistrationComplete,
  requireRole(['admin']),
  async (_req, res) => {
    const list = await LandOwnerDocumentModel.find({ status: 'pending_review' })
      .sort({ updatedAt: -1 })
      .lean();

    res.json({
      submissions: list.map((s) => ({
        ...toSubmissionDto(s),
        landOwnerGoogleId: s.landOwnerGoogleId,
      })),
    });
  },
);

router.get(
  '/admin/owner/:googleId',
  requireAuth,
  requireRegistrationComplete,
  requireRole(['admin']),
  async (req, res) => {
    const { googleId } = req.params;
    if (!googleId) {
      return res.status(400).json({ message: 'googleId is required.' });
    }

    const submissions = await LandOwnerDocumentModel.find({ landOwnerGoogleId: googleId }).lean();
    const { cumulativeAverageScore, scoredApprovedCount } = computeCumulativeAverage(submissions);

    res.json({
      landOwnerGoogleId: googleId,
      cumulativeAverageScore,
      scoredApprovedCount,
      submissions: submissions.map((s) => toSubmissionDto(s)),
    });
  },
);

router.patch(
  '/admin/submissions/:submissionId',
  requireAuth,
  requireRegistrationComplete,
  requireRole(['admin']),
  async (req, res) => {
    const { submissionId } = req.params;
    const { status, score, note } = req.body ?? {};

    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ message: 'status must be approved or rejected.' });
    }

    const scoreNum = score === undefined || score === null || score === '' ? null : Number(score);

    if (status === 'approved') {
      if (scoreNum == null || Number.isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
        return res.status(400).json({ message: 'score (0–100) is required when approving.' });
      }
    }

    const updated = await LandOwnerDocumentModel.findByIdAndUpdate(
      submissionId,
      {
        status,
        adminScore: status === 'approved' ? scoreNum : null,
        adminNote: typeof note === 'string' ? note.slice(0, 2000) : '',
        reviewedAt: new Date(),
      },
      { new: true },
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: 'Submission not found.' });
    }

    const all = await LandOwnerDocumentModel.find({
      landOwnerGoogleId: updated.landOwnerGoogleId,
    }).lean();
    const { cumulativeAverageScore, scoredApprovedCount } = computeCumulativeAverage(all);

    return res.json({
      submission: toSubmissionDto(updated),
      landOwnerCumulativeAverageScore: cumulativeAverageScore,
      landOwnerScoredApprovedCount: scoredApprovedCount,
    });
  },
);

export { router as landDocumentsRouter };
