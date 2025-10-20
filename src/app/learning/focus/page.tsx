'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useLearning } from '@/hooks/useLearning';
import { useDefinitionSettings } from '@/hooks/useDefinitionSettings';
import { Button } from '@/components/ui/button';
import { Settings, Maximize2, Volume2, Shuffle } from 'lucide-react';
import { authFetch } from '@/hooks/useAuth';
import { DefinitionSettingsButton } from '@/components/learning/DefinitionSettingsButton';
import { DefinitionSettingsModal } from '@/components/learning/DefinitionSettingsModal';


// 物理属性接口
interface CardPhysics {
  velocity: { x: number; y: number }; // 速度 (百分比/帧)
  acceleration: { x: number; y: number }; // 加速度
  mass: number; // 质量
  elasticity: number; // 弹性系数
  friction: number; // 摩擦系数
}

// 碰撞信息接口
interface CollisionInfo {
  cardId: string;
  otherCardId: string;
  collisionPoint: { x: number; y: number };
  collisionNormal: { x: number; y: number };
  overlapDepth: number;
}

// 单词卡片接口
interface WordCard {
  id: string;
  text: string;
  position: { x: number; y: number }; // 百分比位置
  definition?: any;
  pronunciationData?: any;
  isExpanded: boolean;
  isAnimating: boolean;
  isDragging?: boolean;
  physics?: CardPhysics; // 物理属性
  isColliding?: boolean; // 是否正在碰撞
  collisionScale?: number; // 碰撞挤压效果
}

// 释义面板接口
interface DefinitionPanel {
  wordId: string;
  wordText: string;
  position: { x: number; y: number }; // 展开位置
  definition: any;
  pronunciationData?: any;
  isVisible: boolean;
  sourceCardPosition: { x: number; y: number }; // 源卡片位置
  isDragging?: boolean; // 是否正在拖动
}

// 碰撞检测引擎类
class CollisionEngine {
  private static readonly DEFAULT_ELASTICITY = 0.7; // 默认弹性系数
  private static readonly DEFAULT_FRICTION = 0.95; // 默认摩擦系数
  private static readonly DEFAULT_MASS = 1.0; // 默认质量
  private static readonly MIN_VELOCITY = 0.01; // 最小速度阈值
  private static readonly COLLISION_THRESHOLD = 0.1; // 碰撞阈值（百分比）

  /**
   * 创建默认的物理属性
   */
  static createDefaultPhysics(): CardPhysics {
    return {
      velocity: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: this.DEFAULT_MASS,
      elasticity: this.DEFAULT_ELASTICITY,
      friction: this.DEFAULT_FRICTION
    };
  }

  /**
   * 检测两个卡片是否碰撞
   */
  static detectCollision(
    card1: WordCard,
    card2: WordCard,
    cardWidth: number,
    cardHeight: number
  ): CollisionInfo | null {
    const dx = card2.position.x - card1.position.x;
    const dy = card2.position.y - card1.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 使用卡片的对角线作为碰撞半径
    const collisionRadius = Math.sqrt(cardWidth * cardWidth + cardHeight * cardHeight) / 2;
    const minDistance = collisionRadius * 2;

    if (distance < minDistance && distance > 0) {
      // 计算碰撞法向量
      const normalX = dx / distance;
      const normalY = dy / distance;

      // 计算重叠深度
      const overlapDepth = minDistance - distance;

      // 计算碰撞点
      const collisionPoint = {
        x: card1.position.x + normalX * (collisionRadius + overlapDepth / 2),
        y: card1.position.y + normalY * (collisionRadius + overlapDepth / 2)
      };

      return {
        cardId: card1.id,
        otherCardId: card2.id,
        collisionPoint,
        collisionNormal: { x: normalX, y: normalY },
        overlapDepth
      };
    }

    return null;
  }

  /**
   * 计算碰撞响应（弹开效果）
   */
  static calculateCollisionResponse(
    collision: CollisionInfo,
    card1: WordCard,
    card2: WordCard,
    cardWidth: number,
    cardHeight: number
  ): { velocity1: { x: number; y: number }, velocity2: { x: number; y: number } } {
    const physics1 = card1.physics || this.createDefaultPhysics();
    const physics2 = card2.physics || this.createDefaultPhysics();

    // 获取当前速度，如果没有则为零
    const v1 = { ...physics1.velocity };
    const v2 = { ...physics2.velocity };

    // 计算相对速度
    const relativeVelocity = {
      x: v1.x - v2.x,
      y: v1.y - v2.y
    };

    // 计算碰撞法向量方向的相对速度
    const velocityAlongNormal = relativeVelocity.x * collision.collisionNormal.x +
                               relativeVelocity.y * collision.collisionNormal.y;

    // 如果物体正在分离，不处理碰撞
    if (velocityAlongNormal > 0) {
      return { velocity1: v1, velocity2: v2 };
    }

    // 计算弹性系数（取两个卡片的平均值）
    const restitution = (physics1.elasticity + physics2.elasticity) / 2;

    // 计算冲量标量
    const impulseScalar = -(1 + restitution) * velocityAlongNormal;
    const impulseScalarX = impulseScalar * collision.collisionNormal.x;
    const impulseScalarY = impulseScalar * collision.collisionNormal.y;

    // 计算新的速度
    const totalMass = physics1.mass + physics2.mass;
    const velocity1 = {
      x: v1.x + (impulseScalarX * physics2.mass) / totalMass,
      y: v1.y + (impulseScalarY * physics2.mass) / totalMass
    };

    const velocity2 = {
      x: v2.x - (impulseScalarX * physics1.mass) / totalMass,
      y: v2.y - (impulseScalarY * physics1.mass) / totalMass
    };

    return { velocity1, velocity2 };
  }

  /**
   * 更新卡片物理状态
   */
  static updatePhysics(
    card: WordCard,
    deltaTime: number = 1
  ): WordCard {
    const physics = card.physics || this.createDefaultPhysics();

    // 更新速度（考虑加速度）
    const newVelocity = {
      x: (physics.velocity.x + physics.acceleration.x * deltaTime) * physics.friction,
      y: (physics.velocity.y + physics.acceleration.y * deltaTime) * physics.friction
    };

    // 如果速度太小，停止运动
    if (Math.abs(newVelocity.x) < this.MIN_VELOCITY) {
      newVelocity.x = 0;
    }
    if (Math.abs(newVelocity.y) < this.MIN_VELOCITY) {
      newVelocity.y = 0;
    }

    // 更新位置
    const newPosition = {
      x: card.position.x + newVelocity.x * deltaTime,
      y: card.position.y + newVelocity.y * deltaTime
    };

    // 更新物理属性
    const newPhysics = {
      ...physics,
      velocity: newVelocity,
      acceleration: { x: 0, y: 0 } // 重置加速度
    };

    return {
      ...card,
      position: newPosition,
      physics: newPhysics,
      isColliding: Math.abs(newVelocity.x) > this.MIN_VELOCITY || Math.abs(newVelocity.y) > this.MIN_VELOCITY
    };
  }

  /**
   * 应用推力到卡片
   */
  static applyImpulse(
    card: WordCard,
    impulse: { x: number; y: number }
  ): WordCard {
    const physics = card.physics || this.createDefaultPhysics();

    const newVelocity = {
      x: physics.velocity.x + impulse.x / physics.mass,
      y: physics.velocity.y + impulse.y / physics.mass
    };

    const newPhysics = {
      ...physics,
      velocity: newVelocity
    };

    return {
      ...card,
      physics: newPhysics,
      isColliding: true
    };
  }

  /**
   * 计算避免重叠的位置
   */
  static resolveOverlap(
    collision: CollisionInfo,
    card1: WordCard,
    card2: WordCard
  ): { position1: { x: number; y: number }, position2: { x: number; y: number } } {
    const separationDistance = collision.overlapDepth / 2;

    const position1 = {
      x: card1.position.x - collision.collisionNormal.x * separationDistance,
      y: card1.position.y - collision.collisionNormal.y * separationDistance
    };

    const position2 = {
      x: card2.position.x + collision.collisionNormal.x * separationDistance,
      y: card2.position.y + collision.collisionNormal.y * separationDistance
    };

    return { position1, position2 };
  }
}

// 动画控制器类
class AnimationController {
  private static activeAnimations = new Map<string, number>();

  /**
   * 开始卡片动画
   */
  static startCardAnimation(
    cardId: string,
    updateCallback: () => void,
    stopCondition: () => boolean = () => false
  ): void {
    // 停止已有的动画
    this.stopCardAnimation(cardId);

    const animate = () => {
      updateCallback();

      // 检查是否应该停止动画
      if (stopCondition()) {
        this.stopCardAnimation(cardId);
        return;
      }

      // 继续动画
      const frameId = requestAnimationFrame(animate);
      this.activeAnimations.set(cardId, frameId);
    };

    // 开始动画
    const frameId = requestAnimationFrame(animate);
    this.activeAnimations.set(cardId, frameId);
  }

  /**
   * 停止卡片动画
   */
  static stopCardAnimation(cardId: string): void {
    const frameId = this.activeAnimations.get(cardId);
    if (frameId) {
      cancelAnimationFrame(frameId);
      this.activeAnimations.delete(cardId);
    }
  }

  /**
   * 停止所有动画
   */
  static stopAllAnimations(): void {
    this.activeAnimations.forEach((frameId) => {
      cancelAnimationFrame(frameId);
    });
    this.activeAnimations.clear();
  }

  /**
   * 检查卡片是否正在动画
   */
  static isCardAnimating(cardId: string): boolean {
    return this.activeAnimations.has(cardId);
  }
}

export default function FocusLearningPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { userState } = useAuth();
  const {
    learningState,
    isLoading,
    error,
    startLearningSession,
    nextWord,
    endLearningSession
  } = useLearning();
  
  const {
    settings,
    isLoading: settingsLoading,
    toggleDefinitionType,
    reorderTypes,
    updateUI,
    reset
  } = useDefinitionSettings();
  
  const [wordCards, setWordCards] = useState<WordCard[]>([]);
  const [definitionPanel, setDefinitionPanel] = useState<DefinitionPanel | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // 设置释义面板
  const setDefinitionPanelWithLogging = useCallback((newPanel: DefinitionPanel | null) => {
    setDefinitionPanel(newPanel);
  }, [definitionPanel]);
  const [sessionMode, setSessionMode] = useState<'new' | 'review' | 'test' | null>(null);
  const [wordlistId, setWordlistId] = useState<number | undefined>(undefined);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [draggedPanel, setDraggedPanel] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [collisionDetected, setCollisionDetected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算卡片尺寸百分比
  const getCardDimensions = useCallback(() => {
    const cardWidthPx = settings.uiSettings.cardSize;
    const cardHeightPx = 48; // 固定高度
    const containerWidth = 1200; // 假设容器宽度
    const containerHeight = 700; // 假设容器高度
    
    return {
      widthPercent: (cardWidthPx / containerWidth) * 100,
      heightPercent: (cardHeightPx / containerHeight) * 100
    };
  }, [settings.uiSettings.cardSize]);

  // 生成不重叠的随机位置
  const generateRandomPosition = useCallback((existingCards: WordCard[]): { x: number; y: number } => {
    const margin = 5; // 边距百分比
    const { widthPercent, heightPercent } = getCardDimensions();
    const maxAttempts = 50;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = margin + Math.random() * (100 - margin - widthPercent);
      const y = margin + Math.random() * (100 - margin - heightPercent);
      
      // 检查是否与现有卡片重叠 - 减小判定范围
      const hasOverlap = existingCards.some(card => {
        const dx = Math.abs(card.position.x - x);
        const dy = Math.abs(card.position.y - y);
        return dx < (widthPercent - 1) && dy < (heightPercent - 1); // 减小重叠判定范围
      });
      
      if (!hasOverlap) {
        return { x, y };
      }
    }
    
    // 如果找不到不重叠的位置，返回一个随机位置
    return {
      x: margin + Math.random() * (100 - margin - widthPercent),
      y: margin + Math.random() * (100 - margin - heightPercent)
    };
  }, []);

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
  }, []);

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
  }, [handleCollisions, updatePhysics, wordCards]);

  // 处理鼠标按下事件（开始拖动）
  const handleMouseDown = useCallback((e: React.MouseEvent, cardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const card = wordCards.find(c => c.id === cardId);
    if (!card) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current?.getBoundingClientRect();
    
    if (!containerRect) return;
    
    // 计算鼠标相对于卡片中心的偏移量（百分比）
    const cardCenterX = ((rect.left + rect.width / 2) - containerRect.left) / containerRect.width * 100;
    const cardCenterY = ((rect.top + rect.height / 2) - containerRect.top) / containerRect.height * 100;
    const mouseX = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const mouseY = ((e.clientY - containerRect.top) / containerRect.height) * 100;
    
    setDragOffset({
      x: mouseX - cardCenterX,
      y: mouseY - cardCenterY
    });
    
    setDraggedCard(cardId);
    setCollisionDetected(false);
    
    // 设置卡片为拖动状态
    setWordCards(prev =>
      prev.map(card =>
        card.id === cardId ? { ...card, isDragging: true } : card
      )
    );
  }, [wordCards]);

  // 处理释义面板鼠标按下事件（开始拖动）
  const handlePanelMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!definitionPanel || !containerRef.current) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // 计算鼠标相对于面板中心的偏移量（百分比）
    const panelCenterX = ((rect.left + rect.width / 2) - containerRect.left) / containerRect.width * 100;
    const panelCenterY = ((rect.top + rect.height / 2) - containerRect.top) / containerRect.height * 100;
    const mouseX = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    const mouseY = ((e.clientY - containerRect.top) / containerRect.height) * 100;
    
    setDragOffset({
      x: mouseX - panelCenterX,
      y: mouseY - panelCenterY
    });
    
    setDraggedPanel(true);
    
    // 设置面板为拖动状态
    setDefinitionPanelWithLogging({
      ...definitionPanel,
      isDragging: true
    });
  }, [definitionPanel, setDefinitionPanelWithLogging]);

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
      setDefinitionPanelWithLogging({
        ...definitionPanel,
        position: boundedPosition
      });
    }
  }, [draggedCard, draggedPanel, definitionPanel, dragOffset, checkPositionInBounds, checkCollisionWithOtherCards, handleCollisions, setDefinitionPanelWithLogging]);

  // 处理鼠标释放事件（结束拖动）
  const handleMouseUp = useCallback(() => {
    if (draggedCard) {
      // 获取拖拽卡片
      const draggedCardObj = wordCards.find(c => c.id === draggedCard);

      if (draggedCardObj) {
        // 计算拖拽释放时的惯性速度
        const velocity = calculateDragVelocity(draggedCard, draggedCardObj.position);

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

        // 如果有惯性速度，开始物理动画
        if (Math.abs(velocity.x) > 0.1 || Math.abs(velocity.y) > 0.1) {
          AnimationController.startCardAnimation(
            draggedCard,
            () => {
              setWordCards(prev => {
                const updated = handleCollisions(prev);
                return updatePhysics(updated);
              });
            },
            () => {
              // 当所有卡片都停止运动时停止动画
              const cards = wordCards.find(c => c.id === draggedCard);
              return !cards?.isColliding && (!cards?.physics ||
                (Math.abs(cards.physics.velocity.x) < 0.01 && Math.abs(cards.physics.velocity.y) < 0.01));
            }
          );
        }
      }

      setDraggedCard(null);
      setCollisionDetected(false);
    }

    if (draggedPanel && definitionPanel) {
      // 移除面板拖动状态
      setDefinitionPanelWithLogging({
        ...definitionPanel,
        isDragging: false
      });

      setDraggedPanel(false);
    }
  }, [draggedCard, draggedPanel, definitionPanel, setDefinitionPanelWithLogging, wordCards, calculateDragVelocity, handleCollisions, updatePhysics]);

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

  // 添加新单词卡片
  const addNewWordCard = useCallback((wordText: string, definition?: any, pronunciationData?: any) => {
    const position = generateRandomPosition(wordCards);
    const newCard: WordCard = {
      id: `word-${Date.now()}-${Math.random()}`,
      text: wordText,
      position,
      definition,
      pronunciationData,
      isExpanded: false,
      isAnimating: true,
      physics: CollisionEngine.createDefaultPhysics(), // 添加物理属性
      isColliding: false,
      collisionScale: 1
    };

    setWordCards(prev => [...prev, newCard]);

    // 动画结束后移除动画标记
    setTimeout(() => {
      setWordCards(prev =>
        prev.map(card =>
          card.id === newCard.id ? { ...card, isAnimating: false } : card
        )
      );
    }, 200);
  }, [wordCards, generateRandomPosition]);

  // 如果用户未认证，重定向到令牌页面
  useEffect(() => {
    if (userState.status === 'idle' || (userState.status === 'error' && !userState.isAuthenticated)) {
      router.push('/token');
    }
  }, [userState.status, userState.isAuthenticated, router]);

  // 初始化学习会话
  useEffect(() => {
    const mode = searchParams.get('mode') as 'new' | 'review' | 'test' | null;
    const wlId = searchParams.get('wordlistId');
    
    if (mode && userState.isAuthenticated) {
      setSessionMode(mode);
      if (wlId) {
        setWordlistId(parseInt(wlId));
      }
      
      // 开始学习会话
      startLearningSession(mode, wlId ? parseInt(wlId) : undefined);
    }
  }, [searchParams, userState.isAuthenticated, startLearningSession]);

  // 当有新单词时，添加到卡片列表
  useEffect(() => {
    if (learningState.currentWordText && !isTransitioning) {
      // 检查是否已经添加过这个单词
      const wordAlreadyAdded = wordCards.some(card => card.text === learningState.currentWordText);
      
      if (!wordAlreadyAdded) {
        // 直接使用已有的单词数据，不再调用API
        addNewWordCard(
          learningState.currentWordText!,
          learningState.currentWordData,
          learningState.currentWordData?.pronunciationData
        );
      }
    }
  }, [learningState.currentWordText, isTransitioning, wordCards, addNewWordCard]);

  // 当单词数据加载完成后，更新对应的卡片
  useEffect(() => {
    if (learningState.currentWordData && learningState.currentWordText) {
      setWordCards(prev =>
        prev.map(card =>
          card.text === learningState.currentWordText
            ? {
                ...card,
                definition: learningState.currentWordData,
                pronunciationData: learningState.currentWordData.pronunciationData
              }
            : card
        )
      );
    }
  }, [learningState.currentWordData, learningState.currentWordText]);

  // 处理单词卡片点击
  const handleWordCardClick = useCallback((cardId: string, event?: React.MouseEvent) => {
    const card = wordCards.find(c => c.id === cardId);
    if (!card || isTransitioning) {
      return;
    }

    // 如果有展开的释义面板，先关闭
    if (definitionPanel && definitionPanel.wordId !== cardId) {
      setDefinitionPanelWithLogging(null);
      return;
    }

    // 如果点击的是已展开的卡片，关闭释义面板
    if (definitionPanel && definitionPanel.wordId === cardId) {
      setDefinitionPanelWithLogging(null);
      return;
    }

    // 展开释义面板
    const newDefinitionPanel = {
      wordId: cardId,
      wordText: card.text,
      position: card.position,
      definition: card.definition,
      pronunciationData: card.pronunciationData,
      isVisible: true,
      sourceCardPosition: card.position
    };

    setDefinitionPanelWithLogging(newDefinitionPanel);
  }, [wordCards, definitionPanel, isTransitioning]);

  // 处理点击外部区域
  const handleOutsideClick = useCallback((event: MouseEvent) => {
    if (!containerRef.current || !containerRef.current.contains(event.target as Node)) {
      return;
    }

    // 检查点击的是否是释义面板或单词卡片
    const target = event.target as HTMLElement;
    const isClickOnCard = target.closest('.word-card');
    const isClickOnPanel = target.closest('.definition-panel');
    const isClickOnControls = target.closest('.corner-controls');

    // 添加更多检查，确保不会误关闭释义面板
    const panelElement = document.querySelector('.definition-panel');
    const isClickInsidePanel = panelElement && panelElement.contains(target);

    if (!isClickOnCard && !isClickOnPanel && !isClickOnControls && !isClickInsidePanel && definitionPanel) {
      // 关闭释义面板并添加新单词
      setDefinitionPanelWithLogging(null);

      // 移动到下一个单词
      setTimeout(() => {
        nextWord();
      }, 300);
    }
  }, [definitionPanel, nextWord]);

  // 添加点击外部事件监听
  useEffect(() => {
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [handleOutsideClick]);

  // 键盘事件监听 - 只允许使用空格键
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();

        // 如果有释义面板，关闭并进入下一个单词
        if (definitionPanel) {
          setDefinitionPanelWithLogging(null);
          setTimeout(() => {
            nextWord();
          }, 300);
        } else {
          // 没有释义面板时，直接进入下一个单词
          nextWord();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [definitionPanel, nextWord]);

  // 处理返回仪表盘
  const handleBackToDashboard = () => {
    endLearningSession();
    router.push('/dashboard');
  };

  // 处理设置
  const handleSettings = () => {
    router.push('/settings');
  };

  // 处理全屏
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // 处理设置面板
  const handleOpenSettings = () => {
    setIsSettingsModalOpen(true);
  };

  // 打乱单词卡片位置
  const shuffleWordCards = useCallback(() => {
    setWordCards(prev => {
      const shuffled = [...prev];
      const newCards = [];

      // 为每个卡片生成新的不重叠随机位置
      for (let i = 0; i < shuffled.length; i++) {
        const card = shuffled[i];
        // 创建临时数组，包含当前卡片和其他已重新定位的卡片
        const newPosition = generateRandomPosition(newCards);

        newCards.push({
          ...card,
          position: newPosition,
          isAnimating: true // 添加动画标记
        });
      }

      return newCards;
    });

    // 300ms后移除动画标记
    setTimeout(() => {
      setWordCards(prev =>
        prev.map(card => ({ ...card, isAnimating: false }))
      );
    }, 300);
  }, [generateRandomPosition]);

  const handleCloseSettings = () => {
    setIsSettingsModalOpen(false);
  };

  // 根据设置渲染释义内容
  const renderDefinitionContent = (definition: any) => {
    const enabledTypes = settings.definitionTypes.filter(type => type.enabled).sort((a, b) => a.order - b.order);
    
    return enabledTypes.map(type => {
      switch (type.id) {
        case 'authoritative':
          return definition?.authoritativeDefinitions && definition.authoritativeDefinitions.length > 0 ? (
            <div key="authoritative" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: `${settings.uiSettings.fontSize}px`, fontWeight: '600', color: 'var(--color-ink-black)', marginBottom: '8px' }}>权威英汉释义</div>
              {definition.authoritativeDefinitions.map((authDef: any, index: number) => (
                <div key={index} style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--color-focus-blue)' }}>{authDef.partOfSpeech}</div>
                  {authDef.definitions.map((defItem: any, defIndex: number) => (
                    <div key={defIndex} style={{ marginLeft: '16px', marginBottom: '8px' }}>
                      <span style={{ fontWeight: '500' }}>{defItem.number}.</span>
                      <span style={{ marginLeft: '4px' }}>{defItem.chineseMeaning}</span>
                      {defItem.englishMeaning && (
                        <span style={{ marginLeft: '4px', color: 'var(--color-rock-gray)' }}>({defItem.englishMeaning})</span>
                      )}
                      {defItem.examples && defItem.examples.length > 0 && (
                        <div style={{ marginTop: '4px', marginLeft: '16px' }}>
                          {defItem.examples.map((example: any, exIndex: number) => (
                            <div key={exIndex} style={{ fontStyle: 'italic', fontSize: `${settings.uiSettings.fontSize - 2}px`, color: 'var(--color-rock-gray)', marginBottom: '4px' }}>
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
                      <div style={{ fontWeight: '500', marginBottom: '4px', color: 'var(--color-focus-blue)' }}>习语:</div>
                      {authDef.idioms.map((idiom: any, idiomIndex: number) => (
                        <div key={idiomIndex} style={{ marginBottom: '6px' }}>
                          <span style={{ fontWeight: '500' }}>{idiom.number}. {idiom.title}</span> - {idiom.meaning}
                          {idiom.examples && idiom.examples.length > 0 && (
                            <div style={{ marginTop: '4px', marginLeft: '16px' }}>
                              {idiom.examples.map((example: any, exIndex: number) => (
                                <div key={exIndex} style={{ fontStyle: 'italic', fontSize: `${settings.uiSettings.fontSize - 2}px`, color: 'var(--color-rock-gray)', marginBottom: '4px' }}>
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
              <div style={{ fontSize: `${settings.uiSettings.fontSize}px`, fontWeight: '600', color: 'var(--color-ink-black)', marginBottom: '8px' }}>英汉释义</div>
              {definition.bilingualDefinitions.map((bilDef: any, index: number) => (
                <div key={index} style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--color-focus-blue)' }}>{bilDef.partOfSpeech}</div>
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
              <div style={{ fontSize: `${settings.uiSettings.fontSize}px`, fontWeight: '600', color: 'var(--color-ink-black)', marginBottom: '8px' }}>英英释义</div>
              {definition.englishDefinitions.map((engDef: any, index: number) => (
                <div key={index} style={{ marginBottom: '12px' }}>
                  <div style={{ fontWeight: '600', marginBottom: '4px', color: 'var(--color-focus-blue)' }}>{engDef.partOfSpeech}</div>
                  {engDef.definitions.map((defItem: any, defIndex: number) => (
                    <div key={defIndex} style={{ marginLeft: '16px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: '500' }}>{defItem.number}.</span> {defItem.meaning}
                      {defItem.linkedWords && defItem.linkedWords.length > 0 && (
                        <div style={{ marginTop: '2px', marginLeft: '16px', fontSize: `${settings.uiSettings.fontSize - 2}px`, color: 'var(--color-rock-gray)' }}>
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
              <div style={{ fontSize: `${settings.uiSettings.fontSize}px`, fontWeight: '600', color: 'var(--color-ink-black)', marginBottom: '8px' }}>基本释义</div>
              {definition.definitions.basic.map((def: any, index: number) => (
                <div key={index} style={{ marginBottom: '8px' }}>
                  <span style={{ fontWeight: '600', color: 'var(--color-focus-blue)' }}>{def.partOfSpeech}</span> {def.meaning}
                </div>
              ))}
            </div>
          ) : null;

        case 'web':
          return definition?.definitions?.web && definition.definitions.web.length > 0 ? (
            <div key="web" style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: `${settings.uiSettings.fontSize}px`, fontWeight: '600', color: 'var(--color-ink-black)', marginBottom: '8px' }}>网络释义</div>
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

  // 如果正在加载或未认证，显示加载状态
  if (userState.status === 'loading' || !userState.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-papyrus-white)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-focus-blue)' }}></div>
          <p className="mt-4" style={{ color: 'var(--color-rock-gray)' }}>正在加载...</p>
        </div>
      </div>
    );
  }

  // 如果正在初始化或出错
  if (isLoading || error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-papyrus-white)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-focus-blue)' }}></div>
          <p className="mt-4" style={{ color: 'var(--color-rock-gray)' }}>
            {error || '正在准备学习内容...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="focus-learning-container"
      style={{ 
        backgroundColor: 'var(--color-papyrus-white)',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* 单词卡片 */}
      {wordCards.map(card => (
        <div
          key={card.id}
          className={`word-card ${card.isAnimating ? 'word-card-appearing' : ''} ${definitionPanel?.wordId === card.id ? 'word-card-expanded' : ''} ${card.isDragging ? 'word-card-dragging' : ''} ${card.isColliding ? 'word-card-colliding' : ''}`}
          style={{
            position: 'absolute',
            left: `${card.position.x}%`,
            top: `${card.position.y}%`,
            width: `${settings.uiSettings.cardSize}px`,
            height: '48px',
            backgroundColor: 'var(--color-pure-white)',
            border: card.isDragging ? '2px solid var(--color-focus-blue)' :
                   (card.isColliding ? '2px solid #FF6B6B' :
                   (definitionPanel?.wordId === card.id ? '2px solid var(--color-focus-blue)' : '1px solid #E2E8F0')),
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: card.isDragging ? 'move' : 'pointer',
            fontSize: `${settings.uiSettings.fontSize - 2}px`,
            fontWeight: '600',
            color: 'var(--color-ink-black)',
            fontFamily: "'Inter', 'Source Han Sans CN', sans-serif",
            boxShadow: card.isDragging ? '0 12px 24px rgba(0, 0, 0, 0.2)' :
                      (card.isColliding ? '0 6px 12px rgba(255, 107, 107, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.05)'),
            transition: card.isDragging || card.isColliding ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: card.isDragging ? 25 : (card.isColliding ? 20 : (definitionPanel?.wordId === card.id ? 15 : 10)),
            opacity: card.isAnimating ? 0 : (card.isDragging ? 0.8 : 1),
            transform: `translate(-50%, -50%) ${card.isAnimating ? 'scale(0.8)' : 'scale(1)'} ${card.isDragging ? 'scale(1.05)' : ''} ${card.collisionScale ? `scale(${card.collisionScale})` : ''}`,
            userSelect: 'none',
            willChange: card.isDragging || card.isColliding ? 'transform, box-shadow' : 'auto'
          }}
          onMouseDown={(e) => handleMouseDown(e, card.id)}
          onClick={(e) => {
            e.stopPropagation();
            if (!card.isDragging) {
              handleWordCardClick(card.id, e);
            }
          }}
        >
          {card.text}
          
          {/* 拖动指示器 */}
          <div style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            opacity: 0.6,
            pointerEvents: 'none'
          }}>
            <div style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-rock-gray)'
            }} />
            <div style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-rock-gray)'
            }} />
          </div>
        </div>
      ))}
      
      {/* 碰撞指示器 */}
      {collisionDetected && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(255, 107, 107, 0.9)',
          color: 'white',
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '500',
          zIndex: 30,
          pointerEvents: 'none'
        }}>
          禁止放置：单词不能重叠
        </div>
      )}
      
      {/* 释义面板 */}
      {definitionPanel && (
        <div
          className="definition-panel"
          onClick={(e) => {
            e.stopPropagation();
          }} // 防止点击事件冒泡
          onMouseDown={(e) => {
            e.stopPropagation();
            handlePanelMouseDown(e);
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
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  // 播放音频
                  const audioUrl = definitionPanel.pronunciationData?.american?.audioUrl ||
                                  definitionPanel.pronunciationData?.british?.audioUrl;
                  if (audioUrl) {
                    const audio = new Audio(audioUrl);
                    audio.play().catch(error => {
                      console.error('播放音频失败:', error);
                    });
                  }
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
                  {definitionPanel.definition.wordForms.map((form: any, index: number) => (
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
                {definitionPanel.definition.sentences.slice(0, 5).map((sentence: any, index: number) => (
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
      )}
      
      
      {/* 角落控件 */}
      <div className="corner-controls" style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        gap: '12px',
        zIndex: 30
      }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={shuffleWordCards}
          title="打乱单词位置"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--color-rock-gray)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Shuffle className="h-5 w-5" />
        </Button>

        <DefinitionSettingsButton onClick={handleOpenSettings} />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleFullscreen}
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--color-rock-gray)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Maximize2 className="h-5 w-5" />
        </Button>
      </div>
      
      {/* 释义设置模态框 */}
      <DefinitionSettingsModal
        isOpen={isSettingsModalOpen}
        settings={settings}
        onClose={handleCloseSettings}
        onToggleDefinitionType={toggleDefinitionType}
        onReorderDefinitionTypes={reorderTypes}
        onUpdateUISettings={updateUI}
        onReset={reset}
      />
      
      {/* 添加动画样式 */}
      <style jsx>{`
        @keyframes definitionPanelExpand {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
            visibility: hidden;
          }
          1% {
            visibility: visible;
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
            visibility: visible;
          }
        }
        
        .definition-panel {
          /* 确保释义面板始终可见，不会被动画影响 */
          animation-fill-mode: forwards !important;
          /* 防止动画结束后元素消失 */
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        .word-card:hover:not(.word-card-dragging) {
          transform: translate(-50%, -50%) translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          border-color: var(--color-focus-blue);
        }
        
        .word-card-dragging {
          cursor: move !important;
        }
        
        .word-card-appearing {
          animation: wordCardAppear 0.2s ease-out forwards;
        }

        .word-card-colliding {
          animation: collisionBounce 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }

        .word-card-ripple {
          animation: rippleEffect 0.6s ease-out;
        }

        @keyframes wordCardAppear {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.8);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes collisionBounce {
          0% {
            transform: translate(-50%, -50%) scale(1);
          }
          30% {
            transform: translate(-50%, -50%) scale(0.85);
          }
          60% {
            transform: translate(-50%, -50%) scale(1.1);
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes rippleEffect {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(255, 107, 107, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 107, 107, 0);
          }
        }
      `}</style>
    </div>
  );
}