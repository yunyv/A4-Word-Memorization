// 释义类型设置
export interface DefinitionTypeSetting {
  id: string; // 'basic', 'authoritative', 'bilingual', 'english', 'web'
  name: string; // 显示名称：基本释义、权威释义等
  enabled: boolean; // 是否显示
  order: number; // 显示顺序
}

// 界面设置
export interface UISettings {
  fontSize: number; // 字体大小 (12-24px)
  panelWidth: number; // 释义面板宽度 (400-800px)
  cardSize: number; // 单词卡片大小 (100-200px)
}

// 完整设置
export interface DefinitionSettings {
  definitionTypes: DefinitionTypeSetting[];
  uiSettings: UISettings;
}

// 默认设置
export const defaultSettings: DefinitionSettings = {
  definitionTypes: [
    { id: 'authoritative', name: '权威释义', enabled: true, order: 1 },
    { id: 'bilingual', name: '英汉释义', enabled: true, order: 2 },
    { id: 'english', name: '英英释义', enabled: true, order: 3 },
    { id: 'basic', name: '基本释义', enabled: true, order: 4 },
    { id: 'web', name: '网络释义', enabled: true, order: 5 }
  ],
  uiSettings: {
    fontSize: 16, // 默认16px
    panelWidth: 600, // 默认600px
    cardSize: 140 // 默认140px
  }
};