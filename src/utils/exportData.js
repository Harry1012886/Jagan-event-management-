import { locationLabel, summarisePayments } from './calc'
import { formatDate, todayISO } from './format'

/** Triggers a browser download for the given text content. */
function download(filename, content, mime) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8;` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Full backup of every collection, restorable through Settings > Import. */
export function exportJson(db) {
  const payload = {
    exportedAt: new Date().toISOString(),
    version: 1,
    ...db,
  }
  download(`event-manager-backup-${todayISO()}.json`, JSON.stringify(payload, null, 2), 'application/json')
}

function csvCell(value) {
  const text = value == null ? '' : String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function toCsv(headers, rows) {
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}

/** One row per event, with the money summary — handy for accounts. */
export function exportEventsCsv(db) {
  const headers = [
    'Event', 'Date', 'Start', 'End', 'Type', 'Location', 'Client', 'Phone',
    'Total', 'Advance required', 'Advance status', 'Total paid', 'Balance',
    'Payment status', 'Shoot status', 'Crew count', 'Crew agreed', 'Crew pending',
  ]

  const rows = [...db.events]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((event) => {
      const payments = db.payments.filter((p) => p.eventId === event.id)
      const crew = db.crewAssignments.filter((c) => c.eventId === event.id)
      const client = db.clients.find((c) => c.id === event.clientId)
      const money = summarisePayments(event, payments)
      const agreed = crew.reduce((sum, c) => sum + (Number(c.agreedPayment) || 0), 0)
      const paid = crew.reduce(
        (sum, c) => sum + (c.paymentStatus === 'Paid' ? Number(c.paidAmount || c.agreedPayment) || 0 : 0),
        0,
      )

      return [
        event.eventName, formatDate(event.date), event.startTime, event.endTime,
        event.eventType, locationLabel(event.location), client?.name, client?.phone,
        money.totalAmount, money.advanceRequired, money.advanceStatus,
        money.totalPaid, money.balance, money.status,
        event.shootStatus ?? 'Not Started',
        crew.length, agreed, Math.max(0, agreed - paid),
      ]
    })

  download(`events-${todayISO()}.csv`, toCsv(headers, rows), 'text/csv')
}

/** One row per payment, showing amount, method and reference. */
export function exportPaymentsCsv(db) {
  const headers = ['Date', 'Event', 'Client', 'Type', 'Amount', 'Method', 'Reference', 'Notes']

  const rows = [...db.payments]
    .sort((a, b) => String(a.paidDate).localeCompare(String(b.paidDate)))
    .map((payment) => {
      const event = db.events.find((e) => e.id === payment.eventId)
      const client = db.clients.find((c) => c.id === event?.clientId)
      return [
        formatDate(payment.paidDate), event?.eventName, client?.name, payment.type,
        payment.amount, payment.method, payment.reference, payment.notes,
      ]
    })

  download(`payments-${todayISO()}.csv`, toCsv(headers, rows), 'text/csv')
}
