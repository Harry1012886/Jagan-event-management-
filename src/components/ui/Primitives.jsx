import { useId } from 'react'
import { Icon } from '../Icon'
import { STATUS_TONE } from '../../data/constants'

/** Labelled form row with optional hint and validation message. */
export function Field({ label, required, hint, error, children, className = '', htmlFor }) {
  const generatedId = useId()
  const id = htmlFor ?? generatedId
  const child =
    typeof children === 'function' ? children(id) : children

  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="field-label" htmlFor={id}>
          {label}
          {required && (
            <span className="req" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {child}
      {error ? (
        <span className="field-error">
          <Icon name="alert" size={13} />
          {error}
        </span>
      ) : (
        hint && <span className="field-hint">{hint}</span>
      )}
    </div>
  )
}

/** Coloured status pill. Tone is looked up from the status text by default. */
export function Badge({ status, tone, children, plain = false }) {
  const resolved = tone ?? STATUS_TONE[status] ?? 'muted'
  return (
    <span className={`badge badge-${resolved} ${plain ? 'plain' : ''}`}>
      {children ?? status}
    </span>
  )
}

export function StatCard({ label, value, icon, tone = 'brand', foot, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`stat ${onClick ? 'clickable' : ''}`} onClick={onClick} type={onClick ? 'button' : undefined}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {icon && (
          <span className={`stat-icon tone-${tone}`}>
            <Icon name={icon} size={16} />
          </span>
        )}
      </div>
      <span className="stat-value">{value}</span>
      {foot && <span className="stat-foot">{foot}</span>}
    </Tag>
  )
}

export function EmptyState({ icon = 'info', title, text, action }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={icon} size={23} />
      </span>
      {title && <span className="empty-title">{title}</span>}
      {text && <span className="empty-text">{text}</span>}
      {action}
    </div>
  )
}

export function Banner({ kind = 'info', icon, children, onDismiss }) {
  const fallbackIcon =
    kind === 'warn' || kind === 'danger' ? 'alert' : kind === 'ok' ? 'checkCircle' : 'info'
  return (
    <div className={`banner banner-${kind}`}>
      <Icon name={icon ?? fallbackIcon} size={16} />
      <div className="grow">{children}</div>
      {onDismiss && (
        <button type="button" className="banner-close" onClick={onDismiss} aria-label="Dismiss">
          <Icon name="x" size={15} />
        </button>
      )}
    </div>
  )
}

export function SectionCard({ title, icon, action, children, flush = false }) {
  return (
    <section className="card">
      {(title || action) && (
        <header className="card-head">
          <h2 className="card-title">
            {icon && <Icon name={icon} size={17} />}
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className={`card-body ${flush ? 'flush' : ''}`}>{children}</div>
    </section>
  )
}

export function Progress({ value, max = 100, tone }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className={`progress ${tone ?? ''}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Spinner({ size = 16 }) {
  return <Icon name="loader" size={size} className="spin" />
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

export function SearchBox({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="search-input">
      <Icon name="search" size={16} />
      <input
        className="input"
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        aria-label={placeholder}
      />
    </div>
  )
}
