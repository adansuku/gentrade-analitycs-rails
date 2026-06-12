export function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatDate(date) {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Hace un momento';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString();
}

export function formatMaterialType(type) {
  const map = {
    EMAIL: 'Email',
    CSV: 'CSV',
    XLSX: 'Excel',
    AUDIO: 'Audio',
    TRANSCRIPT: 'Transcripcion',
    PDF: 'PDF',
    TXT: 'Texto',
    DOCX: 'Word',
    NOTE: 'Nota',
    OTHER: 'Otro'
  };
  return map[type] || type;
}

export function formatProposalStatus(status) {
  if (!status) return 'Borrador';
  const map = {
    DRAFT: 'Borrador',
    FINAL: 'Final',
    SENT: 'Enviada'
  };
  return map[status] || status;
}
