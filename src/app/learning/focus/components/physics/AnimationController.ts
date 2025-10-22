/**
 * 动画控制器类
 * 负责管理单词卡片的动画状态和生命周期
 */
export class AnimationController {
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

    console.log('🎬 开始动画:', cardId, '当前活跃动画数:', this.activeAnimations.size);

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
      console.log('⏹️ 停止动画:', cardId, '剩余活跃动画数:', this.activeAnimations.size);
    }
  }

  /**
   * 停止所有动画
   */
  static stopAllAnimations(): void {
    const count = this.activeAnimations.size;
    this.activeAnimations.forEach((frameId) => {
      cancelAnimationFrame(frameId);
    });
    this.activeAnimations.clear();
    console.log('🛑 停止所有动画:', count, '个动画已停止');
  }

  /**
   * 检查卡片是否正在动画
   */
  static isCardAnimating(cardId: string): boolean {
    return this.activeAnimations.has(cardId);
  }

  /**
   * 获取当前活跃动画数量
   */
  static getActiveAnimationsCount(): number {
    return this.activeAnimations.size;
  }

  /**
   * 获取所有正在动画的卡片ID
   */
  static getAnimatingCardIds(): string[] {
    return Array.from(this.activeAnimations.keys());
  }
}