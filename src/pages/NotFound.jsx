import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { EmptyState, PageHeader } from '../components/ui/Primitives'

export function NotFound() {
  return (
    <>
      <PageHeader
        title="Page not found"
        subtitle="That link does not point anywhere in this dashboard."
      />
      <div className="card">
        <EmptyState
          icon="search"
          title="Nothing here"
          text="Check the address, or head back and pick a page from the menu."
          action={
            <Link to="/" className="btn btn-primary btn-sm">
              <Icon name="dashboard" size={15} />
              Go to dashboard
            </Link>
          }
        />
      </div>
    </>
  )
}
