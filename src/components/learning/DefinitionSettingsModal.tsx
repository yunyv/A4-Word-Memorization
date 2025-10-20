import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { DefinitionSettings } from '@/types/definitionSettings';
import { DefinitionTypeList } from './DefinitionTypeList';
import { UIControls } from './UIControls';
import { Button } from '@/components/ui/button';

interface DefinitionSettingsModalProps {
  isOpen: boolean;
  settings: DefinitionSettings;
  onClose: () => void;
  onToggleDefinitionType: (id: string, enabled: boolean) => void;
  onReorderDefinitionTypes: (sourceIndex: number, destinationIndex: number) => void;
  onUpdateUISettings: (settings: Partial<DefinitionSettings['uiSettings']>) => void;
  onReset: () => void;
}

export const DefinitionSettingsModal: React.FC<DefinitionSettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onToggleDefinitionType,
  onReorderDefinitionTypes,
  onUpdateUISettings,
  onReset
}) => {
  // 处理ESC键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* 模态框容器 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          className="relative w-full max-w-md bg-white rounded-xl shadow-2xl transform transition-all"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              释义设置
            </h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          
          {/* 内容 */}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {/* 释义类型设置 */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                释义类型
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                拖拽调整显示顺序，点击开关控制显示/隐藏
              </p>
              <DefinitionTypeList
                definitionTypes={settings.definitionTypes}
                onToggle={onToggleDefinitionType}
                onReorder={onReorderDefinitionTypes}
              />
            </div>
            
            {/* UI设置 */}
            <UIControls
              settings={settings}
              onChange={onUpdateUISettings}
            />
          </div>
          
          {/* 底部按钮 */}
          <div className="flex justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
            <Button
              variant="outline"
              onClick={onReset}
              className="px-4 py-2"
            >
              重置为默认
            </Button>
            <Button
              onClick={onClose}
              className="px-6 py-2"
            >
              关闭
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};