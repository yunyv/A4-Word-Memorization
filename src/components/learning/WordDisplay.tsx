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
  fontSize = 32,
  autoPlayAudio = false,
  onAutoPlay,
  onStopAuto
}: WordDisplayProps) {
  const [showDefinition, setShowDefinition] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayWord, setDisplayWord] = useState(wordText);
  const [displayDefinition, setDisplayDefinition] = useState(wordDefinition);
  const [displayPronunciation, setDisplayPronunciation] = useState(pronunciationData);
  const [displaySentences, setDisplaySentences] = useState(sentences);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousWordRef = useRef<string | null>(null);

  // 处理单词切换动画
  useEffect(() => {
    // 如果单词发生变化，触发过渡动画
    if (wordText && wordText !== previousWordRef.current) {
      setIsTransitioning(true);

      // 停止自动播放音频
      if (showDefinition) {
        onStopAuto?.();
      }

      // 短暂延迟后更新显示内容
      setTimeout(() => {
        setDisplayWord(wordText);
        setDisplayDefinition(wordDefinition);
        setDisplayPronunciation(pronunciationData);
        setDisplaySentences(sentences);
        setIsTransitioning(false);

        // 如果当前显示着释义，继续保持显示状态
        if (showDefinition) {
          setShowDefinition(false);
        }
      }, 150);

      previousWordRef.current = wordText;
    } else if (!isTransitioning) {
      // 如果没有过渡中，直接更新数据（用于第一次加载）
      setDisplayWord(wordText);
      setDisplayDefinition(wordDefinition);
      setDisplayPronunciation(pronunciationData);
      setDisplaySentences(sentences);
    }
  }, [wordText, wordDefinition, pronunciationData, sentences, showDefinition, isTransitioning, onStopAuto]);

  // 自动播放音频处理
  useEffect(() => {
    if (showDefinition && autoPlayAudio && displayPronunciation) {
      // 显示释义时自动播放音频
      onAutoPlay?.(displayPronunciation);
    } else if (!showDefinition) {
      // 隐藏释义时停止音频
      onStopAuto?.();
    }
  }, [showDefinition, autoPlayAudio, displayPronunciation, onAutoPlay, onStopAuto]);

  // 播放音频
  const playAudio = () => {
    if (!displayPronunciation || (!displayPronunciation.american && !displayPronunciation.british)) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    // 优先使用美式发音，如果没有则使用英式发音
    const audioUrl = displayPronunciation.american?.audioUrl || displayPronunciation.british?.audioUrl || '';
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
      // 停止自动播放音频
      onStopAuto?.();
    };
  }, [onStopAuto]);

  // 格式化音标
  const formatPhonetic = (phonetic: string) => {
    return phonetic
      .replace(/\//g, '') // 移除斜杠
      .replace(/,/g, ', '); // 在逗号后添加空格
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8">
      {/* 隐藏的音频元素 */}
      {displayPronunciation && (displayPronunciation.american || displayPronunciation.british) && (
        <audio ref={audioRef} preload="none" />
      )}

      {/* 单词显示区域 */}
      <div
        className={`cursor-pointer select-none transition-all duration-300 hover:scale-105 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        onClick={handleClick}
        style={{ fontSize: `${fontSize}px` }}
      >
        <h1 className="font-bold text-gray-900 text-center mb-4">
          {displayWord || ''}
        </h1>

        {/* 音标和发音按钮 */}
        {displayPronunciation && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-lg text-gray-600">
              [{formatPhonetic(displayPronunciation.american?.phonetic || displayPronunciation.british?.phonetic || '')}]
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
      {!isTransitioning && displayWord && (
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
      )}

      {/* 释义内容 */}
      {showDefinition && displayDefinition && (
        <div className={`w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 border transition-all duration-300 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
          {/* 基本释义 */}
          {displayDefinition.definitions && displayDefinition.definitions.basic && displayDefinition.definitions.basic.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">基本释义</h3>
              <ul className="space-y-1">
                {displayDefinition.definitions.basic.map((def: any, index: number) => (
                  <li key={index} className="text-gray-700">
                    <span className="font-medium">{def.partOfSpeech}</span> {def.meaning}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* 网络释义 */}
          {displayDefinition.definitions && displayDefinition.definitions.web && displayDefinition.definitions.web.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">网络释义</h3>
              <ul className="space-y-1">
                {displayDefinition.definitions.web.map((def: any, index: number) => (
                  <li key={index} className="text-gray-700">
                    {def.meaning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 权威英汉释义 */}
          {displayDefinition.authoritativeDefinitions && displayDefinition.authoritativeDefinitions.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">权威英汉释义</h3>
              {displayDefinition.authoritativeDefinitions.map((authDef: any, index: number) => (
                <div key={index} className="mb-3">
                  <p className="font-medium text-gray-800">{authDef.partOfSpeech}</p>
                  <ul className="space-y-1 ml-4">
                    {authDef.definitions.map((def: any, defIndex: number) => (
                      <li key={defIndex} className="text-gray-700">
                        <span className="font-medium">{def.number}. </span>
                        {def.chineseMeaning && <span>{def.chineseMeaning}</span>}
                        {def.englishMeaning && <span className="text-gray-600"> ({def.englishMeaning})</span>}
                      </li>
                    ))}
                  </ul>

                  {/* 习语 */}
                  {authDef.idioms && authDef.idioms.length > 0 && (
                    <div className="mt-2 ml-4">
                      <p className="font-medium text-gray-800">习语:</p>
                      <ul className="space-y-1">
                        {authDef.idioms.map((idiom: any, idiomIndex: number) => (
                          <li key={idiomIndex} className="text-gray-700">
                            <span className="font-medium">{idiom.number}. {idiom.title}</span> - {idiom.meaning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 英汉释义 */}
          {displayDefinition.bilingualDefinitions && displayDefinition.bilingualDefinitions.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">英汉释义</h3>
              {displayDefinition.bilingualDefinitions.map((bilDef: any, index: number) => (
                <div key={index} className="mb-3">
                  <p className="font-medium text-gray-800">{bilDef.partOfSpeech}</p>
                  <ul className="space-y-1 ml-4">
                    {bilDef.definitions.map((def: any, defIndex: number) => (
                      <li key={defIndex} className="text-gray-700">
                        <span className="font-medium">{def.number}. </span>
                        {def.meaning}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* 英英释义 */}
          {displayDefinition.englishDefinitions && displayDefinition.englishDefinitions.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">英英释义</h3>
              {displayDefinition.englishDefinitions.map((engDef: any, index: number) => (
                <div key={index} className="mb-3">
                  <p className="font-medium text-gray-800">{engDef.partOfSpeech}</p>
                  <ul className="space-y-1 ml-4">
                    {engDef.definitions.map((def: any, defIndex: number) => (
                      <li key={defIndex} className="text-gray-700">
                        <span className="font-medium">{def.number}. </span>
                        {def.meaning}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}

          {/* 词形变化 */}
          {displayDefinition.wordForms && displayDefinition.wordForms.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">词形变化</h3>
              <div className="flex flex-wrap gap-2">
                {displayDefinition.wordForms.map((form: any, index: number) => (
                  <span key={index} className="bg-gray-100 px-2 py-1 rounded text-sm">
                    {form.form}: {form.word}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 例句 */}
          {displaySentences && displaySentences.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">例句</h3>
              <ul className="space-y-3">
                {displaySentences.slice(0, 3).map((sentence: any, index: number) => (
                  <li key={index} className="text-gray-700 border-l-2 border-blue-200 pl-3">
                    <p className="italic">{sentence.english}</p>
                    {sentence.chinese && (
                      <p className="text-sm text-gray-600 mt-1">{sentence.chinese}</p>
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