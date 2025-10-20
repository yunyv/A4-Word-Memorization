import React from 'react';
import { DefinitionSettings } from '@/types/definitionSettings';
import { Slider } from '@/components/ui/slider';

interface UIControlsProps {
  settings: DefinitionSettings;
  onChange: (settings: Partial<DefinitionSettings['uiSettings']>) => void;
}

export const UIControls: React.FC<UIControlsProps> = ({
  settings,
  onChange
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          界面设置
        </h3>
        
        <div className="space-y-4">
          <Slider
            label="字体大小"
            unit="px"
            min={12}
            max={24}
            step={1}
            value={settings.uiSettings.fontSize}
            onChange={(fontSize) => onChange({ fontSize })}
          />
          
          <Slider
            label="释义面板宽度"
            unit="px"
            min={400}
            max={800}
            step={50}
            value={settings.uiSettings.panelWidth}
            onChange={(panelWidth) => onChange({ panelWidth })}
          />
          
          <Slider
            label="单词卡片大小"
            unit="px"
            min={100}
            max={200}
            step={10}
            value={settings.uiSettings.cardSize}
            onChange={(cardSize) => onChange({ cardSize })}
          />
        </div>
      </div>
    </div>
  );
};