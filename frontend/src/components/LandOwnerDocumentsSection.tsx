import { useCallback, useEffect, useState } from 'react';
import {
  fetchMyLandDocuments,
  openLandDocumentFile,
  uploadLandDocument,
  type LandOwnerDocumentsResponse,
} from '../lib/landDocumentsApi';

interface Props {
  token: string;
}

export function LandOwnerDocumentsSection({ token }: Props) {
  const [data, setData] = useState<LandOwnerDocumentsResponse | null>(null);
  const [error, setError] = useState<string>('');
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetchMyLandDocuments(token);
      setData(res);
      setError('');
      setSelectedTypes((prev) => {
        const next: Record<string, string> = {};
        for (const item of res.items) {
          next[item.documentKey] =
            prev[item.documentKey] ?? item.submission?.typeLabel ?? item.allowedTypes[0] ?? '';
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load documents.');
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const onFileChange = async (documentKey: string, fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) {
      return;
    }
    const chosenType = selectedTypes[documentKey];
    if (!chosenType) {
      setError('Please select which document type you are uploading.');
      return;
    }
    setUploadingKey(documentKey);
    setError('');
    try {
      await uploadLandDocument(token, documentKey, chosenType, file);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploadingKey(null);
    }
  };

  if (!data) {
    return (
      <div className="dash-card" style={{ marginBottom: '1.25rem' }}>
        <div className="dash-card-body">Loading KYL documents…</div>
      </div>
    );
  }

  return (
    <div id="landowner-platform-kyl" className="dash-card landowner-kyl-card">
      <div className="dash-card-header">
        <div className="dash-card-title">Land owner documents (KYL)</div>
        <div className="dash-card-action" style={{ fontSize: '0.7rem' }}>
          Avg. score (approved):{' '}
          <strong>
            {data.cumulativeAverageScore != null ? `${data.cumulativeAverageScore}` : '—'}
          </strong>
          {data.scoredApprovedCount > 0 ? ` · ${data.scoredApprovedCount} scored` : null}
        </div>
      </div>
      <p className="landowner-kyl-hint">
        Uploads are reviewed by admins. If you <strong>replace</strong> a file that was already
        approved, its status returns to <strong>pending review</strong> until an admin approves it
        again.
      </p>
      <div className="dash-card-body">
        {error ? (
          <div style={{ color: 'var(--terracotta)', marginBottom: '0.75rem', fontSize: '0.72rem' }}>
            {error}
          </div>
        ) : null}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.68rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                <th style={{ padding: '0.35rem' }}>Category</th>
                <th style={{ padding: '0.35rem' }}>Document type</th>
                <th style={{ padding: '0.35rem' }}>Status</th>
                <th style={{ padding: '0.35rem' }}>Score</th>
                <th style={{ padding: '0.35rem' }}>Upload</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((row) => {
                const sub = row.submission;
                const statusLabel = sub
                  ? sub.status === 'pending_review'
                    ? 'Pending admin review'
                    : sub.status === 'approved'
                      ? 'Approved'
                      : 'Rejected'
                  : 'Not uploaded';
                return (
                  <tr key={row.documentKey} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '0.4rem', verticalAlign: 'top' }}>
                      {row.category}
                      {row.optional ? (
                        <span style={{ color: 'var(--muted)', marginLeft: 4 }}>(optional)</span>
                      ) : null}
                    </td>
                    <td style={{ padding: '0.4rem', verticalAlign: 'top' }}>
                      <select
                        id={`land-doc-type-${row.documentKey}`}
                        value={selectedTypes[row.documentKey] ?? ''}
                        onChange={(e) =>
                          setSelectedTypes((prev) => ({
                            ...prev,
                            [row.documentKey]: e.target.value,
                          }))
                        }
                        style={{ fontSize: '0.68rem', maxWidth: '100%' }}
                        disabled={uploadingKey !== null}
                      >
                        <option value="">Select type…</option>
                        {row.allowedTypes.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '0.4rem', verticalAlign: 'top' }}>{statusLabel}</td>
                    <td style={{ padding: '0.4rem', verticalAlign: 'top' }}>
                      {sub?.status === 'approved' && sub.adminScore != null
                        ? sub.adminScore
                        : sub?.predictedScore != null
                          ? `${sub.predictedScore} predicted`
                          : '—'}
                    </td>
                    <td style={{ padding: '0.4rem', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ cursor: 'pointer', fontWeight: 500 }}>
                          {uploadingKey === row.documentKey ? 'Uploading…' : 'Replace / upload'}
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            style={{ display: 'block', marginTop: 4, maxWidth: 200 }}
                            disabled={uploadingKey !== null}
                            onChange={(ev) => void onFileChange(row.documentKey, ev.target.files)}
                          />
                        </label>
                        {sub ? (
                          <button
                            type="button"
                            className="dash-card-action"
                            style={{
                              alignSelf: 'flex-start',
                              border: 'none',
                              background: 'none',
                              cursor: 'pointer',
                            }}
                            onClick={() => void openLandDocumentFile(token, sub.id)}
                          >
                            View file
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
