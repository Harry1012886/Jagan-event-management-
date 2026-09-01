import { Component } from 'react'
import { Icon } from './Icon'

/**
 * Catches render errors so one bad record can never leave you staring at a
 * blank white page. Shows what happened and offers a way back.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error:', error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="loading-screen" style={{ padding: 24 }}>
        <div className="card" style={{ maxWidth: 480, width: '100%' }}>
          <div className="card-body col gap-12">
            <span className="stat-icon tone-danger" style={{ width: 40, height: 40 }}>
              <Icon name="alert" size={20} />
            </span>
            <h2>Something went wrong on this screen</h2>
            <p className="text-sm text-muted">
              The rest of your data is safe. Reload the page to carry on — if it keeps
              happening, note the message below.
            </p>
            <pre className="code-block" style={{ whiteSpace: 'pre-wrap' }}>
              {String(error?.message ?? error)}
            </pre>
            <div className="row gap-8">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.location.reload()}
              >
                <Icon name="refresh" size={16} />
                Reload
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  this.setState({ error: null })
                  window.location.hash = ''
                  window.location.assign(import.meta.env.BASE_URL)
                }}
              >
                Go to dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}
