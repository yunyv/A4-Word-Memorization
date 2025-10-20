import { DefinitionSettings, defaultSettings } from '@/types/definitionSettings';

// 本地存储的键名
const STORAGE_KEY = 'definition-settings';

// 从本地存储加载设置
export const loadSettings = (): DefinitionSettings => {
  if (typeof window === 'undefined') {
    return defaultSettings;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // 验证并合并默认设置，确保所有字段都存在
      return {
        definitionTypes: parsed.definitionTypes || defaultSettings.definitionTypes,
        uiSettings: {
          fontSize: parsed.uiSettings?.fontSize || defaultSettings.uiSettings.fontSize,
          panelWidth: parsed.uiSettings?.panelWidth || defaultSettings.uiSettings.panelWidth,
          cardSize: parsed.uiSettings?.cardSize || defaultSettings.uiSettings.cardSize
        }
      };
    }
  } catch (error) {
    console.error('加载释义设置失败:', error);
  }

  return defaultSettings;
};

// 保存设置到本地存储
export const saveSettings = (settings: DefinitionSettings): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('保存释义设置失败:', error);
  }
};

// 重置设置为默认值
export const resetSettings = (): DefinitionSettings => {
  saveSettings(defaultSettings);
  return defaultSettings;
};

// 根据ID获取释义类型设置
export const getDefinitionTypeSetting = (
  settings: DefinitionSettings,
  id: string
) => {
  return settings.definitionTypes.find(type => type.id === id);
};

// 更新释义类型的启用状态
export const updateDefinitionTypeEnabled = (
  settings: DefinitionSettings,
  id: string,
  enabled: boolean
): DefinitionSettings => {
  const newSettings = {
    ...settings,
    definitionTypes: settings.definitionTypes.map(type =>
      type.id === id ? { ...type, enabled } : type
    )
  };
  saveSettings(newSettings);
  return newSettings;
};

// 重新排序释义类型
export const reorderDefinitionTypes = (
  settings: DefinitionSettings,
  sourceIndex: number,
  destinationIndex: number
): DefinitionSettings => {
  const newDefinitionTypes = Array.from(settings.definitionTypes);
  const [removed] = newDefinitionTypes.splice(sourceIndex, 1);
  newDefinitionTypes.splice(destinationIndex, 0, removed);

  // 更新order字段
  const reorderedTypes = newDefinitionTypes.map((type, index) => ({
    ...type,
    order: index + 1
  }));

  const newSettings = {
    ...settings,
    definitionTypes: reorderedTypes
  };
  saveSettings(newSettings);
  return newSettings;
};

// 更新UI设置
export const updateUISettings = (
  settings: DefinitionSettings,
  uiSettings: Partial<DefinitionSettings['uiSettings']>
): DefinitionSettings => {
  const newSettings = {
    ...settings,
    uiSettings: {
      ...settings.uiSettings,
      ...uiSettings
    }
  };
  saveSettings(newSettings);
  return newSettings;
};

// 获取排序后的释义类型列表
export const getSortedDefinitionTypes = (settings: DefinitionSettings) => {
  return [...settings.definitionTypes].sort((a, b) => a.order - b.order);
};

// 获取启用的释义类型列表
export const getEnabledDefinitionTypes = (settings: DefinitionSettings) => {
  return getSortedDefinitionTypes(settings).filter(type => type.enabled);
};