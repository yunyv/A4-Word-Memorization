import React, { useState } from 'react';
import { DefinitionTypeSetting } from '@/types/definitionSettings';
import { DefinitionTypeItem } from './DefinitionTypeItem';

interface DefinitionTypeListProps {
  definitionTypes: DefinitionTypeSetting[];
  onToggle: (id: string, enabled: boolean) => void;
  onReorder: (sourceIndex: number, destinationIndex: number) => void;
}

export const DefinitionTypeList: React.FC<DefinitionTypeListProps> = ({
  definitionTypes,
  onToggle,
  onReorder
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.outerHTML);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      onReorder(draggedIndex, dropIndex);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-2">
      {definitionTypes.map((type, index) => (
        <div
          key={type.id}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          className={`
            transition-all duration-200
            ${dragOverIndex === index ? 'transform scale-105' : ''}
          `}
        >
          <DefinitionTypeItem
            definitionType={type}
            isDragging={draggedIndex === index}
            onToggle={(enabled) => onToggle(type.id, enabled)}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
          />
          
          {/* 拖拽指示器 */}
          {dragOverIndex === index && draggedIndex !== null && draggedIndex !== index && (
            <div className="h-1 bg-blue-500 rounded-full mt-2 mb-2 animate-pulse" />
          )}
        </div>
      ))}
    </div>
  );
};