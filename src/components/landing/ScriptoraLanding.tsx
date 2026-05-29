import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  Globe2,
  Play,
  Sparkles,
} from "lucide-react";
import { paymentsConfig } from "@/config/payments";
import { setUILanguage, UI_LANGUAGES, useUILanguage, type UILanguage } from "@/lib/i18n";
import {
  audienceTags,
  demoScreenshots,
  ecosystemSystems,
  heroPoster,
  L,
  landingCopy,
  landingPlans,
  productTourVideo,
  socialProofCards,
  testimonialSlots,
  type DemoShotId,
} from "./landing-v3-data";

interface ScriptoraLandingProps {
  mounted: boolean;
  devOn: boolean;
  canStart: boolean;
  isSignedIn: boolean;
  onEnter: () => void;
  onLogoClick: () => void;
}

export function ScriptoraLanding({
  mounted,
  devOn,
  canStart,
  isSignedIn,
  onEnter,
  onLogoClick,
}: ScriptoraLandingProps) {
  const lang = useUILanguage();
  const copy = landingCopy[lang] ?? landingCopy.en;
  const [activeDemo, setActiveDemo] = useState<DemoShotId>("dashboard");

  const primaryPlans = paymentsConfig.plans.filter((plan) =>
    ["free", "pro_monthly", "premium_monthly"].includes(plan.id),
  );

  const demoIds = Object.keys(demoScreenshots) as DemoShotId[];
  const activeShot = demoScreenshots[activeDemo];

  return (
    <main className="scriptora-landing scriptora-landing-v3 min-h-screen overflow-x-hidden bg-[#050608] text-white">
      <div className="scriptora-landing-bg scriptora-landing-v3-bg" aria-hidden="true" />

      <header className="scriptora-landing-nav">
        <button
          type="button"
          onClick={onLogoClick}
          className="scriptora-landing-brand"
          aria-label="Scriptora OS"
        >
          <span className="scriptora-landing-brand-mark">
            <Sparkles className="h-4 w-4" />
          </span>
          <span>Scriptora OS</span>
          {devOn && <span className="scriptora-landing-dev">DEV</span>}
        </button>

        <nav className="hidden items-center gap-6 text-xs font-medium text-white/55 md:flex">
          <a href="#problem">{copy.navProblem}</a>
          <a href="#solution">{copy.navSolution}</a>
          <a href="#systems">{copy.navSystems}</a>
          <a href="#demo">{copy.navDemo}</a>
          <a href="#pricing">{copy.navPricing}</a>
        </nav>

        <div className="scriptora-landing-actions">
          <label className="scriptora-landing-language" aria-label={copy.languageLabel}>
            <Globe2 className="h-3.5 w-3.5" />
            <select
              value={lang}
              onChange={(event) => setUILanguage(event.target.value as UILanguage)}
              aria-label={copy.languageLabel}
            >
              {UI_LANGUAGES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={onEnter} className="scriptora-landing-nav-cta">
            {isSignedIn ? copy.primaryCta : copy.enter}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="scriptora-v3-hero">
        <div
          className={`scriptora-v3-hero-copy transition-all duration-700 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <h1 className="scriptora-v3-headline">
            <span>{copy.heroLine1}</span>
            <span>{copy.heroLine2}</span>
            <span>{copy.heroLine3}</span>
            <span className="scriptora-v3-headline-accent">{copy.heroLine4}</span>
          </h1>
          <p className="scriptora-v3-subhead">{copy.heroSub}</p>
          <p className="scriptora-v3-body">{copy.heroBody}</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onEnter} className="scriptora-landing-primary scriptora-v3-primary">
              {copy.primaryCta}
              <ArrowRight className="h-4 w-4" />
            </button>
            <a href="#demo" className="scriptora-landing-secondary scriptora-v3-secondary">
              <Play className="h-4 w-4" />
              {copy.secondaryCta}
            </a>
          </div>
          {!canStart && (
            <p className="mt-4 text-xs text-white/45">Consent required before entering the workspace.</p>
          )}
        </div>

        <div
          className={`scriptora-v3-hero-visual transition-all delay-100 duration-700 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <HeroMedia />
        </div>
      </section>

      {/* Social proof */}
      <section className="scriptora-landing-section scriptora-v3-proof">
        <div className="scriptora-v3-proof-head">
          <h2>{copy.proofTitle}</h2>
          <p>{copy.proofSubtitle}</p>
        </div>
        <div className="scriptora-v3-proof-grid">
          {socialProofCards.map((card) => (
            <article key={card.label.en} className="scriptora-v3-proof-card">
              <card.icon className="h-4 w-4" />
              <span>{L(card.label, lang)}</span>
            </article>
          ))}
        </div>
      </section>

      {/* Problem */}
      <section id="problem" className="scriptora-landing-section scriptora-v3-problem">
        <div className="scriptora-landing-section-label">{copy.problemLabel}</div>
        <h2>{copy.problemTitle}</h2>
        <ul className="scriptora-v3-problem-list">
          {copy.problemLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <p className="scriptora-v3-problem-footer">{copy.problemFooter}</p>
      </section>

      {/* Solution */}
      <section id="solution" className="scriptora-landing-section scriptora-v3-solution">
        <div className="scriptora-landing-section-label">{copy.solutionLabel}</div>
        <h2>{copy.solutionTitle}</h2>
        <div className="scriptora-v3-solution-lines">
          {copy.solutionLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>

      {/* Differentiation */}
      <section className="scriptora-landing-section scriptora-v3-diff">
        <p className="scriptora-v3-diff-muted">{copy.diffLine1}</p>
        <p className="scriptora-v3-diff-strong">{copy.diffLine2}</p>
      </section>

      {/* 6 macro systems */}
      <section id="systems" className="scriptora-landing-section scriptora-v3-systems">
        <div className="scriptora-landing-section-label">{copy.systemsLabel}</div>
        <h2>{copy.systemsTitle}</h2>
        <div className="scriptora-v3-systems-grid">
          {ecosystemSystems.map((system) => (
            <article key={system.title.en} className="scriptora-v3-system-card">
              <div className="scriptora-v3-system-head">
                <system.icon className="h-4 w-4" />
                <h3>{L(system.title, lang)}</h3>
              </div>
              <ul>
                {system.items.map((item) => (
                  <li key={item.en}>{L(item, lang)}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* Live demo — real screenshots */}
      <section id="demo" className="scriptora-landing-section scriptora-v3-demo">
        <div className="scriptora-v3-demo-header">
          <div>
            <div className="scriptora-landing-section-label">{copy.demoLabel}</div>
            <h2>{copy.demoTitle}</h2>
          </div>
          <p>{copy.demoText}</p>
        </div>

        <div className="scriptora-v3-demo-tabs" role="tablist" aria-label="Product screenshots">
          {demoIds.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeDemo === id}
              className={activeDemo === id ? "is-active" : ""}
              onClick={() => setActiveDemo(id)}
            >
              {L(demoScreenshots[id].label, lang)}
            </button>
          ))}
        </div>

        <div className="scriptora-v3-demo-frame" role="tabpanel">
          <img
            key={activeShot.src}
            src={activeShot.src}
            alt={`Scriptora ${L(activeShot.label, lang)}`}
            loading="lazy"
            decoding="async"
            width={1440}
            height={900}
          />
        </div>
      </section>

      {/* Audience */}
      <section className="scriptora-landing-section scriptora-v3-audience">
        <div className="scriptora-landing-section-label">{copy.audienceLabel}</div>
        <h2>{copy.audienceTitle}</h2>
        <div className="scriptora-v3-audience-tags">
          {audienceTags.map((tag) => (
            <span key={tag.en}>{L(tag, lang)}</span>
          ))}
        </div>
      </section>

      {/* Testimonials — structure only, no fake stock */}
      <section id="testimonials" className="scriptora-landing-section scriptora-v3-testimonials">
        <div className="scriptora-landing-section-label">{copy.testimonialsLabel}</div>
        <div className="scriptora-v3-testimonials-header">
          <h2>{copy.testimonialsTitle}</h2>
          <p>{copy.testimonialsText}</p>
        </div>
        <div className="scriptora-v3-testimonials-grid">
          {testimonialSlots.map((slot) => (
            <article key={slot.role.en} className="scriptora-v3-testimonial-slot">
              <div className="scriptora-v3-testimonial-avatar" aria-hidden="true">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="scriptora-v3-testimonial-role">{L(slot.role, lang)}</span>
              <p className="scriptora-v3-testimonial-placeholder">{L(slot.placeholder, lang)}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scriptora-landing-section">
        <div className="scriptora-landing-section-label">{copy.pricingLabel}</div>
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <h2 className="max-w-2xl">{copy.pricingTitle}</h2>
          <p className="max-w-md text-sm leading-6 text-white/55">{copy.pricingText}</p>
        </div>
        <div className="scriptora-pricing-grid">
          {primaryPlans.map((plan) => {
            const planText = landingPlans[plan.id]?.[lang] ?? landingPlans[plan.id]?.en;
            return (
              <article key={plan.id} className={`scriptora-pricing-card ${plan.highlight || plan.premium ? "is-highlight" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3>{planText?.name ?? plan.name}</h3>
                    <p>{planText?.description ?? plan.description}</p>
                  </div>
                  {(plan.highlight || plan.premium) && <Crown className="h-4 w-4 text-white/70" />}
                </div>
                <div className="mt-6">
                  <strong>{plan.price}</strong>
                  <span>{planText?.period ?? plan.period}</span>
                </div>
                <ul>
                  {(planText?.features ?? plan.features.slice(0, 4).map((f) => f.label)).map((feature) => (
                    <li key={feature}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      </section>

      {/* Final CTA */}
      <section className="scriptora-landing-final scriptora-v3-final">
        <h2>{copy.finalTitle}</h2>
        <p>{copy.finalText}</p>
        <button type="button" onClick={onEnter} className="scriptora-landing-primary scriptora-v3-primary">
          {copy.finalCta}
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </main>
  );
}

function HeroMedia() {
  if (productTourVideo) {
    return (
      <div className="scriptora-v3-hero-media">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={heroPoster}
          aria-label="Scriptora OS product tour"
        >
          <source src={productTourVideo} type="video/webm" />
        </video>
      </div>
    );
  }

  return (
    <div className="scriptora-v3-hero-media">
      <img
        src={heroPoster}
        alt="Scriptora Dashboard"
        loading="eager"
        decoding="async"
        width={1440}
        height={900}
      />
    </div>
  );
}
