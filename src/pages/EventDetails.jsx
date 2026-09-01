import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import {
  Badge,
  Banner,
  EmptyState,
  PageHeader,
  Progress,
  SectionCard,
  Spinner,
} from '../components/ui/Primitives'
import { ConfirmDialog } from '../components/ui/Modal'
import {
  CrewDialog,
  CrewPaymentDialog,
  FootageDialog,
  PaymentDialog,
} from '../components/EventDialogs'
import { FootageStatusSelect } from '../components/ChoiceFields'
import { useToast } from '../components/ui/Toast'
import { useData } from '../data/store'
import { useEventActions, useEventView } from '../hooks/useEvents'
import { isPaymentReceived, locationLabel } from '../utils/calc'
import {
  formatDate,
  formatDateLong,
  formatMoney,
  formatStamp,
  formatTimeRange,
  relativeDay,
} from '../utils/format'
import {
  createCalendarEvent,
  isCalendarConfigured,
  updateCalendarEvent,
} from '../services/calendarService'

export function EventDetails() {
  const { eventId } = useParams()
  const view = useEventView(eventId)
  const navigate = useNavigate()
  const toast = useToast()
  const { create, update, remove, removeEvent, removeCrewMember } = useData()
  const { startShoot, endShoot, resetShoot, addCrewMember } = useEventActions()

  const [paymentDialog, setPaymentDialog] = useState(null)
  const [crewDialog, setCrewDialog] = useState(null)
  const [crewPayDialog, setCrewPayDialog] = useState(null)
  const [footageDialog, setFootageDialog] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState('')

  if (!view) {
    return (
      <>
        <PageHeader title="Event not found" />
        <Banner kind="danger">
          This event does not exist or has been deleted.{' '}
          <Link to="/events">Back to all events</Link>.
        </Banner>
      </>
    )
  }

  const { event, client, money, crew, footage, crewSummary, footageSummary, status } = view

  async function guard(action, successMessage) {
    try {
      await action()
      if (successMessage) toast.success(successMessage)
    } catch (err) {
      console.error(err)
      toast.error(err.message ?? 'Something went wrong.')
    }
  }

  async function syncCalendar() {
    setBusy('calendar')
    try {
      const result = event.calendarEventId
        ? await updateCalendarEvent(event.calendarEventId, event, client)
        : await createCalendarEvent(event, client)

      await update('events', event.id, result)
      await create('notifications', {
        eventId: event.id,
        type: event.calendarEventId ? 'Calendar updated' : 'Calendar event created',
        recipient: 'Google Calendar',
        sentAt: new Date().toISOString(),
        status: 'Sent',
        errorMessage: '',
      })
      toast.success(
        event.calendarEventId
          ? 'Google Calendar event updated.'
          : 'Added to Google Calendar with reminders.',
      )
    } catch (err) {
      console.error(err)
      await create('notifications', {
        eventId: event.id,
        type: 'Calendar event',
        recipient: 'Google Calendar',
        sentAt: new Date().toISOString(),
        status: 'Failed',
        errorMessage: err.message ?? 'Unknown error',
      }).catch(() => {})
      toast.error(err.message ?? 'Could not reach Google Calendar.')
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <div className="row gap-8" style={{ marginBottom: 12 }}>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(-1)}>
          <Icon name="arrowLeft" size={16} />
          Back
        </button>
      </div>

      <section className="detail-head">
        <div className="row row-between row-wrap gap-8">
          <Badge status={status} />
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.78)' }}>
            {relativeDay(event.date)}
          </span>
        </div>

        <h1>{event.eventName}</h1>

        <div className="detail-meta">
          <span>
            <Icon name="calendar" size={14} />
            {formatDateLong(event.date)}
          </span>
          <span>
            <Icon name="clock" size={14} />
            {formatTimeRange(event.startTime, event.endTime)}
          </span>
          <span>
            <Icon name="mapPin" size={14} />
            {locationLabel(event.location)}
          </span>
          {event.eventType && (
            <span>
              <Icon name="camera" size={14} />
              {event.eventType}
            </span>
          )}
        </div>

        <div className="row row-wrap gap-8">
          {event.shootStatus !== 'Started' && event.shootStatus !== 'Ended' && (
            <button
              type="button"
              className="btn btn-success"
              onClick={() => guard(() => startShoot(event.id), 'Shoot started.')}
            >
              <Icon name="play" size={16} />
              Start Shoot
            </button>
          )}
          {event.shootStatus === 'Started' && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => guard(() => endShoot(event.id), 'Shoot ended.')}
            >
              <Icon name="stop" size={16} />
              End Shoot
            </button>
          )}
          {money.balance > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                setPaymentDialog({
                  payment: null,
                  suggestedType: money.advanceStatus === 'Paid' ? 'Final' : 'Advance',
                })
              }
            >
              <Icon name="wallet" size={16} />
              Record payment
            </button>
          )}
          <Link to={`/events/${event.id}/edit`} className="btn btn-secondary">
            <Icon name="edit" size={16} />
            Edit
          </Link>
        </div>
      </section>

      <div className="detail-grid">
        <div className="col gap-16">
          <SectionCard
            title="Client payments"
            icon="wallet"
            action={
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setPaymentDialog({ payment: null, suggestedType: money.advanceStatus === 'Paid' ? 'Final' : 'Advance' })}
              >
                <Icon name="plus" size={15} />
                Record payment
              </button>
            }
          >
            <div className="money-row">
              <span className="label">Total event amount</span>
              <span className="value">{formatMoney(money.totalAmount)}</span>
            </div>
            <div className="money-row">
              <span className="label">
                Advance required
                {money.advanceRequired > 0 && (
                  <> · <Badge status={money.advanceStatus} /></>
                )}
              </span>
              <span className="value">{formatMoney(money.advanceRequired)}</span>
            </div>
            {money.advanceMethod && (
              <div className="money-row">
                <span className="label">Advance method</span>
                <span className="value">
                  {money.advanceMethod} · {formatDate(money.advanceDate)}
                </span>
              </div>
            )}
            <div className="money-row">
              <span className="label">Total received</span>
              <span className="value" style={{ color: 'var(--ok-fg)' }}>
                {formatMoney(money.totalPaid)}
              </span>
            </div>
            <div className={`money-row total ${money.balance > 0 ? 'balance-due' : 'balance-clear'}`}>
              <span className="label strong">Balance</span>
              <span className="value">{formatMoney(money.balance)}</span>
            </div>

            {money.totalAmount > 0 && (
              <div style={{ marginTop: 12 }}>
                <Progress
                  value={money.totalPaid}
                  max={money.totalAmount}
                  tone={money.isFullyPaid ? 'ok' : undefined}
                />
                <p className="text-xs text-muted" style={{ marginTop: 6 }}>
                  {money.isFullyPaid
                    ? 'Fully paid.'
                    : `${Math.round((money.totalPaid / money.totalAmount) * 100)}% received · ${formatMoney(money.balance)} to go`}
                </p>
              </div>
            )}

            <hr className="divider" />

            <h3 style={{ marginBottom: 10, fontSize: '0.875rem' }}>Payment history</h3>

            {money.history.length === 0 ? (
              <EmptyState
                icon="wallet"
                title="No payments recorded"
                text="Record the advance and every later instalment so the balance stays correct."
              />
            ) : (
              <div className="table-wrap">
                <table className="table responsive">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Method</th>
                      <th>Reference</th>
                      <th className="num">Amount</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {money.history.map((payment) => (
                      <tr key={payment.id}>
                        <td data-label="Type">
                          <Badge
                            status={payment.type}
                            tone={
                              payment.type === 'Advance'
                                ? 'info'
                                : payment.type === 'Final'
                                  ? 'ok'
                                  : 'warn'
                            }
                          />
                        </td>
                        <td data-label="Status">
                          <Badge status={isPaymentReceived(payment) ? 'Paid' : 'Pending'} />
                        </td>
                        <td data-label="Date">
                          {isPaymentReceived(payment)
                            ? formatDate(payment.paidDate)
                            : payment.dueDate
                              ? `due ${formatDate(payment.dueDate)}`
                              : '—'}
                        </td>
                        <td data-label="Method">{payment.method || '—'}</td>
                        <td data-label="Reference" className="text-muted">
                          {payment.reference || '—'}
                        </td>
                        <td data-label="Amount" className="num strong">
                          {formatMoney(payment.amount)}
                        </td>
                        <td data-label="">
                          <div className="row gap-4 row-end">
                            <button
                              type="button"
                              className="icon-button"
                              style={{ width: 32, height: 32 }}
                              onClick={() => setPaymentDialog({ payment })}
                              aria-label="Edit payment"
                            >
                              <Icon name="edit" size={15} />
                            </button>
                            <button
                              type="button"
                              className="icon-button"
                              style={{ width: 32, height: 32 }}
                              onClick={() =>
                                setConfirm({
                                  title: 'Delete this payment?',
                                  message: isPaymentReceived(payment)
                                    ? `${formatMoney(payment.amount)} received on ${formatDate(payment.paidDate)} by ${payment.method} will be removed from the history.`
                                    : `The pending ${formatMoney(payment.amount)} instalment will be removed from the history.`,
                                  action: () => remove('payments', payment.id),
                                  done: 'Payment deleted.',
                                })
                              }
                              aria-label="Delete payment"
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title={`Crew (${crewSummary.count})`}
            icon="users"
            action={
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCrewDialog({ member: null })}
              >
                <Icon name="plus" size={15} />
                Add member
              </button>
            }
          >
            {crew.length === 0 ? (
              <EmptyState
                icon="users"
                title="No crew added"
                text="Add the photographers and videographers shooting with you to track their payment and footage."
              />
            ) : (
              <>
                <div className="row row-between text-sm" style={{ marginBottom: 8 }}>
                  <span className="text-muted">
                    Agreed <strong>{formatMoney(crewSummary.agreed)}</strong>
                  </span>
                  <span className="text-muted">
                    Paid <strong style={{ color: 'var(--ok-fg)' }}>{formatMoney(crewSummary.paid)}</strong>
                  </span>
                  <span className="text-muted">
                    Pending{' '}
                    <strong style={{ color: crewSummary.pending > 0 ? 'var(--danger-fg)' : 'var(--ok-fg)' }}>
                      {formatMoney(crewSummary.pending)}
                    </strong>
                  </span>
                </div>

                <div className="col">
                  {crew.map((member) => (
                    <div className="person-row" key={member.id}>
                      <span className="stat-icon tone-brand">
                        <Icon name="camera" size={15} />
                      </span>
                      <span className="person-main">
                        <span className="person-name">{member.memberName}</span>
                        <span className="person-sub">
                          {member.role} · {formatMoney(member.agreedPayment)}
                          {member.paymentStatus === 'Paid' && member.paymentMethod && (
                            <> · paid by {member.paymentMethod} on {formatDate(member.paidDate)}</>
                          )}
                        </span>
                      </span>
                      <Badge status={member.paymentStatus ?? 'Pending'} />
                      <span className="person-actions">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setCrewPayDialog({ member })}
                        >
                          <Icon name="wallet" size={14} />
                          Pay
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          style={{ width: 32, height: 32 }}
                          onClick={() => setCrewDialog({ member })}
                          aria-label={`Edit ${member.memberName}`}
                        >
                          <Icon name="edit" size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          style={{ width: 32, height: 32 }}
                          onClick={() =>
                            setConfirm({
                              title: `Remove ${member.memberName}?`,
                              message:
                                'Their payment record and footage tracking for this event will be removed too.',
                              action: () => removeCrewMember(member.id),
                              done: 'Crew member removed.',
                            })
                          }
                          aria-label={`Remove ${member.memberName}`}
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </SectionCard>

          <SectionCard title="Footage uploads" icon="film">
            {footage.length === 0 ? (
              <EmptyState
                icon="upload"
                title="No footage records"
                text="Add crew members and a footage row is created for each of them automatically."
              />
            ) : (
              <>
                <div className="row row-between text-sm" style={{ marginBottom: 10 }}>
                  <span className="text-muted">
                    {footageSummary.uploaded} of {footageSummary.count} uploaded ·{' '}
                    {footageSummary.verified} verified
                  </span>
                  {footageSummary.allVerified && <Badge status="Verified" />}
                </div>

                <Progress
                  value={footageSummary.uploaded}
                  max={footageSummary.count}
                  tone={footageSummary.allUploaded ? 'ok' : 'warn'}
                />

                <div className="col" style={{ marginTop: 8 }}>
                  {footage.map((row) => {
                    const member = crew.find((item) => item.id === row.crewAssignmentId)
                    const name = row.memberName || member?.memberName || 'Crew member'
                    return (
                      <div className="person-row" key={row.id}>
                        <span className="stat-icon tone-info">
                          <Icon name="film" size={15} />
                        </span>
                        <span className="person-main">
                          <span className="person-name">{name}</span>
                          <span className="person-sub">
                            {row.status === 'Pending'
                              ? 'Nothing uploaded yet'
                              : row.uploadedAt
                                ? `Uploaded ${formatStamp(row.uploadedAt)}`
                                : row.status}
                          </span>
                        </span>

                        <span style={{ width: 168, flex: 'none' }} className="hide-mobile">
                          <FootageStatusSelect
                            value={row.status ?? 'Pending'}
                            onChange={(value) =>
                              guard(
                                () =>
                                  update('footageUploads', row.id, {
                                    status: value,
                                    verified: value === 'Verified',
                                    verifiedAt:
                                      value === 'Verified' ? new Date().toISOString() : null,
                                    uploadedAt:
                                      value === 'Uploaded' || value === 'Verified'
                                        ? row.uploadedAt ?? new Date().toISOString()
                                        : null,
                                  }),
                                `${name}: ${value}`,
                              )
                            }
                            ariaLabel={`Upload status for ${name}`}
                          />
                        </span>

                        <span className="only-mobile">
                          <Badge status={row.status ?? 'Pending'} />
                        </span>

                        <span className="person-actions">
                          {row.driveLink && (
                            <a
                              href={row.driveLink}
                              target="_blank"
                              rel="noreferrer"
                              className="icon-button"
                              style={{ width: 32, height: 32 }}
                              aria-label={`Open Drive folder for ${name}`}
                            >
                              <Icon name="externalLink" size={15} />
                            </a>
                          )}
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setFootageDialog({ footage: row, memberName: name })}
                          >
                            <Icon name="edit" size={14} />
                            Update
                          </button>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </SectionCard>
        </div>

        <div className="col gap-16">
          <SectionCard title="Client" icon="user">
            {client ? (
              <div className="col gap-12">
                <div>
                  <div className="strong">{client.name}</div>
                  {client.notes && <div className="text-sm text-muted">{client.notes}</div>}
                </div>
                <div className="row row-wrap gap-8">
                  {client.phone && (
                    <a href={`tel:${client.phone}`} className="btn btn-secondary btn-sm">
                      <Icon name="phone" size={14} />
                      {client.phone}
                    </a>
                  )}
                  {client.email && (
                    <a href={`mailto:${client.email}`} className="btn btn-secondary btn-sm">
                      <Icon name="mail" size={14} />
                      Email
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">No client linked to this event.</p>
            )}
          </SectionCard>

          <SectionCard title="Shoot status" icon="camera">
            <div className="col gap-12">
              <div className="row row-between">
                <span className="text-sm text-muted">Current</span>
                <Badge status={event.shootStatus ?? 'Not Started'} />
              </div>
              <dl className="kv">
                <dt>Started</dt>
                <dd>{event.shootStartedAt ? formatStamp(event.shootStartedAt) : '—'}</dd>
                <dt>Ended</dt>
                <dd>{event.shootEndedAt ? formatStamp(event.shootEndedAt) : '—'}</dd>
              </dl>
              {event.shootStatus !== 'Not Started' && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    setConfirm({
                      title: 'Reset shoot status?',
                      message: 'The start and end timestamps for this event will be cleared.',
                      action: () => resetShoot(event.id),
                      done: 'Shoot status reset.',
                      confirmLabel: 'Reset',
                    })
                  }
                >
                  <Icon name="refresh" size={14} />
                  Reset shoot status
                </button>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Google Calendar" icon="calendar">
            <div className="col gap-12">
              {!isCalendarConfigured ? (
                <p className="text-sm text-muted">
                  Add your Google client ID in <Link to="/settings">Settings</Link> to create
                  calendar events with automatic reminders.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted">
                    {event.calendarLink
                      ? 'This event is on your Google Calendar. Reminders arrive by email and phone notification.'
                      : 'Add this event to Google Calendar and Google will remind you 1 day and 2 hours before.'}
                  </p>
                  <div className="row row-wrap gap-8">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={syncCalendar}
                      disabled={busy === 'calendar'}
                    >
                      {busy === 'calendar' ? <Spinner /> : <Icon name="calendarPlus" size={15} />}
                      {event.calendarEventId ? 'Update calendar event' : 'Add to Google Calendar'}
                    </button>
                    {event.calendarLink && (
                      <a
                        href={event.calendarLink}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary btn-sm"
                      >
                        <Icon name="externalLink" size={15} />
                        Open
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </SectionCard>

          {event.notes && (
            <SectionCard title="Notes" icon="list">
              <p className="text-sm" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {event.notes}
              </p>
            </SectionCard>
          )}

          <SectionCard title="Danger zone" icon="alert">
            <p className="text-sm text-muted" style={{ marginBottom: 10 }}>
              Deleting this event also removes its payments, crew and footage records.
            </p>
            <button
              type="button"
              className="btn btn-danger btn-block"
              onClick={() =>
                setConfirm({
                  title: `Delete "${event.eventName}"?`,
                  message:
                    'This cannot be undone. All payments, crew assignments and footage records for this event will be deleted.',
                  action: async () => {
                    await removeEvent(event.id)
                    navigate('/events')
                  },
                  done: 'Event deleted.',
                })
              }
            >
              <Icon name="trash" size={16} />
              Delete event
            </button>
          </SectionCard>
        </div>
      </div>

      <PaymentDialog
        open={Boolean(paymentDialog)}
        onClose={() => setPaymentDialog(null)}
        payment={paymentDialog?.payment}
        suggestedType={paymentDialog?.suggestedType}
        balance={money.balance}
        onSave={(values) =>
          guard(
            () =>
              paymentDialog?.payment
                ? update('payments', paymentDialog.payment.id, values)
                : create('payments', { ...values, eventId: event.id }),
            'Payment saved.',
          )
        }
      />

      <CrewDialog
        open={Boolean(crewDialog)}
        onClose={() => setCrewDialog(null)}
        member={crewDialog?.member}
        onSave={(values) =>
          guard(
            () =>
              crewDialog?.member
                ? update('crewAssignments', crewDialog.member.id, values)
                : addCrewMember(event.id, {
                    ...values,
                    paymentStatus: 'Pending',
                    paidAmount: 0,
                    paymentMethod: '',
                    paidDate: '',
                    paymentReference: '',
                  }),
            'Crew member saved.',
          )
        }
      />

      <CrewPaymentDialog
        open={Boolean(crewPayDialog)}
        onClose={() => setCrewPayDialog(null)}
        member={crewPayDialog?.member}
        onSave={(values) =>
          guard(
            () => update('crewAssignments', crewPayDialog.member.id, values),
            'Crew payment updated.',
          )
        }
      />

      <FootageDialog
        open={Boolean(footageDialog)}
        onClose={() => setFootageDialog(null)}
        footage={footageDialog?.footage}
        memberName={footageDialog?.memberName}
        onSave={(values) =>
          guard(
            () => update('footageUploads', footageDialog.footage.id, values),
            'Footage status updated.',
          )
        }
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel ?? 'Delete'}
        busy={busy === 'confirm'}
        onConfirm={async () => {
          setBusy('confirm')
          await guard(confirm.action, confirm.done)
          setBusy('')
          setConfirm(null)
        }}
      />
    </>
  )
}
