import { Select } from './ui/Select'
import {
  CLIENT_PAYMENT_STATUSES,
  CREW_ROLES,
  EVENT_TYPES,
  FOOTAGE_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PAYMENT_TYPES,
  SHOOT_STATUSES,
  STATUS_TONE,
} from '../data/constants'

/** Turns a list of status strings into Select options with a matching colour dot. */
function toneOptions(values, subs = {}) {
  return values.map((value) => ({
    value,
    label: value,
    tone: STATUS_TONE[value] ?? 'muted',
    sub: subs[value],
  }))
}

const ANY = { value: '', label: 'All', tone: 'muted' }

/** Pending / Paid — used for the advance and for each crew member. */
export function PaymentStatusSelect({ value, onChange, includeAll = false, ...rest }) {
  const options = toneOptions(PAYMENT_STATUSES, {
    Pending: 'Money not received yet',
    Paid: 'Money received in full',
  })
  return (
    <Select
      value={value}
      onChange={onChange}
      options={includeAll ? [{ ...ANY, label: 'All payment statuses' }, ...options] : options}
      placeholder="Select payment status"
      searchable={false}
      {...rest}
    />
  )
}

/** Unpaid / Partially Paid / Fully Paid — the rolled-up client status. */
export function ClientPaymentStatusSelect({ value, onChange, includeAll = false, ...rest }) {
  const options = toneOptions(CLIENT_PAYMENT_STATUSES, {
    Unpaid: 'Nothing received so far',
    'Partially Paid': 'Advance or part payment received',
    'Fully Paid': 'Balance is zero',
  })
  return (
    <Select
      value={value}
      onChange={onChange}
      options={includeAll ? [{ ...ANY, label: 'All payment statuses' }, ...options] : options}
      placeholder="Select payment status"
      searchable={false}
      {...rest}
    />
  )
}

/** Cash / UPI / Bank Transfer. */
export function PaymentMethodSelect({ value, onChange, includeAll = false, ...rest }) {
  const options = PAYMENT_METHODS.map((method) => ({
    value: method,
    label: method,
    tone: method === 'Cash' ? 'warn' : method === 'UPI' ? 'info' : 'brand',
    sub:
      method === 'Cash'
        ? 'Received physically in cash'
        : method === 'UPI'
          ? 'GPay / PhonePe / Paytm / any UPI app'
          : 'NEFT / IMPS / RTGS',
  }))
  return (
    <Select
      value={value}
      onChange={onChange}
      options={includeAll ? [{ ...ANY, label: 'All payment methods' }, ...options] : options}
      placeholder="How was it paid?"
      searchable={false}
      {...rest}
    />
  )
}

/** Advance / Partial / Final. */
export function PaymentTypeSelect({ value, onChange, ...rest }) {
  const options = PAYMENT_TYPES.map((type) => ({
    value: type,
    label: type,
    tone: type === 'Advance' ? 'info' : type === 'Final' ? 'ok' : 'warn',
    sub:
      type === 'Advance'
        ? 'Booking amount taken up front'
        : type === 'Partial'
          ? 'An instalment towards the balance'
          : 'Settles the remaining balance',
  }))
  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      placeholder="Select payment type"
      searchable={false}
      {...rest}
    />
  )
}

/** Pending / Uploading / Uploaded / Verified. */
export function FootageStatusSelect({ value, onChange, includeAll = false, ...rest }) {
  const options = toneOptions(FOOTAGE_STATUSES, {
    Pending: 'Nothing uploaded yet',
    Uploading: 'Upload in progress',
    Uploaded: 'Files are in the Drive folder',
    Verified: 'You have checked the files',
  })
  return (
    <Select
      value={value}
      onChange={onChange}
      options={includeAll ? [{ ...ANY, label: 'All upload statuses' }, ...options] : options}
      placeholder="Select upload status"
      searchable={false}
      {...rest}
    />
  )
}

/** Not Started / Started / Ended. */
export function ShootStatusSelect({ value, onChange, includeAll = false, ...rest }) {
  const options = toneOptions(SHOOT_STATUSES)
  return (
    <Select
      value={value}
      onChange={onChange}
      options={includeAll ? [{ ...ANY, label: 'All shoot statuses' }, ...options] : options}
      placeholder="Select shoot status"
      searchable={false}
      {...rest}
    />
  )
}

export function EventTypeSelect({ value, onChange, includeAll = false, ...rest }) {
  const options = EVENT_TYPES.map((type) => ({ value: type, label: type }))
  return (
    <Select
      value={value}
      onChange={onChange}
      options={includeAll ? [{ ...ANY, label: 'All event types' }, ...options] : options}
      placeholder="Select event type"
      {...rest}
    />
  )
}

export function CrewRoleSelect({ value, onChange, ...rest }) {
  const options = CREW_ROLES.map((role) => ({ value: role, label: role }))
  return (
    <Select value={value} onChange={onChange} options={options} placeholder="Select role" {...rest} />
  )
}
