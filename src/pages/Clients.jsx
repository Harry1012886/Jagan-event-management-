import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { ClientDialog } from '../components/EventDialogs'
import { ConfirmDialog } from '../components/ui/Modal'
import {
  EmptyState,
  PageHeader,
  SearchBox,
  SectionCard,
} from '../components/ui/Primitives'
import { useToast } from '../components/ui/Toast'
import { useData } from '../data/store'
import { useEventViews } from '../hooks/useEvents'
import { formatMoney } from '../utils/format'

export function Clients() {
  const { db, create, update, remove } = useData()
  const views = useEventViews()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [dialog, setDialog] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return db.clients
      .map((client) => {
        const clientEvents = views.filter((view) => view.event.clientId === client.id)
        return {
          client,
          events: clientEvents,
          billed: clientEvents.reduce((sum, view) => sum + view.money.totalAmount, 0),
          balance: clientEvents.reduce((sum, view) => sum + view.money.balance, 0),
        }
      })
      .filter((row) => {
        if (!term) return true
        return [row.client.name, row.client.phone, row.client.email]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term)
      })
      .sort((a, b) => String(a.client.name).localeCompare(String(b.client.name)))
  }, [db.clients, views, search])

  async function guard(action, message) {
    try {
      await action()
      toast.success(message)
    } catch (err) {
      toast.error(err.message ?? 'Something went wrong.')
    }
  }

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${db.clients.length} client${db.clients.length === 1 ? '' : 's'} on record`}
        actions={
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setDialog({ client: null })}
          >
            <Icon name="plus" size={17} />
            Add Client
          </button>
        }
      />

      <div style={{ marginBottom: 14, maxWidth: 420 }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search name, phone or email…" />
      </div>

      <SectionCard flush>
        {rows.length === 0 ? (
          <EmptyState
            icon="users"
            title={db.clients.length ? 'No client matches' : 'No clients yet'}
            text={
              db.clients.length
                ? 'Try a different search.'
                : 'Clients are created automatically when you add an event, or you can add one here.'
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Contact</th>
                  <th className="num">Events</th>
                  <th className="num">Billed</th>
                  <th className="num">Balance</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(({ client, events, billed, balance }) => (
                  <tr key={client.id}>
                    <td data-label="Client">
                      <div className="strong">{client.name}</div>
                      {client.notes && <div className="text-xs text-muted">{client.notes}</div>}
                    </td>
                    <td data-label="Contact">
                      <div className="col gap-4">
                        {client.phone && (
                          <a href={`tel:${client.phone}`} className="text-sm">
                            {client.phone}
                          </a>
                        )}
                        {client.email && (
                          <a href={`mailto:${client.email}`} className="text-sm">
                            {client.email}
                          </a>
                        )}
                        {!client.phone && !client.email && (
                          <span className="text-muted text-sm">—</span>
                        )}
                      </div>
                    </td>
                    <td data-label="Events" className="num">
                      {events.length}
                    </td>
                    <td data-label="Billed" className="num">
                      {formatMoney(billed)}
                    </td>
                    <td data-label="Balance" className="num strong">
                      <span style={{ color: balance > 0 ? 'var(--danger-fg)' : 'var(--ok-fg)' }}>
                        {formatMoney(balance)}
                      </span>
                    </td>
                    <td data-label="">
                      <div className="row gap-4 row-end">
                        {events[0] && (
                          <Link
                            to={`/events?`}
                            className="icon-button"
                            style={{ width: 32, height: 32 }}
                            aria-label="View events"
                          >
                            <Icon name="camera" size={15} />
                          </Link>
                        )}
                        <button
                          type="button"
                          className="icon-button"
                          style={{ width: 32, height: 32 }}
                          onClick={() => setDialog({ client })}
                          aria-label={`Edit ${client.name}`}
                        >
                          <Icon name="edit" size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          style={{ width: 32, height: 32 }}
                          onClick={() =>
                            setConfirm({
                              client,
                              blocked: events.length > 0,
                            })
                          }
                          aria-label={`Delete ${client.name}`}
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

      <ClientDialog
        open={Boolean(dialog)}
        onClose={() => setDialog(null)}
        client={dialog?.client}
        onSave={(values) =>
          guard(
            () =>
              dialog?.client
                ? update('clients', dialog.client.id, values)
                : create('clients', values),
            'Client saved.',
          )
        }
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.blocked ? 'Cannot delete this client' : `Delete ${confirm?.client?.name}?`}
        message={
          confirm?.blocked
            ? 'This client still has events linked to them. Delete or reassign those events first.'
            : 'The client record will be removed. This cannot be undone.'
        }
        confirmLabel={confirm?.blocked ? 'Understood' : 'Delete'}
        danger={!confirm?.blocked}
        onConfirm={async () => {
          if (!confirm.blocked) {
            await guard(() => remove('clients', confirm.client.id), 'Client deleted.')
          }
          setConfirm(null)
        }}
      />
    </>
  )
}
