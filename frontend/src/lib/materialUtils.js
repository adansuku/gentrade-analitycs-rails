import Icons from '../components/ui/Icons';
import { formatMaterialType } from './formatters';

export function getMaterialIcon(type) {
  const icons = {
    EMAIL: Icons.Mail,
    AUDIO: Icons.Mic,
    TRANSCRIPT: Icons.MessageText,
    PDF: Icons.FileText,
    CSV: Icons.List,
    XLSX: Icons.List,
    TXT: Icons.FileText,
    DOCX: Icons.FileText,
    NOTE: Icons.Edit,
    OTHER: Icons.FileText,
  };
  return icons[type] || Icons.FileText;
}

export function getMaterialIconColor(type) {
  const colors = {
    EMAIL: '#3b82f6',
    AUDIO: '#8b5cf6',
    TRANSCRIPT: '#a855f7',
    PDF: '#ef4444',
    CSV: '#10b981',
    XLSX: '#10b981',
    TXT: '#6b7280',
    DOCX: '#2563eb',
    NOTE: '#f59e0b',
    OTHER: '#6b7280',
  };
  return colors[type] || '#6b7280';
}

export const MATERIAL_TYPE_ORDER = ['EMAIL', 'PDF', 'DOCX', 'TXT', 'CSV', 'XLSX', 'NOTE', 'OTHER'];

export function organizeMaterials(materials) {
  // Pair audios with their transcriptions
  const audios = materials.filter(m => m.type === 'AUDIO');
  const transcripts = materials.filter(m => m.type === 'TRANSCRIPT');
  const rest = materials.filter(m => m.type !== 'AUDIO' && m.type !== 'TRANSCRIPT');

  const audioPairs = audios.map(audio => {
    // Match transcript by title containing the audio filename
    const audioName = audio.title || '';
    const match = transcripts.find(t =>
      t.title?.includes(audioName) || t.source === 'audio'
    );
    return { audio, transcript: match || null };
  });

  // Orphan transcripts (no matching audio)
  const pairedTranscriptIds = new Set(audioPairs.map(p => p.transcript?.id).filter(Boolean));
  const orphanTranscripts = transcripts.filter(t => !pairedTranscriptIds.has(t.id));

  // Group the rest by type
  const groups = {};
  for (const m of [...rest, ...orphanTranscripts]) {
    const type = m.type || 'OTHER';
    if (!groups[type]) groups[type] = [];
    groups[type].push(m);
  }
  const otherGroups = MATERIAL_TYPE_ORDER
    .filter(t => groups[t])
    .map(t => ({ type: t, label: formatMaterialType(t), materials: groups[t] }));

  return { audioPairs, otherGroups };
}

export const PIPELINE_STAGES = [
  { key: 'new', label: 'Nuevo', color: '#9ca3af' },
  { key: 'contacted', label: 'Contactado', color: '#1b5e3b' },
  { key: 'proposal_sent', label: 'Propuesta enviada', color: '#d97706' },
  { key: 'negotiating', label: 'Negociando', color: '#a855f7' },
  { key: 'closed_won', label: 'Cerrado (ganado)', color: '#059669' },
  { key: 'closed_lost', label: 'Cerrado (perdido)', color: '#dc2626' },
];
