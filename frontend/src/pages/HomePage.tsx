import { Link, useNavigate } from 'react-router-dom';
import { SiteFooter } from '../components/SiteFooter';
import { useReveal } from '../hooks/useReveal';

const STRIP_ITEMS = [
  'KYL Score — Free Land Rating',
  'Verified Developer Profiles',
  'JV Deal Room with e-Sign',
  'RERA Compliance Tracker',
  'Feasibility & FSI Engine',
  'Debris & Demolition Module',
  'Architect Test-Fits',
  'Milestone-linked Payments',
] as const;

export function HomePage() {
  const navigate = useNavigate();
  const featuresRef = useReveal<HTMLDivElement>();

  return (
    <>
      <section className="hero">
        <div className="hero-bg-text">BHOOMI</div>
        <div className="hero-left">
          <div className="hero-eyebrow">India&apos;s B2B Land Marketplace</div>
          <h1>
            Where <em>land</em> meets
            <br />
            <strong>intelligence.</strong>
          </h1>
          <p className="hero-sub">
            Bhoomi Sethu connects landowners with developers, architects, and financiers —
            standardising, de-risking, and accelerating every real estate transaction in India.
          </p>
          <div className="hero-actions">
            <Link to="/dashboard" className="btn-primary">
              Get KYL Score Free →
            </Link>
            <Link to="/listings" className="btn-ghost">
              Browse Listings
            </Link>
          </div>
          <div className="hero-stats">
            <div>
              <span className="hero-stat-val">₹500B+</span>
              <div className="hero-stat-label">Market Opportunity</div>
            </div>
            <div>
              <span className="hero-stat-val">10%</span>
              <div className="hero-stat-label">Market CAGR</div>
            </div>
            <div>
              <span className="hero-stat-val">60–70%</span>
              <div className="hero-stat-label">Cost shaped by architecture</div>
            </div>
          </div>
        </div>

        <div className="hero-right">
          <div className="land-grid" />
          <div className="land-parcels">
            <div className="parcel">
              <span className="parcel-label">Plot 14-B · 2400 sqft</span>
            </div>
            <div className="parcel">
              <span className="parcel-label">Plot 15 · 1800 sqft</span>
            </div>
            <div className="parcel active-parcel">
              <span className="parcel-label">🔴 ACTIVE DEAL</span>
            </div>
            <div className="parcel" />
            <div className="parcel">
              <span className="parcel-label">Survey 112/A · 4 acres</span>
            </div>
            <div className="parcel" />
            <div className="parcel" />
            <div className="parcel" />
            <div className="parcel" />
            <div className="map-pin" />
            <div className="map-pin" />
          </div>

          <div className="hero-card">
            <div className="hero-card-title">KYL Score — Survey 112/A, Kompally</div>
            <div className="kyl-meter">
              <div className="kyl-label">
                <span>Title Clarity</span>
                <span>92/100</span>
              </div>
              <div className="kyl-bar">
                <div className="kyl-fill high" style={{ width: '92%' }} />
              </div>
            </div>
            <div className="kyl-meter">
              <div className="kyl-label">
                <span>Zoning Compliance</span>
                <span>78/100</span>
              </div>
              <div className="kyl-bar">
                <div className="kyl-fill med" style={{ width: '78%' }} />
              </div>
            </div>
            <div className="kyl-meter">
              <div className="kyl-label">
                <span>Document Completeness</span>
                <span>61/100</span>
              </div>
              <div className="kyl-bar">
                <div className="kyl-fill low" style={{ width: '61%' }} />
              </div>
            </div>
            <div className="match-list">
              <div className="match-item">
                <div className="match-dot" style={{ background: 'var(--green)' }} />
                <div className="match-name">Prestige Projects Pvt. Ltd.</div>
                <div className="match-badge verified">MATCHED</div>
              </div>
              <div className="match-item">
                <div className="match-dot" style={{ background: 'var(--wheat)' }} />
                <div className="match-name">Aparna Constructions</div>
                <div className="match-badge pending">REVIEWING</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="strip">
        <div className="strip-inner">
          {[...STRIP_ITEMS, ...STRIP_ITEMS].map((t, i) => (
            <span key={`${t}-${i}`} className="strip-item">
              {t}
            </span>
          ))}
        </div>
      </div>

      <section className="section" style={{ paddingBottom: 0 }}>
        <div className="section-tag">Platform Capabilities</div>
        <h2 className="section-h2">
          Every layer of the
          <br />
          <em>real estate transaction</em>
        </h2>
      </section>
      <div ref={featuresRef} className="features-grid reveal" style={{ margin: '3rem 4rem 0' }}>
        <button type="button" className="feat-card" onClick={() => navigate('/dashboard')}>
          <span className="feat-num">01</span>
          <span className="feat-icon">🗺️</span>
          <div className="feat-title">KYL — Know Your Land</div>
          <div className="feat-desc">
            Free land intelligence scoring. Upload documents, get a verified KYL Score across title
            clarity, zoning, FSI potential, and document completeness.
          </div>
        </button>
        <button type="button" className="feat-card" onClick={() => navigate('/listings')}>
          <span className="feat-num">02</span>
          <span className="feat-icon">🔗</span>
          <div className="feat-title">Smart Matchmaking</div>
          <div className="feat-desc">
            AI-powered developer matching based on project size, capital capacity, JV structure
            preference, asset class and track record. No broker needed.
          </div>
        </button>
        <button type="button" className="feat-card">
          <span className="feat-num">03</span>
          <span className="feat-icon">📐</span>
          <div className="feat-title">Feasibility Engine</div>
          <div className="feat-desc">
            Instant FSI calculations, saleable area estimates, construction cost benchmarks, and
            revenue-share modelling for any parcel in Telangana.
          </div>
        </button>
        <button type="button" className="feat-card" onClick={() => navigate('/deal-room')}>
          <span className="feat-num">04</span>
          <span className="feat-icon">🤝</span>
          <div className="feat-title">JV Deal Room</div>
          <div className="feat-desc">
            Structured workspace for negotiation, scenario comparison, term sheet generation, and
            legally-binding e-signature via Leegality. Full audit trail.
          </div>
        </button>
        <button type="button" className="feat-card">
          <span className="feat-num">05</span>
          <span className="feat-icon">⚖️</span>
          <div className="feat-title">Legal & Compliance</div>
          <div className="feat-desc">
            RERA compliance tracker, MOU builder, title checklist, and document vault. Connected to
            empanelled legal partners for escalation.
          </div>
        </button>
        <button type="button" className="feat-card">
          <span className="feat-num">06</span>
          <span className="feat-icon">♻️</span>
          <div className="feat-title">Debris & Demolition</div>
          <div className="feat-desc">
            Hidden cost made visible. C&D waste estimates, certified recycler marketplace,
            demolition planning, and ESG compliance documentation.
          </div>
        </button>
      </div>

      <section className="kyl-section" style={{ marginTop: '5rem' }}>
        <div className="kyl-grid">
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="section-tag" style={{ color: 'var(--wheat)' }}>
              Freemium Entry Point
            </div>
            <h2 className="section-h2" style={{ color: 'var(--cream)' }}>
              Know Your Land
              <br />
              <em style={{ color: 'var(--wheat)' }}>before you sell it.</em>
            </h2>
            <p
              className="section-sub"
              style={{
                color: 'rgba(242,237,224,0.45)',
                marginBottom: '3rem',
              }}
            >
              The KYL Score is your land&apos;s credit rating. Free to generate, it tells you
              exactly what&apos;s strong, what&apos;s missing, and what unlocks developer interest.
            </p>
            <ul className="kyl-steps">
              <li className="kyl-step-item">
                <div className="kyl-step-num">01</div>
                <div className="kyl-step-content">
                  <h4>Upload your land documents</h4>
                  <p>
                    Patta, EC, survey documents, any govt papers you have. Our OCR reads them
                    instantly.
                  </p>
                  <span className="kyl-free-badge">FREE</span>
                </div>
              </li>
              <li className="kyl-step-item">
                <div className="kyl-step-num">02</div>
                <div className="kyl-step-content">
                  <h4>Get your KYL Score</h4>
                  <p>
                    Five-dimension rating: Title, Zoning, Document completeness, RERA compliance,
                    Geographic risk.
                  </p>
                  <span className="kyl-free-badge">FREE</span>
                </div>
              </li>
              <li className="kyl-step-item">
                <div className="kyl-step-num">03</div>
                <div className="kyl-step-content">
                  <h4>Activate paid services on demand</h4>
                  <p>
                    Document gap filling, legal opinion, architect test-fit, developer-ready listing
                    promotion.
                  </p>
                </div>
              </li>
              <li className="kyl-step-item">
                <div className="kyl-step-num">04</div>
                <div className="kyl-step-content">
                  <h4>Match with verified developers</h4>
                  <p>
                    Get matched to the right developer for your land&apos;s profile. No brokers, no
                    guesswork.
                  </p>
                </div>
              </li>
            </ul>
          </div>
          <div className="kyl-score-demo">
            <div className="kyl-score-header">
              <div>
                <div className="kyl-score-title">KYL Score Report</div>
                <div
                  style={{
                    fontSize: '0.65rem',
                    color: 'var(--muted)',
                    marginTop: '0.25rem',
                  }}
                >
                  Survey 88, Kompally, Hyderabad
                </div>
              </div>
              <span className="kyl-score-tag">Developer Ready</span>
            </div>
            <div className="kyl-big-score">
              82<span>/100</span>
            </div>
            <div
              style={{
                height: '1px',
                background: 'var(--border)',
                margin: '1.5rem 0',
              }}
            />
            <div className="kyl-dimensions">
              {[
                ['Title & Ownership', 94, 'var(--green)'],
                ['Zoning & Land Use', 88, 'var(--green)'],
                ['RERA Compliance', 75, 'var(--wheat)'],
                ['Document Completeness', 68, 'var(--wheat)'],
                ['Geographic Risk', 85, 'var(--green)'],
              ].map(([name, pct, bg]) => (
                <div key={String(name)} className="kyl-dim-row">
                  <div className="kyl-dim-name">{name}</div>
                  <div className="kyl-dim-bar-wrap">
                    <div className="kyl-dim-bar" style={{ width: `${pct}%`, background: bg }} />
                  </div>
                  <div className="kyl-dim-val">{pct}</div>
                </div>
              ))}
            </div>
            <div
              style={{
                marginTop: '1.5rem',
                paddingTop: '1.5rem',
                borderTop: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: '0.55rem',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--muted)',
                  marginBottom: '0.75rem',
                }}
              >
                3 Developers Matched
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.4rem',
                }}
              >
                {[
                  ['Prestige Group', '96% fit', 'var(--green)'],
                  ['Aparna Constructions', '88% fit', 'var(--wheat)'],
                  ['My Home Constructions', '82% fit', 'var(--wheat)'],
                ].map(([n, f, c]) => (
                  <div
                    key={String(n)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.68rem',
                      padding: '0.4rem 0',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <span style={{ color: 'var(--cream)' }}>{n}</span>
                    <span style={{ color: c }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="how-section">
        <div className="section-tag" style={{ color: 'var(--wheat)' }}>
          Process
        </div>
        <h2 className="section-h2" style={{ color: 'var(--cream)' }}>
          From raw land to <em style={{ color: 'var(--wheat)' }}>signed deal</em>
        </h2>
        <div className="how-grid">
          <div className="how-step">
            <div className="how-role">Landowner</div>
            <div className="how-step-num">1</div>
            <h4>Upload & Score</h4>
            <p>Submit land documents. Receive free KYL Score across 5 dimensions in minutes.</p>
          </div>
          <div className="how-step">
            <div className="how-role">Platform</div>
            <div className="how-step-num">2</div>
            <h4>Match & Verify</h4>
            <p>
              Platform matches to 3–5 verified developers. KYC, RERA, and entity verification done
              automatically.
            </p>
          </div>
          <div className="how-step">
            <div className="how-role">Both Parties</div>
            <div className="how-step-num">3</div>
            <h4>Negotiate in Deal Room</h4>
            <p>
              Structured JV workspace. Scenario modelling, term sheet builder, legal templates, and
              e-sign.
            </p>
          </div>
          <div className="how-step">
            <div className="how-role">Post-Deal</div>
            <div className="how-step-num">4</div>
            <h4>Monitor & Execute</h4>
            <p>
              Real-time milestone tracking, budget vs actual dashboards, compliance alerts, payment
              releases.
            </p>
          </div>
        </div>
      </section>

      <section className="proof-section">
        <div className="section-tag">Early Pilot Voices</div>
        <h2 className="section-h2">
          What our <em>pilot users</em> say
        </h2>
        <div className="proof-grid">
          <div className="proof-card">
            <div className="proof-quote">
              &quot;The KYL Score showed me exactly why three developers had rejected my land.
              Within a week of fixing the documents, I had two term sheets.&quot;
            </div>
            <div className="proof-author">
              <div className="proof-avatar" style={{ background: 'var(--terracotta)' }}>
                RV
              </div>
              <div>
                <div className="proof-name">Ramesh Varma</div>
                <div className="proof-role">Landowner · Kompally, Hyderabad</div>
              </div>
            </div>
          </div>
          <div className="proof-card">
            <div className="proof-quote">
              &quot;Feasibility used to take our team 3 weeks. On Bhoomi Sethu, I had FSI
              calculations and a cost benchmark before the landowner meeting even ended.&quot;
            </div>
            <div className="proof-author">
              <div className="proof-avatar" style={{ background: 'var(--green)' }}>
                SP
              </div>
              <div>
                <div className="proof-name">Suresh Pillai</div>
                <div className="proof-role">Project Head · Residential Developer</div>
              </div>
            </div>
          </div>
          <div className="proof-card">
            <div className="proof-quote">
              &quot;As an architect, I was always brought in after the deal. Here, I&apos;m embedded
              at step one. My test-fits are influencing deal structures — that&apos;s
              unprecedented.&quot;
            </div>
            <div className="proof-author">
              <div className="proof-avatar" style={{ background: 'var(--sand)' }}>
                AK
              </div>
              <div>
                <div className="proof-name">Ananya Krishnan</div>
                <div className="proof-role">Architect · Hyderabad</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>
          Ready to unlock your
          <br />
          land&apos;s <em style={{ fontStyle: 'italic' }}>true value?</em>
        </h2>
        <p>
          Join landowners, developers and professionals building India&apos;s most trusted land
          marketplace.
        </p>
        <div className="cta-options">
          <button type="button" className="cta-option" onClick={() => navigate('/dashboard')}>
            <span className="cta-option-icon">🏚️</span>
            <div className="cta-option-title">I own land</div>
            <div className="cta-option-desc">
              Get free KYL Score and connect with verified developers
            </div>
          </button>
          <button type="button" className="cta-option" onClick={() => navigate('/listings')}>
            <span className="cta-option-icon">🏗️</span>
            <div className="cta-option-title">I&apos;m a developer</div>
            <div className="cta-option-desc">
              Browse verified land with feasibility data attached
            </div>
          </button>
          <button type="button" className="cta-option">
            <span className="cta-option-icon">👷</span>
            <div className="cta-option-title">I&apos;m a professional</div>
            <div className="cta-option-desc">
              Join as architect, engineer, legal or financial advisor
            </div>
          </button>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
