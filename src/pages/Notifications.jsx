import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import {
  Badge,
  Banner,
  EmptyState,
  PageHeader,
  SectionCard,
} from '../components/ui/Primitives'
import { useData } from '../data/store'
import { useDashboardData } from '../hooks/useEvents'
import { isCalendarConfigured } from '../services/calendarService'
import { formatDate, formatMoney, formatStamp, relativeDay } from '../utils/format'

export function Notifications() {
  const { db } = useData()
  const { upcoming, advancePending, footagePending, views } = useDashboardData()

  const log = useMemo(
    () =>
      [...db.notifications].sort((a, b) =>
        String(b.sentAt ?? '').localeCompare(String(a.sentAt ?? '')),
      ),
    [db.notifications],
  )

  const onCalendar = views.filter((view) => view.event.calendarEventId)
  const notOnCalendar = upcoming.filter((view) => !view.event.calendarEventId)
  const balanceDue = views.filter((view) => view.money.balance > 0)

  return (
    <>
      <PageHeader
        title="Reminders"
        subtitle="Google Calendar delivers the reminders; this page shows what is covered and what is not."
      />

      <Banner kind="info">
        <strong>How reminders work.</strong> Adding an event to Google Calendar schedules an
        email and a phone notification 1 day and 2 hours before it starts. Google sends
        them whether or not this website is open, and it costs nothing.
      </Banner>

      {!isCalendarConfigured && (
        <Banner kind="warn">
          Google Calendar is not connected yet. Add your client ID in{' '}
          <Link to="/settings">Settings</Link> to switch reminders on.
        </Banner>
      )}

      <div className="grid grid-2" style={{ marginBottom: 18 }}>
        <SectionCard title="Needs your attention" icon="alert">
          {advancePending.length === 0 && footagePending.length === 0 && balanceDue.length === 0 ? (
            <EmptyState
              icon="checkCircle"
              title="All clear"
              text="No unpaid advances, no balances and no missing footage."
            />
          ) : (
            <div className="col">
              {advancePending.map((view) => (
                <Row
                  key={`a-${view.event.id}`}
                  to={`/events/${view.event.id}`}
                  tone="warn"
                  icon="wallet"
                  title={view.event.eventName}
                  detail={`Advance of ${formatMoney(view.money.advanceRequired)} still pending`}
                  meta={relativeDay(view.event.date)}
                />
              ))}
              {balanceDue.map((view) => (
                <Row
                  key={`b-${view.event.id}`}
                  to={`/events/${view.event.id}`}
                  tone="danger"
                  icon="rupee"
                  title={view.event.eventName}
                  detail={`Balance ${formatMoney(view.money.balance)} to collect`}
                  meta={formatDate(view.event.date)}
                />
              ))}
              {footagePending.map((view) => (
                <Row
                  key={`f-${view.event.id}`}
                  to={`/events/${view.event.id}`}
                  tone="info"
                  icon="upload"
                  title={view.event.eventName}
                  detail={`Footage pending from ${view.footageSummary.pendingMembers
                    .map((row) => row.memberName)
                    .filter(Boolean)
                    .join(', ') || 'crew'}`}
                  meta={`${view.footageSummary.uploaded}/${view.footageSummary.count}`}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Calendar coverage" icon="calendar">
          <dl className="kv" style={{ marginBottom: 12 }}>
            <dt>Events on Google Calendar</dt>
            <dd>{onCalendar.length}</dd>
            <dt>Upcoming events without a reminder</dt>
            <dd style={{ color: notOnCalendar.length ? 'var(--warn-fg)' : 'var(--ok-fg)' }}>
              {notOnCalendar.length}
            </dd>
          </dl>

          {notOnCalendar.length === 0 ? (
            <EmptyState
              icon="checkCircle"
              title="Every upcoming event has a reminder"
              text="Nothing left to add to your calendar."
            />
          ) : (
            <div className="col">
              {notOnCalendar.slice(0, 8).map((view) => (
                <Row
                  key={view.event.id}
                  to={`/events/${view.event.id}`}
                  tone="warn"
                  icon="calendarPlus"
                  title={view.event.eventName}
                  detail="Not added to Google Calendar yet"
                  meta={relativeDay(view.event.date)}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Activity log" icon="bell" flush>
        {log.length === 0 ? (
          <EmptyState
            icon="bell"
            title="Nothing logged yet"
            text="Each time you add an event to Google Calendar, the result is recorded here."
          />
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Event</th>
                  <th>Sent to</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {log.map((entry) => {
                  const event = db.events.find((item) => item.id === entry.eventId)
                  return (
                    <tr key={entry.id}>
                      <td data-label="When">{formatStamp(entry.sentAt)}</td>
                      <td data-label="Action">{entry.type}</td>
                      <td data-label="Event">
                        {event ? (
                          <Link to={`/events/${event.id}`}>{event.eventName}</Link>
                        ) : (
                          <span className="text-muted">Deleted event</span>
                        )}
                      </td>
                      <td data-label="Sent to" className="text-muted">
                        {entry.recipient}
                      </td>
                      <td data-label="Result">
                        <Badge
                          status={entry.status}
                          tone={entry.status === 'Sent' ? 'ok' : 'danger'}
                        />
                        {entry.errorMessage && (
                          <div className="text-xs text-muted">{entry.errorMessage}</div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  )
}

function Row({ to, tone, icon, title, detail, meta }) {
  return (
    <Link to={to} className="person-row" style={{ textDecoration: 'none', color: 'inherit' }}>
      <span className={`stat-icon tone-${tone}`}>
        <Icon name={icon} size={15} />
      </span>
      <span className="person-main">
        <span className="person-name">{title}</span>
        <span className="person-sub">{detail}</span>
      </span>
      <span className="text-xs text-muted nowrap">{meta}</span>
    </Link>
  )
}
