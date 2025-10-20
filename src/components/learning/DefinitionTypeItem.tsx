import React from 'react';
import { DefinitionTypeSetting } from '@/types/definitionSettings';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import { GripVertical } from 'lucide-react';

interface DefinitionTypeItemProps {
  definitionType: DefinitionTypeSetting;
  isDragging?: boolean;
  onToggle: (enabled: boolean) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
}

export const DefinitionTypeItem: React.FC<DefinitionTypeItemProps> = ({
  definitionType,
  isDragging = false,
  onToggle,
  onDragStart,
  onDragEnd
}) => {
  return (
    <div
      className={`
        flex items-center justify-between p-3 bg-white border rounded-lg
        transition-all duration-200 ease-in-out
        ${isDragging 
          ? 'shadow-lg opacity-50 scale-105 border-blue-400' 
          : 'shadow-sm border-gray-200 hover:shadow-md hover:border-gray-300'
        }
      `}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center space-x-3 flex-1">
        <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
          <GripVertical size={20} />
        </div>
        <span className="font-medium text-gray-800">
          {definitionType.name}
        </span>
      </div>
      
      <ToggleSwitch
        checked={definitionType.enabled}
        onChange={onToggle}
        size="md"
      />
    </div>
  );
};