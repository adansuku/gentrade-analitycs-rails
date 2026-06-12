import { useDroppable } from '@dnd-kit/core';
import DraggableCard from './DraggableCard';

function DroppableColumn({ stage, clients }) {
  const { isOver, setNodeRef } = useDroppable({ id: stage.key });
  return (
    <div key={stage.key} className="pipeline-column">
      <div className="pipeline-column-header">
        <div className="pipeline-column-dot" style={{ background: stage.color }} />
        <span className="pipeline-column-title">{stage.label}</span>
        <span className="pipeline-column-count">{clients.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`pipeline-column-body ${isOver ? 'pipeline-column-over' : ''}`}
      >
        {clients.length === 0 ? (
          <div className="pipeline-empty">Arrastra clientes aqui</div>
        ) : (
          clients.map(client => (
            <DraggableCard key={client.id} client={client} stageKey={stage.key} />
          ))
        )}
      </div>
    </div>
  );
}

export default DroppableColumn;
