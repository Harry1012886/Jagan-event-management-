import { useState } from 'react'
import { Modal } from './ui/Modal'
import { Field, Spinner } from './ui/Primitives'
import { DatePicker } from './ui/DatePicker'
import { Icon } from './Icon'
import {
  CrewRoleSelect,
  FootageStatusSelect,
  PaymentMethodSelect,
  PaymentStatusSelect,
  PaymentTypeSelect,
} from './ChoiceFields'
import { CURRENCY } from '../data/constants'
import { formatMoney, toAmount, todayISO } from '../utils/format'

/*
 * Each dialog is a thin wrapper that renders nothing while closed, around an
 * inner form that holds the state. Opening the dialog mounts a fresh form, so
 * the fields always start from the record being edited with no stale values
 * left over from last time.
 */

/** Record or edit one client payment: type, amount, method, date, reference. */
export function PaymentDialog({ open, ...props }) {
  if (!open) return null
  return <PaymentForm {...props} />
}

function PaymentForm({ onClose, onSave, payment, balance, suggestedType }) {
  const [form, setForm] = useState(() => ({
    type: payment?.type ?? suggestedType ?? 'Partial',
    // Rows saved before the status field existed were money already in hand.
    status: payment?.status ?? 'Paid',
    amount: payment ? String(payment.amount ?? '') : balance > 0 ? String(balance) : '',
    method: payment?.method ?? 'UPI',
    // One date field serves both meanings: when it was received, or when it is
    // expected. Which one is stored depends on the status at save time.
    paidDate: payment?.paidDate || payment?.dueDate || todayISO(),
    reference: payment?.reference ?? '',
    notes: payment?.notes ?? '',
  }))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const isPaid = form.status === 'Paid'

  async function submit(event) {
    event.preventDefault()
    const amount = toAmount(form.amount)
    const next = {}
    if (amount <= 0) next.amount = 'Enter an amount greater than zero.'
    if (isPaid && !form.method) next.method = 'Choose how the money was received.'
    if (isPaid && !form.paidDate) next.paidDate = 'Pick the date the money was received.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      await onSave({
        type: form.type,
        status: form.status,
        amount,
        // An instalment that has not landed has no method or date yet.
        method: isPaid ? form.method : '',
        paidDate: isPaid ? form.paidDate : '',
        dueDate: isPaid ? '' : form.paidDate,
        reference: isPaid ? form.reference.trim() : '',
        notes: form.notes.trim(),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const entered = toAmount(form.amount)
  const overpaying = balance > 0 && entered > balance

  return (
    <Modal
      open
      onClose={onClose}
      title={payment ? 'Edit payment' : 'Record a payment'}
      subtitle={
        balance > 0 ? `Balance outstanding: ${formatMoney(balance)}` : 'This event is fully paid'
      }
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="payment-form" className="btn btn-primary" disabled={saving}>
            {saving ? <Spinner /> : <Icon name="check" size={16} />}
            {payment ? 'Save' : 'Record payment'}
          </button>
        </>
      }
    >
      <form id="payment-form" className="form-grid" onSubmit={submit} noValidate>
        <Field label="Payment type" required>
          {(id) => (
            <PaymentTypeSelect
              id={id}
              value={form.type}
              onChange={(value) => setForm({ ...form, type: value })}
            />
          )}
        </Field>

        <Field
          label="Status"
          required
          hint={isPaid ? 'Money is in hand.' : 'Expected, but not received yet.'}
        >
          {(id) => (
            <PaymentStatusSelect
              id={id}
              value={form.status}
              onChange={(value) => setForm({ ...form, status: value })}
            />
          )}
        </Field>

        <Field
          label={isPaid ? 'Amount received' : 'Amount expected'}
          required
          error={errors.amount}
          hint={
            overpaying
              ? `That is ${formatMoney(entered - balance)} more than the balance.`
              : undefined
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
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                aria-invalid={Boolean(errors.amount)}
                placeholder="30000"
              />
            </div>
          )}
        </Field>

        {isPaid && (
          <Field label="Payment method" required error={errors.method}>
            {(id) => (
              <PaymentMethodSelect
                id={id}
                value={form.method}
                onChange={(value) => setForm({ ...form, method: value })}
                invalid={Boolean(errors.method)}
              />
            )}
          </Field>
        )}

        <Field
          label={isPaid ? 'Payment date' : 'Expected by'}
          required={isPaid}
          error={errors.paidDate}
        >
          {(id) => (
            <DatePicker
              id={id}
              value={form.paidDate}
              onChange={(value) => setForm({ ...form, paidDate: value })}
              clearable={false}
              invalid={Boolean(errors.paidDate)}
            />
          )}
        </Field>

        {isPaid && (
          <Field
            label="Reference"
            className="span-2"
            hint="UPI transaction ID, bank reference number or receipt note."
          >
            {(id) => (
              <input
                id={id}
                className="input"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="Optional"
              />
            )}
          </Field>
        )}

        <Field label="Notes" className="span-2">
          {(id) => (
            <textarea
              id={id}
              className="textarea"
              style={{ minHeight: 60 }}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional"
            />
          )}
        </Field>
      </form>
    </Modal>
  )
}

/** Add or edit a crew member and their agreed fee. */
export function CrewDialog({ open, ...props }) {
  if (!open) return null
  return <CrewForm {...props} />
}

function CrewForm({ onClose, onSave, member }) {
  const [form, setForm] = useState(() => ({
    memberName: member?.memberName ?? '',
    role: member?.role ?? 'Photographer',
    agreedPayment: member?.agreedPayment != null ? String(member.agreedPayment) : '',
    notes: member?.notes ?? '',
  }))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (!form.memberName.trim()) {
      setErrors({ memberName: 'Enter the name of the crew member.' })
      return
    }
    setSaving(true)
    try {
      await onSave({
        memberName: form.memberName.trim(),
        role: form.role,
        agreedPayment: toAmount(form.agreedPayment),
        notes: form.notes.trim(),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={member ? 'Edit crew member' : 'Add crew member'}
      subtitle="Each person gets their own payment and footage tracking."
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="crew-form" className="btn btn-primary" disabled={saving}>
            {saving ? <Spinner /> : <Icon name="check" size={16} />}
            Save
          </button>
        </>
      }
    >
      <form id="crew-form" className="form-grid" onSubmit={submit} noValidate>
        <Field label="Name" required error={errors.memberName}>
          {(id) => (
            <input
              id={id}
              className="input"
              value={form.memberName}
              onChange={(e) => setForm({ ...form, memberName: e.target.value })}
              placeholder="e.g. Karthik"
              aria-invalid={Boolean(errors.memberName)}
            />
          )}
        </Field>

        <Field label="Role">
          {(id) => (
            <CrewRoleSelect
              id={id}
              value={form.role}
              onChange={(value) => setForm({ ...form, role: value })}
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
                value={form.agreedPayment}
                onChange={(e) => setForm({ ...form, agreedPayment: e.target.value })}
                placeholder="5000"
              />
            </div>
          )}
        </Field>

        <Field label="Notes">
          {(id) => (
            <input
              id={id}
              className="input"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional"
            />
          )}
        </Field>
      </form>
    </Modal>
  )
}

/** Mark a crew member paid or pending, with method, date and reference. */
export function CrewPaymentDialog({ open, member, ...props }) {
  if (!open || !member) return null
  return <CrewPaymentForm member={member} {...props} />
}

function CrewPaymentForm({ onClose, onSave, member }) {
  const [form, setForm] = useState(() => ({
    paymentStatus: member.paymentStatus ?? 'Pending',
    paidAmount:
      member.paidAmount != null && member.paidAmount !== 0
        ? String(member.paidAmount)
        : String(member.agreedPayment ?? ''),
    paymentMethod: member.paymentMethod || 'Cash',
    paidDate: member.paidDate || todayISO(),
    paymentReference: member.paymentReference ?? '',
  }))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const isPaid = form.paymentStatus === 'Paid'

  async function submit(event) {
    event.preventDefault()
    const next = {}
    if (isPaid && toAmount(form.paidAmount) <= 0) {
      next.paidAmount = 'Enter the amount you paid.'
    }
    if (isPaid && !form.paidDate) next.paidDate = 'Pick the date you paid.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      await onSave(
        isPaid
          ? {
              paymentStatus: 'Paid',
              paidAmount: toAmount(form.paidAmount),
              paymentMethod: form.paymentMethod,
              paidDate: form.paidDate,
              paymentReference: form.paymentReference.trim(),
            }
          : {
              paymentStatus: 'Pending',
              paidAmount: 0,
              paymentMethod: '',
              paidDate: '',
              paymentReference: '',
            },
      )
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Crew payment"
      subtitle={`${member.memberName} — agreed ${formatMoney(member.agreedPayment)}`}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="crew-pay-form" className="btn btn-primary" disabled={saving}>
            {saving ? <Spinner /> : <Icon name="check" size={16} />}
            Save
          </button>
        </>
      }
    >
      <form id="crew-pay-form" className="form-grid" onSubmit={submit} noValidate>
        <Field label="Payment status" required className="span-2">
          {(id) => (
            <PaymentStatusSelect
              id={id}
              value={form.paymentStatus}
              onChange={(value) => setForm({ ...form, paymentStatus: value })}
            />
          )}
        </Field>

        {isPaid && (
          <>
            <Field label="Amount paid" required error={errors.paidAmount}>
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
                    value={form.paidAmount}
                    onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
                    aria-invalid={Boolean(errors.paidAmount)}
                  />
                </div>
              )}
            </Field>

            <Field label="Paid by" required>
              {(id) => (
                <PaymentMethodSelect
                  id={id}
                  value={form.paymentMethod}
                  onChange={(value) => setForm({ ...form, paymentMethod: value })}
                />
              )}
            </Field>

            <Field label="Paid on" required error={errors.paidDate}>
              {(id) => (
                <DatePicker
                  id={id}
                  value={form.paidDate}
                  onChange={(value) => setForm({ ...form, paidDate: value })}
                  clearable={false}
                  invalid={Boolean(errors.paidDate)}
                />
              )}
            </Field>

            <Field label="Reference">
              {(id) => (
                <input
                  id={id}
                  className="input"
                  value={form.paymentReference}
                  onChange={(e) => setForm({ ...form, paymentReference: e.target.value })}
                  placeholder="Optional"
                />
              )}
            </Field>
          </>
        )}
      </form>
    </Modal>
  )
}

/** Set a crew member's footage upload status and Drive link. */
export function FootageDialog({ open, ...props }) {
  if (!open) return null
  return <FootageForm {...props} />
}

function FootageForm({ onClose, onSave, footage, memberName }) {
  const [form, setForm] = useState(() => ({
    status: footage?.status ?? 'Pending',
    driveLink: footage?.driveLink ?? '',
    notes: footage?.notes ?? '',
  }))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const needsLink = form.status === 'Uploaded' || form.status === 'Verified'

  async function submit(event) {
    event.preventDefault()
    const link = form.driveLink.trim()
    const next = {}
    if (link && !/^https?:\/\/\S+$/i.test(link)) {
      next.driveLink = 'Paste the full link, starting with https://'
    }
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      const now = new Date().toISOString()
      await onSave({
        status: form.status,
        driveLink: link,
        notes: form.notes.trim(),
        uploadedAt: needsLink ? (footage?.uploadedAt ?? now) : null,
        verified: form.status === 'Verified',
        verifiedAt: form.status === 'Verified' ? (footage?.verifiedAt ?? now) : null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Footage upload"
      subtitle={memberName ? `Upload status for ${memberName}` : undefined}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="footage-form" className="btn btn-primary" disabled={saving}>
            {saving ? <Spinner /> : <Icon name="check" size={16} />}
            Save
          </button>
        </>
      }
    >
      <form id="footage-form" className="col gap-12" onSubmit={submit} noValidate>
        <Field label="Upload status" required hint="Pending → Uploading → Uploaded → Verified.">
          {(id) => (
            <FootageStatusSelect
              id={id}
              value={form.status}
              onChange={(value) => setForm({ ...form, status: value })}
            />
          )}
        </Field>

        <Field
          label="Google Drive folder or file link"
          error={errors.driveLink}
          hint={
            needsLink
              ? 'Paste the Drive link so you can open the files straight from here.'
              : 'Optional until the files are uploaded.'
          }
        >
          {(id) => (
            <input
              id={id}
              className="input"
              type="url"
              value={form.driveLink}
              onChange={(e) => setForm({ ...form, driveLink: e.target.value })}
              placeholder="https://drive.google.com/drive/folders/…"
              aria-invalid={Boolean(errors.driveLink)}
            />
          )}
        </Field>

        <Field label="Notes">
          {(id) => (
            <textarea
              id={id}
              className="textarea"
              style={{ minHeight: 60 }}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="e.g. Reception clips still to come"
            />
          )}
        </Field>
      </form>
    </Modal>
  )
}

/** Add or edit a client record. */
export function ClientDialog({ open, ...props }) {
  if (!open) return null
  return <ClientForm {...props} />
}

function ClientForm({ onClose, onSave, client }) {
  const [form, setForm] = useState(() => ({
    name: client?.name ?? '',
    phone: client?.phone ?? '',
    email: client?.email ?? '',
    notes: client?.notes ?? '',
  }))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    const next = {}
    if (!form.name.trim()) next.name = 'Enter the client name.'
    if (form.phone && !/^[0-9+\-\s()]{6,18}$/.test(form.phone.trim())) {
      next.phone = 'That phone number does not look right.'
    }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      next.email = 'That email address does not look right.'
    }
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      await onSave({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        notes: form.notes.trim(),
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={client ? 'Edit client' : 'Add client'}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="client-form" className="btn btn-primary" disabled={saving}>
            {saving ? <Spinner /> : <Icon name="check" size={16} />}
            Save
          </button>
        </>
      }
    >
      <form id="client-form" className="form-grid" onSubmit={submit} noValidate>
        <Field label="Name" required error={errors.name} className="span-2">
          {(id) => (
            <input
              id={id}
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Arun & Priya"
              aria-invalid={Boolean(errors.name)}
            />
          )}
        </Field>

        <Field label="Phone" error={errors.phone}>
          {(id) => (
            <input
              id={id}
              className="input"
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="9876543210"
              aria-invalid={Boolean(errors.phone)}
            />
          )}
        </Field>

        <Field label="Email" error={errors.email}>
          {(id) => (
            <input
              id={id}
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="client@example.com"
              aria-invalid={Boolean(errors.email)}
            />
          )}
        </Field>

        <Field label="Notes" className="span-2">
          {(id) => (
            <textarea
              id={id}
              className="textarea"
              style={{ minHeight: 60 }}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Optional"
            />
          )}
        </Field>
      </form>
    </Modal>
  )
}
