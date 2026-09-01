import { daysFromToday, toAmount } from './format'

/**
 * All derived numbers live here. Nothing in this file writes to the database —
 * totals are always recomputed from the payment history so a stored total can
 * never disagree with the records behind it.
 */

/**
 * Has this instalment actually landed?
 *
 * Rows saved before the status field existed are money that was already in hand,
 * so a missing status counts as received.
 */
export function isPaymentReceived(payment) {
  return payment?.status !== 'Pending'
}

/** Money summary for one event, built from its payment rows. */
export function summarisePayments(event, payments) {
  const rows = [...payments].sort((a, b) =>
    String(a.paidDate).localeCompare(String(b.paidDate)),
  )
  const received = rows.filter(isPaymentReceived)
  const totalAmount = toAmount(event?.totalAmount)
  const advanceRequired = toAmount(event?.advanceRequired)
  const totalPaid = received.reduce((sum, p) => sum + toAmount(p.amount), 0)
  const pendingAmount = rows
    .filter((p) => !isPaymentReceived(p))
    .reduce((sum, p) => sum + toAmount(p.amount), 0)
  const balance = Math.max(0, Math.round((totalAmount - totalPaid) * 100) / 100)

  const advanceRows = received.filter((p) => p.type === 'Advance')
  const advancePaid = advanceRows.reduce((sum, p) => sum + toAmount(p.amount), 0)
  const lastPayment = received[received.length - 1] ?? null

  let status = 'Unpaid'
  if (totalAmount > 0 && totalPaid >= totalAmount) status = 'Fully Paid'
  else if (totalPaid > 0) status = 'Partially Paid'

  return {
    totalAmount,
    advanceRequired,
    advancePaid,
    advanceStatus: advanceRequired > 0 && advancePaid >= advanceRequired
      ? 'Paid'
      : advancePaid > 0
        ? 'Partially Paid'
        : 'Pending',
    advanceMethod: advanceRows[0]?.method ?? null,
    advanceDate: advanceRows[0]?.paidDate ?? null,
    totalPaid,
    pendingAmount,
    balance,
    status,
    lastPayment,
    lastMethod: lastPayment?.method ?? null,
    history: rows,
    isFullyPaid: status === 'Fully Paid',
  }
}

/** Agreed cost and outstanding amount across an event's crew. */
export function summariseCrew(crew) {
  const agreed = crew.reduce((sum, c) => sum + toAmount(c.agreedPayment), 0)
  const paid = crew.reduce(
    (sum, c) => sum + (c.paymentStatus === 'Paid'
      ? toAmount(c.paidAmount || c.agreedPayment)
      : toAmount(c.paidAmount)),
    0,
  )
  const pendingMembers = crew.filter((c) => c.paymentStatus !== 'Paid')
  return {
    count: crew.length,
    agreed,
    paid,
    pending: Math.max(0, Math.round((agreed - paid) * 100) / 100),
    pendingMembers,
    allPaid: crew.length > 0 && pendingMembers.length === 0,
  }
}

/** Upload progress across an event's crew. */
export function summariseFootage(footage) {
  const done = footage.filter((f) => f.status === 'Verified').length
  const uploaded = footage.filter(
    (f) => f.status === 'Uploaded' || f.status === 'Verified',
  ).length
  const pendingMembers = footage.filter(
    (f) => f.status !== 'Uploaded' && f.status !== 'Verified',
  )
  return {
    count: footage.length,
    uploaded,
    verified: done,
    pending: pendingMembers.length,
    pendingMembers,
    allUploaded: footage.length > 0 && pendingMembers.length === 0,
    allVerified: footage.length > 0 && done === footage.length,
  }
}

/**
 * The single lifecycle label shown on cards and filters.
 * An event is only 'Completed' once the shoot ended, the money is settled and
 * every crew member's footage is in (requirements section 7, step 16).
 */
export function eventStatus(event, { payments = [], crew = [], footage = [] } = {}) {
  const money = summarisePayments(event, payments)
  const crewSummary = summariseCrew(crew)
  const footageSummary = summariseFootage(footage)
  const diff = daysFromToday(event?.date)

  if (event?.shootStatus === 'Started') return 'Ongoing'

  if (event?.shootStatus === 'Ended') {
    const moneyDone = money.isFullyPaid && crewSummary.pending === 0
    const footageDone = footage.length === 0 || footageSummary.allUploaded
    if (moneyDone && footageDone) return 'Completed'
    return 'Needs Attention'
  }

  if (diff === null) return 'Upcoming'
  if (diff === 0) return 'Today'
  if (diff > 0) return 'Upcoming'
  return 'Needs Attention'
}

/** Everything the dashboard and event page need about one event, in one object. */
export function buildEventView(event, db) {
  const payments = db.payments.filter((p) => p.eventId === event.id)
  const crew = db.crewAssignments.filter((c) => c.eventId === event.id)
  const footage = db.footageUploads.filter((f) => f.eventId === event.id)
  const client = db.clients.find((c) => c.id === event.clientId) ?? null

  return {
    event,
    client,
    payments,
    crew,
    footage,
    money: summarisePayments(event, payments),
    crewSummary: summariseCrew(crew),
    footageSummary: summariseFootage(footage),
    status: eventStatus(event, { payments, crew, footage }),
  }
}

/** Sorts events by date then start time, earliest first. */
export function byDateAsc(a, b) {
  const date = String(a.date).localeCompare(String(b.date))
  if (date !== 0) return date
  return String(a.startTime ?? '').localeCompare(String(b.startTime ?? ''))
}

/** Human-readable 'State — District, Venue' from an event's location object. */
export function locationLabel(location) {
  if (!location) return '—'
  if (typeof location === 'string') return location
  const parts = [location.venue, location.district, location.state].filter(Boolean)
  return parts.length ? parts.join(', ') : '—'
}
