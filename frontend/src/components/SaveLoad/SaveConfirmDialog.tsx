interface SaveConfirmDialogProps {
  open: boolean;
  oldName: string;
  newName: string;
  onSaveAsNew: () => void;
  onOverwrite: () => void;
  onCancel: () => void;
}

export function SaveConfirmDialog({
  open,
  oldName,
  newName,
  onSaveAsNew,
  onOverwrite,
  onCancel,
}: SaveConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: 'var(--bg-popover)',
          borderRadius: 8,
          padding: 24,
          maxWidth: 400,
          width: '90%',
          boxShadow: '0 8px 32px var(--bg-overlay)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Save Scenario</h3>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
          Scenario name changed from &lsquo;{oldName}&rsquo; to &lsquo;{newName}&rsquo;. How would
          you like to save?
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-secondary" onClick={onOverwrite}>
            Overwrite
          </button>
          <button className="btn btn-primary" onClick={onSaveAsNew}>
            Save As New
          </button>
        </div>
      </div>
    </div>
  );
}
