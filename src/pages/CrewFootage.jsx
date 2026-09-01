import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { FootageStatusSelect } from '../components/ChoiceFields'
import { FootageDialog } from '../components/EventDialogs'
import { Select } from '../components/ui/Select'
import {
  Badge,
  EmptyState,
  PageHeader,
  SearchBox,
  SectionCard,
  StatCard,
} from '../components/ui/Primitives'
import { useToast } from '../components/ui/Toast'
import { useData } from '../data/store'
import { useEventViews } from '../hooks/useEvents'
import { FOOTAGE_STATUSES } from '../data/constants'
import { formatDate, formatMoney, formatStamp } from '../utils/format'

export function CrewFootage() {
  const views = useEventViews()
  const { update } = useData()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [scope, setScope] = useState('shot')
  const [dialog, setDialog] = useState(null)

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const list = []

    for (const view of views) {
      if (scope === 'shot' && view.event.shootStatus === 'Not Started') continue

      for (const footage of view.footage) {
        const member = view.crew.find((item) => item.id === footage.crewAssignmentId)
        const name = footage.memberName || member?.memberName || 'Crew member'
        const status = footage.status ?? 'Pending'

        if (statusFilter && status !== statusFilter) continue
        if (
          term &&
          ![name, member?.role, view.event.eventName]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(term)
        ) {
          continue
        }

        list.push({ view, footage, member, name, status })
      }
    }

    const order = Object.fromEntries(FOOTAGE_STATUSES.map((s, i) => [s, i]))
    return list.sort((a, b) => {
      const byStatus = (order[a.status] ?? 9) - (order[b.status] ?? 9)
      if (byStatus !== 0) return byStatus
      return String(b.view.event.date).localeCompare(String(a.view.event.date))
    })
  }, [views, search, statusFilter, scope])

  const counts = useMemo(() => {
    const all = views.flatMap((view) =>
      view.event.shootStatus === 'Not Started' ? [] : view.footage,
    )
    const tally = (status) => all.filter((row) => (row.status ?? 'Pending') === status).length
    return {
      total: all.length,
      pending: tally('Pending'),
      uploading: tally('Uploading'),
      uploaded: tally('Uploaded'),
      verified: tally('Verified'),
    }
  }, [views])

  async function setStatus(footage, name, status) {
    try {
      const now = new Date().toISOString()
      await update('footageUploads', footage.id, {
        status,
        verified: status === 'Verified',
        verifiedAt: status === 'Verified' ? footage.verifiedAt ?? now : null,
        uploadedAt:
          status === 'Uploaded' || status === 'Verified' ? footage.uploadedAt ?? now : null,
      })
      toast.success(`${name}: ${status}`)
    } catch (err) {
      toast.error(err.message ?? 'Could not update the status.')
    }
  }

  return (
    <>
      <PageHeader
        title="Crew & Footage"
        subtitle="Who shot with you, and whose footage is still missing."
      />

      <div className="grid grid-stats" style={{ marginBottom: 18 }}>
        <StatCard label="Tracked" value={counts.total} icon="film" tone="brand" />
        <StatCard
          label="Pending"
          value={counts.pending}
          icon="alert"
          tone={counts.pending ? 'warn' : 'ok'}
        />
        <StatCard label="Uploading" value={counts.uploading} icon="upload" tone="info" />
        <StatCard label="Uploaded" value={counts.uploaded} icon="drive" tone="info" />
        <StatCard label="Verified" value={counts.verified} icon="checkCircle" tone="ok" />
      </div>

      <div className="filter-bar">
        <SearchBox value={search} onChange={setSearch} placeholder="Search crew member or event…" />
        <FootageStatusSelect
          value={statusFilter}
          onChange={setStatusFilter}
          includeAll
          ariaLabel="Filter by upload status"
        />
        <Select
          value={scope}
          onChange={setScope}
          options={[
            { value: 'shot', label: 'Shoots that have happened' },
            { value: 'all', label: 'All events' },
          ]}
          searchable={false}
          ariaLabel="Which events to show"
        />
      </div>

      <SectionCard title={`Footage tracker (${rows.length})`} icon="film" flush>
        {rows.length === 0 ? (
          <EmptyState
            icon="film"
            title="Nothing to track yet"
            text="Add crew members to an event and each person gets a footage row here automatically."
          />
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead>
                <tr>
                  <th>Crew member</th>
                  <th>Event</th>
                  <th>Date</th>
                  <th style={{ width: 190 }}>Upload status</th>
                  <th>Uploaded</th>
                  <th>Drive</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ view, footage, member, name, status }) => (
                  <tr key={footage.id}>
                    <td data-label="Crew member">
                      <div className="strong">{name}</div>
                      {member?.role && <div className="text-xs text-muted">{member.role}</div>}
                    </td>
                    <td data-label="Event">
                      <Link to={`/events/${view.event.id}`}>{view.event.eventName}</Link>
                    </td>
                    <td data-label="Date">{formatDate(view.event.date)}</td>
                    <td data-label="Upload status" className="cell-full">
                      <FootageStatusSelect
                        value={status}
                        onChange={(next) => setStatus(footage, name, next)}
                        ariaLabel={`Upload status for ${name}`}
                      />
                    </td>
                    <td data-label="Uploaded" className="text-muted text-sm">
                      {footage.uploadedAt ? formatStamp(footage.uploadedAt) : '—'}
                    </td>
                    <td data-label="Drive">
                      {footage.driveLink ? (
                        <a
                          href={footage.driveLink}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-secondary btn-sm"
                        >
                          <Icon name="drive" size={14} />
                          Open
                        </a>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td data-label="">
                      <div className="row row-end">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setDialog({ footage, memberName: name })}
                        >
                          <Icon name="edit" size={14} />
                          Edit
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

      <div style={{ marginTop: 18 }}>
        <SectionCard title="Crew across all events" icon="users" flush>
          <CrewSummaryTable views={views} />
        </SectionCard>
      </div>

      <FootageDialog
        open={Boolean(dialog)}
        onClose={() => setDialog(null)}
        footage={dialog?.footage}
        memberName={dialog?.memberName}
        onSave={async (values) => {
          try {
            await update('footageUploads', dialog.footage.id, values)
            toast.success('Footage status updated.')
          } catch (err) {
            toast.error(err.message ?? 'Could not save.')
          }
        }}
      />
    </>
  )
}

/** Totals per person: how many shoots and how much is still owed to them. */
function CrewSummaryTable({ views }) {
  const people = useMemo(() => {
    const map = new Map()
    for (const view of views) {
      for (const member of view.crew) {
        const key = member.memberName?.trim().toLowerCase()
        if (!key) continue
        const entry = map.get(key) ?? {
          name: member.memberName,
          roles: new Set(),
          shoots: 0,
          agreed: 0,
          paid: 0,
        }
        entry.roles.add(member.role)
        entry.shoots += 1
        entry.agreed += Number(member.agreedPayment) || 0
        if (member.paymentStatus === 'Paid') {
          entry.paid += Number(member.paidAmount || member.agreedPayment) || 0
        }
        map.set(key, entry)
      }
    }
    return [...map.values()].sort((a, b) => b.agreed - a.agreed)
  }, [views])

  if (people.length === 0) {
    return (
      <EmptyState icon="users" title="No crew yet" text="Crew members you add to events appear here." />
    )
  }

  return (
    <div className="table-wrap">
      <table className="table responsive">
        <thead>
          <tr>
            <th>Name</th>
            <th>Roles</th>
            <th className="num">Shoots</th>
            <th className="num">Agreed</th>
            <th className="num">Paid</th>
            <th className="num">Pending</th>
          </tr>
        </thead>
        <tbody>
          {people.map((person) => {
            const pending = Math.max(0, person.agreed - person.paid)
            return (
              <tr key={person.name}>
                <td data-label="Name" className="strong">
                  {person.name}
                </td>
                <td data-label="Roles" className="text-muted text-sm">
                  {[...person.roles].filter(Boolean).join(', ') || '—'}
                </td>
                <td data-label="Shoots" className="num">
                  {person.shoots}
                </td>
                <td data-label="Agreed" className="num">
                  {formatMoney(person.agreed)}
                </td>
                <td data-label="Paid" className="num">
                  {formatMoney(person.paid)}
                </td>
                <td data-label="Pending" className="num strong">
                  <span style={{ color: pending > 0 ? 'var(--danger-fg)' : 'var(--ok-fg)' }}>
                    {formatMoney(pending)}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
