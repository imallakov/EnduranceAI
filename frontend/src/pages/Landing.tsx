import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { IconLogo } from '../components/icons';
import {
  Brain, Activity, CloudSun, Code2, ArrowRight, Github,
  Check, X, ChevronDown, Sparkles, Mountain, BarChart3,
} from 'lucide-react';
import { useT } from '../i18n/context';

const GITHUB_URL = 'https://github.com/imallakov/EnduranceAI';

/* ────────────────────────────────────────────────────────────────── */
/*  Subcomponents                                                     */
/* ────────────────────────────────────────────────────────────────── */

const Nav: React.FC<{ isAuthenticated: boolean }> = ({ isAuthenticated }) => {
  const t = useT();
  return (
    <nav className="landing-nav">
      <Link to="/" className="landing-nav-brand">
        <IconLogo size={24} />
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)', letterSpacing: -0.3 }}>EnduranceAI</span>
      </Link>
      <div className="landing-nav-links">
        <a href="#features" className="landing-nav-link">{t.landing.nav.features}</a>
        <a href="#how-it-works" className="landing-nav-link">{t.landing.nav.howItWorks}</a>
        <a href="#pricing" className="landing-nav-link">{t.landing.nav.pricing}</a>
        <a href="#faq" className="landing-nav-link">{t.landing.nav.faq}</a>
      </div>
      <div className="landing-nav-cta">
        <LanguageSwitcher variant="mini" />
        <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ textDecoration: 'none' }}>
          <Github size={14} /> {t.landing.nav.github}
        </a>
        {isAuthenticated ? (
          <Link to="/dashboard" className="btn btn-coral" style={{ textDecoration: 'none' }}>
            {t.landing.nav.goToDashboard} <ArrowRight size={14} />
          </Link>
        ) : (
          <>
            <Link to="/login" className="btn btn-ghost" style={{ textDecoration: 'none' }}>{t.landing.nav.signIn}</Link>
            <Link to="/register" className="btn btn-coral" style={{ textDecoration: 'none' }}>
              {t.landing.nav.getFreeAccess} <ArrowRight size={14} />
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};

const PredictionCardMockup: React.FC = () => {
  const t = useT();
  return (
    <div className="landing-hero-mockup">
      <div className="landing-mockup-card">
        <div className="landing-mockup-head">
          <div>
            <div className="landing-mockup-eyebrow">{t.landing.mockup.predictedFinish}</div>
            <div className="landing-mockup-marathon">Berlin Marathon · Sep 27</div>
          </div>
          <div className="landing-mockup-pill">{t.landing.mockup.confident}</div>
        </div>
        <div className="landing-mockup-time mono">3:24:18</div>
        <div className="landing-mockup-pace">
          <span style={{ color: 'var(--muted)' }}>{t.landing.mockup.pace}</span>
          <span className="mono" style={{ color: 'var(--text)', fontWeight: 600 }}>4:51 /km</span>
        </div>
        <div className="landing-mockup-divider" />
        <div className="landing-mockup-breakdown-label">{t.landing.mockup.howWeGotThere}</div>
        <div className="landing-mockup-row">
          <span>{t.landing.mockup.baseTime}</span>
          <span className="mono">3:30:00</span>
        </div>
        <div className="landing-mockup-row">
          <span>{t.landing.mockup.courseElev}</span>
          <span className="mono" style={{ color: 'var(--success)' }}>−02:34</span>
        </div>
        <div className="landing-mockup-row">
          <span>{t.landing.mockup.weatherTemp}</span>
          <span className="mono" style={{ color: 'var(--warning)' }}>+00:48</span>
        </div>
        <div className="landing-mockup-row">
          <span>{t.landing.mockup.mlCorrection}</span>
          <span className="mono" style={{ color: 'var(--success)' }}>−04:56</span>
        </div>
        <div className="landing-mockup-divider" />
        <div className="landing-mockup-row landing-mockup-row-total">
          <span style={{ fontWeight: 600 }}>{t.landing.mockup.hybridPrediction}</span>
          <span className="mono" style={{ fontWeight: 700, color: 'var(--accent)' }}>3:24:18</span>
        </div>
      </div>
      <div className="landing-mockup-glow" />
    </div>
  );
};

const MethodBadges: React.FC = () => {
  const t = useT();
  return (
    <div className="landing-method-badges">
      <span className="landing-method-badge">{t.landing.badges.daniels}</span>
      <span className="landing-method-badge">{t.landing.badges.xgboost}</span>
      <span className="landing-method-badge">{t.landing.badges.minetti}</span>
      <span className="landing-method-badge">{t.landing.badges.acsm}</span>
    </div>
  );
};

const Hero: React.FC = () => {
  const t = useT();
  return (
    <section className="landing-hero">
      <div className="landing-hero-text">
        <div className="landing-hero-eyebrow">
          <Sparkles size={12} /> {t.landing.hero.eyebrow}
        </div>
        <h1 className="landing-hero-title">
          {t.landing.hero.title1}<br />
          <span style={{ color: 'var(--accent)' }}>{t.landing.hero.title2}</span>
        </h1>
        <p className="landing-hero-sub" dangerouslySetInnerHTML={{__html: `${t.landing.hero.sub1}<br/>${t.landing.hero.sub2}`}}></p>
        <div className="landing-hero-ctas">
          <Link to="/register" className="btn btn-coral" style={{ height: 44, padding: '0 22px', fontSize: 14, textDecoration: 'none' }}>
            {t.landing.nav.getFreeAccess} <ArrowRight size={16} />
          </Link>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost" style={{ height: 44, padding: '0 22px', fontSize: 14, textDecoration: 'none' }}>
            <Github size={16} /> {t.landing.hero.viewSource}
          </a>
        </div>
        <MethodBadges />
        <div className="landing-hero-trust">
          <span>● {t.landing.hero.trustBeta}</span>
          <span>● {t.landing.hero.trustCard}</span>
          <span>● {t.landing.hero.trustOpen}</span>
        </div>
      </div>
      <PredictionCardMockup />
    </section>
  );
};

const NumbersStrip: React.FC = () => {
  const t = useT();
  const stats = [
    { value: '4.7', unit: 'min', label: t.landing.stats.mae, sub: t.landing.stats.maeSub },
    { value: '28%', unit: '', label: t.landing.stats.error, sub: t.landing.stats.errorSub },
    { value: '4', unit: '', label: t.landing.stats.methods, sub: t.landing.stats.methodsSub },
    { value: '100%', unit: '', label: t.landing.stats.open, sub: t.landing.stats.openSub },
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
  const t = useT();
  const features = [
    {
      Icon: Brain,
      title: t.landing.features.f1Title,
      body: t.landing.features.f1Body,
    },
    {
      Icon: Activity,
      title: t.landing.features.f2Title,
      body: t.landing.features.f2Body,
    },
    {
      Icon: CloudSun,
      title: t.landing.features.f3Title,
      body: t.landing.features.f3Body,
    },
    {
      Icon: Code2,
      title: t.landing.features.f4Title,
      body: t.landing.features.f4Body,
    },
  ];
  return (
    <section id="features" className="landing-section">
      <div className="landing-section-head">
        <div className="landing-eyebrow">{t.landing.features.eyebrow}</div>
        <h2 className="landing-h2" dangerouslySetInnerHTML={{__html: t.landing.features.title}}></h2>
        <p className="landing-section-sub">{t.landing.features.sub}</p>
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
  const t = useT();
  const steps = [
    { n: '01', title: t.landing.steps.s1Title, body: t.landing.steps.s1Body },
    { n: '02', title: t.landing.steps.s2Title, body: t.landing.steps.s2Body },
    { n: '03', title: t.landing.steps.s3Title, body: t.landing.steps.s3Body },
  ];
  return (
    <section id="how-it-works" className="landing-section landing-section-dark">
      <div className="landing-section-head">
        <div className="landing-eyebrow" style={{ color: 'rgba(255,255,255,0.6)' }}>{t.landing.steps.eyebrow}</div>
        <h2 className="landing-h2" style={{ color: '#fff' }}>{t.landing.steps.title}</h2>
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
  const t = useT();
  const rows = [
    { feat: t.landing.compare.f1, us: true,  strava: false, tp: false, garmin: false, runna: false },
    { feat: t.landing.compare.f2, us: true,  strava: false, tp: false, garmin: false, runna: false },
    { feat: t.landing.compare.f3, us: true,  strava: false, tp: t.landing.compare.partial, garmin: false, runna: false },
    { feat: t.landing.compare.f4, us: true,  strava: false, tp: true,  garmin: true,  runna: true  },
    { feat: t.landing.compare.f5, us: true,  strava: false, tp: false, garmin: false, runna: false },
    { feat: t.landing.compare.f6, us: true,  strava: t.landing.compare.partial, tp: false, garmin: t.landing.compare.hardware, runna: t.landing.compare.partial },
  ];
  const Cell: React.FC<{ v: boolean | string }> = ({ v }) => {
    if (v === true)  return <Check size={16} style={{ color: 'var(--success)' }} />;
    if (v === false) return <X size={16} style={{ color: 'var(--muted-2)' }} />;
    return <span style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.3 }}>{v as string}</span>;
  };
  return (
    <section className="landing-section">
      <div className="landing-section-head">
        <div className="landing-eyebrow">{t.landing.compare.eyebrow}</div>
        <h2 className="landing-h2">{t.landing.compare.title}</h2>
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
              <td className="feat-col" style={{ fontWeight: 600 }}>{t.landing.compare.price}</td>
              <td className="us-col" style={{ fontWeight: 600 }}>{t.landing.compare.usPrice}</td>
              <td>{t.landing.compare.stravaPrice}</td>
              <td>{t.landing.compare.tpPrice}</td>
              <td>{t.landing.compare.garminPrice}</td>
              <td>{t.landing.compare.runnaPrice}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
};

const PricingTeaser: React.FC = () => {
  const t = useT();
  return (
    <section id="pricing" className="landing-section">
      <div className="landing-section-head">
        <div className="landing-eyebrow">{t.landing.pricing.eyebrow}</div>
        <h2 className="landing-h2">{t.landing.pricing.title}</h2>
        <p className="landing-section-sub">{t.landing.pricing.sub}</p>
      </div>
      <div className="landing-pricing-grid">
        <div className="landing-pricing-card">
          <div className="landing-pricing-tag">{t.landing.pricing.b1Tag}</div>
          <h3 className="landing-pricing-name">{t.landing.pricing.b1Name}</h3>
          <div className="landing-pricing-price">
            <span className="mono" style={{ fontSize: 38, fontWeight: 700, color: 'var(--text)' }}>{t.landing.pricing.b1Price}</span>
            <span style={{ color: 'var(--muted)', fontSize: 14, marginLeft: 8 }}>{t.landing.pricing.b1Period}</span>
          </div>
          <p className="landing-pricing-sub">{t.landing.pricing.b1Sub}</p>
          <ul className="landing-pricing-list">
            <li><Check size={14} style={{ color: 'var(--success)' }} /> {t.landing.pricing.b1F1}</li>
            <li><Check size={14} style={{ color: 'var(--success)' }} /> {t.landing.pricing.b1F2}</li>
            <li><Check size={14} style={{ color: 'var(--success)' }} /> {t.landing.pricing.b1F3}</li>
            <li><Check size={14} style={{ color: 'var(--success)' }} /> {t.landing.pricing.b1F4}</li>
          </ul>
          <Link to="/register" className="btn btn-coral" style={{ width: '100%', justifyContent: 'center', height: 40, textDecoration: 'none' }}>
            {t.landing.pricing.b1Btn} <ArrowRight size={14} />
          </Link>
        </div>
  
        <div className="landing-pricing-card landing-pricing-card-featured">
          <div className="landing-pricing-tag landing-pricing-tag-featured">{t.landing.pricing.b2Tag}</div>
          <h3 className="landing-pricing-name">{t.landing.pricing.b2Name}</h3>
          <div className="landing-pricing-price">
            <span className="mono" style={{ fontSize: 38, fontWeight: 700, color: 'var(--text)' }}>{t.landing.pricing.b2Price}</span>
            <span style={{ color: 'var(--muted)', fontSize: 14, marginLeft: 8 }}>{t.landing.pricing.b2Period}</span>
          </div>
          <p className="landing-pricing-sub">{t.landing.pricing.b2Sub}</p>
          <ul className="landing-pricing-list">
            <li><Check size={14} style={{ color: 'var(--success)' }} /> {t.landing.pricing.b2F1}</li>
            <li><Check size={14} style={{ color: 'var(--success)' }} /> {t.landing.pricing.b2F2}</li>
            <li><Check size={14} style={{ color: 'var(--success)' }} /> {t.landing.pricing.b2F3}</li>
            <li><Check size={14} style={{ color: 'var(--success)' }} /> {t.landing.pricing.b2F4}</li>
            <li><Check size={14} style={{ color: 'var(--success)' }} /> {t.landing.pricing.b2F5}</li>
            <li><Check size={14} style={{ color: 'var(--success)' }} /> {t.landing.pricing.b2F6}</li>
          </ul>
          <button className="btn btn-coral" style={{ width: '100%', justifyContent: 'center', height: 40, opacity: 0.6, cursor: 'not-allowed' }} disabled>
            {t.landing.pricing.b2Btn}
          </button>
        </div>
  
        <div className="landing-pricing-card">
          <div className="landing-pricing-tag">{t.landing.pricing.b3Tag}</div>
          <h3 className="landing-pricing-name">{t.landing.pricing.b3Name}</h3>
          <div className="landing-pricing-price">
            <span className="mono" style={{ fontSize: 38, fontWeight: 700, color: 'var(--text)' }}>{t.landing.pricing.b3Price}</span>
            <span style={{ color: 'var(--muted)', fontSize: 14, marginLeft: 8 }}>{t.landing.pricing.b3Period}</span>
          </div>
          <p className="landing-pricing-sub">{t.landing.pricing.b3Sub}</p>
          <ul className="landing-pricing-list">
            <li><Check size={14} style={{ color: 'var(--success)' }} /> {t.landing.pricing.b3F1}</li>
            <li><Check size={14} style={{ color: 'var(--success)' }} /> {t.landing.pricing.b3F2}</li>
            <li><Check size={14} style={{ color: 'var(--success)' }} /> {t.landing.pricing.b3F3}</li>
            <li><Check size={14} style={{ color: 'var(--success)' }} /> {t.landing.pricing.b3F4}</li>
            <li><Check size={14} style={{ color: 'var(--success)' }} /> {t.landing.pricing.b3F5}</li>
          </ul>
          <Link to="/register" className="btn btn-ghost" style={{ width: '100%', justifyContent: 'center', height: 40, textDecoration: 'none' }}>
            {t.landing.pricing.b3Btn}
          </Link>
        </div>
      </div>
    </section>
  );
};

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

const FAQ: React.FC = () => {
  const t = useT();
  return (
    <section id="faq" className="landing-section">
      <div className="landing-section-head">
        <div className="landing-eyebrow">{t.landing.faq.eyebrow}</div>
        <h2 className="landing-h2">{t.landing.faq.title}</h2>
      </div>
      <div className="landing-faq-wrap">
        <FAQItem
          q={t.landing.faq.q1}
          a={t.landing.faq.a1}
        />
        <FAQItem
          q={t.landing.faq.q2}
          a={<span dangerouslySetInnerHTML={{__html: t.landing.faq.a2.replace('{0}', GITHUB_URL)}}></span>}
        />
        <FAQItem
          q={t.landing.faq.q3}
          a={<>
            {t.landing.faq.a3.split('<Link')[0]}
            <Link to="/legal/privacy" style={{ color: 'var(--primary-2)' }}>Privacy Policy</Link>.
          </>}
        />
        <FAQItem
          q={t.landing.faq.q4}
          a={t.landing.faq.a4}
        />
        <FAQItem
          q={t.landing.faq.q5}
          a={<span dangerouslySetInnerHTML={{__html: t.landing.faq.a5.replace('{0}', GITHUB_URL)}}></span>}
        />
        <FAQItem
          q={t.landing.faq.q6}
          a={t.landing.faq.a6}
        />
      </div>
    </section>
  );
};

const CTAFinal: React.FC = () => {
  const t = useT();
  return (
    <section className="landing-final-cta">
      <div className="landing-final-inner">
        <Sparkles size={28} style={{ color: 'var(--accent)' }} />
        <h2 className="landing-h2" style={{ color: '#fff', marginTop: 16 }}>
          {t.landing.cta.title}
        </h2>
        <p className="landing-final-sub">
          {t.landing.cta.sub}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
          <Link to="/register" className="btn btn-coral" style={{ height: 44, padding: '0 22px', fontSize: 14, textDecoration: 'none' }}>
            {t.landing.nav.getFreeAccess} <ArrowRight size={16} />
          </Link>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="btn" style={{ height: 44, padding: '0 22px', fontSize: 14, background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', textDecoration: 'none' }}>
            <Github size={16} /> {t.landing.cta.star}
          </a>
        </div>
      </div>
    </section>
  );
};

const Footer: React.FC = () => {
  const t = useT();
  return (
    <footer className="landing-footer">
      <div className="landing-footer-inner">
        <div className="landing-footer-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <IconLogo size={20} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>EnduranceAI</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, margin: 0, maxWidth: 280 }}>
            {t.landing.footer.desc}
          </p>
        </div>
        <div className="landing-footer-col">
          <div className="landing-footer-head">{t.landing.footer.product}</div>
          <a href="#features">{t.landing.nav.features}</a>
          <a href="#how-it-works">{t.landing.nav.howItWorks}</a>
          <a href="#pricing">{t.landing.nav.pricing}</a>
          <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">{t.landing.nav.github}</a>
        </div>
        <div className="landing-footer-col">
          <div className="landing-footer-head">{t.landing.footer.legal}</div>
          <Link to="/legal/privacy">Privacy Policy</Link>
          <Link to="/legal/terms">Terms of Service</Link>
          <Link to="/legal/cookies">Cookie Policy</Link>
        </div>
        <div className="landing-footer-col">
          <div className="landing-footer-head">{t.landing.footer.account}</div>
          <Link to="/login">{t.landing.nav.signIn}</Link>
          <Link to="/register">{t.landing.nav.getFreeAccess}</Link>
        </div>
      </div>
      <div className="landing-footer-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>{t.landing.footer.rights}</span>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          {t.landing.footer.builtWith1} <BarChart3 size={11} /> {t.landing.footer.builtWith2} <Mountain size={11} /> {t.landing.footer.builtWith3} <Code2 size={11} /> {t.landing.footer.builtWith4}
        </span>
      </div>
    </footer>
  );
};

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
