import { toISODate } from '../utils/format'

/**
 * The worked example from the requirements document (Arun & Priya Wedding),
 * plus one upcoming booking so the dashboard has something to show.
 * Dates are shifted relative to today so it always looks current.
 */

function dayOffset(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return toISODate(date)
}

export async function loadSampleData(create) {
  const clientId = await create('clients', {
    name: 'Arun & Priya',
    phone: '9876543210',
    email: 'arun.priya@example.com',
    notes: 'Introduced by Ramesh. Prefers candid style.',
  })

  const eventId = await create('events', {
    eventName: 'Arun & Priya Wedding',
    eventType: 'Wedding',
    clientId,
    date: dayOffset(-5),
    startTime: '06:00',
    endTime: '22:00',
    location: { state: 'Tamil Nadu', district: 'Chennai', venue: 'Sri Kalyana Mahal, Anna Nagar' },
    notes: 'Muhurtham at 7:20 AM. Reception at the same venue from 6 PM.',
    totalAmount: 80000,
    advanceRequired: 30000,
    shootStatus: 'Ended',
    shootStartedAt: new Date(`${dayOffset(-5)}T05:52:00`).toISOString(),
    shootEndedAt: new Date(`${dayOffset(-5)}T22:18:00`).toISOString(),
    calendarEventId: '',
    calendarLink: '',
  })

  await create('payments', {
    eventId,
    type: 'Advance',
    status: 'Paid',
    amount: 30000,
    method: 'UPI',
    paidDate: dayOffset(-19),
    reference: 'UPI/4429183746',
    notes: 'Booking advance',
  })

  await create('payments', {
    eventId,
    type: 'Final',
    status: 'Paid',
    amount: 50000,
    method: 'Bank Transfer',
    paidDate: dayOffset(-5),
    reference: 'NEFT/HDFC/883721',
    notes: 'Balance settled on the event day',
  })

  const karthikId = await create('crewAssignments', {
    eventId,
    memberName: 'Karthik',
    role: 'Videographer',
    agreedPayment: 5000,
    paymentStatus: 'Paid',
    paidAmount: 5000,
    paymentMethod: 'Cash',
    paidDate: dayOffset(-5),
    paymentReference: '',
    notes: '',
  })

  const manoId = await create('crewAssignments', {
    eventId,
    memberName: 'Mano',
    role: 'Photographer',
    agreedPayment: 4000,
    paymentStatus: 'Pending',
    paidAmount: 0,
    paymentMethod: '',
    paidDate: '',
    paymentReference: '',
    notes: '',
  })

  await create('footageUploads', {
    eventId,
    crewAssignmentId: karthikId,
    memberName: 'Karthik',
    status: 'Verified',
    driveLink: 'https://drive.google.com/drive/folders/example-karthik',
    uploadedAt: new Date(`${dayOffset(-4)}T11:20:00`).toISOString(),
    verified: true,
    verifiedAt: new Date(`${dayOffset(-3)}T09:05:00`).toISOString(),
    notes: '',
  })

  await create('footageUploads', {
    eventId,
    crewAssignmentId: manoId,
    memberName: 'Mano',
    status: 'Pending',
    driveLink: '',
    uploadedAt: null,
    verified: false,
    verifiedAt: null,
    notes: 'Still to hand over the reception photos.',
  })

  // A second, upcoming booking so the dashboard is not empty.
  const secondClientId = await create('clients', {
    name: 'Divya Reception',
    phone: '9843012345',
    email: '',
    notes: '',
  })

  const upcomingId = await create('events', {
    eventName: 'Divya & Vignesh Reception',
    eventType: 'Reception',
    clientId: secondClientId,
    date: dayOffset(12),
    startTime: '17:00',
    endTime: '22:30',
    location: { state: 'Tamil Nadu', district: 'Coimbatore', venue: 'GRG Convention Centre' },
    notes: 'Drone shots requested.',
    totalAmount: 45000,
    advanceRequired: 15000,
    shootStatus: 'Not Started',
    shootStartedAt: null,
    shootEndedAt: null,
    calendarEventId: '',
    calendarLink: '',
  })

  // An instalment that has been agreed but has not landed yet.
  await create('payments', {
    eventId: upcomingId,
    type: 'Advance',
    status: 'Pending',
    amount: 15000,
    method: '',
    paidDate: '',
    dueDate: dayOffset(4),
    reference: '',
    notes: 'Advance promised by the end of the week',
  })

  const assistantId = await create('crewAssignments', {
    eventId: upcomingId,
    memberName: 'Suresh',
    role: 'Drone Operator',
    agreedPayment: 6000,
    paymentStatus: 'Pending',
    paidAmount: 0,
    paymentMethod: '',
    paidDate: '',
    paymentReference: '',
    notes: '',
  })

  await create('footageUploads', {
    eventId: upcomingId,
    crewAssignmentId: assistantId,
    memberName: 'Suresh',
    status: 'Pending',
    driveLink: '',
    uploadedAt: null,
    verified: false,
    verifiedAt: null,
    notes: '',
  })
}
