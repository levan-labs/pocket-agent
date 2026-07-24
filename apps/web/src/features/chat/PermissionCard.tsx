import type { PermissionRequest } from '@pocket-agent/shared-types'
import { Button } from '@pocket-agent/ui'

export interface PermissionCardProps {
  request: PermissionRequest
  onApprove: (requestId: string) => void
  onDeny: (requestId: string) => void
}

const KIND_LABELS: Record<PermissionRequest['kind'], string> = {
  'run-command': 'Run command',
  'write-file': 'Write file',
  'delete-file': 'Delete file',
  'read-file': 'Read file',
  other: 'Action',
}

/**
 * Approval card shown near the bottom of the screen (thumb reach). Always
 * displays the exact action, command, and path before anything runs.
 */
export function PermissionCard({ request, onApprove, onDeny }: PermissionCardProps) {
  return (
    <section className="permission-card" aria-label="Permission request" aria-live="assertive">
      <header className="permission-card__header">
        <span className="permission-card__kind">{KIND_LABELS[request.kind]}</span>
        <h3 className="permission-card__title">{request.title}</h3>
      </header>
      {request.command && (
        <code className="permission-card__detail">{request.command}</code>
      )}
      {request.path && <code className="permission-card__detail">{request.path}</code>}
      <div className="permission-card__actions">
        <Button variant="primary" onClick={() => onApprove(request.id)}>
          Approve once
        </Button>
        <Button variant="danger" onClick={() => onDeny(request.id)}>
          Deny
        </Button>
      </div>
    </section>
  )
}
