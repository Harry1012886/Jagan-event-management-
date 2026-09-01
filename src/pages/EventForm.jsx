import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { DatePicker } from '../components/ui/DatePicker'
import { TimePicker } from '../components/ui/TimePicker'
import { LocationPicker } from '../components/LocationPicker'
import { Select } from '../components/ui/Select'
import {
  CrewRoleSelect,
  EventTypeSelect,
  PaymentMethodSelect,
  PaymentStatusSelect,
} from '../components/ChoiceFields'
import {
  Banner,
  Field,
  PageHeader,
  SectionCard,
  Spinner,
} from '../components/ui/Primitives'
import { useToast } from '../components/ui/Toast'
import { useData } from '../data/store'
import { useEventActions } from '../hooks/useEvents'
import { CURRENCY } from '../data/constants'
import { formatMoney, toAmount, todayISO } from '../utils/format'

const BLANK_CREW = { memberName: '', role: 'Photographer', agreedPayment: '' }

function blankForm(prefillDate) {
  return {
    eventName: '',
    eventType: 'Wedding',
    date: prefillDate || '',
    startTime: '',
    endTime: '',
    location: { state: '', district: '', venue: '' },
    notes: '',
    totalAmount: '',
    advanceRequired: '',
  }
}

function formFromEvent(event) {
  return {
    eventName: event.eventName ?? '',
    eventType: event.eventType ?? 'Wedding',
    date: event.date ?? '',
    startTime: event.startTime ?? '',
    endTime: event.endTime ?? '',
    // Older records may have stored the location as a plain string.
    location:
      typeof event.location === 'object' && event.location !== null
        ? { state: '', district: '', venue: '', ...event.location }
        : { state: '', district: '', venue: event.location ?? '' },
    notes: event.notes ?? '',
    totalAmount: event.totalAmount ?? '',
    advanceRequired: event.advanceRequired ?? '',
  }
}

export function EventForm() {
  const { eventId } = useParams()
  const isEdit = Boolean(eventId)
  const navigate = useNavigate()
  const toast = useToast()
  const { db, create, update } = useData()
  const { addCrewMember } = useEventActions()
  const [params] = useSearchParams()

  const existing = useMemo(
    () => db.events.find((item) => item.id === eventId) ?? null,
    [db.events, eventId],
  )

  // The store has finished loading before this page renders, so the record being
  // edited can seed the form directly instead of arriving later through an effect.
  const [form, setForm] = useState(() =>
    existing ? formFromEvent(existing) : blankForm(params.get('date')),
  )

  const [clientMode, setClientMode] = useState(() => (existing?.clientId ? 'existing' : 'new'))
  const [clientId, setClientId] = useState(() => existing?.clientId ?? '')
  const [client, setClient] = useState({ name: '', phone: '', email: '', notes: '' })

  const [advance, setAdvance] = useState({
    status: 'Pending',
    method: 'UPI',
    paidDate: todayISO(),
    reference: '',
  })

  const [crew, setCrew] = useState([])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const clients = useMemo(
    () => [...db.clients].sort((a, b) => String(a.name).localeCompare(String(b.name))),
    [db.clients],
  )

  const totalAmount = toAmount(form.totalAmount)
  const advanceRequired = toAmount(form.advanceRequired)
  const crewCost = crew.reduce((sum, member) => sum + toAmount(member.agreedPayment), 0)

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  function validate() {
    const next = {}
    if (!form.eventName.trim()) next.eventName = 'Give the event a name.'
    if (!form.date) next.date = 'Pick the event date.'
    if (!form.location.state) next.state = 'Choose the state on the map.'

    if (clientMode === 'new' && !client.name.trim()) {
      next.clientName = 'Enter the client name.'
    }
    if (clientMode === 'existing' && !clientId) {
      next.clientId = 'Choose a client, or switch to New client.'
    }
    if (client.phone && !/^[0-9+\-\s()]{6,18}$/.test(client.phone.trim())) {
      next.clientPhone = 'That phone number does not look right.'
    }
    if (client.email && !/^\S+@\S+\.\S+$/.test(client.email.trim())) {
      next.clientEmail = 'That email address does not look right.'
    }

    if (form.totalAmount !== '' && totalAmount <= 0) {
      next.totalAmount = 'Enter an amount greater than zero.'
    }
    if (advanceRequired > totalAmount && totalAmount > 0) {
      next.advanceRequired = 'Advance cannot be more than the total amount.'
    }
    if (form.startTime && form.endTime && form.endTime <= form.startTime) {
      next.endTime = 'End time should be after the start time.'
    }
    if (crew.some((member) => !member.memberName.trim())) {
      next.crew = 'Every crew member needs a name.'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function onSubmit(event) {
    event.preventDefault()
    if (!validate()) {
      toast.error('Please fix the highlighted fields.')
      return
    }

    setSaving(true)
    try {
      let resolvedClientId = clientId

      if (clientMode === 'new') {
        resolvedClientId = await create('clients', {
          name: client.name.trim(),
          phone: client.phone.trim(),
          email: client.email.trim(),
          notes: client.notes.trim(),
        })
      }

      const payload = {
        eventName: form.eventName.trim(),
        eventType: form.eventType,
        clientId: resolvedClientId,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        location: {
          state: form.location.state,
          district: form.location.district,
          venue: form.location.venue.trim(),
        },
        notes: form.notes.trim(),
        totalAmount,
        advanceRequired,
      }

      if (isEdit) {
        await update('events', eventId, payload)
        toast.success('Event updated.')
        navigate(`/events/${eventId}`)
        return
      }

      const newEventId = await create('events', {
        ...payload,
        shootStatus: 'Not Started',
        shootStartedAt: null,
        shootEndedAt: null,
        calendarEventId: '',
        calendarLink: '',
      })

      if (advance.status === 'Paid' && advanceRequired > 0) {
        await create('payments', {
          eventId: newEventId,
          type: 'Advance',
          amount: advanceRequired,
          method: advance.method,
          paidDate: advance.paidDate || todayISO(),
          reference: advance.reference.trim(),
          notes: '',
        })
      }

      for (const member of crew) {
        if (!member.memberName.trim()) continue
        await addCrewMember(newEventId, {
          memberName: member.memberName.trim(),
          role: member.role,
          agreedPayment: toAmount(member.agreedPayment),
          paymentStatus: 'Pending',
          paidAmount: 0,
          paymentMethod: '',
          paidDate: '',
          paymentReference: '',
          notes: '',
        })
      }

      toast.success('Event saved.')
      navigate(`/events/${newEventId}`)
    } catch (err) {
      console.error(err)
      toast.error(err.message ?? 'Could not save the event.')
    } finally {
      setSaving(false)
    }
  }

  if (isEdit && !existing) {
    return (
      <>
        <PageHeader title="Event not found" />
        <Banner kind="danger">
          That event no longer exists. <Link to="/events">Back to all events</Link>.
        </Banner>
      </>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        title={isEdit ? 'Edit Event' : 'Add Event'}
        subtitle={
          isEdit
            ? 'Change the details of this booking.'
            : 'Enter the booking once — payments, crew and footage all hang off it.'
        }
        actions={
          <Link
            to={isEdit ? `/events/${eventId}` : '/events'}
            className="btn btn-secondary"
          >
            <Icon name="arrowLeft" size={16} />
            Cancel
          </Link>
        }
      />

      <div className="col gap-16">
        <SectionCard title="Client" icon="user">
          <div className="col gap-12">
            <div className="row gap-8">
              <button
                type="button"
                className={`btn btn-sm ${clientMode === 'new' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setClientMode('new')}
                disabled={isEdit}
              >
                New client
              </button>
              <button
                type="button"
                className={`btn btn-sm ${clientMode === 'existing' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setClientMode('existing')}
                disabled={clients.length === 0}
              >
                Existing client {clients.length > 0 && `(${clients.length})`}
              </button>
            </div>

            {clientMode === 'existing' ? (
              <Field label="Choose client" required error={errors.clientId}>
                {(id) => (
                  <Select
                    id={id}
                    value={clientId}
                    onChange={setClientId}
                    options={clients.map((item) => ({
                      value: item.id,
                      label: item.name,
                      sub: [item.phone, item.email].filter(Boolean).join(' · '),
                    }))}
                    placeholder="Select a client"
                    searchPlaceholder="Search client…"
                    invalid={Boolean(errors.clientId)}
                  />
                )}
              </Field>
            ) : (
              <div className="form-grid">
                <Field label="Client name" required error={errors.clientName}>
                  {(id) => (
                    <input
                      id={id}
                      className="input"
                      value={client.name}
                      onChange={(e) => setClient({ ...client, name: e.target.value })}
                      placeholder="e.g. Arun & Priya"
                      aria-invalid={Boolean(errors.clientName)}
                    />
                  )}
                </Field>
                <Field label="Phone" error={errors.clientPhone}>
                  {(id) => (
                    <input
                      id={id}
                      className="input"
                      type="tel"
                      inputMode="tel"
                      value={client.phone}
                      onChange={(e) => setClient({ ...client, phone: e.target.value })}
                      placeholder="9876543210"
                      aria-invalid={Boolean(errors.clientPhone)}
                    />
                  )}
                </Field>
                <Field label="Email" error={errors.clientEmail} className="span-2">
                  {(id) => (
                    <input
                      id={id}
                      className="input"
                      type="email"
                      value={client.email}
                      onChange={(e) => setClient({ ...client, email: e.target.value })}
                      placeholder="client@example.com"
                      aria-invalid={Boolean(errors.clientEmail)}
                    />
                  )}
                </Field>
              </div>
            )}

            {isEdit && (
              <p className="field-hint">
                To change which client this event belongs to, edit it from the{' '}
                <Link to="/clients">Clients</Link> page.
              </p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Event details" icon="camera">
          <div className="form-grid">
            <Field label="Event name" required error={errors.eventName} className="span-2">
              {(id) => (
                <input
                  id={id}
                  className="input"
                  value={form.eventName}
                  onChange={(e) => set('eventName', e.target.value)}
                  placeholder="e.g. Arun & Priya Wedding"
                  aria-invalid={Boolean(errors.eventName)}
                />
              )}
            </Field>

            <Field label="Event type">
              {(id) => (
                <EventTypeSelect
                  id={id}
                  value={form.eventType}
                  onChange={(value) => set('eventType', value)}
                />
              )}
            </Field>

            <Field label="Date" required error={errors.date} hint="Pick the month and year from the dropdowns.">
              {(id) => (
                <DatePicker
                  id={id}
                  value={form.date}
                  onChange={(value) => set('date', value)}
                  invalid={Boolean(errors.date)}
                />
              )}
            </Field>

            <Field label="Start time" hint="Tap the clock to set the hour, then the minutes.">
              {(id) => (
                <TimePicker
                  id={id}
                  value={form.startTime}
                  onChange={(value) => set('startTime', value)}
                />
              )}
            </Field>

            <Field label="End time" error={errors.endTime}>
              {(id) => (
                <TimePicker
                  id={id}
                  value={form.endTime}
                  onChange={(value) => set('endTime', value)}
                  invalid={Boolean(errors.endTime)}
                />
              )}
            </Field>

            <Field label="Notes" className="span-2" hint="Anything you want to remember about this shoot.">
              {(id) => (
                <textarea
                  id={id}
                  className="textarea"
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Muhurtham at 7:20 AM, reception same venue, drone allowed…"
                />
              )}
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Location" icon="mapPin">
          <LocationPicker
            value={form.location}
            onChange={(value) => {
              setForm((prev) => ({ ...prev, location: value }))
              setErrors((prev) => ({ ...prev, state: undefined }))
            }}
            error={errors.state}
          />
        </SectionCard>

        <SectionCard title="Money" icon="wallet">
          <div className="form-grid">
            <Field label="Total event amount" error={errors.totalAmount}>
              {(id) => (
                <div className="input-prefix">
                  <span>{CURRENCY}</span>
                  <input
                    id={id}
                    className="input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="100"
                    value={form.totalAmount}
                    onChange={(e) => set('totalAmount', e.target.value)}
                    placeholder="80000"
                    aria-invalid={Boolean(errors.totalAmount)}
                  />
                </div>
              )}
            </Field>

            <Field
              label="Advance required"
              error={errors.advanceRequired}
              hint={
                totalAmount > 0 && advanceRequired > 0
                  ? `Balance after advance: ${formatMoney(totalAmount - advanceRequired)}`
                  : 'Booking amount you take up front.'
              }
            >
              {(id) => (
                <div className="input-prefix">
                  <span>{CURRENCY}</span>
                  <input
                    id={id}
                    className="input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="100"
                    value={form.advanceRequired}
                    onChange={(e) => set('advanceRequired', e.target.value)}
                    placeholder="30000"
                    aria-invalid={Boolean(errors.advanceRequired)}
                  />
                </div>
              )}
            </Field>

            {!isEdit && advanceRequired > 0 && (
              <>
                <Field label="Advance status" hint="Has the client paid the advance yet?">
                  {(id) => (
                    <PaymentStatusSelect
                      id={id}
                      value={advance.status}
                      onChange={(value) => setAdvance({ ...advance, status: value })}
                    />
                  )}
                </Field>

                {advance.status === 'Paid' && (
                  <>
                    <Field label="Paid by" required>
                      {(id) => (
                        <PaymentMethodSelect
                          id={id}
                          value={advance.method}
                          onChange={(value) => setAdvance({ ...advance, method: value })}
                        />
                      )}
                    </Field>

                    <Field label="Advance paid on">
                      {(id) => (
                        <DatePicker
                          id={id}
                          value={advance.paidDate}
                          onChange={(value) => setAdvance({ ...advance, paidDate: value })}
                          clearable={false}
                        />
                      )}
                    </Field>

                    <Field
                      label="Reference"
                      hint="UPI transaction ID, bank reference or receipt note."
                    >
                      {(id) => (
                        <input
                          id={id}
                          className="input"
                          value={advance.reference}
                          onChange={(e) => setAdvance({ ...advance, reference: e.target.value })}
                          placeholder="Optional"
                        />
                      )}
                    </Field>
                  </>
                )}
              </>
            )}
          </div>

          {isEdit && (
            <p className="field-hint" style={{ marginTop: 12 }}>
              Payments are recorded on the event page so the full history is kept.
            </p>
          )}
        </SectionCard>

        {!isEdit && (
          <SectionCard
            title="Crew"
            icon="users"
            action={
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setCrew([...crew, { ...BLANK_CREW }])}
              >
                <Icon name="plus" size={15} />
                Add member
              </button>
            }
          >
            {crew.length === 0 ? (
              <p className="text-sm text-muted">
                Shooting alone? Leave this empty. You can add crew any time from the event
                page.
              </p>
            ) : (
              <div className="col gap-12">
                {errors.crew && (
                  <span className="field-error">
                    <Icon name="alert" size={13} />
                    {errors.crew}
                  </span>
                )}

                {crew.map((member, index) => (
                  <div className="form-grid" key={index}>
                    <Field label={`Member ${index + 1} name`}>
                      {(id) => (
                        <input
                          id={id}
                          className="input"
                          value={member.memberName}
                          onChange={(e) =>
                            setCrew(
                              crew.map((row, i) =>
                                i === index ? { ...row, memberName: e.target.value } : row,
                              ),
                            )
                          }
                          placeholder="e.g. Karthik"
                        />
                      )}
                    </Field>

                    <Field label="Role">
                      {(id) => (
                        <CrewRoleSelect
                          id={id}
                          value={member.role}
                          onChange={(value) =>
                            setCrew(
                              crew.map((row, i) => (i === index ? { ...row, role: value } : row)),
                            )
                          }
                        />
                      )}
                    </Field>

                    <Field label="Agreed payment">
                      {(id) => (
                        <div className="input-prefix">
                          <span>{CURRENCY}</span>
                          <input
                            id={id}
                            className="input"
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="100"
                            value={member.agreedPayment}
                            onChange={(e) =>
                              setCrew(
                                crew.map((row, i) =>
                                  i === index ? { ...row, agreedPayment: e.target.value } : row,
                                ),
                              )
                            }
                            placeholder="5000"
                          />
                        </div>
                      )}
                    </Field>

                    <div className="field" style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-danger"
                        onClick={() => setCrew(crew.filter((_, i) => i !== index))}
                      >
                        <Icon name="trash" size={15} />
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {crewCost > 0 && (
                  <p className="text-sm text-muted">
                    Total crew cost: <strong>{formatMoney(crewCost)}</strong>
                    {totalAmount > 0 && (
                      <> · Your share: <strong>{formatMoney(totalAmount - crewCost)}</strong></>
                    )}
                  </p>
                )}
              </div>
            )}
          </SectionCard>
        )}

        <div className="row row-wrap gap-8" style={{ paddingBottom: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <Spinner /> : <Icon name="check" size={17} />}
            {isEdit ? 'Save changes' : 'Save event'}
          </button>
          <Link
            to={isEdit ? `/events/${eventId}` : '/events'}
            className="btn btn-secondary"
          >
            Cancel
          </Link>
        </div>
      </div>
    </form>
  )
}
