interface ValidationBadgeProps {
  status: 'valid' | 'warning';
}

export function ValidationBadge({ status }: ValidationBadgeProps) {
  if (status === 'valid') {
    return (
      <div
        style={{
          position: 'absolute',
          top: -4,
          right: -4,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: 'var(--success)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          color: 'var(--text-on-primary)',
          fontWeight: 700,
        }}
      >
        &#10003;
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: -4,
        right: -4,
        width: 18,
        height: 18,
        background: 'var(--warning)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        color: 'var(--text-on-primary)',
        fontWeight: 700,
        borderRadius: 2,
        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
      }}
    >
      !
    </div>
  );
}
