import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { IconLogo } from '../components/icons';
import {
  Brain, Activity, CloudSun, Code2, ArrowRight, Github,
  Check, X, ChevronDown, Sparkles, Mountain, BarChart3,
} from 'lucide-react';

const GITHUB_URL = 'https://github.com/imallakov/enduranceai';

/* ────────────────────────────────────────────────────────────────── */
/*  Subcomponents                                                     */
/* ────────────────────────────────────────────────────────────────── */

const Nav: React.FC<{ isAuthenticated: boolean }> = ({ isAuthenticated }) => (
  <nav className="landing-nav">
    <Link to="/" className="landing-nav-brand">
      <IconLogo size={24} />
      <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)', letterSpacing: -0.3 }}>EnduranceAI</span>
    </Link>
    <div className="landing-nav-links">
      <a href="#features" className="landing-nav-link">Features</a>
      <a href="#how-it-works" className="landing-nav-link">How it works</a>
      <a href="#pricing" className="landing-nav-link">Pricing</a>
      <a href="#faq" className="landing-nav-link">FAQ</a>
    </div>
    <div className="landing-nav-cta">
      <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
        <Github size={14} /> GitHub
      </a>
      {isAuthenticated ? (
        <Link to="/dashboard" className="btn btn-coral" style={{ textDecoration: 'none' }}>
          Go to Dashboard <ArrowRight size={14} />
        </Link>
      ) : (
        <>
          <Link to="/login" className="btn btn-ghost" style={{ textDecoration: 'none' }}>Sign in</Link>
          <Link to="/register" className="btn btn-coral" style={{ textDecoration: 'none' }}>
            Get free access <ArrowRight size={14} />
          </Link>
        </>
      )}
    </div>
  </nav>
);

const PredictionCardMockup: React.FC = () => (
  <div className="landing-hero-mockup">
    <div className="landing-mockup-card">
      <div className="landing-mockup-head">
        <div>
          <div className="landing-mockup-eyebrow">PREDICTED FINISH</div>
          <div className="landing-mockup-marathon">Berlin Marathon · Sep 27</div>
        </div>
        <div className="landing-mockup-pill">CONFIDENT</div>
      </div>
      <div className="landing-mockup-time mono">3:24:18</div>
      <div className="landing-mockup-pace">
        <span style={{ color: 'var(--muted)' }}>Pace</span>
        <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>4:51 /km</span>
      </div>
      <div className="landing-mockup-divider" />
      <div className="landing-mockup-breakdown-label">HOW WE GOT THERE</div>
      <div className="landing-mockup-row">
        <span>Base (Daniels VDOT)</span>
        <span className="mono">3:30:00</span>
      </div>
      <div className="landing-mockup-row">
        <span>Course (Minetti)</span>
        <span className="mono" style={{ color: 'var(--success)' }}>−02:34</span>
      </div>
      <div className="landing-mockup-row">
        <span>Weather (ACSM)</span>
        <span className="mono" style={{ color: 'var(--warning)' }}>+00:48</span>
      </div>
      <div className="landing-mockup-row">
        <span>ML correction</span>
        <span className="mono" style={{ color: 'var(--success)' }}>−04:56</span>
      </div>
      <div className="landing-mockup-divider" />
      <div className="landing-mockup-row landing-mockup-row-total">
        <span style={{ fontWeight: 600 }}>Hybrid prediction</span>
        <span className="mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>3:24:18</span>
      </div>
    </div>
    <div className="landing-mockup-glow" />
  </div>
);

const MethodBadges: React.FC = () => (
  <div className="landing-method-badges">
    <span className="landing-method-badge">Daniels VDOT</span>
    <span className="landing-method-badge">XGBoost</span>
    <span className="landing-method-badge">Minetti elevation</span>
    <span className="landing-method-badge">ACSM WBGT</span>
  </div>
);

const Hero: React.FC = () => (
  <section className="landing-hero">
    <div className="landing-hero-text">
      <div className="landing-hero-eyebrow">
        <Sparkles size={12} /> OPEN-SOURCE MARATHON COACH
      </div>
      <h1 className="landing-hero-title">
        Predict your marathon.<br />
        <span style={{ color: 'var(--accent)' }}>Train smarter.</span>
      </h1>
      <p className="landing-hero-sub">
        Hybrid prediction engine combining <strong style={{ color: 'var(--text)' }}>Daniels VDOT</strong>, machine learning, and corrections for elevation and weather.
        <br />
        <strong style={{ color: 'var(--text)' }}>Validated at 4.7 min MAE</strong> on independent test data — full methodology on GitHub.
      </p>
      <div className="landing-hero-ctas">
        <Link to="/register" className="btn btn-coral" style={{ height: 44, padding: '0 22px', fontSize: 14, textDecoration: 'none' }}>
          Get free access <ArrowRight size={16} />
        </Link>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ height: 44, padding: '0 22px', fontSize: 14, textDecoration: 'none' }}>
          <Github size={16} /> View source
        </a>
      </div>
      <MethodBadges />
      <div className="landing-hero-trust">
        <span>● Free during open beta</span>
        <span>● No credit card</span>
        <span>● Open source MIT</span>
      </div>
    </div>
    <PredictionCardMockup />
  </section>
);

const NumbersStrip: React.FC = () => {
  const stats = [
    { value: '4.7', unit: 'min', label: 'Hybrid MAE', sub: 'On independent test set' },
    { value: '28%', unit: '', label: 'Lower error', sub: 'Than Riegel formula (industry)' },
    { value: '4', unit: '', label: 'Scientific methods', sub: 'Daniels · ML · Minetti · ACSM' },
    { value: '100%', unit: '', label: 'Open source', sub: 'MIT · audit every formula' },
  ];
  return (
    <section className="landing-numbers">
      {stats.map((s) => (
        <div key={s.label} className="landing-number-card">
          <div className="landing-number-value mono">
            {s.value}{s.unit && <span style={{ fontSize: 18, color: 'var(--muted)', marginLeft: 4 }}>{s.unit}</span>}
          </div>
          <div className="landing-number-label">{s.label}</div>
          <div className="landing-number-sub">{s.sub}</div>
        </div>
      ))}
    </section>
  );
};

const Features: React.FC = () => {
  const features = [
    {
      Icon: Brain,
      title: 'Hybrid prediction engine',
      body: 'Daniels VDOT methodology × XGBoost ML correction × Minetti elevation × ACSM heat stress. Four published methods combined — every coefficient lives on GitHub, not behind a paywall.',
    },
    {
      Icon: Activity,
      title: 'Plan that adapts to your runs',
      body: 'Pace zones auto-refresh when your VDOT changes — no stale 5:30/km targets when you can hold 5:10. Activities from Strava auto-link to planned workouts. Distances and structure stay yours; only the pace zones move with your fitness.',
    },
    {
      Icon: CloudSun,
      title: 'Weather + elevation aware',
      body: 'Racing Boston in 32°C heatwave? 600m gain at Athens? We adjust your prediction. Strava and Garmin do not.',
    },
    {
      Icon: Code2,
      title: 'Open source. No black box.',
      body: 'See every formula, every coefficient, every prediction reasoning. Garmin Firstbeat hides it. We publish it on GitHub.',
    },
  ];
  return (
    <section id="features" className="landing-section">
      <div className="landing-section-head">
        <div className="landing-eyebrow">WHY ENDURANCEAI</div>
        <h2 className="landing-h2">Built for runners who want to know <em>why</em>.</h2>
        <p className="landing-section-sub">Not another AI coach with hidden algorithms. Every formula and dataset is published.</p>
      </div>
      <div className="landing-features-grid">
        {features.map(({ Icon, title, body }) => (
          <div key={title} className="landing-feature-card">
            <div className="landing-feature-icon">
              <Icon size={22} />
            </div>
            <h3 className="landing-feature-title">{title}</h3>
            <p className="landing-feature-body">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const HowItWorks: React.FC = () => {
  const steps = [
    { n: '01', title: 'Connect Strava', body: 'One-click OAuth. We auto-import your last 365 days of activities.' },
    { n: '02', title: 'Pick your target marathon', body: 'Choose from 36 majors (Berlin, Boston, Tokyo…) or upload custom GPX.' },
    { n: '03', title: 'Get prediction + 16-week plan', body: 'Daniels-based personalized plan. Pace zones auto-update with your fitness; workouts auto-tick as you run them.' },
  ];
  return (
    <section id="how-it-works" className="landing-section landing-section-dark">
      <div className="landing-section-head">
        <div className="landing-eyebrow" style={{ color: 'rgba(255,255,255,0.6)' }}>HOW IT WORKS</div>
        <h2 className="landing-h2" style={{ color: '#fff' }}>From Strava connect to race day in 3 steps.</h2>
      </div>
      <div className="landing-steps">
        {steps.map(({ n, title, body }) => (
          <div key={n} className="landing-step">
            <div className="landing-step-num mono">{n}</div>
            <h3 className="landing-step-title">{title}</h3>
            <p className="landing-step-body">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

const Comparison: React.FC = () => {
  const rows = [
    { feat: 'Open-source ML model',         us: true,  strava: false, tp: false, garmin: false, runna: false },
    { feat: 'Weather correction',           us: true,  strava: false, tp: false, garmin: false, runna: false },
    { feat: 'Elevation correction',         us: true,  strava: false, tp: 'partial', garmin: false, runna: false },
    { feat: 'Adaptive weekly plan',         us: true,  strava: false, tp: true,  garmin: true,  runna: true  },
    { feat: 'Transparent algorithm',        us: true,  strava: false, tp: false, garmin: false, runna: false },
    { feat: 'Free tier',                    us: true,  strava: 'partial', tp: false, garmin: 'hardware', runna: 'partial' },
  ];
  const Cell: React.FC<{ v: boolean | string }> = ({ v }) => {
    if (v === true)  return <Check size={16} style={{ color: 'var(--success)' }} />;
    if (v === false) return <X size={16} style={{ color: 'var(--muted-2)' }} />;
    return <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>{v}</span>;
  };
  return (
    <section className="landing-section">
      <div className="landing-section-head">
        <div className="landing-eyebrow">VS THE COMPETITION</div>
        <h2 className="landing-h2">The only one that does all four.</h2>
      </div>
      <div className="landing-table-wrap">
        <table className="landing-compare">
          <thead>
            <tr>
              <th></th>
              <th className="us-col">EnduranceAI</th>
              <th>Strava Premium</th>
              <th>TrainingPeaks</th>
              <th>Garmin Coach</th>
              <th>Runna</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.feat}>
                <td className="feat-col">{r.feat}</td>
                <td className="us-col"><Cell v={r.us} /></td>
                <td><Cell v={r.strava} /></td>
                <td><Cell v={r.tp} /></td>
                <td><Cell v={r.garmin} /></td>
                <td><Cell v={r.runna} /></td>
              </tr>
            ))}
            <tr>
              <td className="feat-col" style={{ fontWeight: 600 }}>Price</td>
              <td className="us-col" style={{ fontWeight: 600 }}>$0 – $12</td>
              <td>$14/mo</td>
              <td>$20/mo</td>
              <td>$400+ hw</td>
              <td>$20/mo</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};

const PricingTeaser: React.FC = () => (
  <section id="pricing" className="landing-section">
    <div className="landing-section-head">
      <div className="landing-eyebrow">PRICING</div>
      <h2 className="landing-h2">Free during beta. Affordable forever.</h2>
      <p className="landing-section-sub">Lock in lifetime founding member pricing before public launch.</p>
    </div>
    <div className="landing-pricing-grid">
      <div className="landing-pricing-card">
        <div className="landing-pricing-tag">AVAILABLE NOW</div>
        <h3 className="landing-pricing-name">Open Beta</h3>
        <div className="landing-pricing-price">
          <span className="mono" style={{ fontSize: 38, fontWeight: 700, color: 'var(--text)' }}>$0</span>
          <span style={{ color: 'var(--muted)', fontSize: 14, marginLeft: 8 }}>during beta</span>
        </div>
        <p className="landing-pricing-sub">Full access. No card required. Email only.</p>
        <ul className="landing-pricing-list">
          <li><Check size={14} style={{ color: 'var(--success)' }} /> Full hybrid prediction</li>
          <li><Check size={14} style={{ color: 'var(--success)' }} /> 16-week plan with auto-refreshing paces</li>
          <li><Check size={14} style={{ color: 'var(--success)' }} /> Strava sync (365 days)</li>
          <li><Check size={14} style={{ color: 'var(--success)' }} /> All 36 marathons in catalog</li>
        </ul>
        <Link to="/register" className="btn btn-coral" style={{ width: '100%', justifyContent: 'center', height: 40, textDecoration: 'none' }}>
          Start free <ArrowRight size={14} />
        </Link>
      </div>

      <div className="landing-pricing-card landing-pricing-card-featured">
        <div className="landing-pricing-tag landing-pricing-tag-featured">FOUNDING MEMBER · LIMIT 100</div>
        <h3 className="landing-pricing-name">Lifetime Access</h3>
        <div className="landing-pricing-price">
          <span className="mono" style={{ fontSize: 38, fontWeight: 700, color: 'var(--text)' }}>$99</span>
          <span style={{ color: 'var(--muted)', fontSize: 14, marginLeft: 8 }}>one-time, forever</span>
        </div>
        <p className="landing-pricing-sub">Premium features for life. Launches in ~3 months.</p>
        <ul className="landing-pricing-list">
          <li><Check size={14} style={{ color: 'var(--success)' }} /> Everything in Open Beta</li>
          <li><Check size={14} style={{ color: 'var(--success)' }} /> Unlimited predictions forever</li>
          <li><Check size={14} style={{ color: 'var(--success)' }} /> Plan export PDF/CSV</li>
          <li><Check size={14} style={{ color: 'var(--success)' }} /> Multi-marathon planning</li>
          <li><Check size={14} style={{ color: 'var(--success)' }} /> Priority support</li>
          <li><Check size={14} style={{ color: 'var(--success)' }} /> All future Premium features</li>
        </ul>
        <button className="btn btn-coral" style={{ width: '100%', justifyContent: 'center', height: 40, opacity: 0.6, cursor: 'not-allowed' }} disabled>
          Join waitlist — opens in March
        </button>
      </div>

      <div className="landing-pricing-card">
        <div className="landing-pricing-tag">AFTER BETA</div>
        <h3 className="landing-pricing-name">Premium</h3>
        <div className="landing-pricing-price">
          <span className="mono" style={{ fontSize: 38, fontWeight: 700, color: 'var(--text)' }}>$12</span>
          <span style={{ color: 'var(--muted)', fontSize: 14, marginLeft: 8 }}>/month</span>
        </div>
        <p className="landing-pricing-sub">Or $99/year (save 31%). Cancel anytime.</p>
        <ul className="landing-pricing-list">
          <li><Check size={14} style={{ color: 'var(--success)' }} /> All Open Beta features</li>
          <li><Check size={14} style={{ color: 'var(--success)' }} /> Unlimited predictions</li>
          <li><Check size={14} style={{ color: 'var(--success)' }} /> Adaptive plan engine</li>
          <li><Check size={14} style={{ color: 'var(--success)' }} /> Analytics dashboard</li>
          <li><Check size={14} style={{ color: 'var(--success)' }} /> 14-day free trial</li>
        </ul>
        <Link to="/register" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', height: 40, textDecoration: 'none' }}>
          Notify me at launch
        </Link>
      </div>
    </div>
  </section>
);

const FAQItem: React.FC<{ q: string; a: React.ReactNode }> = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`landing-faq-item${open ? ' open' : ''}`}>
      <button className="landing-faq-q" onClick={() => setOpen(v => !v)}>
        <span>{q}</span>
        <ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }} />
      </button>
      {open && <div className="landing-faq-a">{a}</div>}
    </div>
  );
};

const FAQ: React.FC = () => (
  <section id="faq" className="landing-section">
    <div className="landing-section-head">
      <div className="landing-eyebrow">FAQ</div>
      <h2 className="landing-h2">Things you might ask.</h2>
    </div>
    <div className="landing-faq-wrap">
      <FAQItem
        q="Is this really free during beta?"
        a="Yes. No credit card, no usage limits, no hidden gates. We're collecting feedback to refine the product before launching paid tiers in ~3 months. Sign up now to lock in Founding Member pricing."
      />
      <FAQItem
        q="How does your prediction work?"
        a={<>We start with Jack Daniels' VDOT methodology (gold-standard physiology since 1998), then layer in a Minetti polynomial for course elevation gain, an ACSM WBGT term for race-day heat stress, and an XGBoost correction trained on training-history features. On an independent 81-runner test set: <strong>Hybrid model MAE 4.7 min</strong> vs Daniels VDOT 6.2 min vs Riegel formula (industry baseline used by Strava and most calculators) 6.5 min — our hybrid achieves <strong>28% lower error than Riegel</strong> (1.39× speedup ratio) with 94% of predictions within ±10 min. For runners without training history, demographics-only fallback degrades to ~27 min MAE — which is why connecting Strava matters. <a href={`${GITHUB_URL}/tree/main/backend/ml/validation_results`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-2)' }}>Full validation results</a> on GitHub.</>}
      />
      <FAQItem
        q="What data do you collect?"
        a={<>Strava activities (with your explicit OAuth consent), age, gender, and target marathon. Nothing else. We don't sell data. We don't run ads. See our <Link to="/legal/privacy" style={{ color: 'var(--primary-2)' }}>Privacy Policy</Link>.</>}
      />
      <FAQItem
        q="Do I need a Garmin or Apple Watch?"
        a="No. Any data source works: Strava (most common), manual FIT/GPX/TCX upload, or just enter activities manually. Tested with Garmin, Apple Watch, Polar, Coros, Suunto, and Wahoo."
      />
      <FAQItem
        q="Can I see the source code?"
        a={<>Yes. The full backend (Django) and frontend (React) source code lives on GitHub: <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-2)' }}>github.com/imallakov/enduranceai</a>. MIT-licensed. Audit our ML, fork it, or self-host.</>}
      />
      <FAQItem
        q="Why should I trust a new product over Garmin or Strava?"
        a="Two reasons that matter. (1) Methodology is public — Garmin Firstbeat is a closed black box; we publish every formula. (2) Built by a runner-developer who actually runs marathons, not a corporate growth team. Start with the free beta — the product proves itself or it doesn't. No subscription, no card."
      />
    </div>
  </section>
);

const CTAFinal: React.FC = () => (
  <section className="landing-final-cta">
    <div className="landing-final-inner">
      <Sparkles size={28} style={{ color: 'var(--accent)' }} />
      <h2 className="landing-h2" style={{ color: '#fff', marginTop: 16 }}>
        Start training with data, not guesswork.
      </h2>
      <p className="landing-final-sub">
        Free forever during beta. Lock in founding member pricing before March.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
        <Link to="/register" className="btn btn-coral" style={{ height: 44, padding: '0 22px', fontSize: 14, textDecoration: 'none' }}>
          Get free access <ArrowRight size={16} />
        </Link>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn" style={{ height: 44, padding: '0 22px', fontSize: 14, background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', textDecoration: 'none' }}>
          <Github size={16} /> Star on GitHub
        </a>
      </div>
    </div>
  </section>
);

const Footer: React.FC = () => (
  <footer className="landing-footer">
    <div className="landing-footer-inner">
      <div className="landing-footer-brand">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <IconLogo size={20} />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>EnduranceAI</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, margin: 0, maxWidth: 280 }}>
          Open-source marathon coach built on Daniels VDOT, machine learning, weather and elevation models.
        </p>
      </div>
      <div className="landing-footer-col">
        <div className="landing-footer-head">Product</div>
        <a href="#features">Features</a>
        <a href="#how-it-works">How it works</a>
        <a href="#pricing">Pricing</a>
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">GitHub</a>
      </div>
      <div className="landing-footer-col">
        <div className="landing-footer-head">Legal</div>
        <Link to="/legal/privacy">Privacy Policy</Link>
        <Link to="/legal/terms">Terms of Service</Link>
        <Link to="/legal/cookies">Cookie Policy</Link>
      </div>
      <div className="landing-footer-col">
        <div className="landing-footer-head">Account</div>
        <Link to="/login">Sign in</Link>
        <Link to="/register">Create account</Link>
      </div>
    </div>
    <div className="landing-footer-bottom">
      <span>© 2026 EnduranceAI · MIT License</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        Built with <BarChart3 size={11} /> science, <Mountain size={11} /> data, and <Code2 size={11} /> open code.
      </span>
    </div>
  </footer>
);

/* ────────────────────────────────────────────────────────────────── */
/*  Page                                                              */
/* ────────────────────────────────────────────────────────────────── */

const Landing: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="landing-root">
      <Nav isAuthenticated={isAuthenticated} />
      <Hero />
      <NumbersStrip />
      <Features />
      <HowItWorks />
      <Comparison />
      <PricingTeaser />
      <FAQ />
      <CTAFinal />
      <Footer />
    </div>
  );
};

export default Landing;
