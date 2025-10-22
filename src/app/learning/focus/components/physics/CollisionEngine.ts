import { CardPhysics, CollisionInfo, WordCard, VelocityPair, PositionPair } from '../types';

/**
 * 碰撞检测引擎类
 * 负责处理单词卡片之间的物理碰撞检测和响应计算
 */
export class CollisionEngine {
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
    _cardWidth: number,
    _cardHeight: number
  ): VelocityPair {
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

    console.log('💥 碰撞响应计算:', {
      卡片1: card1.id,
      卡片2: card2.id,
      原始速度1: v1,
      原始速度2: v2,
      新速度1: velocity1,
      新速度2: velocity2,
      弹性系数: restitution,
      冲量: { x: impulseScalarX, y: impulseScalarY }
    });

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

    const isColliding = Math.abs(newVelocity.x) > this.MIN_VELOCITY || Math.abs(newVelocity.y) > this.MIN_VELOCITY;

    if (isColliding) {
      console.log('🔄 物理状态更新:', {
        卡片: card.id,
        原始位置: card.position,
        新位置: newPosition,
        速度: newVelocity,
        摩擦系数: physics.friction
      });
    }

    return {
      ...card,
      position: newPosition,
      physics: newPhysics,
      isColliding
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
  ): PositionPair {
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