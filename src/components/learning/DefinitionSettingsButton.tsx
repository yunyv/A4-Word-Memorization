import React from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DefinitionSettingsButtonProps {
  onClick: () => void;
  className?: string;
}

export const DefinitionSettingsButton: React.FC<DefinitionSettingsButtonProps> = ({
  onClick,
  className = ''
}) => {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`
        w-10 h-10 rounded-full bg-white border border-gray-200
        shadow-sm hover:shadow-md hover:bg-gray-50
        transition-all duration-200 ease-in-out
        flex items-center justify-center
        ${className}
      `}
      title="释义设置"
    >
      <Settings className="h-5 w-5 text-gray-600" />
    </Button>
  );
};