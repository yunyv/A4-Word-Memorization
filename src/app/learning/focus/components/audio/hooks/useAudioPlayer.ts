import { useCallback, useRef, useEffect, useState } from 'react';
import { WordDefinitionData } from '@/types/learning';

interface UseAudioPlayerProps {
  autoPlayAudio: boolean;
  hasUserInteraction: boolean;
}

export function useAudioPlayer({ autoPlayAudio, hasUserInteraction }: UseAudioPlayerProps) {
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const autoPlayAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioAbortControllerRef = useRef<AbortController | null>(null);

  // 自动播放音频函数
  const playAutoAudio = useCallback((pronunciationData: WordDefinitionData['pronunciationData'], userInteraction: boolean = false) => {
    console.log('🎵 音频播放请求:', {
      autoPlayAudio,
      hasUserInteraction,
      userInteraction,
      pronunciationData: pronunciationData ? '存在' : '不存在'
    });

    if (!autoPlayAudio || !pronunciationData) {
      console.log('❌ 音频播放被拒绝: 自动播放设置或发音数据不存在');
      return;
    }

    // 如果没有用户交互且不是直接用户交互触发，不播放音频
    if (!hasUserInteraction && !userInteraction) {
      console.log('⏳ 等待用户交互后再播放音频');
      return;
    }

    // 获取音频URL，按优先级排序
    const americanUrl = pronunciationData?.american?.audioUrl;
    const britishUrl = pronunciationData?.british?.audioUrl;

    // 验证音频URL的有效性
    const isValidUrl = (url: string | undefined): boolean => {
      return Boolean(url && url.length > 0 && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')));
    };

    // 尝试美式发音，如果无效则尝试英式发音
    let audioUrl = null;
    if (isValidUrl(americanUrl)) {
      audioUrl = americanUrl;
      console.log('🇺🇸 使用美式发音URL:', audioUrl);
    } else if (isValidUrl(britishUrl)) {
      audioUrl = britishUrl;
      console.log('🇬🇧 使用英式发音URL:', audioUrl);
    }

    if (!audioUrl) {
      console.log('❌ 未找到有效的音频URL:', {
        americanUrl,
        britishUrl,
        pronunciationData
      });
      return;
    }

    // 停止之前的音频并清理事件监听器
    if (autoPlayAudioRef.current) {
      const oldAudio = autoPlayAudioRef.current;
      console.log('⏹️ 停止之前的音频');
      oldAudio.pause();
      oldAudio.currentTime = 0;
      autoPlayAudioRef.current = null;
    }

    // 取消之前的 AbortController
    if (audioAbortControllerRef.current) {
      console.log('🚫 取消之前的音频请求');
      audioAbortControllerRef.current.abort();
    }

    try {
      setIsAudioLoading(true);
      const audio = new Audio();
      autoPlayAudioRef.current = audio;

      // 创建新的 AbortController
      const abortController = new AbortController();
      audioAbortControllerRef.current = abortController;

      // 设置音频属性
      audio.preload = 'auto';
      audio.loop = true; // 设置为循环播放，在释义面板打开期间持续播放

      // 定义事件处理函数
      const handleCanPlay = () => {
        // 检查是否已经被取消
        if (abortController.signal.aborted) return;

        console.log('✅ 音频加载完成，准备播放:', audioUrl);
        setIsAudioLoading(false);

        // 尝试播放音频
        const playPromise = audio.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              if (!abortController.signal.aborted) {
                console.log('🎉 音频播放成功');
                setIsAudioPlaying(true);
              }
            })
            .catch(error => {
              if (!abortController.signal.aborted) {
                console.error('❌ 音频播放失败:', error);
                setIsAudioPlaying(false);
                setIsAudioLoading(false);
                if (error.name === 'NotAllowedError') {
                  console.log('🚫 浏览器阻止了自动播放，需要用户交互');
                  // 如果是用户交互触发的播放，可以显示提示
                  if (userInteraction) {
                    console.log('⚠️ 即使在用户交互后也被阻止，可能需要进一步的用户操作');
                  }
                } else if (error.name === 'AbortError') {
                  console.log('⏹️ 音频播放被中断:', error);
                } else if (error.name === 'NotSupportedError') {
                  console.error('🚫 音频格式不支持:', audioUrl);
                } else {
                  console.error('❌ 音频播放发生未知错误:', error);
                }
              }
            });
        }
      };

      // 错误处理函数
      const handleError = (e: Event) => {
        // 检查是否已经被取消
        if (abortController.signal.aborted) return;

        const audioElement = e.target as HTMLAudioElement;
        const error = audioElement.error as MediaError;
        const errorCode = error?.code;
        const errorMessage = error?.message;

        console.error('❌ 音频加载失败:', {
          url: audioUrl,
          errorCode,
          errorMessage,
          networkState: audioElement.networkState,
          readyState: audioElement.readyState,
          error: error
        });

        setIsAudioPlaying(false);
        setIsAudioLoading(false);

        // 如果是美式发音失败，尝试英式发音
        if (audioUrl === americanUrl && britishUrl && isValidUrl(britishUrl)) {
          console.log('🔄 尝试使用英式发音作为备用:', britishUrl);

          // 更换音频源
          if (!abortController.signal.aborted) {
            audioElement.src = britishUrl;

            // 重新添加事件监听器
            audioElement.addEventListener('canplay', handleCanPlay, { once: true, signal: abortController.signal });
            audioElement.addEventListener('error', (e) => {
              if (!abortController.signal.aborted) {
                console.error('❌ 英式发音也加载失败:', britishUrl);
                autoPlayAudioRef.current = null;
              }
            }, { signal: abortController.signal });
          }
        } else {
          // 没有备用选项，清理音频对象
          if (!abortController.signal.aborted) {
            console.log('🗑️ 没有备用音频选项，清理音频对象');
            autoPlayAudioRef.current = null;
          }
        }
      };

      // 添加事件监听器，使用 AbortController 的 signal
      audio.addEventListener('canplay', handleCanPlay, { once: true, signal: abortController.signal });
      audio.addEventListener('error', handleError, { signal: abortController.signal });

      // 设置音频源
      audio.src = audioUrl;

      // 如果音频已经可以播放，立即尝试播放
      if (audio.readyState >= 3 && !abortController.signal.aborted) { // HAVE_FUTURE_DATA
        handleCanPlay();
      }

    } catch (error) {
      console.error('创建音频对象失败:', error);
      autoPlayAudioRef.current = null;
      setIsAudioLoading(false);
    }
  }, [autoPlayAudio, hasUserInteraction]);

  // 停止自动播放音频
  const stopAutoAudio = useCallback(() => {
    if (autoPlayAudioRef.current) {
      const audio = autoPlayAudioRef.current;

      console.log('⏹️ 停止音频播放');

      // 取消所有事件监听器
      if (audioAbortControllerRef.current) {
        console.log('🚫 取消音频事件监听器');
        audioAbortControllerRef.current.abort();
        audioAbortControllerRef.current = null;
      }

      // 停止播放
      audio.pause();
      audio.currentTime = 0;

      // 清理音频源以释放内存
      audio.src = '';
      audio.load(); // 触发加载空内容，确保完全停止

      // 清理引用和状态
      autoPlayAudioRef.current = null;
      setIsAudioPlaying(false);
      setIsAudioLoading(false);
    }
  }, []);

  // 清理音频资源
  useEffect(() => {
    return () => {
      stopAutoAudio();
      // 确保清理 AbortController
      if (audioAbortControllerRef.current) {
        audioAbortControllerRef.current.abort();
        audioAbortControllerRef.current = null;
      }
    };
  }, [stopAutoAudio]);

  return {
    isAudioPlaying,
    isAudioLoading,
    playAutoAudio,
    stopAutoAudio
  };
}