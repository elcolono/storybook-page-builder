import React from 'react';

import './company-ui.css';

export type CompanyTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'ink';
export type CompanyDensity = 'compact' | 'comfortable';

type SlotProps = {
  children?: React.ReactNode;
};

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const toneClass = (tone: CompanyTone | undefined) => `company-tone-${tone ?? 'neutral'}`;

const splitItems = (value: string | undefined, fallback: string[]) => {
  const items = (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : fallback;
};

const clamp = (value: number | undefined, min: number, max: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
};

const initials = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'AC';

const button = (label: string, variant: 'primary' | 'secondary' = 'primary') => (
  <button type="button" className={cx('company-button', `company-button--${variant}`)}>
    {label}
  </button>
);

export interface ProductHeaderProps {
  brandName: string;
  navItems: string;
  activeItem: string;
  ctaLabel: string;
  userName: string;
  variant?: 'light' | 'dark';
}

export const ProductHeader = ({
  brandName,
  navItems,
  activeItem,
  ctaLabel,
  userName,
  variant = 'light',
}: ProductHeaderProps) => {
  const items = splitItems(navItems, ['Dashboard', 'Customers', 'Reports']);

  return (
    <header className={cx('company-ui company-product-header', variant === 'dark' && 'company-product-header--dark')}>
      <div className="company-brand">
        <span className="company-brand__mark">{initials(brandName)}</span>
        <span className="company-brand__name">{brandName}</span>
      </div>
      <nav className="company-product-header__nav" aria-label="Primary">
        {items.map((item) => (
          <button
            type="button"
            key={item}
            className={cx('company-nav-link', item === activeItem && 'company-nav-link--active')}
          >
            {item}
          </button>
        ))}
      </nav>
      <div className="company-product-header__actions">
        <span className="company-avatar">{initials(userName)}</span>
        {button(ctaLabel)}
      </div>
    </header>
  );
};

export interface SidebarNavProps {
  workspaceName: string;
  items: string;
  activeItem: string;
  badgeLabel: string;
  compact?: boolean;
}

export const SidebarNav = ({ workspaceName, items, activeItem, badgeLabel, compact = false }: SidebarNavProps) => {
  const navItems = splitItems(items, ['Overview', 'Pipeline', 'Customers', 'Settings']);

  return (
    <aside className={cx('company-ui company-sidebar-nav', compact && 'company-sidebar-nav--compact')}>
      <div className="company-sidebar-nav__workspace">
        <span className="company-brand__mark">{initials(workspaceName)}</span>
        {!compact ? <strong>{workspaceName}</strong> : null}
      </div>
      <div className="company-sidebar-nav__items">
        {navItems.map((item, index) => (
          <button
            type="button"
            key={item}
            className={cx('company-sidebar-link', item === activeItem && 'company-sidebar-link--active')}
          >
            <span className="company-sidebar-link__dot">{index + 1}</span>
            {!compact ? <span>{item}</span> : null}
          </button>
        ))}
      </div>
      {!compact ? <span className="company-badge company-badge--brand">{badgeLabel}</span> : null}
    </aside>
  );
};

export interface AppShellProps {
  appName: string;
  workspaceName: string;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  children?: React.ReactNode;
}

export const AppShell = ({ appName, workspaceName, header, sidebar, children }: AppShellProps) => (
  <div className="company-ui company-app-shell">
    <div className="company-app-shell__top">
      {header ?? (
        <div className="company-app-shell__fallback-header">
          <div className="company-brand">
            <span className="company-brand__mark">{initials(appName)}</span>
            <span className="company-brand__name">{appName}</span>
          </div>
          <span className="company-badge company-badge--neutral">{workspaceName}</span>
        </div>
      )}
    </div>
    <div className="company-app-shell__body">
      <div className="company-app-shell__sidebar">
        {sidebar ?? (
          <SidebarNav
            workspaceName={workspaceName}
            items="Overview, Roadmap, Experiments, Settings"
            activeItem="Overview"
            badgeLabel="Team"
          />
        )}
      </div>
      <main className="company-app-shell__content">{children}</main>
    </div>
  </div>
);

export interface PageHeroProps extends SlotProps {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: string;
  secondaryAction: string;
  mediaLabel: string;
  tone?: CompanyTone;
}

export const PageHero = ({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  mediaLabel,
  tone = 'brand',
  children,
}: PageHeroProps) => (
  <section className={cx('company-ui company-hero', toneClass(tone))}>
    <div className="company-hero__content">
      <span className="company-eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{description}</p>
      <div className="company-actions">
        {button(primaryAction)}
        {button(secondaryAction, 'secondary')}
      </div>
    </div>
    <div className="company-hero__media" aria-label={mediaLabel}>
      <span>{mediaLabel}</span>
      <div className="company-hero__chart">
        <i />
        <i />
        <i />
      </div>
    </div>
    {children ? <div className="company-hero__slot">{children}</div> : null}
  </section>
);

export interface PageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: string;
  secondaryAction: string;
  align?: 'left' | 'center';
}

export const PageHeader = ({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  align = 'left',
}: PageHeaderProps) => (
  <section className={cx('company-ui company-page-header', align === 'center' && 'company-page-header--center')}>
    <span className="company-eyebrow">{eyebrow}</span>
    <div className="company-page-header__main">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="company-actions">
        {button(secondaryAction, 'secondary')}
        {button(primaryAction)}
      </div>
    </div>
  </section>
);

export interface SurfacePanelProps extends SlotProps {
  eyebrow: string;
  title: string;
  description: string;
  tone?: CompanyTone;
  padding?: 'compact' | 'normal' | 'spacious';
}

export const SurfacePanel = ({
  eyebrow,
  title,
  description,
  tone = 'neutral',
  padding = 'normal',
  children,
}: SurfacePanelProps) => (
  <section className={cx('company-ui company-surface-panel', toneClass(tone), `company-surface-panel--${padding}`)}>
    <div className="company-surface-panel__header">
      <span className="company-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
    {children ? <div className="company-surface-panel__body">{children}</div> : null}
  </section>
);

export interface SplitFeatureProps extends SlotProps {
  eyebrow: string;
  title: string;
  description: string;
  statValue: string;
  statLabel: string;
  reverse?: boolean;
  tone?: CompanyTone;
}

export const SplitFeature = ({
  eyebrow,
  title,
  description,
  statValue,
  statLabel,
  reverse = false,
  tone = 'brand',
  children,
}: SplitFeatureProps) => (
  <section
    className={cx('company-ui company-split-feature', toneClass(tone), reverse && 'company-split-feature--reverse')}
  >
    <div className="company-split-feature__copy">
      <span className="company-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{description}</p>
      {children ? <div className="company-split-feature__slot">{children}</div> : null}
    </div>
    <div className="company-split-feature__proof">
      <strong>{statValue}</strong>
      <span>{statLabel}</span>
    </div>
  </section>
);

export interface FeatureCardProps {
  iconLabel: string;
  title: string;
  description: string;
  badgeLabel: string;
  ctaLabel: string;
  tone?: CompanyTone;
}

export const FeatureCard = ({
  iconLabel,
  title,
  description,
  badgeLabel,
  ctaLabel,
  tone = 'neutral',
}: FeatureCardProps) => (
  <article className={cx('company-ui company-feature-card', toneClass(tone))}>
    <div className="company-feature-card__icon">{iconLabel}</div>
    <span className="company-badge company-badge--accent">{badgeLabel}</span>
    <h3>{title}</h3>
    <p>{description}</p>
    <button type="button" className="company-text-link">
      {ctaLabel}
    </button>
  </article>
);

export interface MetricCardProps {
  label: string;
  value: string;
  change: string;
  description: string;
  tone?: CompanyTone;
}

export const MetricCard = ({ label, value, change, description, tone = 'neutral' }: MetricCardProps) => (
  <article className={cx('company-ui company-metric-card', toneClass(tone))}>
    <div className="company-metric-card__top">
      <span>{label}</span>
      <strong>{change}</strong>
    </div>
    <div className="company-metric-card__value">{value}</div>
    <p>{description}</p>
  </article>
);

export interface ProgressCardProps {
  title: string;
  value: string;
  caption: string;
  progress: number;
  tone?: CompanyTone;
}

export const ProgressCard = ({ title, value, caption, progress, tone = 'brand' }: ProgressCardProps) => {
  const safeProgress = clamp(progress, 0, 100);

  return (
    <article
      className={cx('company-ui company-progress-card', toneClass(tone))}
      style={{ '--company-progress': `${safeProgress}%` } as React.CSSProperties}
    >
      <div className="company-progress-card__header">
        <span>{title}</span>
        <strong>{value}</strong>
      </div>
      <div className="company-progress-card__track">
        <span />
      </div>
      <p>{caption}</p>
    </article>
  );
};

export interface DataTablePreviewProps {
  title: string;
  subtitle: string;
  primaryMetric: string;
  statusLabel: string;
  rows: number;
  density?: CompanyDensity;
}

export const DataTablePreview = ({
  title,
  subtitle,
  primaryMetric,
  statusLabel,
  rows,
  density = 'comfortable',
}: DataTablePreviewProps) => {
  const rowCount = clamp(rows, 1, 5);
  const tableRows = Array.from({ length: rowCount }, (_, index) => index + 1);

  return (
    <section className={cx('company-ui company-table-preview', `company-table-preview--${density}`)}>
      <div className="company-table-preview__header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <span className="company-badge company-badge--success">{primaryMetric}</span>
      </div>
      <div className="company-table-preview__table" role="table" aria-label={title}>
        {tableRows.map((row) => (
          <div className="company-table-preview__row" role="row" key={row}>
            <span>Account {row}</span>
            <span>Owner {row}</span>
            <strong>{statusLabel}</strong>
          </div>
        ))}
      </div>
    </section>
  );
};

export interface ActivityFeedProps {
  title: string;
  itemOne: string;
  itemTwo: string;
  itemThree: string;
  tone?: CompanyTone;
}

export const ActivityFeed = ({ title, itemOne, itemTwo, itemThree, tone = 'neutral' }: ActivityFeedProps) => (
  <section className={cx('company-ui company-activity-feed', toneClass(tone))}>
    <h3>{title}</h3>
    {[itemOne, itemTwo, itemThree].map((item, index) => (
      <div className="company-activity-feed__item" key={item}>
        <span>{index + 1}</span>
        <p>{item}</p>
      </div>
    ))}
  </section>
);

export interface IntegrationCardProps {
  provider: string;
  description: string;
  status: string;
  buttonLabel: string;
  tone?: CompanyTone;
}

export const IntegrationCard = ({
  provider,
  description,
  status,
  buttonLabel,
  tone = 'brand',
}: IntegrationCardProps) => (
  <article className={cx('company-ui company-integration-card', toneClass(tone))}>
    <div className="company-integration-card__logo">{initials(provider)}</div>
    <div>
      <h3>{provider}</h3>
      <p>{description}</p>
    </div>
    <div className="company-integration-card__footer">
      <span className="company-badge company-badge--accent">{status}</span>
      {button(buttonLabel, 'secondary')}
    </div>
  </article>
);

export interface PricingCardProps {
  planName: string;
  price: string;
  cadence: string;
  description: string;
  featureOne: string;
  featureTwo: string;
  featureThree: string;
  buttonLabel: string;
  featured?: boolean;
}

export const PricingCard = ({
  planName,
  price,
  cadence,
  description,
  featureOne,
  featureTwo,
  featureThree,
  buttonLabel,
  featured = false,
}: PricingCardProps) => (
  <article className={cx('company-ui company-pricing-card', featured && 'company-pricing-card--featured')}>
    <div className="company-pricing-card__header">
      <span className="company-badge company-badge--brand">{featured ? 'Recommended' : 'Plan'}</span>
      <h3>{planName}</h3>
      <p>{description}</p>
    </div>
    <div className="company-pricing-card__price">
      <strong>{price}</strong>
      <span>{cadence}</span>
    </div>
    <ul>
      {[featureOne, featureTwo, featureThree].map((feature) => (
        <li key={feature}>{feature}</li>
      ))}
    </ul>
    {button(buttonLabel)}
  </article>
);

export interface FormPanelProps extends SlotProps {
  title: string;
  description: string;
  submitLabel: string;
  secondaryLabel: string;
}

export const FormPanel = ({ title, description, submitLabel, secondaryLabel, children }: FormPanelProps) => (
  <form className="company-ui company-form-panel">
    <div className="company-form-panel__header">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
    {children ? <div className="company-form-panel__fields">{children}</div> : null}
    <div className="company-form-panel__actions">
      {button(secondaryLabel, 'secondary')}
      {button(submitLabel)}
    </div>
  </form>
);

export interface TextFieldProps {
  label: string;
  placeholder: string;
  value: string;
  helpText: string;
  required?: boolean;
  state?: 'default' | 'error' | 'success';
}

export const TextField = ({
  label,
  placeholder,
  value,
  helpText,
  required = false,
  state = 'default',
}: TextFieldProps) => (
  <label className={cx('company-ui company-field', `company-field--${state}`)}>
    <span>
      {label}
      {required ? <strong>Required</strong> : null}
    </span>
    <input placeholder={placeholder} value={value} readOnly />
    <em>{helpText}</em>
  </label>
);

export interface SelectFieldProps {
  label: string;
  value: string;
  optionsText: string;
  helpText: string;
  state?: 'default' | 'error' | 'success';
}

export const SelectField = ({ label, value, optionsText, helpText, state = 'default' }: SelectFieldProps) => (
  <label className={cx('company-ui company-field', `company-field--${state}`)}>
    <span>{label}</span>
    <select value={value} aria-label={label} onChange={() => undefined}>
      {splitItems(optionsText, [value]).map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
    <em>{helpText}</em>
  </label>
);

export interface ToggleSettingProps {
  title: string;
  description: string;
  badgeLabel: string;
  enabled?: boolean;
}

export const ToggleSetting = ({ title, description, badgeLabel, enabled = true }: ToggleSettingProps) => (
  <div className="company-ui company-toggle-setting">
    <div>
      <span className="company-badge company-badge--neutral">{badgeLabel}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
    <button
      type="button"
      className={cx('company-toggle', enabled && 'company-toggle--enabled')}
      aria-pressed={enabled}
      aria-label={title}
    >
      <span />
    </button>
  </div>
);

export interface FilterBarProps {
  placeholder: string;
  filterOne: string;
  filterTwo: string;
  buttonLabel: string;
}

export const FilterBar = ({ placeholder, filterOne, filterTwo, buttonLabel }: FilterBarProps) => (
  <div className="company-ui company-filter-bar">
    <input placeholder={placeholder} readOnly />
    <button type="button">{filterOne}</button>
    <button type="button">{filterTwo}</button>
    {button(buttonLabel)}
  </div>
);

export interface AlertBannerProps {
  title: string;
  description: string;
  actionLabel: string;
  tone?: CompanyTone;
}

export const AlertBanner = ({ title, description, actionLabel, tone = 'warning' }: AlertBannerProps) => (
  <aside className={cx('company-ui company-alert-banner', toneClass(tone))}>
    <div>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
    {button(actionLabel, 'secondary')}
  </aside>
);

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel: string;
  tone?: CompanyTone;
}

export const EmptyState = ({ title, description, actionLabel, tone = 'neutral' }: EmptyStateProps) => (
  <section className={cx('company-ui company-empty-state', toneClass(tone))}>
    <div className="company-empty-state__symbol">+</div>
    <h3>{title}</h3>
    <p>{description}</p>
    {button(actionLabel)}
  </section>
);

export interface StepperProps {
  title: string;
  stepOne: string;
  stepTwo: string;
  stepThree: string;
  currentStep: number;
}

export const Stepper = ({ title, stepOne, stepTwo, stepThree, currentStep }: StepperProps) => {
  const activeStep = clamp(currentStep, 1, 3);

  return (
    <section className="company-ui company-stepper">
      <h3>{title}</h3>
      {[stepOne, stepTwo, stepThree].map((step, index) => {
        const position = index + 1;

        return (
          <div
            className={cx(
              'company-stepper__step',
              position < activeStep && 'company-stepper__step--done',
              position === activeStep && 'company-stepper__step--active',
            )}
            key={step}
          >
            <span>{position}</span>
            <p>{step}</p>
          </div>
        );
      })}
    </section>
  );
};
