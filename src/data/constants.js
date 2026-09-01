/**
 * Every fixed choice in the app lives here so the dropdowns, badges and filters
 * can never drift apart from each other.
 */

/** Allowed payment methods (requirements section 2). */
export const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer']

/** A payment row is one of these. An event may have many. */
export const PAYMENT_TYPES = ['Advance', 'Partial', 'Final']

/** Status of the advance, and of each crew member's payment. */
export const PAYMENT_STATUSES = ['Pending', 'Paid']

/** Rolled-up status for the whole event, derived from the payment history. */
export const CLIENT_PAYMENT_STATUSES = ['Unpaid', 'Partially Paid', 'Fully Paid']

/** Footage upload progress for one crew member (requirements section 8). */
export const FOOTAGE_STATUSES = ['Pending', 'Uploading', 'Uploaded', 'Verified']

export const SHOOT_STATUSES = ['Not Started', 'Started', 'Ended']

export const EVENT_TYPES = [
  'Wedding',
  'Engagement',
  'Reception',
  'Pre-Wedding Shoot',
  'Birthday',
  'Baby Shower',
  'Naming Ceremony',
  'Corporate Event',
  'Product Shoot',
  'Portfolio Shoot',
  'Concert / Show',
  'Other',
]

export const CREW_ROLES = [
  'Photographer',
  'Videographer',
  'Candid Photographer',
  'Cinematographer',
  'Drone Operator',
  'Assistant',
  'Editor',
  'Light Man',
  'Other',
]

/** Colour token used by badges/status pills, keyed by status text. */
export const STATUS_TONE = {
  Pending: 'warn',
  Unpaid: 'danger',
  'Partially Paid': 'warn',
  'Fully Paid': 'ok',
  Paid: 'ok',
  Uploading: 'info',
  Uploaded: 'info',
  Verified: 'ok',
  'Not Started': 'muted',
  Started: 'info',
  Ended: 'ok',
  Upcoming: 'info',
  Today: 'warn',
  Ongoing: 'warn',
  Completed: 'ok',
}

export const CURRENCY = '₹'
