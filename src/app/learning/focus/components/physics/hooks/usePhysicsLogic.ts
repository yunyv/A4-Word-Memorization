import { useCallback } from 'react';
import { CollisionEngine, AnimationController } from '../index';
import { WordCard, CollisionInfo } from '../../types';

interface UsePhysicsLogicProps {
  wordCards: WordCard[];
  setWordCards: React.Dispatch<React.SetStateAction<WordCard[]>>;
  getCardDimensions: () => { widthPercent: number; heightPercent: number };
}

export function usePhysicsLogic({
  wordCards,
  setWordCards,
  getCardDimensions
}: UsePhysicsLogicProps) {
  // 检测所有碰撞对
  const detectAllCollisions = useCallback((cards: WordCard[]): CollisionInfo[] => {
    const { widthPercent, heightPercent } = getCardDimensions();
    const collisions: CollisionInfo[] = [];

    // 检查所有卡片对
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        const collision = CollisionEngine.detectCollision(
          cards[i],
          cards[j],
          widthPercent,
          heightPercent
        );

        if (collision) {
          collisions.push(collision);
          console.log('🔴 检测到碰撞:', {
            card1: cards[i].id,
            card2: cards[j].id,
            overlapDepth: collision.overlapDepth,
            collisionPoint: collision.collisionPoint
          });
        }
      }
    }

    return collisions;
  }, [getCardDimensions]);

  // 处理碰撞响应
  const handleCollisions = useCallback((cards: WordCard[]): WordCard[] => {
    let updatedCards = [...cards];
    const collisions = detectAllCollisions(updatedCards);

    if (collisions.length === 0) {
      return updatedCards;
    }

    // 处理每个碰撞
    collisions.forEach(collision => {
      const card1 = updatedCards.find(c => c.id === collision.cardId);
      const card2 = updatedCards.find(c => c.id === collision.otherCardId);

      if (!card1 || !card2) return;

      const { widthPercent, heightPercent } = getCardDimensions();

      // 计算碰撞响应速度
      const { velocity1, velocity2 } = CollisionEngine.calculateCollisionResponse(
        collision,
        card1,
        card2,
        widthPercent,
        heightPercent
      );

      // 解决重叠
      const { position1, position2 } = CollisionEngine.resolveOverlap(collision, card1, card2);

      // 更新卡片1
      updatedCards = updatedCards.map(card => {
        if (card.id === card1.id) {
          const physics = card.physics || CollisionEngine.createDefaultPhysics();
          return {
            ...card,
            position: position1,
            physics: { ...physics, velocity: velocity1 },
            isColliding: true,
            collisionScale: 0.85 // 挤压效果
          };
        }
        return card;
      });

      // 更新卡片2
      updatedCards = updatedCards.map(card => {
        if (card.id === card2.id) {
          const physics = card.physics || CollisionEngine.createDefaultPhysics();
          return {
            ...card,
            position: position2,
            physics: { ...physics, velocity: velocity2 },
            isColliding: true,
            collisionScale: 0.85 // 挤压效果
          };
        }
        return card;
      });
    });

    return updatedCards;
  }, [detectAllCollisions, getCardDimensions]);

  // 检查位置是否在屏幕边界内
  const checkPositionInBounds = useCallback((position: { x: number; y: number }): { x: number; y: number } => {
    const margin = 5; // 边距百分比
    const { widthPercent, heightPercent } = getCardDimensions();

    const boundedX = Math.max(margin, Math.min(100 - margin - widthPercent, position.x));
    const boundedY = Math.max(margin, Math.min(100 - margin - heightPercent, position.y));

    // 记录边界调整
    if (position.x !== boundedX || position.y !== boundedY) {
      console.log('📍 边界调整:', {
        原始位置: { x: position.x, y: position.y },
        调整后位置: { x: boundedX, y: boundedY },
        卡片尺寸: { widthPercent, heightPercent }
      });
    }

    return { x: boundedX, y: boundedY };
  }, [getCardDimensions]);

  // 检查卡片是否与其他卡片重叠
  const checkCollisionWithOtherCards = useCallback((cardId: string, position: { x: number; y: number }): boolean => {
    const { widthPercent, heightPercent } = getCardDimensions();

    return wordCards.some(card => {
      if (card.id === cardId) return false;
      const dx = Math.abs(position.x - card.position.x);
      const dy = Math.abs(position.y - card.position.y);
      return dx < (widthPercent - 1) && dy < (heightPercent - 1);
    });
  }, [wordCards, getCardDimensions]);

  // 更新所有卡片的物理状态
  const updatePhysics = useCallback((cards: WordCard[]): WordCard[] => {
    return cards.map(card => {
      if (card.isDragging) {
        // 拖拽中的卡片不更新物理状态
        return { ...card, isColliding: false, collisionScale: 1 };
      }

      let updatedCard = CollisionEngine.updatePhysics(card, 0.5);

      // 如果卡片还在运动，检查边界
      if (updatedCard.isColliding) {
        const boundedPosition = checkPositionInBounds(updatedCard.position);
        updatedCard = { ...updatedCard, position: boundedPosition };
      }

      // 恢复缩放
      if (updatedCard.collisionScale !== undefined && updatedCard.collisionScale < 1) {
        updatedCard.collisionScale = Math.min(1, updatedCard.collisionScale + 0.05);
      }

      // 如果速度很小，停止碰撞状态
      const physics = updatedCard.physics;
      if (physics && Math.abs(physics.velocity.x) < 0.01 && Math.abs(physics.velocity.y) < 0.01) {
        console.log('⏹️ 卡片停止运动:', card.id);
        return {
          ...updatedCard,
          physics: { ...physics, velocity: { x: 0, y: 0 } },
          isColliding: false,
          collisionScale: 1
        };
      }

      return updatedCard;
    });
  }, [checkPositionInBounds]);

  // 计算拖拽释放时的速度（用于惯性效果）
  const calculateDragVelocity = useCallback((cardId: string, newPosition: { x: number; y: number }): { x: number; y: number } => {
    const card = wordCards.find(c => c.id === cardId);
    if (!card) return { x: 0, y: 0 };

    // 计算速度（基于位置变化）
    const velocity = {
      x: (newPosition.x - card.position.x) * 0.3,
      y: (newPosition.y - card.position.y) * 0.3
    };

    // 限制最大速度
    const maxSpeed = 5;
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    if (speed > maxSpeed) {
      return {
        x: (velocity.x / speed) * maxSpeed,
        y: (velocity.y / speed) * maxSpeed
      };
    }

    return velocity;
  }, [wordCards]);

  // 创建碰撞涟漪效果（扩散到附近的卡片）
  const createCollisionRipple = useCallback((centerCard: WordCard, impactForce: number) => {
    setWordCards(prev => {
      return prev.map(card => {
        if (card.id === centerCard.id) return card;

        const dx = card.position.x - centerCard.position.x;
        const dy = card.position.y - centerCard.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 影响范围内的卡片受到推力
        const affectRadius = 15; // 影响半径（百分比）
        if (distance < affectRadius && distance > 0) {
          const force = impactForce * (1 - distance / affectRadius) * 0.5; // 随距离衰减
          const directionX = dx / distance;
          const directionY = dy / distance;

          const physics = card.physics || CollisionEngine.createDefaultPhysics();
          const newVelocity = {
            x: physics.velocity.x + directionX * force,
            y: physics.velocity.y + directionY * force
          };

          return {
            ...card,
            physics: { ...physics, velocity: newVelocity },
            isColliding: true,
            collisionScale: 0.95
          };
        }

        return card;
      });
    });
  }, [setWordCards]);

  // 应用推力到卡片（用于拖拽释放时的弹开效果）
  const applyCollisionImpulse = useCallback((cardId: string, force: { x: number; y: number }) => {
    setWordCards(prev => {
      return prev.map(card => {
        if (card.id === cardId) {
          const impulse = {
            x: force.x * 2, // 放大推力
            y: force.y * 2
          };
          return CollisionEngine.applyImpulse(card, impulse);
        }
        return card;
      });
    });

    // 开始物理动画
    AnimationController.startCardAnimation(
      cardId,
      () => {
        setWordCards(prev => {
          const updated = handleCollisions(prev);
          return updatePhysics(updated);
        });
      },
      () => {
        // 当所有卡片都停止运动时停止动画
        const cards = wordCards.find(c => c.id === cardId);
        return !cards?.isColliding && (!cards?.physics ||
          (Math.abs(cards.physics.velocity.x) < 0.01 && Math.abs(cards.physics.velocity.y) < 0.01));
      }
    );
  }, [handleCollisions, updatePhysics, wordCards, setWordCards]);

  return {
    detectAllCollisions,
    handleCollisions,
    checkPositionInBounds,
    checkCollisionWithOtherCards,
    updatePhysics,
    calculateDragVelocity,
    createCollisionRipple,
    applyCollisionImpulse
  };
}