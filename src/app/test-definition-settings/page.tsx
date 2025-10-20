'use client';

import { useState } from 'react';
import { DefinitionSettingsButton } from '@/components/learning/DefinitionSettingsButton';
import { DefinitionSettingsModal } from '@/components/learning/DefinitionSettingsModal';
import { useDefinitionSettings } from '@/hooks/useDefinitionSettings';

export default function TestDefinitionSettingsPage() {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const {
    settings,
    isLoading,
    toggleDefinitionType,
    reorderTypes,
    updateUI,
    reset
  } = useDefinitionSettings();

  const handleOpenSettings = () => {
    setIsSettingsModalOpen(true);
  };

  const handleCloseSettings = () => {
    setIsSettingsModalOpen(false);
  };

  // 模拟释义数据
  const mockDefinitionData = {
    authoritativeDefinitions: [
      {
        partOfSpeech: 'n.',
        definitions: [
          {
            number: 1,
            chineseMeaning: '名词，一种测试数据',
            englishMeaning: 'noun, a test data',
            examples: [
              {
                english: 'This is a test example.',
                chinese: '这是一个测试例句。'
              }
            ]
          }
        ],
        idioms: [
          {
            number: 1,
            title: 'test idiom',
            meaning: '测试习语',
            examples: [
              {
                english: 'This is a test idiom example.',
                chinese: '这是一个测试习语例句。'
              }
            ]
          }
        ]
      }
    ],
    bilingualDefinitions: [
      {
        partOfSpeech: 'v.',
        definitions: [
          {
            number: 1,
            meaning: '动词，测试'
          }
        ]
      }
    ],
    englishDefinitions: [
      {
        partOfSpeech: 'adj.',
        definitions: [
          {
            number: 1,
            meaning: 'adjective, test',
            linkedWords: ['testing', 'tested']
          }
        ]
      }
    ],
    definitions: {
      basic: [
        {
          partOfSpeech: 'n.',
          meaning: '名词，测试'
        }
      ],
      web: [
        {
          meaning: '网络释义：测试'
        }
      ]
    },
    wordForms: [
      {
        form: '复数',
        word: 'tests'
      }
    ],
    sentences: [
      {
        number: 1,
        english: 'This is a test sentence.',
        chinese: '这是一个测试句子。',
        source: '测试来源'
      }
    ]
  };

  // 根据设置渲染释义内容
  const renderDefinitionContent = (definition: any) => {
    const enabledTypes = settings.definitionTypes.filter(type => type.enabled).sort((a, b) => a.order - b.order);
    
    return enabledTypes.map(type => {
      switch (type.id) {
        case 'authoritative':
          return definition?.authoritativeDefinitions && definition.authoritativeDefinitions.length > 0 ? (
            <div key="authoritative" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: `${settings.uiSettings.fontSize}px`, fontWeight: '600', color: '#333', marginBottom: '8px' }}>权威英汉释义</div>
              {definition.authoritativeDefinitions.map((authDef: any, index: number) => (
                <div key={index} style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: '#4285f4' }}>{authDef.partOfSpeech}</div>
                  {authDef.definitions.map((defItem: any, defIndex: number) => (
                    <div key={defIndex} style={{ marginLeft: '16px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '500' }}>{defItem.number}.</span>
                      <span style={{ marginLeft: '4px' }}>{defItem.chineseMeaning}</span>
                      {defItem.englishMeaning && (
                        <span style={{ marginLeft: '4px', color: '#666' }}>({defItem.englishMeaning})</span>
                      )}
                      {defItem.examples && defItem.examples.length > 0 && (
                        <div style={{ marginTop: '4px', marginLeft: '16px' }}>
                          {defItem.examples.map((example: any, exIndex: number) => (
                            <div key={exIndex} style={{ fontStyle: 'italic', fontSize: `${settings.uiSettings.fontSize - 2}px`, color: '#666', marginBottom: '4px' }}>
                              {example.english} {example.chinese && `(${example.chinese})`}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* 习语 */}
                  {authDef.idioms && authDef.idioms.length > 0 && (
                    <div style={{ marginTop: '8px', marginLeft: '16px' }}>
                      <div style={{ fontWeight: '500', marginBottom: '4px', color: '#4285f4' }}>习语:</div>
                      {authDef.idioms.map((idiom: any, idiomIndex: number) => (
                        <div key={idiomIndex} style={{ marginBottom: '6px' }}>
                          <span style={{ fontWeight: '500' }}>{idiom.number}. {idiom.title}</span> - {idiom.meaning}
                          {idiom.examples && idiom.examples.length > 0 && (
                            <div style={{ marginTop: '4px', marginLeft: '16px' }}>
                              {idiom.examples.map((example: any, exIndex: number) => (
                                <div key={exIndex} style={{ fontStyle: 'italic', fontSize: `${settings.uiSettings.fontSize - 2}px`, color: '#666', marginBottom: '4px' }}>
                                  {example.english} {example.chinese && `(${example.chinese})`}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : null;

        case 'bilingual':
          return definition?.bilingualDefinitions && definition.bilingualDefinitions.length > 0 ? (
            <div key="bilingual" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: `${settings.uiSettings.fontSize}px`, fontWeight: '600', color: '#333', marginBottom: '8px' }}>英汉释义</div>
              {definition.bilingualDefinitions.map((bilDef: any, index: number) => (
                <div key={index} style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: '#4285f4' }}>{bilDef.partOfSpeech}</div>
                  {bilDef.definitions.map((defItem: any, defIndex: number) => (
                    <div key={defIndex} style={{ marginLeft: '16px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '500' }}>{defItem.number}.</span> {defItem.meaning}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : null;

        case 'english':
          return definition?.englishDefinitions && definition.englishDefinitions.length > 0 ? (
            <div key="english" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: `${settings.uiSettings.fontSize}px`, fontWeight: '600', color: '#333', marginBottom: '8px' }}>英英释义</div>
              {definition.englishDefinitions.map((engDef: any, index: number) => (
                <div key={index} style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: '#4285f4' }}>{engDef.partOfSpeech}</div>
                  {engDef.definitions.map((defItem: any, defIndex: number) => (
                    <div key={defIndex} style={{ marginLeft: '16px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '500' }}>{defItem.number}.</span> {defItem.meaning}
                      {defItem.linkedWords && defItem.linkedWords.length > 0 && (
                        <div style={{ marginTop: '2px', marginLeft: '16px', fontSize: `${settings.uiSettings.fontSize - 2}px`, color: '#666' }}>
                          相关词: {defItem.linkedWords.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : null;

        case 'basic':
          return definition?.definitions?.basic && definition.definitions.basic.length > 0 ? (
            <div key="basic" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: `${settings.uiSettings.fontSize}px`, fontWeight: '600', color: '#333', marginBottom: '8px' }}>基本释义</div>
              {definition.definitions.basic.map((def: any, index: number) => (
                <div key={index} style={{ marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: '#4285f4' }}>{def.partOfSpeech}</span> {def.meaning}
                </div>
              ))}
            </div>
          ) : null;

        case 'web':
          return definition?.definitions?.web && definition.definitions.web.length > 0 ? (
            <div key="web" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: `${settings.uiSettings.fontSize}px`, fontWeight: '600', color: '#333', marginBottom: '8px' }}>网络释义</div>
              {definition.definitions.web.map((def: any, index: number) => (
                <div key={index} style={{ marginBottom: '8px', marginLeft: '16px' }}>
                  {def.meaning}
                </div>
              ))}
            </div>
          ) : null;

        default:
          return null;
      }
    }).filter(Boolean);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>释义设置功能测试</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <p>当前设置:</p>
        <ul>
          <li>字体大小: {settings.uiSettings.fontSize}px</li>
          <li>面板宽度: {settings.uiSettings.panelWidth}px</li>
          <li>卡片大小: {settings.uiSettings.cardSize}px</li>
        </ul>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <DefinitionSettingsButton onClick={handleOpenSettings} />
      </div>

      <div style={{ 
        width: `${settings.uiSettings.panelWidth}px`, 
        border: '1px solid #ddd', 
        borderRadius: '8px', 
        padding: '20px',
        backgroundColor: '#f9f9f9'
      }}>
        <h2 style={{ fontSize: `${settings.uiSettings.fontSize + 8}px`, marginBottom: '16px' }}>测试单词</h2>
        
        <div style={{ fontSize: `${settings.uiSettings.fontSize}px`, lineHeight: '1.8' }}>
          {renderDefinitionContent(mockDefinitionData)}
        </div>
      </div>

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {settings.definitionTypes.map(type => (
          <div 
            key={type.id}
            style={{
              width: `${settings.uiSettings.cardSize}px`,
              height: '48px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: `${settings.uiSettings.fontSize - 2}px`,
              backgroundColor: type.enabled ? '#e6f4ea' : '#f1f3f4'
            }}
          >
            {type.name}
          </div>
        ))}
      </div>

      <DefinitionSettingsModal
        isOpen={isSettingsModalOpen}
        settings={settings}
        onClose={handleCloseSettings}
        onToggleDefinitionType={toggleDefinitionType}
        onReorderDefinitionTypes={reorderTypes}
        onUpdateUISettings={updateUI}
        onReset={reset}
      />
    </div>
  );
}