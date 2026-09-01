import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { EventCard } from '../components/EventCard'
import {
  Badge,
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
} from '../components/ui/Primitives'
import { useDashboardData, useEventActions } from '../hooks/useEvents'
import { useToast } from '../components/ui/Toast'
import { locationLabel } from '../utils/calc'
import {
  formatDate,
  formatMoney,
  formatStamp,
  formatTimeRange,
  relativeDay,
} from '../utils/format'

export function Dashboard() {
  const {
    views,
    todays,
    ongoing,
    upcoming,
    clientBalance,
    crewPending,
    footagePending,
    advancePending,
    needsAttention,
  } = useDashboardData()
  const navigate = useNavigate()

  const liveEvents = [...ongoing, ...todays.filter((v) => v.event.shootStatus !== 'Started')]

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle={
          views.length
            ? `${views.length} event${views.length === 1 ? '' : 's'} on record`
            : 'Start by adding your first event'
        }
        actions={
          <>
            <Link to="/events/new" className="btn btn-primary">
              <Icon name="plus" size={17} />
              Add Event
            </Link>
            <Link to="/calendar" className="btn btn-secondary">
              <Icon name="calendar" size={17} />
              Calendar
            </Link>
          </>
        }
      />

      <div className="grid grid-stats" style={{ marginBottom: 18 }}>
        <StatCard
          label="Upcoming"
          value={upcoming.length}
          icon="calendar"
          tone="brand"
          foot={upcoming[0] ? `Next: ${relativeDay(upcoming[0].event.date)}` : 'Nothing scheduled'}
          onClick={() => navigate('/events?status=Upcoming')}
        />
        <StatCard
          label="Today"
          value={todays.length}
          icon="camera"
          tone={todays.length ? 'warn' : 'muted'}
          foot={ongoing.length ? `${ongoing.length} shoot in progress` : 'No shoot today'}
          onClick={() => navigate('/calendar')}
        />
        <StatCard
          label="Client balance"
          value={formatMoney(clientBalance)}
          icon="wallet"
          tone={clientBalance > 0 ? 'danger' : 'ok'}
          foot={clientBalance > 0 ? 'Still to collect' : 'All settled'}
          onClick={() => navigate('/payments')}
        />
        <StatCard
          label="Crew unpaid"
          value={formatMoney(crewPending)}
          icon="users"
          tone={crewPending > 0 ? 'warn' : 'ok'}
          foot={crewPending > 0 ? 'Owed to your team' : 'Everyone paid'}
          onClick={() => navigate('/payments?tab=crew')}
        />
        <StatCard
          label="Footage pending"
          value={footagePending.length}
          icon="upload"
          tone={footagePending.length ? 'warn' : 'ok'}
          foot={footagePending.length ? 'Events missing uploads' : 'Everything uploaded'}
          onClick={() => navigate('/crew')}
        />
      </div>

      {liveEvents.length > 0 && (
        <div className="col gap-12" style={{ marginBottom: 18 }}>
          {liveEvents.map((view) => (
            <TodayPanel key={view.event.id} view={view} />
          ))}
        </div>
      )}

      <div className="grid grid-2" style={{ marginBottom: 18 }}>
        <SectionCard
          title="Payment alerts"
          icon="wallet"
          action={
            <Link to="/payments" className="btn btn-ghost btn-sm">
              View all
            </Link>
          }
        >
          {advancePending.length === 0 && clientBalance === 0 && crewPending === 0 ? (
            <EmptyState
              icon="checkCircle"
              title="Nothing outstanding"
              text="Every advance is collected and no crew payment is pending."
            />
          ) : (
            <div className="col">
              {advancePending.slice(0, 4).map((view) => (
                <AlertRow
                  key={`adv-${view.event.id}`}
                  to={`/events/${view.event.id}`}
                  icon="alert"
                  tone="warn"
                  title={view.event.eventName}
                  detail={`Advance of ${formatMoney(view.money.advanceRequired)} not received`}
                  meta={formatDate(view.event.date)}
                />
              ))}
              {views
                .filter((view) => view.money.balance > 0 && view.money.advanceStatus === 'Paid')
                .slice(0, 4)
                .map((view) => (
                  <AlertRow
                    key={`bal-${view.event.id}`}
                    to={`/events/${view.event.id}`}
                    icon="wallet"
                    tone="danger"
                    title={view.event.eventName}
                    detail={`Balance ${formatMoney(view.money.balance)} pending`}
                    meta={formatDate(view.event.date)}
                  />
                ))}
              {views
                .filter((view) => view.crewSummary.pending > 0)
                .slice(0, 4)
                .map((view) => (
                  <AlertRow
                    key={`crew-${view.event.id}`}
                    to={`/events/${view.event.id}`}
                    icon="users"
                    tone="warn"
                    title={view.event.eventName}
                    detail={`${formatMoney(view.crewSummary.pending)} owed to crew`}
                    meta={`${view.crewSummary.pendingMembers.length} member(s)`}
                  />
                ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Footage alerts"
          icon="film"
          action={
            <Link to="/crew" className="btn btn-ghost btn-sm">
              View all
            </Link>
          }
        >
          {footagePending.length === 0 ? (
            <EmptyState
              icon="checkCircle"
              title="No missing footage"
              text="Every crew member has uploaded for the shoots that have happened."
            />
          ) : (
            <div className="col">
              {footagePending.slice(0, 8).map((view) => (
                <AlertRow
                  key={view.event.id}
                  to={`/events/${view.event.id}`}
                  icon="upload"
                  tone="warn"
                  title={view.event.eventName}
                  detail={view.footageSummary.pendingMembers
                    .map((row) => row.memberName)
                    .filter(Boolean)
                    .join(', ') || `${view.footageSummary.pending} pending`}
                  meta={`${view.footageSummary.uploaded}/${view.footageSummary.count} in`}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Upcoming events"
        icon="calendar"
        action={
          <Link to="/events" className="btn btn-ghost btn-sm">
            All events
          </Link>
        }
      >
        {upcoming.length === 0 ? (
          <EmptyState
            icon="calendarPlus"
            title="No upcoming events"
            text="When you book a shoot, add it here so the dates, payments and crew stay in one place."
            action={
              <Link to="/events/new" className="btn btn-primary btn-sm">
                <Icon name="plus" size={15} />
                Add your first event
              </Link>
            }
          />
        ) : (
          <div className="grid grid-2">
            {upcoming.slice(0, 6).map((view) => (
              <EventCard key={view.event.id} view={view} />
            ))}
          </div>
        )}
      </SectionCard>

      {needsAttention.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <SectionCard title="Needs closing" icon="alert">
            <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
              These dates have passed but the money or the footage is not complete yet.
            </p>
            <div className="grid grid-2">
              {needsAttention.slice(0, 6).map((view) => (
                <EventCard key={view.event.id} view={view} />
              ))}
            </div>
          </SectionCard>
        </div>
      )}
    </>
  )
}

/** Highlighted panel for a shoot happening today, with the start/end buttons. */
function TodayPanel({ view }) {
  const { event, client, money } = view
  const { startShoot, endShoot } = useEventActions()
  const toast = useToast()

  async function run(action, message) {
    try {
      await action()
      toast.success(message)
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <section className="detail-head" style={{ marginBottom: 0 }}>
      <div className="row row-between row-wrap gap-8">
        <Badge status={event.shootStatus === 'Started' ? 'Ongoing' : 'Today'} />
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {event.shootStatus === 'Started'
            ? `Started ${formatStamp(event.shootStartedAt)}`
            : 'Ready to start'}
        </span>
      </div>

      <h1>{event.eventName}</h1>

      <div className="detail-meta">
        <span>
          <Icon name="clock" size={14} />
          {formatTimeRange(event.startTime, event.endTime)}
        </span>
        <span>
          <Icon name="mapPin" size={14} />
          {locationLabel(event.location)}
        </span>
        {client && (
          <span>
            <Icon name="user" size={14} />
            {client.name}
          </span>
        )}
        <span>
          <Icon name="wallet" size={14} />
          Balance {formatMoney(money.balance)}
        </span>
      </div>

      <div className="row row-wrap gap-8">
        {event.shootStatus !== 'Started' && event.shootStatus !== 'Ended' && (
          <button
            type="button"
            className="btn btn-success"
            onClick={() => run(() => startShoot(event.id), 'Shoot started. Timestamp saved.')}
          >
            <Icon name="play" size={16} />
            Start Shoot
          </button>
        )}
        {event.shootStatus === 'Started' && (
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => run(() => endShoot(event.id), 'Shoot ended. Timestamp saved.')}
          >
            <Icon name="stop" size={16} />
            End Shoot
          </button>
        )}
        <Link to={`/events/${event.id}`} className="btn btn-secondary">
          Open event
          <Icon name="chevronRight" size={16} />
        </Link>
      </div>
    </section>
  )
}

function AlertRow({ to, icon, tone, title, detail, meta }) {
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
