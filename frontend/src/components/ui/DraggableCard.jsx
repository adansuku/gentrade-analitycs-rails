import { useDraggable } from '@dnd-kit/core';

function DraggableCard({ client, stageKey }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: client.id,
    data: { client, fromStage: stageKey },
  });
  const style = transform ? {
    transform: `translate(${transform.x}px, ${transform.y}px)`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto',
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="pipeline-card" tabIndex={0}>
      <div className="pipeline-card-info">
        <strong>{client.name}</strong>
        {client.company && <span>{client.company}</span>}
      </div>
      <div className="pipeline-card-meta">
        <span className="proposal-count">{client.proposalCount || 0} prop.</span>
        <span className="proposal-count">{client.materialCount || 0} mat.</span>
      </div>
    </div>
  );
}

export default DraggableCard;
