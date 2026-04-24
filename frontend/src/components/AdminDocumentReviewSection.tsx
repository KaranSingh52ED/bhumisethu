import { useCallback, useEffect, useState } from 'react';
import {
  fetchAdminPendingDocuments,
  openLandDocumentFile,
  reviewLandDocument,
  type AdminPendingSubmission,
} from '../lib/landDocumentsApi';

interface Props {
  token: string;
}

export function AdminDocumentReviewSection({ token }: Props) {
  const [list, setList] = useState<AdminPendingSubmission[]>([]);
  const [error, setError] = useState<string>('');
  const [scores, setScores] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const submissions = await fetchAdminPendingDocuments(token);
      setList(submissions);
      setScores((prev) => {
        const next = { ...prev };
        for (const submission of submissions) {
          if (next[submission.id] == null && submission.predictedScore != null) {
            next[submission.id] = String(submission.predictedScore);
          }
        }
        return next;
      });
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load queue.');
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const setScore = (id: string, value: string) => {
    setScores((prev) => ({ ...prev, [id]: value }));
  };

  const setNote = (id: string, value: string) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

  const act = async (submission: AdminPendingSubmission, status: 'approved' | 'rejected') => {
    setBusyId(submission.id);
    setError('');
    try {
      const raw = scores[submission.id] ?? '';
      const score = raw === '' ? undefined : Number(raw);
      await reviewLandDocument(token, submission.id, {
        status,
        score: status === 'approved' ? score : undefined,
        note: notes[submission.id],
      });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section id="admin-doc-queue" className="admin-doc-section" aria-labelledby="admin-doc-heading">
      <div className="admin-kyl-hero">
        <h2 id="admin-doc-heading" className="admin-kyl-hero__title">
          Landowner profile documents
        </h2>
        <p className="admin-kyl-hero__lead">
          Platform-level KYL uploads (not tied to a single listing). Approve or reject and assign a
          score when approving.
        </p>
      </div>

      <div className="dash-card admin-kyl-card">
        <div className="dash-card-header">
          <div className="dash-card-title">Queue</div>
          <button type="button" className="dash-card-action" onClick={() => void load()}>
            Refresh
          </button>
        </div>
        <div className="dash-card-body">
          {error ? <p className="admin-kyl-error">{error}</p> : null}
          {list.length === 0 ? (
            <p className="admin-kyl-empty">No documents pending review.</p>
          ) : (
            <div className="admin-doc-queue">
              {list.map((s) => (
                <div key={s.id} className="admin-doc-row">
                  <div className="admin-doc-row__head">
                    <strong>{s.typeLabel}</strong>
                    <span className="admin-doc-row__cat"> · {s.category}</span>
                  </div>
                  <p className="admin-doc-row__meta">
                    Owner: {s.landOwnerGoogleId.slice(0, 12)}… · {s.originalFileName}
                  </p>
                  {s.predictedScore != null ? (
                    <p className="admin-kyl-doc__badge">Predicted score: {s.predictedScore}/100</p>
                  ) : null}
                  <div className="admin-doc-row__actions">
                    <button
                      type="button"
                      className="btn-ghost btn-ghost--sm"
                      disabled={busyId !== null}
                      onClick={() => void openLandDocumentFile(token, s.id)}
                    >
                      Open file
                    </button>
                    <div className="admin-kyl-field">
                      <label htmlFor={`adm-score-${s.id}`}>Score</label>
                      <input
                        id={`adm-score-${s.id}`}
                        type="number"
                        min={0}
                        max={100}
                        className="admin-kyl-input"
                        value={scores[s.id] ?? ''}
                        onChange={(ev) => setScore(s.id, ev.target.value)}
                      />
                    </div>
                    <input
                      type="text"
                      className="admin-kyl-input admin-kyl-input--wide"
                      placeholder="Note (optional)"
                      value={notes[s.id] ?? ''}
                      onChange={(ev) => setNote(s.id, ev.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-primary btn-primary--sm"
                      disabled={busyId !== null}
                      onClick={() => void act(s, 'approved')}
                    >
                      {busyId === s.id ? '…' : 'Approve + score'}
                    </button>
                    <button
                      type="button"
                      className="btn-outline-danger btn-outline-danger--sm"
                      disabled={busyId !== null}
                      onClick={() => void act(s, 'rejected')}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
