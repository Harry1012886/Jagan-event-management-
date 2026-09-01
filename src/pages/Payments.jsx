import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import {
  Badge,
  EmptyState,
  PageHeader,
  SearchBox,
  SectionCard,
  StatCard,
} from '../components/ui/Primitives'
import {
  ClientPaymentStatusSelect,
  PaymentMethodSelect,
  PaymentStatusSelect,
} from '../components/ChoiceFields'
import { Select } from '../components/ui/Select'
import { useEventViews } from '../hooks/useEvents'
import { isPaymentReceived } from '../utils/calc'
import { formatDate, formatMoney } from '../utils/format'

const TABS = [
  { id: 'client', label: 'Client payments', icon: 'wallet' },
  { id: 'crew', label: 'Crew payments', icon: 'users' },
]

export function Payments() {
  const views = useEventViews()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'crew' ? 'crew' : 'client'

  function setTab(next) {
    const nextParams = new URLSearchParams(params)
    nextParams.set('tab', next)
    setParams(nextParams, { replace: true })
  }

  const totals = useMemo(() => {
    const billed = views.reduce((sum, view) => sum + view.money.totalAmount, 0)
    const received = views.reduce((sum, view) => sum + view.money.totalPaid, 0)
    const crewAgreed = views.reduce((sum, view) => sum + view.crewSummary.agreed, 0)
    const crewPaid = views.reduce((sum, view) => sum + view.crewSummary.paid, 0)
    return {
      billed,
      received,
      balance: Math.max(0, billed - received),
      crewAgreed,
      crewPaid,
      crewPending: Math.max(0, crewAgreed - crewPaid),
      net: received - crewPaid,
    }
  }, [views])

  return (
    <>
      <PageHeader
        title="Payments"
        subtitle="Every rupee in and out, with the method used for each."
      />

      <div className="grid grid-stats" style={{ marginBottom: 18 }}>
        <StatCard label="Billed" value={formatMoney(totals.billed)} icon="rupee" tone="brand" />
        <StatCard
          label="Received"
          value={formatMoney(totals.received)}
          icon="checkCircle"
          tone="ok"
        />
        <StatCard
          label="To collect"
          value={formatMoney(totals.balance)}
          icon="alert"
          tone={totals.balance > 0 ? 'danger' : 'ok'}
        />
        <StatCard
          label="Crew unpaid"
          value={formatMoney(totals.crewPending)}
          icon="users"
          tone={totals.crewPending > 0 ? 'warn' : 'ok'}
        />
        <StatCard
          label="Net so far"
          value={formatMoney(totals.net)}
          icon="wallet"
          tone="info"
          foot="Received minus crew paid"
        />
      </div>

      <div className="row gap-8" style={{ marginBottom: 14 }}>
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`btn ${tab === item.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setTab(item.id)}
          >
            <Icon name={item.icon} size={16} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === 'client' ? <ClientPayments views={views} /> : <CrewPayments views={views} />}
    </>
  )
}

function ClientPayments({ views }) {
  const [search, setSearch] = useState('')
  const [method, setMethod] = useState('')
  const [status, setStatus] = useState('')
  const [mode, setMode] = useState('history')

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = []
    for (const view of views) {
      if (status && view.money.status !== status) continue
      for (const payment of view.money.history) {
        if (method && payment.method !== method) continue
        if (
          term &&
          ![view.event.eventName, view.client?.name, payment.reference, payment.method]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(term)
        ) {
          continue
        }
        list.push({ view, payment })
      }
    }
    return list.sort((a, b) =>
      String(b.payment.paidDate).localeCompare(String(a.payment.paidDate)),
    )
  }, [views, search, method, status])

  const outstanding = useMemo(
    () =>
      views
        .filter((view) => view.money.balance > 0)
        .filter((view) => !status || view.money.status === status)
        .sort((a, b) => b.money.balance - a.money.balance),
    [views, status],
  )

  return (
    <>
      <div className="filter-bar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search event, client or reference…" />
        <ClientPaymentStatusSelect
          value={status}
          onChange={setStatus}
          includeAll
          ariaLabel="Filter by payment status"
        />
        <PaymentMethodSelect
          value={method}
          onChange={setMethod}
          includeAll
          ariaLabel="Filter by payment method"
        />
        <Select
          value={mode}
          onChange={setMode}
          options={[
            { value: 'history', label: 'Payment history' },
            { value: 'outstanding', label: 'Outstanding balances' },
          ]}
          searchable={false}
          ariaLabel="View"
        />
      </div>

      {mode === 'outstanding' ? (
        <SectionCard title="Outstanding balances" icon="alert" flush>
          {outstanding.length === 0 ? (
            <EmptyState
              icon="checkCircle"
              title="Nothing outstanding"
              text="Every client has paid in full."
            />
          ) : (
            <div className="table-wrap">
              <table className="table responsive">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Client</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="num">Total</th>
                    <th className="num">Received</th>
                    <th className="num">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {outstanding.map((view) => (
                    <tr key={view.event.id}>
                      <td data-label="Event">
                        <Link to={`/events/${view.event.id}`} className="strong">
                          {view.event.eventName}
                        </Link>
                      </td>
                      <td data-label="Client">{view.client?.name ?? '—'}</td>
                      <td data-label="Date">{formatDate(view.event.date)}</td>
                      <td data-label="Status">
                        <Badge status={view.money.status} />
                      </td>
                      <td data-label="Total" className="num">
                        {formatMoney(view.money.totalAmount)}
                      </td>
                      <td data-label="Received" className="num">
                        {formatMoney(view.money.totalPaid)}
                      </td>
                      <td data-label="Balance" className="num strong">
                        <span style={{ color: 'var(--danger-fg)' }}>
                          {formatMoney(view.money.balance)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      ) : (
        <SectionCard title={`Payment history (${rows.length})`} icon="wallet" flush>
          {rows.length === 0 ? (
            <EmptyState
              icon="wallet"
              title="No payments found"
              text="Record payments from an event page and they will appear here."
            />
          ) : (
            <div className="table-wrap">
              <table className="table responsive">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Event</th>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th className="num">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ view, payment }) => (
                    <tr key={payment.id}>
                      <td data-label="Date">
                        {isPaymentReceived(payment)
                          ? formatDate(payment.paidDate)
                          : payment.dueDate
                            ? `due ${formatDate(payment.dueDate)}`
                            : '—'}
                      </td>
                      <td data-label="Event">
                        <Link to={`/events/${view.event.id}`} className="strong">
                          {view.event.eventName}
                        </Link>
                      </td>
                      <td data-label="Client">{view.client?.name ?? '—'}</td>
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
                      <td data-label="Method">{payment.method || '—'}</td>
                      <td data-label="Reference" className="text-muted">
                        {payment.reference || '—'}
                      </td>
                      <td data-label="Amount" className="num strong">
                        {formatMoney(payment.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}
    </>
  )
}

function CrewPayments({ views }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [method, setMethod] = useState('')

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = []
    for (const view of views) {
      for (const member of view.crew) {
        const memberStatus = member.paymentStatus ?? 'Pending'
        if (status && memberStatus !== status) continue
        if (method && member.paymentMethod !== method) continue
        if (
          term &&
          ![member.memberName, member.role, view.event.eventName]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(term)
        ) {
          continue
        }
        list.push({ view, member, memberStatus })
      }
    }
    return list.sort((a, b) => {
      if (a.memberStatus !== b.memberStatus) return a.memberStatus === 'Pending' ? -1 : 1
      return String(b.view.event.date).localeCompare(String(a.view.event.date))
    })
  }, [views, search, status, method])

  return (
    <>
      <div className="filter-bar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search crew member or event…" />
        <PaymentStatusSelect
          value={status}
          onChange={setStatus}
          includeAll
          ariaLabel="Filter by crew payment status"
        />
        <PaymentMethodSelect
          value={method}
          onChange={setMethod}
          includeAll
          ariaLabel="Filter by payment method"
        />
      </div>

      <SectionCard title={`Crew payments (${rows.length})`} icon="users" flush>
        {rows.length === 0 ? (
          <EmptyState
            icon="users"
            title="No crew payments found"
            text="Add crew members to an event to track what you owe them."
          />
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead>
                <tr>
                  <th>Crew member</th>
                  <th>Role</th>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th className="num">Agreed</th>
                  <th className="num">Paid</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ view, member, memberStatus }) => (
                  <tr key={member.id}>
                    <td data-label="Crew member" className="strong">
                      {member.memberName}
                    </td>
                    <td data-label="Role">{member.role}</td>
                    <td data-label="Event">
                      <Link to={`/events/${view.event.id}`}>{view.event.eventName}</Link>
                    </td>
                    <td data-label="Date">{formatDate(view.event.date)}</td>
                    <td data-label="Status">
                      <Badge status={memberStatus} />
                    </td>
                    <td data-label="Method">{member.paymentMethod || '—'}</td>
                    <td data-label="Agreed" className="num">
                      {formatMoney(member.agreedPayment)}
                    </td>
                    <td data-label="Paid" className="num strong">
                      <span
                        style={{
                          color: memberStatus === 'Paid' ? 'var(--ok-fg)' : 'var(--danger-fg)',
                        }}
                      >
                        {formatMoney(memberStatus === 'Paid' ? member.paidAmount || member.agreedPayment : 0)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  )
}
