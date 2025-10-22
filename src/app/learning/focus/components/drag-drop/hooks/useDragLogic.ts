import { useCallback, useEffect, useState } from 'react';
import { WordCard, DefinitionPanel } from '../../types';
import { CollisionEngine } from '../../physics';

interface UseDragLogicProps {
  wordCards: WordCard[];
  setWordCards: React.Dispatch<React.SetStateAction<WordCard[]>>;
  definitionPanel: DefinitionPanel | null;
  setDefinitionPanel: (panel: DefinitionPanel | null) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  checkPositionInBounds: (position: { x: number; y: number }) => { x: number; y: number };
  checkCollisionWithOtherCards: (cardId: string, position: { x: number; y: number }) => boolean;
  handleCollisions: (cards: WordCard[]) => WordCard[];
  calculateDragVelocity: (cardId: string, newPosition: { x: number; y: number }) => { x: number; y: number };
  setCollisionDetected: (detected: boolean) => void;
}

export function useDragLogic({
  wordCards,
  setWordCards,
  definitionPanel,
  setDefinitionPanel,
  containerRef,
  checkPositionInBounds,
  checkCollisionWithOtherCards,
  handleCollisions,
  calculateDragVelocity,
  setCollisionDetected
}: UseDragLogicProps) {
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [draggedPanel, setDraggedPanel] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // 处理鼠标按下事件（开始拖动）
  const handleMouseDown = useCallback((e: React.MouseEvent, cardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const card = wordCards.find(c => c.id === cardId);
    if (!card) {
      console.log('❌ 未找到卡片:', cardId);
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    
    if (!containerRect) {
      console.log('❌ 容器不存在');
      return;
    }
    
    // 计算鼠标相对于卡片中心的偏移量（百分比）
    const cardCenterX = ((rect.left + rect.width / 2) - containerRect.left) / containerRect.width * 100;
    const cardCenterY = ((rect.top + rect.height / 2) - containerRect.top) / containerRect.height * 100;
    const mouseX = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const mouseY = ((e.clientY - containerRect.top) / containerRect.height) * 100;
    
    const offset = {
      x: mouseX - cardCenterX,
      y: mouseY - cardCenterY
    };
    
    console.log('🖱️ 开始拖拽卡片:', {
      cardId,
      原始位置: card.position,
      鼠标位置: { x: mouseX, y: mouseY },
      卡片中心: { x: cardCenterX, y: cardCenterY },
      偏移量: offset
    });
    
    setDragOffset(offset);
    setDraggedCard(cardId);
    setCollisionDetected(false);
    
    // 设置卡片为拖动状态
    setWordCards(prev =>
      prev.map(card =>
        card.id === cardId ? { ...card, isDragging: true } : card
      )
    );
  }, [wordCards, containerRef, setWordCards, setCollisionDetected]);

  // 处理释义面板鼠标按下事件（开始拖动）
  const handlePanelMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!definitionPanel || !containerRef.current) {
      console.log('❌ 释义面板或容器不存在');
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // 计算鼠标相对于面板中心的偏移量（百分比）
    const panelCenterX = ((rect.left + rect.width / 2) - containerRect.left) / containerRect.width * 100;
    const panelCenterY = ((rect.top + rect.height / 2) - containerRect.top) / containerRect.height * 100;
    const mouseX = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const mouseY = ((e.clientY - containerRect.top) / containerRect.height) * 100;
    
    const offset = {
      x: mouseX - panelCenterX,
      y: mouseY - panelCenterY
    };
    
    console.log('🖱️ 开始拖拽释义面板:', {
      原始位置: definitionPanel.position,
      鼠标位置: { x: mouseX, y: mouseY },
      面板中心: { x: panelCenterX, y: panelCenterY },
      偏移量: offset
    });
    
    setDragOffset(offset);
    setDraggedPanel(true);
    
    // 设置面板为拖动状态
    setDefinitionPanel({
      ...definitionPanel,
      isDragging: true
    });
  }, [definitionPanel, containerRef, setDefinitionPanel]);

  // 处理鼠标移动事件（拖动中）
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();

    // 计算鼠标位置（百分比）
    const mouseX = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const mouseY = ((e.clientY - containerRect.top) / containerRect.height) * 100;

    if (draggedCard) {
      // 处理单词卡片拖动
      // 计算新位置（考虑偏移量）
      const newPosition = {
        x: mouseX - dragOffset.x,
        y: mouseY - dragOffset.y
      };

      // 检查边界
      const boundedPosition = checkPositionInBounds(newPosition);

      // 检查碰撞
      const hasCollision = checkCollisionWithOtherCards(draggedCard, boundedPosition);
      setCollisionDetected(hasCollision);

      if (hasCollision) {
        console.log('💥 拖拽时检测到碰撞:', draggedCard);
      }

      // 更新拖拽中的卡片位置
      setWordCards(prev => {
        const updatedCards = prev.map(card =>
          card.id === draggedCard ? { ...card, position: boundedPosition } : card
        );

        // 如果有碰撞，触发碰撞处理
        if (hasCollision) {
          return handleCollisions(updatedCards);
        }

        return updatedCards;
      });
    } else if (draggedPanel && definitionPanel) {
      // 处理释义面板拖动
      // 计算新位置（考虑偏移量）
      const newPosition = {
        x: mouseX - dragOffset.x,
        y: mouseY - dragOffset.y
      };

      // 面板边界检查（面板较大，需要特殊处理）
      const panelWidthPercent = 50; // 面板宽度百分比
      const panelHeightPercent = 70; // 面板高度百分比

      const boundedX = Math.max(panelWidthPercent / 2, Math.min(100 - panelWidthPercent / 2, newPosition.x));
      const boundedY = Math.max(panelHeightPercent / 2, Math.min(100 - panelHeightPercent / 2, newPosition.y));

      const boundedPosition = { x: boundedX, y: boundedY };

      // 更新面板位置
      setDefinitionPanel({
        ...definitionPanel,
        position: boundedPosition
      });
    }
  }, [draggedCard, draggedPanel, definitionPanel, dragOffset, containerRef, checkPositionInBounds, checkCollisionWithOtherCards, handleCollisions, setWordCards, setDefinitionPanel, setCollisionDetected]);

  // 处理鼠标释放事件（结束拖动）
  const handleMouseUp = useCallback(() => {
    if (draggedCard) {
      // 获取拖拽卡片
      const draggedCardObj = wordCards.find(c => c.id === draggedCard);

      if (draggedCardObj) {
        // 计算拖拽释放时的惯性速度
        const velocity = calculateDragVelocity(draggedCard, draggedCardObj.position);

        console.log('🏁 结束拖拽卡片:', {
          cardId: draggedCard,
          最终位置: draggedCardObj.position,
          惯性速度: velocity,
          会有惯性: Math.abs(velocity.x) > 0.1 || Math.abs(velocity.y) > 0.1
        });

        // 应用惯性速度到卡片
        setWordCards(prev =>
          prev.map(card => {
            if (card.id === draggedCard) {
              const physics = card.physics || CollisionEngine.createDefaultPhysics();
              return {
                ...card,
                isDragging: false,
                physics: { ...physics, velocity },
                isColliding: Math.abs(velocity.x) > 0.1 || Math.abs(velocity.y) > 0.1
              };
            }
            return card;
          })
        );
      }

      setDraggedCard(null);
      setCollisionDetected(false);
    }

    if (draggedPanel && definitionPanel) {
      // 移除面板拖动状态
      setDefinitionPanel({
        ...definitionPanel,
        isDragging: false
      });

      setDraggedPanel(false);
    }
  }, [draggedCard, draggedPanel, definitionPanel, wordCards, calculateDragVelocity, setWordCards, setDefinitionPanel, setCollisionDetected]);

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (draggedCard || draggedPanel) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedCard, draggedPanel, handleMouseMove, handleMouseUp]);

  return {
    draggedCard,
    draggedPanel,
    dragOffset,
    handleMouseDown,
    handlePanelMouseDown
  };
}