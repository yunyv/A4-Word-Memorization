import { WordDefinitionData } from '@/types/learning';

// 物理属性接口
export interface CardPhysics {
  velocity: { x: number; y: number }; // 速度 (百分比/帧)
  acceleration: { x: number; y: number }; // 加速度
  mass: number; // 质量
  elasticity: number; // 弹性系数
  friction: number; // 摩擦系数
}

// 碰撞信息接口
export interface CollisionInfo {
  cardId: string;
  otherCardId: string;
  collisionPoint: { x: number; y: number };
  collisionNormal: { x: number; y: number };
  overlapDepth: number;
}

// 单词卡片接口
export interface WordCard {
  id: string;
  text: string;
  position: { x: number; y: number }; // 百分比位置
  definition?: WordDefinitionData | null;
  pronunciationData?: WordDefinitionData['pronunciationData'];
  isExpanded: boolean;
  isAnimating: boolean;
  isDragging?: boolean;
  physics?: CardPhysics; // 物理属性
  isColliding?: boolean; // 是否正在碰撞
  collisionScale?: number; // 碰撞挤压效果
}

// 释义面板接口
export interface DefinitionPanel {
  wordId: string;
  wordText: string;
  position: { x: number; y: number }; // 展开位置
  definition: WordDefinitionData | null | undefined;
  pronunciationData?: WordDefinitionData['pronunciationData'];
  isVisible: boolean;
  sourceCardPosition: { x: number; y: number }; // 源卡片位置
  isDragging?: boolean; // 是否正在拖动
}

// 速度对接口
export interface VelocityPair {
  velocity1: { x: number; y: number };
  velocity2: { x: number; y: number };
}

// 位置对接口
export interface PositionPair {
  position1: { x: number; y: number };
  position2: { x: number; y: number };
}