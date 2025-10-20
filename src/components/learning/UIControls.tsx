import React from 'react';
import { DefinitionSettings } from '@/types/definitionSettings';
import { Slider } from '@/components/ui/slider';
import { ToggleSwitch } from '@/components/ui/toggle-switch';

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
            label="单词卡片缩放"
            unit="px"
            min={100}
            max={200}
            step={10}
            value={settings.uiSettings.cardSize}
            onChange={(cardSize) => onChange({ cardSize })}
          />

          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700">
                自动朗读读音
              </div>
              <div className="text-xs text-gray-500">
                打开释义面板时自动播放单词读音
              </div>
            </div>
            <ToggleSwitch
              checked={settings.uiSettings.autoPlayAudio}
              onChange={(autoPlayAudio) => onChange({ autoPlayAudio })}
            />
          </div>
        </div>
      </div>
    </div>
  );
};