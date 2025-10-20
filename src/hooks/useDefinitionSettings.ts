import { useState, useEffect, useCallback } from 'react';
import { DefinitionSettings } from '@/types/definitionSettings';
import {
  loadSettings,
  saveSettings,
  resetSettings,
  updateDefinitionTypeEnabled,
  reorderDefinitionTypes,
  updateUISettings,
  getSortedDefinitionTypes,
  getEnabledDefinitionTypes
} from '@/lib/definitionSettings';

export const useDefinitionSettings = () => {
  const [settings, setSettings] = useState<DefinitionSettings>(loadSettings());
  const [isLoading, setIsLoading] = useState(true);

  // 初始化时加载设置
  useEffect(() => {
    const loadedSettings = loadSettings();
    setSettings(loadedSettings);
    setIsLoading(false);
  }, []);

  // 更新整个设置对象
  const updateSettings = useCallback((newSettings: DefinitionSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  }, []);

  // 更新释义类型的启用状态
  const toggleDefinitionType = useCallback((id: string, enabled: boolean) => {
    const newSettings = updateDefinitionTypeEnabled(settings, id, enabled);
    setSettings(newSettings);
  }, [settings]);

  // 重新排序释义类型
  const reorderTypes = useCallback((sourceIndex: number, destinationIndex: number) => {
    const newSettings = reorderDefinitionTypes(settings, sourceIndex, destinationIndex);
    setSettings(newSettings);
  }, [settings]);

  // 更新UI设置
  const updateUI = useCallback((uiSettings: Partial<DefinitionSettings['uiSettings']>) => {
    const newSettings = updateUISettings(settings, uiSettings);
    setSettings(newSettings);
  }, [settings]);

  // 重置为默认设置
  const reset = useCallback(() => {
    const newSettings = resetSettings();
    setSettings(newSettings);
  }, []);

  // 获取排序后的释义类型
  const sortedDefinitionTypes = getSortedDefinitionTypes(settings);

  // 获取启用的释义类型
  const enabledDefinitionTypes = getEnabledDefinitionTypes(settings);

  return {
    settings,
    sortedDefinitionTypes,
    enabledDefinitionTypes,
    isLoading,
    updateSettings,
    toggleDefinitionType,
    reorderTypes,
    updateUI,
    reset
  };
};