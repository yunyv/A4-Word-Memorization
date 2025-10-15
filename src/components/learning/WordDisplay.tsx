'use client';

import { useState, useEffect, useRef } from 'react';
import { WordDisplayProps } from '@/types/learning';
import { Button } from '@/components/ui/button';
import { Volume2, Eye, EyeOff } from 'lucide-react';

export function WordDisplay({ 
  wordText, 
  wordDefinition, 
  pronunciationData, 
  sentences,
  onClick, 
  fontSize = 32 
}: WordDisplayProps) {
  const [showDefinition, setShowDefinition] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 播放音频
  const playAudio = () => {
    if (!pronunciationData || (!pronunciationData.american && !pronunciationData.british)) return;
    
    if (audioRef.current) {
      audioRef.current.pause();
    }
    
    // 优先使用美式发音，如果没有则使用英式发音
    const audioUrl = pronunciationData.american?.audioUrl || pronunciationData.british?.audioUrl || '';
    if (!audioUrl) return;
    
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    
    audio.addEventListener('playing', () => setIsPlaying(true));
    audio.addEventListener('ended', () => setIsPlaying(false));
    audio.addEventListener('error', () => {
      console.error('Error playing audio');
      setIsPlaying(false);
    });
    
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    });
  };

  // 处理点击事件
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      setShowDefinition(!showDefinition);
    }
  };

  // 清理音频资源
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 格式化音标
  const formatPhonetic = (phonetic: string) => {
    return phonetic
      .replace(/\//g, '') // 移除斜杠
      .replace(/,/g, ', '); // 在逗号后添加空格
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* 隐藏的音频元素 */}
      {pronunciationData && (pronunciationData.american || pronunciationData.british) && (
        <audio ref={audioRef} preload="none" />
      )}
      
      {/* 单词显示区域 */}
      <div 
        className="cursor-pointer select-none transition-all duration-300 hover:scale-105"
        onClick={handleClick}
        style={{ fontSize: `${fontSize}px` }} // 保留这个动态样式，因为它依赖于用户设置
      >
        <h1 className="font-bold text-gray-900 text-center mb-4">
          {wordText}
        </h1>
        
        {/* 音标和发音按钮 */}
        {pronunciationData && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-lg text-gray-600">
              [{formatPhonetic(pronunciationData.american?.phonetic || pronunciationData.british?.phonetic || '')}]
            </span>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                playAudio();
              }}
              disabled={isPlaying}
              className="p-1 h-8 w-8"
            >
              <Volume2 className={`h-4 w-4 ${isPlaying ? 'animate-pulse' : ''}`} />
            </Button>
          </div>
        )}
      </div>
      
      {/* 释义显示/隐藏切换按钮 */}
      <Button
        variant="outline"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setShowDefinition(!showDefinition);
        }}
        className="mb-4 flex items-center gap-2"
      >
        {showDefinition ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {showDefinition ? '隐藏释义' : '显示释义'}
      </Button>
      
      {/* 释义内容 */}
      {showDefinition && wordDefinition && (
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 border">
          {/* 基本释义 */}
          {wordDefinition.basicDefinition && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">基本释义</h3>
              <p className="text-gray-700">{wordDefinition.basicDefinition}</p>
            </div>
          )}
          
          {/* 权威英汉释义 */}
          {wordDefinition.authoritativeDefinitions && wordDefinition.authoritativeDefinitions.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">权威英汉释义</h3>
              <ul className="space-y-1">
                {wordDefinition.authoritativeDefinitions.map((def: any, index: number) => (
                  <li key={index} className="text-gray-700">
                    <span className="font-medium">{index + 1}. </span>
                    {def.definition}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* 英汉释义 */}
          {wordDefinition.bilingualDefinitions && wordDefinition.bilingualDefinitions.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">英汉释义</h3>
              <ul className="space-y-1">
                {wordDefinition.bilingualDefinitions.map((def: any, index: number) => (
                  <li key={index} className="text-gray-700">
                    <span className="font-medium">{index + 1}. </span>
                    {def.definition}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* 英英释义 */}
          {wordDefinition.englishDefinitions && wordDefinition.englishDefinitions.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">英英释义</h3>
              <ul className="space-y-1">
                {wordDefinition.englishDefinitions.map((def: any, index: number) => (
                  <li key={index} className="text-gray-700">
                    <span className="font-medium">{index + 1}. </span>
                    {def.definition}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* 例句 */}
          {sentences && sentences.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">例句</h3>
              <ul className="space-y-2">
                {sentences.slice(0, 3).map((sentence: any, index: number) => (
                  <li key={index} className="text-gray-700">
                    <p className="italic">{sentence.sentence}</p>
                    {sentence.translation && (
                      <p className="text-sm text-gray-600 mt-1">{sentence.translation}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* 提示文字 */}
      {!showDefinition && (
        <p className="text-sm text-gray-500 mt-4">点击单词或"显示释义"按钮查看释义</p>
      )}
    </div>
  );
}