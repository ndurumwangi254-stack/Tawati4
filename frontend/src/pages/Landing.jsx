import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { CheckCircleIcon, PillIcon } from "../components/Icons";

const TRUST_ITEMS = [
  "100% Genuine Sealed Drugs",
  "Cold-Chain Insulins & Vaccines",
  "Licensed Clinical Pharmacists",
  "Same-Day Refill Dispatch",
];

const STATS = [
  { number: "12,500+", label: "Prescriptions Safely Dispensed" },
  { number: "850+", label: "Chronic Care Members Monitored", tone: "green" },
  { number: "100%", label: "Cold-Chain Compliant Biologics" },
  { number: "< 15 Mins", label: "Average In-Store Wait Time", tone: "accent" },
];

const SERVICES = [
  {
    n: 1,
    title: "Prescription Dispensing & Drug Interaction Audits",
    desc: "Every doctor's prescription is reviewed by certified pharmacists for potential drug-drug interactions, accurate renal dosing, food incompatibilities, and generic bioavailability equivalencies.",
    tag: "Certified PPB Standards",
  },
  {
    n: 2,
    title: "Hypertension, Diabetes & Asthma Adherence",
    desc: "Scheduled monthly refill kits, personalized pill organizers, and continuous blood glucose & pressure tracking.",
    tag: "Free Monthly Reviews",
  },
  {
    n: 3,
    title: "Pediatric Nutrition & Front Shop Retail",
    desc: "Trusted infant formulas, diapering essentials, premium prenatal vitamins, and certified sanitization devices.",
    tag: "Retail & Clinical Quality",
  },
  {
    n: 4,
    title: "Walk-In Diagnostic Screenings",
    desc: "Fast, professional on-site screenings including automated blood pressure profiling, random blood glucose (RBS), and BMI calculations with immediate clinical referrals.",
    tag: "Same-Day Results",
  },
  {
    n: 5,
    title: "Continuous Cold-Chain Storage",
    desc: "Dedicated temperature-monitored pharmaceutical fridges (2°C \u2013 8°C) with dual solar and generator backup to preserve insulin, monoclonal antibodies, and vaccines.",
    tag: "WHO-Standard Verified",
  },
  {
    n: 6,
    title: "Cold-Chain & Institutional Supply",
    desc: "Licensed pharmaceutical distribution, continuous cold-chain biologics management, and verified bulk supplies for healthcare facilities and clinics across Karatina and Nyeri County.",
    tag: "B2B Wholesale Ready",
  },
];

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="brand-badge">TC</div>
        <span className="brand-name">TAWATI CHEMIST</span>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="landing-hero">
        <div className="hero-grid">
          <div>
            <div className="eyebrow">
              Licensed Community Dispensary<span className="eyebrow-sep">·</span>PPB Reg: PPB/RET/2024-884
            </div>
            <p className="hero-location">Three Kilometer Junction, Karogoto Center, Karatina</p>

            <h1 className="hero-title">Certified Community Pharmacy &amp; Prescription Dispensary</h1>
            <p className="hero-desc">
              Providing verified sealed prescription medications, certified superintendent pharmacist
              counseling, chronic therapy monitoring, and fast cold-chain delivery for families across
              Karogoto, Karatina, and Nyeri County.
            </p>

            <div className="hero-cta">
              <button className="btn btn-primary" onClick={() => navigate("/login")}>
                Sign In →
              </button>
            </div>

            <div className="trust-row">
              {TRUST_ITEMS.map((t) => (
                <div className="trust-item" key={t}>
                  <CheckCircleIcon width={18} height={18} />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-visual">
            <PillIcon width={96} height={96} className="hero-visual-icon" strokeWidth={1.3} />
            <div className="hero-visual-caption">
              <div className="loc">Tawati Chemist Main Dispensary · Three Kilometer Junction, Karogoto Center, Karatina</div>
              <div className="owner">Owned &amp; Supervised by Pharm. Anthony Wanjohi, B.Pharm</div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- Stats ---------------- */}
      <section className="stats-row">
        {STATS.map((s) => (
          <div className="stat-item" key={s.label}>
            <div className={"stat-number" + (s.tone ? ` ${s.tone}` : "")}>{s.number}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ---------------- Services ---------------- */}
      <section className="landing-section tinted">
        <div className="landing-section-inner">
          <div className="eyebrow">COMPREHENSIVE PHARMACY CARE</div>
          <h2 className="section-heading">Clinical Excellence for Patients &amp; Families</h2>
          <p className="section-desc">
            Beyond standard over-the-counter sales, Tawati Chemist operates as an accredited clinical
            care partner ensuring safe drug utilization and preventative health screening.
          </p>

          <div className="services-grid">
            {SERVICES.map((s) => (
              <div className="service-card" key={s.n}>
                <div className={`service-number n${s.n}`}>{String(s.n).padStart(2, "0")}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
                <span className="service-tag">{s.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Pharmacist / Ownership ---------------- */}
      <section className="landing-section">
        <div className="eyebrow">SUPERINTENDENT PHARMACIST &amp; OWNERSHIP</div>
        <h2 className="section-heading">Owned &amp; Clinically Directed by Pharm. Anthony Wanjohi</h2>
        <p className="section-desc">
          At Tawati Chemist, you receive direct, personalized care from the owner himself. Pharm.
          Anthony Wanjohi is the sole licensed superintendent pharmacist, personally inspecting every
          batch and reviewing all patient medications in Karogoto.
        </p>

        <div className="pharmacist-card">
          <div className="pharmacist-header">
            <div className="avatar-circle">AW</div>
            <div>
              <h3>
                Pharm. Anthony Wanjohi <span className="pill">Sole Pharmacist &amp; Owner</span>
              </h3>
              <div className="pharmacist-role">Superintendent Pharmacist &amp; Founder</div>
              <div className="pharmacist-reg">B.Pharm · PPB Registration: PPB/PHARM/2012-4418</div>
            </div>
          </div>

          <p className="pharmacist-bio">
            With over a decade of dedicated clinical practice, Pharm. Anthony Wanjohi established
            Tawati Chemist to provide genuine pharmaceutical access and hands-on patient counseling in
            Karogoto, Karatina, and rural Nyeri. As the sole licensed pharmacist and owner, he
            personally oversees all dispensing, patient safety, and prescription reviews at the counter.
          </p>

          <div className="mini-feature-grid">
            <div className="mini-feature">
              <div className="mini-feature-title">
                <CheckCircleIcon width={16} height={16} /> Direct Pharmacist Review
              </div>
              <p>Every prescription is personally verified for safety, interactions, and accurate dosage by Pharm. Anthony.</p>
            </div>
            <div className="mini-feature">
              <div className="mini-feature-title">
                <CheckCircleIcon width={16} height={16} /> Chronic Disease Monitoring
              </div>
              <p>Specialized therapy management for hypertension, diabetes, and asthma patients across Karatina.</p>
            </div>
            <div className="mini-feature">
              <div className="mini-feature-title">
                <CheckCircleIcon width={16} height={16} /> Authentic Cold-Chain Care
              </div>
              <p>Strict temperature monitoring and sealed sourcing directly from verified PPB-registered distributors.</p>
            </div>
          </div>

          <div className="pharmacist-footer">
            <div>Direct Pharmacist Consultation Desk: <strong>0714 318 869</strong></div>
            <span className="badge-licensed">Pharmacy &amp; Poisons Board Licensed</span>
          </div>
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <footer className="landing-footer">
        <div className="footer-grid">
          <div className="footer-col">
            <div className="footer-brand">
              <div className="brand-badge">TC</div>
              <div className="footer-brand-text">
                <strong>TAWATI CHEMIST</strong>
                <span>Community Pharmacy &amp; Retail Dispensary</span>
              </div>
            </div>
            <p className="footer-desc">
              Tawati Chemist is an accredited community healthcare institution committed to delivering
              genuine pharmaceuticals, chronic illness medication support, and professional clinical
              care in Karogoto, Karatina, and across Nyeri County.
            </p>
            <div className="footer-badges">
              <div className="footer-badge">
                <CheckCircleIcon width={15} height={15} /> PPB License: PPB/RET/2024-884
              </div>
              <div className="footer-badge">
                <CheckCircleIcon width={15} height={15} /> WHO-Standard Cold-Chain Storage Verified
              </div>
            </div>
          </div>

          <div className="footer-col">
            <h4>Services</h4>
            <ul>
              <li>Prescription Dispensing</li>
              <li>Chronic Refill Packs</li>
              <li>Diagnostic Screenings</li>
              <li>Pediatric Nutrition</li>
              <li>Vaccines &amp; Insulins</li>
              <li>Superintendent Pharmacist</li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Hours &amp; Location</h4>
            <dl className="footer-hours">
              <dt>Monday – Saturday</dt>
              <dd>7:30 AM – 10:00 PM</dd>
              <dt>Sundays &amp; Holidays</dt>
              <dd>9:00 AM – 8:00 PM</dd>
              <dt>Dispensary Address</dt>
              <dd>Three Kilometer Junction, Karogoto Center, Karatina</dd>
            </dl>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Tawati Chemist Ltd. All rights reserved. · Pharmacy and Poisons Act Cap 244 (Laws of Kenya)</span>
          <span>Prescription medicines dispensed strictly against valid prescriptions</span>
        </div>
      </footer>
    </div>
  );
}
