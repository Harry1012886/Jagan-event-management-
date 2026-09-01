import { useCallback, useMemo } from 'react'
import { useData } from '../data/store'
import { buildEventView, byDateAsc } from '../utils/calc'
import { todayISO } from '../utils/format'

/** Every event with its payments, crew, footage and derived totals attached. */
export function useEventViews() {
  const { db } = useData()
  return useMemo(
    () => [...db.events].sort(byDateAsc).map((event) => buildEventView(event, db)),
    [db],
  )
}

/** One event with everything attached, or null when the id is unknown. */
export function useEventView(eventId) {
  const { db } = useData()
  return useMemo(() => {
    const event = db.events.find((item) => item.id === eventId)
    return event ? buildEventView(event, db) : null
  }, [db, eventId])
}

/** Buckets the dashboard needs. */
export function useDashboardData() {
  const views = useEventViews()
  const today = todayISO()

  return useMemo(() => {
    const todays = views.filter((view) => view.event.date === today)
    const ongoing = views.filter((view) => view.event.shootStatus === 'Started')
    const upcoming = views.filter(
      (view) => view.event.date > today && view.status !== 'Completed',
    )
    const needsAttention = views.filter((view) => view.status === 'Needs Attention')

    const clientBalance = views.reduce((sum, view) => sum + view.money.balance, 0)
    const crewPending = views.reduce((sum, view) => sum + view.crewSummary.pending, 0)
    const footagePending = views.filter(
      (view) => view.footageSummary.pending > 0 && view.event.shootStatus !== 'Not Started',
    )
    const advancePending = views.filter(
      (view) =>
        view.money.advanceRequired > 0 &&
        view.money.advanceStatus !== 'Paid' &&
        view.status !== 'Completed',
    )

    return {
      views,
      todays,
      ongoing,
      upcoming,
      needsAttention,
      clientBalance,
      crewPending,
      footagePending,
      advancePending,
    }
  }, [views, today])
}

/** Shared write helpers so the same rules apply from every screen. */
export function useEventActions() {
  const { update, create } = useData()

  const startShoot = useCallback(
    (eventId) =>
      update('events', eventId, {
        shootStatus: 'Started',
        shootStartedAt: new Date().toISOString(),
        shootEndedAt: null,
      }),
    [update],
  )

  const endShoot = useCallback(
    (eventId) =>
      update('events', eventId, {
        shootStatus: 'Ended',
        shootEndedAt: new Date().toISOString(),
      }),
    [update],
  )

  const resetShoot = useCallback(
    (eventId) =>
      update('events', eventId, {
        shootStatus: 'Not Started',
        shootStartedAt: null,
        shootEndedAt: null,
      }),
    [update],
  )

  /** Adds a crew member and the matching 'Pending' footage row in one go. */
  const addCrewMember = useCallback(
    async (eventId, values) => {
      const assignmentId = await create('crewAssignments', { ...values, eventId })
      await create('footageUploads', {
        eventId,
        crewAssignmentId: assignmentId,
        memberName: values.memberName,
        status: 'Pending',
        driveLink: '',
        uploadedAt: null,
        verified: false,
        verifiedAt: null,
        notes: '',
      })
      return assignmentId
    },
    [create],
  )

  return { startShoot, endShoot, resetShoot, addCrewMember }
}
