import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { EventCard } from '../components/EventCard'
import { Select } from '../components/ui/Select'
import {
  ClientPaymentStatusSelect,
  EventTypeSelect,
  ShootStatusSelect,
} from '../components/ChoiceFields'
import { EmptyState, PageHeader, SearchBox } from '../components/ui/Primitives'
import { useEventViews } from '../hooks/useEvents'
import { INDIA_STATES } from '../data/indiaLocations'
import { locationLabel } from '../utils/calc'

const LIFECYCLE = ['Upcoming', 'Today', 'Ongoing', 'Needs Attention', 'Completed']

const SORTS = [
  { value: 'date-asc', label: 'Date — earliest first' },
  { value: 'date-desc', label: 'Date — latest first' },
  { value: 'amount-desc', label: 'Amount — highest first' },
  { value: 'balance-desc', label: 'Balance — highest first' },
  { value: 'name-asc', label: 'Name — A to Z' },
]

export function Events() {
  const views = useEventViews()
  const [params, setParams] = useSearchParams()

  const [search, setSearch] = useState('')
  const [paymentStatus, setPaymentStatus] = useState('')
  const [shootStatus, setShootStatus] = useState('')
  const [eventType, setEventType] = useState('')
  const [state, setState] = useState('')
  const [sort, setSort] = useState('date-asc')

  const lifecycle = params.get('status') ?? ''

  function setLifecycle(next) {
    const nextParams = new URLSearchParams(params)
    if (next) nextParams.set('status', next)
    else nextParams.delete('status')
    setParams(nextParams, { replace: true })
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()

    const matches = views.filter((view) => {
      const { event, client, money, status } = view

      if (lifecycle && status !== lifecycle) return false
      if (paymentStatus && money.status !== paymentStatus) return false
      if (shootStatus && (event.shootStatus ?? 'Not Started') !== shootStatus) return false
      if (eventType && event.eventType !== eventType) return false
      if (state && event.location?.state !== state) return false

      if (!term) return true
      const haystack = [
        event.eventName,
        event.eventType,
        event.notes,
        locationLabel(event.location),
        client?.name,
        client?.phone,
        client?.email,
        event.date,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(term)
    })

    const sorted = [...matches]
    if (sort === 'date-desc') sorted.reverse()
    if (sort === 'amount-desc') {
      sorted.sort((a, b) => b.money.totalAmount - a.money.totalAmount)
    }
    if (sort === 'balance-desc') sorted.sort((a, b) => b.money.balance - a.money.balance)
    if (sort === 'name-asc') {
      sorted.sort((a, b) => String(a.event.eventName).localeCompare(String(b.event.eventName)))
    }
    return sorted
  }, [views, search, lifecycle, paymentStatus, shootStatus, eventType, state, sort])

  const hasFilters =
    Boolean(search || lifecycle || paymentStatus || shootStatus || eventType || state)

  function clearFilters() {
    setSearch('')
    setPaymentStatus('')
    setShootStatus('')
    setEventType('')
    setState('')
    setLifecycle('')
  }

  const usedStates = useMemo(() => {
    const present = new Set(
      views.map((view) => view.event.location?.state).filter(Boolean),
    )
    return INDIA_STATES.filter((item) => present.has(item.name)).map((item) => item.name)
  }, [views])

  return (
    <>
      <PageHeader
        title="All Events"
        subtitle={`${filtered.length} of ${views.length} events shown`}
        actions={
          <Link to="/events/new" className="btn btn-primary">
            <Icon name="plus" size={17} />
            Add Event
          </Link>
        }
      />

      <div className="filter-bar">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search event, client, phone or place…"
        />
        <Select
          value={lifecycle}
          onChange={setLifecycle}
          options={[
            { value: '', label: 'All statuses', tone: 'muted' },
            ...LIFECYCLE.map((item) => ({ value: item, label: item })),
          ]}
          placeholder="Event status"
          searchable={false}
          ariaLabel="Filter by event status"
        />
        <ClientPaymentStatusSelect
          value={paymentStatus}
          onChange={setPaymentStatus}
          includeAll
          ariaLabel="Filter by payment status"
        />
        <ShootStatusSelect
          value={shootStatus}
          onChange={setShootStatus}
          includeAll
          ariaLabel="Filter by shoot status"
        />
      </div>

      <div className="filter-bar">
        <EventTypeSelect
          value={eventType}
          onChange={setEventType}
          includeAll
          ariaLabel="Filter by event type"
        />
        <Select
          value={state}
          onChange={setState}
          options={[
            { value: '', label: 'All locations', tone: 'muted' },
            ...usedStates.map((name) => ({ value: name, label: name })),
          ]}
          placeholder="Location"
          ariaLabel="Filter by state"
        />
        <Select
          value={sort}
          onChange={setSort}
          options={SORTS}
          searchable={false}
          ariaLabel="Sort events"
        />
        {hasFilters && (
          <button type="button" className="btn btn-secondary" onClick={clearFilters}>
            <Icon name="x" size={16} />
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={views.length ? 'search' : 'calendarPlus'}
            title={views.length ? 'No events match these filters' : 'No events yet'}
            text={
              views.length
                ? 'Try clearing a filter or searching for something else.'
                : 'Add your first booking to start tracking dates, payments, crew and footage.'
            }
            action={
              views.length ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>
                  Clear filters
                </button>
              ) : (
                <Link to="/events/new" className="btn btn-primary btn-sm">
                  <Icon name="plus" size={15} />
                  Add Event
                </Link>
              )
            }
          />
        </div>
      ) : (
        <div className="grid grid-2">
          {filtered.map((view) => (
            <EventCard key={view.event.id} view={view} />
          ))}
        </div>
      )}
    </>
  )
}
