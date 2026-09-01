import { useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { Avatar } from '../components/Layout'
import {
  Badge,
  Banner,
  Field,
  PageHeader,
  SectionCard,
  Spinner,
} from '../components/ui/Primitives'
import { ConfirmDialog } from '../components/ui/Modal'
import { Select } from '../components/ui/Select'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../firebase/auth'
import { useData } from '../data/store'
import { useLocalSetting } from '../hooks/useLocalSetting'
import {
  DEFAULT_REMINDERS,
  REMINDER_PRESETS,
  connectCalendar,
  disconnectCalendar,
  isCalendarConfigured,
} from '../services/calendarService'
import { exportEventsCsv, exportJson, exportPaymentsCsv } from '../utils/exportData'
import { loadSampleData } from '../data/sampleData'

export function Settings() {
  const { user, signOut } = useAuth()
  const { db, replaceAll, create } = useData()
  const toast = useToast()

  const [reminders, setReminders] = useLocalSetting('reminders', DEFAULT_REMINDERS)
  const [calendarBusy, setCalendarBusy] = useState(false)
  const [calendarLinked, setCalendarLinked] = useLocalSetting('calendarLinked', false)
  const [confirm, setConfirm] = useState(null)
  // Which long-running Firestore job is in flight: 'restore' | 'sample' | 'clear'.
  const [busy, setBusy] = useState('')
  const fileRef = useRef(null)

  const counts = {
    events: db.events.length,
    clients: db.clients.length,
    payments: db.payments.length,
    crew: db.crewAssignments.length,
    footage: db.footageUploads.length,
  }

  async function connect() {
    setCalendarBusy(true)
    try {
      await connectCalendar()
      setCalendarLinked(true)
      toast.success('Google Calendar connected.')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCalendarBusy(false)
    }
  }

  function disconnect() {
    disconnectCalendar()
    setCalendarLinked(false)
    toast.info('Google Calendar disconnected from this browser.')
  }

  function onImportFile(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      setBusy('restore')
      try {
        const parsed = JSON.parse(String(reader.result))
        await replaceAll(parsed)
        toast.success('Backup restored to Firestore.')
      } catch (err) {
        toast.error(err.message ?? 'That file could not be read.')
      } finally {
        setBusy('')
      }
    }
    reader.onerror = () => toast.error('That file could not be read.')
    reader.readAsText(file)
    event.target.value = ''
  }

  async function addSampleEvent() {
    setBusy('sample')
    try {
      await loadSampleData(create)
      toast.success('Sample event added. Open it from All Events.')
    } catch (err) {
      toast.error(err.message ?? 'Could not add the sample event.')
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Account, sync, reminders and backups." />

      <div className="grid grid-2">
        <div className="col gap-16">
          <SectionCard title="Account" icon="user">
            <div className="row gap-12" style={{ marginBottom: 14 }}>
              <Avatar user={user} size={44} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div className="strong">{user?.displayName}</div>
                <div className="text-sm text-muted">{user?.email}</div>
              </div>
            </div>
            <button type="button" className="btn btn-secondary btn-block" onClick={signOut}>
              <Icon name="logout" size={16} />
              Sign out
            </button>
          </SectionCard>

          <SectionCard title="Cloud sync" icon="cloud">
            <div className="row row-between" style={{ marginBottom: 12 }}>
              <span className="text-sm text-muted">Storage</span>
              <Badge status="Cloud Firestore" tone="ok" />
            </div>

            <Banner kind="ok">
              Connected to Cloud Firestore as <strong>{user?.email}</strong>. Anything you
              save here appears on your other devices within a second, and edits made with
              no signal are sent up as soon as you are back online.
            </Banner>
          </SectionCard>

          <SectionCard title="Data stored" icon="drive">
            <dl className="kv">
              <dt>Events</dt>
              <dd>{counts.events}</dd>
              <dt>Clients</dt>
              <dd>{counts.clients}</dd>
              <dt>Payment records</dt>
              <dd>{counts.payments}</dd>
              <dt>Crew assignments</dt>
              <dd>{counts.crew}</dd>
              <dt>Footage records</dt>
              <dd>{counts.footage}</dd>
              <dt>Stored in</dt>
              <dd>Cloud Firestore</dd>
            </dl>
          </SectionCard>
        </div>

        <div className="col gap-16">
          <SectionCard title="Google Calendar reminders" icon="calendar">
            <Banner kind="info">
              <strong>Why Calendar and not Gmail.</strong> A reminder has to fire when the
              website is closed. Google Calendar stores the reminder and sends it for you —
              by email and as a phone notification — at no cost. Gmail would need a
              scheduled server job, and Firebase charges for those.
            </Banner>

            <div className="row row-between" style={{ marginBottom: 12 }}>
              <span className="text-sm text-muted">Status</span>
              {!isCalendarConfigured ? (
                <Badge status="Not configured" tone="muted" />
              ) : (
                <Badge
                  status={calendarLinked ? 'Connected' : 'Not connected'}
                  tone={calendarLinked ? 'ok' : 'warn'}
                />
              )}
            </div>

            {!isCalendarConfigured ? (
              <>
                <p className="text-sm text-muted" style={{ marginBottom: 10 }}>
                  To switch reminders on, create an OAuth client ID in Google Cloud Console
                  and add it to your <code>.env</code> file:
                </p>
                <div className="steps">
                  <div className="step">
                    Create a Google Cloud project and enable the <strong>Google Calendar API</strong>.
                  </div>
                  <div className="step">
                    Configure the OAuth consent screen and add your own Google account as a
                    test user.
                  </div>
                  <div className="step">
                    Create an <strong>OAuth client ID</strong> of type Web application, and add
                    your site address to the authorised JavaScript origins.
                  </div>
                  <div className="step">
                    Put it in <code>.env</code> as <code>VITE_GOOGLE_CLIENT_ID</code> and
                    rebuild.
                  </div>
                </div>
              </>
            ) : (
              <>
                <Field
                  label="Remind me"
                  hint="Applied to new calendar events. Each one sends an email and a phone notification."
                >
                  {(id) => (
                    <Select
                      id={id}
                      value={String(reminders[0] ?? 1440)}
                      onChange={(value) => setReminders([Number(value), reminders[1] ?? 120])}
                      options={REMINDER_PRESETS.map((preset) => ({
                        value: String(preset.value),
                        label: preset.label,
                      }))}
                      searchable={false}
                    />
                  )}
                </Field>

                <div style={{ height: 12 }} />

                <Field label="And again">
                  {(id) => (
                    <Select
                      id={id}
                      value={String(reminders[1] ?? 120)}
                      onChange={(value) => setReminders([reminders[0] ?? 1440, Number(value)])}
                      options={REMINDER_PRESETS.map((preset) => ({
                        value: String(preset.value),
                        label: preset.label,
                      }))}
                      searchable={false}
                    />
                  )}
                </Field>

                <div className="row gap-8" style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={connect}
                    disabled={calendarBusy}
                  >
                    {calendarBusy ? <Spinner /> : <Icon name="calendarCheck" size={16} />}
                    {calendarLinked ? 'Reconnect' : 'Connect Google Calendar'}
                  </button>
                  {calendarLinked && (
                    <button type="button" className="btn btn-secondary" onClick={disconnect}>
                      Disconnect
                    </button>
                  )}
                </div>
              </>
            )}
          </SectionCard>

          <SectionCard title="Backup & export" icon="download">
            <p className="text-sm text-muted" style={{ marginBottom: 12 }}>
              Keep a copy of your event and payment data. Exports open in Excel or Google
              Sheets.
            </p>

            <div className="settings-list">
              <div className="setting-row">
                <div className="grow">
                  <div className="setting-name">Full backup (JSON)</div>
                  <div className="setting-desc">Everything, restorable from the row below.</div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => exportJson(db)}
                >
                  <Icon name="download" size={15} />
                  Download
                </button>
              </div>

              <div className="setting-row">
                <div className="grow">
                  <div className="setting-name">Events (CSV)</div>
                  <div className="setting-desc">One row per event with the money summary.</div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => exportEventsCsv(db)}
                >
                  <Icon name="download" size={15} />
                  Download
                </button>
              </div>

              <div className="setting-row">
                <div className="grow">
                  <div className="setting-name">Payments (CSV)</div>
                  <div className="setting-desc">Every payment with its method and reference.</div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => exportPaymentsCsv(db)}
                >
                  <Icon name="download" size={15} />
                  Download
                </button>
              </div>

              <div className="setting-row">
                <div className="grow">
                  <div className="setting-name">Restore a backup</div>
                  <div className="setting-desc">
                    Replaces everything in your account with the file's contents, on every
                    device.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={busy === 'restore'}
                >
                  {busy === 'restore' ? <Spinner /> : <Icon name="upload" size={15} />}
                  Choose file
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  onChange={onImportFile}
                  style={{ display: 'none' }}
                />
              </div>

              <div className="setting-row">
                <div className="grow">
                  <div className="setting-name">Load a sample event</div>
                  <div className="setting-desc">
                    Adds the example wedding from the requirements so you can see how it
                    all fits together.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={addSampleEvent}
                  disabled={busy === 'sample'}
                >
                  {busy === 'sample' ? <Spinner /> : <Icon name="plus" size={15} />}
                  Add sample
                </button>
              </div>

              <div className="setting-row">
                <div className="grow">
                  <div className="setting-name">Clear all data</div>
                  <div className="setting-desc">
                    Deletes every record in your account, on every device.
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-danger btn-sm"
                  onClick={() => setConfirm(true)}
                  disabled={busy === 'clear'}
                >
                  {busy === 'clear' ? <Spinner /> : <Icon name="trash" size={15} />}
                  Clear
                </button>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Security" icon="shield">
            <ul className="text-sm text-muted" style={{ paddingLeft: 18, lineHeight: 1.8, margin: 0 }}>
              <li>Only signed-in accounts you authorise can open this dashboard.</li>
              <li>Firestore rules restrict every record to the account that created it.</li>
              <li>No Google client secret or admin credential is stored in this website.</li>
              <li>Payment records hold amounts and references only — never card numbers, UPI PINs or passwords.</li>
              <li>Large photo and video files stay in Google Drive; this app stores the links.</li>
            </ul>
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title="Clear all data?"
        message="Every event, client, payment, crew member and footage record in your account will be deleted from Firestore, on every device. Download a backup first if you want to keep it."
        confirmLabel="Clear everything"
        onConfirm={async () => {
          setBusy('clear')
          try {
            await replaceAll({})
            toast.success('All data cleared.')
          } catch (err) {
            toast.error(err.message)
          } finally {
            setBusy('')
          }
          setConfirm(null)
        }}
      />
    </>
  )
}
