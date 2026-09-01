import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import { Badge } from './ui/Primitives'
import { STATUS_TONE } from '../data/constants'
import { locationLabel } from '../utils/calc'
import { formatDate, formatMoney, formatTimeRange, relativeDay } from '../utils/format'

/** Compact summary of one event. Used on the dashboard and the events list. */
export function EventCard({ view }) {
  const { event, client, money, status, crewSummary, footageSummary } = view
  const tone = STATUS_TONE[status] ?? 'muted'

  return (
    <Link to={`/events/${event.id}`} className={`event-card tone-${tone}`}>
      <div className="row row-between gap-8" style={{ alignItems: 'flex-start' }}>
        <span className="event-card-name grow">{event.eventName}</span>
        <Badge status={status} />
      </div>

      <div className="event-meta">
        <span>
          <Icon name="calendar" size={13} />
          {formatDate(event.date)}
          <span className="text-muted">· {relativeDay(event.date)}</span>
        </span>
        {(event.startTime || event.endTime) && (
          <span>
            <Icon name="clock" size={13} />
            {formatTimeRange(event.startTime, event.endTime)}
          </span>
        )}
        <span>
          <Icon name="mapPin" size={13} />
          {locationLabel(event.location)}
        </span>
        {client && (
          <span>
            <Icon name="user" size={13} />
            {client.name}
          </span>
        )}
      </div>

      <div className="event-money">
        <span className="text-muted">
          Total
          <b style={{ color: 'var(--ink-900)' }}>{formatMoney(money.totalAmount)}</b>
        </span>
        <span className="text-muted">
          Received
          <b style={{ color: 'var(--ok-fg)' }}>{formatMoney(money.totalPaid)}</b>
        </span>
        <span className="text-muted text-right">
          Balance
          <b style={{ color: money.balance > 0 ? 'var(--danger-fg)' : 'var(--ok-fg)' }}>
            {formatMoney(money.balance)}
          </b>
        </span>
      </div>

      {(crewSummary.count > 0 || footageSummary.pending > 0) && (
        <div className="row row-wrap gap-8 text-xs text-muted">
          {crewSummary.count > 0 && (
            <span className="row gap-4">
              <Icon name="users" size={12} />
              {crewSummary.count} crew
              {crewSummary.pending > 0 && (
                <span style={{ color: 'var(--warn-fg)', fontWeight: 650 }}>
                  · {formatMoney(crewSummary.pending)} unpaid
                </span>
              )}
            </span>
          )}
          {footageSummary.pending > 0 && (
            <span className="row gap-4" style={{ color: 'var(--warn-fg)', fontWeight: 650 }}>
              <Icon name="upload" size={12} />
              {footageSummary.pending} footage pending
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
