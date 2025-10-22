'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Volume2 } from 'lucide-react';
import { DefinitionPanel as DefinitionPanelType, WordDefinitionData } from '../types';

interface DefinitionPanelProps {
  definitionPanel: DefinitionPanelType;
  settings: {
    uiSettings: {
      panelWidth: number;
      fontSize: number;
    };
    definitionTypes: Array<{
      id: string;
      enabled: boolean;
      order: number;
    }>;
  };
  isAudioLoading: boolean;
  isAudioPlaying: boolean;
  onPanelMouseDown: (e: React.MouseEvent) => void;
  playAutoAudio: (pronunciationData: WordDefinitionData['pronunciationData'], hasUserInteraction: boolean) => void;
  renderDefinitionContent: (definition: WordDefinitionData | null | undefined) => React.ReactNode;
}

const DefinitionPanel = React.memo<DefinitionPanelProps>(({
  definitionPanel,
  settings,
  isAudioLoading,
  isAudioPlaying,
  onPanelMouseDown,
  playAutoAudio,
  renderDefinitionContent
}) => {
  return (
    <div
      className="definition-panel"
      onClick={(e) => {
        e.stopPropagation();
      }} // 防止点击事件冒泡
      onMouseDown={(e) => {
        e.stopPropagation();
        onPanelMouseDown(e);
      }}
      style={{
        position: 'absolute',
        left: `${definitionPanel.position.x}%`,
        top: `${definitionPanel.position.y}%`,
        transform: 'translate(-50%, -50%)',
        width: `${settings.uiSettings.panelWidth}px`,
        maxWidth: '80vw',
        maxHeight: '70vh',
        overflowY: 'auto',
        backgroundColor: 'var(--color-pure-white)',
        borderRadius: '16px',
        boxShadow: definitionPanel.isDragging ? '0 15px 35px rgba(0, 0, 0, 0.25)' : '0 10px 25px rgba(0, 0, 0, 0.15)',
        zIndex: 1000, // 提高z-index确保在最上层
        padding: '24px',
        fontFamily: "'Inter', 'Source Han Sans CN', sans-serif",
        fontSize: `${settings.uiSettings.fontSize}px`,
        animation: 'definitionPanelExpand 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        visibility: 'visible',
        opacity: 1,
        display: 'block',
        pointerEvents: 'auto',
        cursor: definitionPanel.isDragging ? 'move' : 'default',
        transition: definitionPanel.isDragging ? 'none' : 'box-shadow 0.2s ease'
      }}
    >
      {/* 单词标题 */}
      <div style={{
        fontSize: `${settings.uiSettings.fontSize + 8}px`,
        fontWeight: '700',
        color: 'var(--color-ink-black)',
        textAlign: 'center',
        marginBottom: '16px'
      }}>
        {definitionPanel.wordText}
      </div>
      
      {/* 音标 */}
      {definitionPanel.pronunciationData && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <span style={{
            fontSize: `${settings.uiSettings.fontSize + 2}px`,
            fontWeight: '500',
            color: 'var(--color-ink-black)'
          }}>
            [{definitionPanel.pronunciationData.american?.phonetic || definitionPanel.pronunciationData.british?.phonetic || ''}]
          </span>

          {/* 音频播放状态指示器 */}
          {isAudioLoading && (
            <span style={{
              fontSize: '12px',
              color: 'var(--color-rock-gray)',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-rock-gray)',
                animation: 'pulse 1.5s infinite'
              }}></span>
              加载中...
            </span>
          )}

          {isAudioPlaying && !isAudioLoading && (
            <span style={{
              fontSize: '12px',
              color: 'var(--color-focus-blue)',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-focus-blue)',
                animation: 'pulse 1.5s infinite'
              }}></span>
              正在播放
            </span>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              console.log('🔊 释义面板音频按钮被点击:', definitionPanel.wordText);
              // 使用统一的音频播放函数
              playAutoAudio(definitionPanel.pronunciationData, true);
            }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              padding: '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Volume2 className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <div style={{
        height: '1px',
        backgroundColor: '#E2E8F0',
        marginBottom: '16px'
      }} />
      
      {/* 释义内容 */}
      <div style={{
        fontSize: `${settings.uiSettings.fontSize}px`,
        lineHeight: '1.8',
        color: 'var(--color-ink-black)'
      }}>
        {renderDefinitionContent(definitionPanel.definition)}
        
        {/* 词形变化 */}
        {definitionPanel.definition?.wordForms && definitionPanel.definition.wordForms.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: `${settings.uiSettings.fontSize}px`, fontWeight: '600', color: 'var(--color-ink-black)', marginBottom: '8px' }}>词形变化</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginLeft: '16px' }}>
              {definitionPanel.definition.wordForms.map((form, index: number) => (
                <div key={index} style={{
                  backgroundColor: 'var(--color-gray-100)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: `${settings.uiSettings.fontSize - 2}px`
                }}>
                  <span style={{ fontWeight: '500' }}>{form.form}:</span> {form.word}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 例句 */}
        {definitionPanel.definition?.sentences && definitionPanel.definition.sentences.length > 0 && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: `${settings.uiSettings.fontSize}px`, fontWeight: '600', color: 'var(--color-ink-black)', marginBottom: '8px' }}>例句</div>
            {definitionPanel.definition.sentences.slice(0, 5).map((sentence, index: number) => (
              <div key={index} style={{ marginBottom: '12px', fontStyle: 'italic' }}>
                <div style={{ color: 'var(--color-ink-black)', marginBottom: '4px', fontSize: `${settings.uiSettings.fontSize}px` }}>{sentence.english}</div>
                {sentence.chinese && (
                  <div style={{ color: 'var(--color-rock-gray)', fontSize: `${settings.uiSettings.fontSize - 2}px` }}>{sentence.chinese}</div>
                )}
                {sentence.source && (
                  <div style={{ fontSize: `${settings.uiSettings.fontSize - 4}px`, color: 'var(--color-rock-gray)', marginTop: '2px' }}>
                    来源: {sentence.source}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* 如果完全没有释义数据，显示提示 */}
        {!definitionPanel.definition ||
         (!definitionPanel.definition.authoritativeDefinitions &&
          !definitionPanel.definition.bilingualDefinitions &&
          !definitionPanel.definition.englishDefinitions &&
          !definitionPanel.definition.definitions?.basic &&
          !definitionPanel.definition.definitions?.web &&
          !definitionPanel.definition.sentences &&
          !definitionPanel.definition.wordForms) && (
          <div style={{
            padding: '16px',
            textAlign: 'center',
            color: 'var(--color-rock-gray)',
            fontStyle: 'italic'
          }}>
            释义数据加载中...
          </div>
        )}
      </div>
    </div>
  );
});

DefinitionPanel.displayName = 'DefinitionPanel';

export default DefinitionPanel;