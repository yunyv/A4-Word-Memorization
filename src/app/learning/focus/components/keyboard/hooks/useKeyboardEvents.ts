import { useCallback, useEffect } from 'react';

import { DefinitionPanel } from '../../types';

interface UseKeyboardEventsProps {
  definitionPanel: DefinitionPanel | null;
  nextWord: () => void;
  stopAutoAudio: () => void;
  setDefinitionPanel: (panel: DefinitionPanel | null) => void;
  handleExitLearning: () => void;
}

export function useKeyboardEvents({
  definitionPanel,
  nextWord,
  stopAutoAudio,
  setDefinitionPanel,
  handleExitLearning
}: UseKeyboardEventsProps) {
  // 键盘事件监听 - 空格键和ESC键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        console.log('⌨️ 空格键被按下');

        // 如果有释义面板，关闭并进入下一个单词
        if (definitionPanel) {
          console.log('📖 关闭释义面板并进入下一个单词');
          stopAutoAudio();
          setDefinitionPanel(null);
          setTimeout(() => {
            nextWord();
          }, 300);
        } else {
          // 没有释义面板时，直接进入下一个单词
          console.log('➡️ 直接进入下一个单词');
          nextWord();
        }
      } else if (event.code === 'Escape') {
        event.preventDefault();
        console.log('🚪 ESC键被按下，触发退出确认');
        // ESC键触发退出确认
        handleExitLearning();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [definitionPanel, nextWord, stopAutoAudio, setDefinitionPanel, handleExitLearning]);

  return {
    // 如果需要返回任何函数或状态，可以在这里添加
  };
}