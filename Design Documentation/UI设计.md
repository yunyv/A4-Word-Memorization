## **UI/UX 设计规范文档: "A4 Recite"**

- **文档版本:** V1.0
- **设计目标:** 27 英寸 4K 显示器, Chrome/Edge/Safari 浏览器
- **设计师:** [UI/UX Designer]

### **1. 设计原则与风格指南 (已确认)**

- **核心气质:** 专注、高效、精密、纯粹、宁静、可靠。
- **色彩体系:**
  - 主色 (专注蓝): `#4A69E2`
  - 背景 (纸莎白): `#F8F5F1`
  - 卡片 (纯白): `#FFFFFF`
  - 主文字 (墨黑): `#1A202C`
  - 次文字 (岩灰): `#718096`
- **字体排印:**
  - 西文/数字: `Inter`
  - 中文: `Source Han Sans CN`
- **核心交互:** 键盘优先 (PC), 触控友好 (iPad)。

---

### **2. 页面设计详述**

#### **2.1. 令牌认证页 (Token Authentication Page)**

**页面目标:** 提供一个极致简约、无摩擦的身份入口。在 4K 屏幕上，这种极简主义将营造出一种高级、宁静的“启动仪式感”。

**高保真设计稿 (SVG):**

```svg
<svg width="1200" height="700" viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg" style="background-color: #F8F5F1; font-family: 'Inter', 'Source Han Sans CN', sans-serif;">

  <!-- Main Content Block -->
  <g transform="translate(400, 250)">
    <!-- Main Title -->
    <text x="200" y="0" font-size="36" font-weight="600" text-anchor="middle" fill="#1A202C">欢迎使用 A4 Recite</text>

    <!-- Subtitle -->
    <text x="200" y="40" font-size="18" text-anchor="middle" fill="#718096">创建或输入您的同步令牌，开始专注之旅。</text>

    <!-- Input Field -->
    <g transform="translate(0, 80)">
      <rect x="0" y="0" width="400" height="56" rx="10" ry="10" fill="#FFFFFF" stroke="#A0AEC0" stroke-width="1.5"/>
      <text x="20" y="36" font-size="16" fill="#A0AEC0">例如: yunyv-gre-mastery-2025</text>
    </g>

    <!-- Submit Button -->
    <g transform="translate(170, 160)" cursor="pointer">
      <rect x="0" y="0" width="60" height="60" rx="30" ry="30" fill="#4A69E2"/>
      <path d="M 25 30 H 45 M 38 23 L 45 30 L 38 37" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
  </g>

  <!-- Footer Text -->
  <text x="600" y="650" font-size="14" text-anchor="middle" fill="#718096">令牌是您唯一的钥匙，它将同步所有数据至云端，无需账户。</text>
</svg>
```

**设计详解 (4K 优化):**

1.  **空间感:** 在 4K 屏幕上，内容区域居中，四周留有大量“呼吸空间”，强化了“专注”的核心理念。
2.  **尺寸与触感:** 输入框和按钮的尺寸都已增大，不仅在视觉上更和谐，也为可能的触控操作（如在 Surface 设备上）提供了更好的体验。按钮从矩形改为圆形，更具现代感和亲和力。
3.  **字体层级:** 标题、副标题、占位符、说明文字之间的字号和颜色对比清晰，引导用户视线自然流动。

**交互细节:**

- **输入框:** 点击时，边框变为 `#4A69E2` (专注蓝)，内部占位符文字消失。
- **按钮:**
  - **悬浮 (Hover):** 背景色变为 `#3A5BFF` (高亮蓝)，并有轻微放大效果 (`transform: scale(1.05)`), 提供明确的视觉反馈。
  - **点击:** 有一个微小的下沉效果 (`transform: scale(0.98)`), 确认操作触发。
- **键盘:** 支持按 `Enter` 键触发提交。

---

#### **2.2. 主仪表盘 (Main Dashboard)**

**页面目标:** 用户的指挥中心。在 4K 屏幕上，Bento 网格布局可以更舒展，信息密度恰到好处，既能一览无余，又不会感到压迫。

**高保真设计稿 (SVG):**

```svg
<svg width="1200" height="700" viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg" style="background-color: #F8F5F1; font-family: 'Inter', 'Source Han Sans CN', sans-serif;">

  <!-- Header -->
  <g transform="translate(80, 60)">
    <text font-size="32" font-weight="600" fill="#1A202C">主仪表盘</text>
    <g transform="translate(900, -10)" cursor="pointer">
      <rect width="140" height="40" rx="20" ry="20" fill="#FFFFFF" stroke="#E2E8F0"/>
      <circle cx="20" cy="20" r="8" fill="#4A69E2"/>
      <text x="38" y="26" font-size="14" fill="#1A202C" font-weight="500">yunyv-gre-mastery</text>
    </g>
  </g>

  <!-- Bento Grid -->
  <g transform="translate(80, 140)">
    <!-- Module 1: Smart Review -->
    <g id="smart-review" cursor="pointer">
      <rect width="480" height="240" rx="20" ry="20" fill="#1A202C"/>
      <text x="40" y="50" font-size="22" font-weight="600" fill="#FFFFFF">智能复习</text>
      <text x="40" y="160" font-size="96" font-weight="700" fill="#4A69E2">25</text>
      <text x="160" y="155" font-size="24" fill="#E2E8F0" font-weight="500">个单词</text>
      <text x="40" y="200" font-size="16" fill="#A0AEC0">今日待复习</text>
    </g>

    <!-- Module 2: My Wordlists -->
    <g id="wordlists" transform="translate(520, 0)">
      <rect width="560" height="500" rx="20" ry="20" fill="#FFFFFF"/>
      <text x="40" y="50" font-size="22" font-weight="600" fill="#1A202C">我的词书</text>
      <g id="upload-btn" cursor="pointer" transform="translate(460, 32)">
        <rect width="60" height="36" rx="18" ry="18" fill="#F8F5F1"/>
        <text x="30" y="25" font-size="24" fill="#1A202C" text-anchor="middle" font-weight="300">+</text>
      </g>

      <!-- Wordlist Items -->
      <g transform="translate(40, 90)">
        <rect width="480" height="1" fill="#E2E8F0"/>
        <text x="0" y="40" font-size="18" fill="#1A202C">GRE核心3000</text>
        <g class="action-btn" transform="translate(300, 24)" cursor="pointer"><rect width="80" height="32" rx="16" ry="16" fill="#F8F5F1"/><text x="40" y="22" font-size="14" fill="#1A202C" text-anchor="middle">学习</text></g>
        <g class="action-btn" transform="translate(390, 24)" cursor="pointer"><rect width="80" height="32" rx="16" ry="16" fill="#F8F5F1"/><text x="40" y="22" font-size="14" fill="#1A202C" text-anchor="middle">测试</text></g>
      </g>
      <g transform="translate(40, 155)">
        <rect width="480" height="1" fill="#E2E8F0"/>
        <text x="0" y="40" font-size="18" fill="#1A202C">经济学人高频词</text>
        <g class="action-btn" transform="translate(300, 24)" cursor="pointer"><rect width="80" height="32" rx="16" ry="16" fill="#F8F5F1"/><text x="40" y="22" font-size="14" fill="#1A202C" text-anchor="middle">学习</text></g>
        <g class="action-btn" transform="translate(390, 24)" cursor="pointer"><rect width="80" height="32" rx="16" ry="16" fill="#F8F5F1"/><text x="40" y="22" font-size="14" fill="#1A202C" text-anchor="middle">测试</text></g>
      </g>
    </g>
  </g>
</svg>
```

**设计详解 (4K 优化):**

1.  **布局优化:** 采用了更宽的 2 列布局。左侧的“智能复习”模块使用深色背景 (`#1A202C` 墨黑)，与主色蓝搭配，形成强烈的视觉吸引力，使其成为用户的首要视觉焦点。
2.  **信息层级:** 待复习数字 `25` 被放大到 `96px`，视觉冲击力极强。词书列表中的字体大小和间距也相应增加，保证了在远距离观看时的可读性。
3.  **精致感:** 组件圆角统一为 `20px` (大模块) 和 `16px` (按钮)，视觉上更柔和、现代。按钮使用了与背景色接近的 `#F8F5F1`，营造出一种“雕刻”在卡片上的精致感。

**交互细节:**

- **智能复习模块:** 整个卡片可点击。悬浮时，卡片有轻微上浮效果 (`box-shadow` 变深, `transform: translateY(-8px)`), 箭头图标会在右下角浮现，指示可点击。
- **词书操作按钮:** 悬浮时，背景色变为 `#E2E8F0` (浅灰)，文字颜色变为 `#4A69E2` (专注蓝)。
- **上传按钮 (+):** 悬浮时有旋转动画 (`transform: rotate(90deg)`).

---

#### **2.3. 专注学习/复习页 (Focus Learning/Review Page)**

**页面目标:** 模拟A4纸上的背单词体验，提供沉浸式的随机单词学习环境。单词像便利贴一样随机分布在屏幕上，支持拖动调整位置，点击展开释义，创造自然的学习节奏。

**高保真设计稿 (SVG):**

```svg
<svg width="1200" height="700" viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg" style="background-color: #F8F5F1; font-family: 'Inter', 'Source Han Sans CN', sans-serif;">

  <!-- Word Cards (Randomly Distributed) -->
  <!-- Small word cards that have been clicked - some with drag handles -->
  <g class="word-card" transform="translate(150, 120)" cursor="pointer">
    <rect width="140" height="48" rx="10" ry="10" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
    <text x="70" y="31" text-anchor="middle" font-size="16" font-weight="600" fill="#1A202C">paucity</text>
    <!-- Drag handle indicator -->
    <circle cx="125" cy="24" r="3" fill="#A0AEC0" opacity="0.6"/>
    <circle cx="125" cy="32" r="3" fill="#A0AEC0" opacity="0.6"/>
  </g>
  
  <!-- Dragging state example -->
  <g class="word-card dragging" transform="translate(850, 200)" cursor="move" opacity="0.8">
    <rect width="140" height="48" rx="10" ry="10" fill="#FFFFFF" stroke="#4A69E2" stroke-width="2" style="filter: drop-shadow(0 8px 16px rgba(0,0,0,0.15));"/>
    <text x="70" y="31" text-anchor="middle" font-size="16" font-weight="600" fill="#1A202C">garrulous</text>
  </g>
  
  <g class="word-card" transform="translate(320, 450)" cursor="pointer">
    <rect width="140" height="48" rx="10" ry="10" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="1"/>
    <text x="70" y="31" text-anchor="middle" font-size="16" font-weight="600" fill="#1A202C">alacrity</text>
    <circle cx="125" cy="24" r="3" fill="#A0AEC0" opacity="0.6"/>
    <circle cx="125" cy="32" r="3" fill="#A0AEC0" opacity="0.6"/>
  </g>

  <!-- Expanded Definition Panel (from clicked word) -->
  <g id="definition-panel" transform="translate(600, 250)">
    <rect x="-200" y="0" width="400" height="280" rx="16" ry="16" fill="#FFFFFF" style="filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1));"/>
    
    <!-- Word Title -->
    <text x="0" y="35" text-anchor="middle" font-size="24" font-weight="700" fill="#1A202C">serendipity</text>
    
    <!-- Pronunciation -->
    <g transform="translate(-170, 60)">
      <text font-size="18" font-weight="500" fill="#1A202C">/ˌserənˈdɪpəti/</text>
      <circle cx="320" cy="-5" r="10" fill="#F8F5F1" stroke="#718096" stroke-width="1"/>
      <path d="M315 -5 L317 -8 L319 -5 L317 -2 Z" fill="#718096" stroke="none"/>
      <path d="M322 -8 L325 -5 L322 -2" stroke="#718096" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    
    <rect x="-170" y="85" width="340" height="1" fill="#E2E8F0"/>
    
    <!-- Enhanced Definition Content -->
    <foreignObject x="-170" y="100" width="340" height="160">
      <body xmlns="http://www.w3.org/1999/xhtml" style="margin:0; font-family: 'Source Han Sans CN'; font-size: 16px; color: #1A202C; line-height: 1.8;">
        <div style="margin-bottom: 12px;">
          <b>n.</b> (意外发现或发明新事物的) 运气，机缘巧合
        </div>
        <div style="color: #718096; margin-bottom: 12px;">
          The occurrence and development of events by chance in a happy or beneficial way.
        </div>
        <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
          <div style="font-size: 14px; color: #718096; margin-bottom: 8px;">例句：</div>
          <div style="font-style: italic; color: #1A202C;">
            The discovery of penicillin was a happy serendipity that saved millions of lives.
          </div>
          <div style="color: #718096; margin-top: 4px;">
            青霉素的发现是一个幸运的意外，拯救了数百万人的生命。
          </div>
        </div>
      </body>
    </foreignObject>
  </g>

  <!-- New Word Card (just appeared) -->
  <g class="word-card" transform="translate(900, 480)" cursor="pointer" style="opacity: 0.9;">
    <rect width="140" height="48" rx="10" ry="10" fill="#FFFFFF" stroke="#4A69E2" stroke-width="2"/>
    <text x="70" y="31" text-anchor="middle" font-size="16" font-weight="600" fill="#1A202C">prosaic</text>
  </g>

  <!-- Collision indication -->
  <g class="collision-indicator" transform="translate(500, 300)" opacity="0.8">
    <rect x="-70" y="-24" width="140" height="48" rx="10" ry="10" fill="none" stroke="#FF6B6B" stroke-width="2" stroke-dasharray="5,5"/>
    <text x="0" y="5" text-anchor="middle" font-size="14" fill="#FF6B6B">禁止放置</text>
  </g>

  <!-- Bottom Controls & Hint -->
  <text x="600" y="660" font-size="16" fill="#A0AEC0" text-anchor="middle">拖动单词调整位置，点击单词查看释义，点击外部区域继续</text>
  <g id="controls" transform="translate(1100, 640)" cursor="pointer" fill="none" stroke="#A0AEC0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
    <circle cx="45" cy="12" r="2.5" transform="translate(20, -1)" fill="#A0AEC0" stroke="none"/>
    <path d="M45 4.5A7.5 7.5 0 0 1 52.5 12 M37.5 12A7.5 7.5 0 0 1 45 19.5 M45 19.5A7.5 7.5 0 0 1 37.5 12 M52.5 12A7.5 7.5 0 0 1 45 4.5" transform="translate(20, -1)"/>
  </g>
</svg>
```

**设计详解 (A4纸模拟体验 - 增强版):**

1.  **单词卡片设计:**
    - 小卡片尺寸：140px × 48px，圆角10px
    - 背景：纯白色，边框：浅灰色 (#E2E8F0)
    - 字体：16px，字体粗细：600，颜色：墨黑色 (#1A202C)
    - 悬浮效果：轻微上浮 (translateY(-2px))，边框变为专注蓝 (#4A69E2)
    - **拖动指示器**：右上角显示两个小圆点，表示可拖动区域

2.  **释义面板设计:**
    - 展开尺寸：400px × 280px（增加高度以容纳更多内容），圆角16px
    - 背景：纯白色，阴影：drop-shadow(0 10px 15px rgba(0,0,0,0.1))
    - 从被点击的单词卡片位置展开，动画流畅自然
    - **增强内容显示**：完整显示单词、音标、释义、例句（中英文对照）

3.  **拖动功能设计:**
    - **拖动状态**：拖动时卡片半透明，边框变为专注蓝，阴影加深
    - **碰撞检测**：拖动到其他卡片位置时显示红色虚线边框和"禁止放置"提示
    - **边界限制**：卡片不能完全移出屏幕，保留最小可见区域
    - **磁性吸附**：释放时卡片自动吸附到合适位置

4.  **随机分布算法:**
    - 单词卡片在屏幕上随机分布，避免重叠
    - 考虑屏幕边距，确保所有卡片完全可见
    - 新单词在空白区域出现，创造自然的视觉流动

**交互细节:**

- **拖动单词卡片:**
  - 按住卡片可拖动调整位置
  - 拖动时有视觉反馈（半透明、边框变色、阴影加深）
  - 碰撞检测防止重叠，有明确的禁止提示
  - 释放时自动吸附到合适位置

- **点击单词卡片:** 释义面板从被点击的卡片位置展开，动画时长300ms，使用cubic-bezier缓动

- **点击释义面板外部:** 释义面板收缩回原位置，同时在新的随机位置出现新单词卡片

- **键盘交互:** ESC键关闭释义面板，空格键关闭释义面板并出现新单词

- **动画效果:** 所有交互都有流畅的过渡动画，提升用户体验的精致感

- **多单词共存:** 屏幕上可以同时存在多个已点击的小单词卡片和一个当前展开的释义面板

**技术实现要点:**

1. **拖动实现:**
   - 使用 `transform: translate()` 进行位置更新，提升性能
   - 节流鼠标移动事件，避免过度渲染
   - 实时碰撞检测算法，确保卡片不重叠

2. **数据解析优化:**
   - 完善JSON数据解析逻辑
   - 支持多种数据格式和结构
   - 优雅的错误处理和降级显示

3. **性能优化:**
   - 使用CSS `will-change` 属性优化动画性能
   - 合理的状态管理，避免不必要的重渲染
   - 懒加载释义数据，提升初始加载速度

---

#### **2.4. 全览测试页 (All-View Test Page)**

**页面目标:** 数字化“A4 纸”，在 4K 屏幕上，我们可以展示更多的单词卡片，更真实地模拟“在一大张纸上寻找单词”的体验。

**高保真设计稿 (SVG):**

```svg
<svg width="1200" height="700" viewBox="0 0 1200 700" xmlns="http://www.w3.org/2000/svg" style="background-color: #F8F5F1; font-family: 'Inter', 'Source Han Sans CN', sans-serif;">

  <!-- Header -->
  <g transform="translate(80, 60)">
    <text font-size="28" font-weight="600" fill="#1A202C">全览测试: <tspan font-weight="400">GRE核心3000</tspan></text>
  </g>

  <!-- Main Controls -->
  <g id="shuffle-btn" cursor="pointer" transform="translate(950, 45)">
     <rect width="170" height="48" rx="24" ry="24" fill="#4A69E2"/>
     <text x="85" y="31" font-size="16" font-weight="600" fill="#FFFFFF" text-anchor="middle">随机打乱 (Shuffle)</text>
  </g>

  <!-- Word Cards Area -->
  <g id="word-cards-area" transform="translate(80, 140)">
    <!-- A few example cards, randomly placed -->
    <g class="word-card" transform="translate(50, 40)" cursor="pointer"><rect width="140" height="48" rx="10" ry="10" fill="#FFFFFF"/><text x="70" y="31" text-anchor="middle" font-size="16" fill="#1A202C">paucity</text></g>
    <g class="word-card" transform="translate(220, 100)" cursor="pointer"><rect width="140" height="48" rx="10" ry="10" fill="#FFFFFF"/><text x="70" y="31" text-anchor="middle" font-size="16" fill="#1A202C">garrulous</text></g>
    <g class="word-card" transform="translate(800, 80)" cursor="pointer"><rect width="140" height="48" rx="10" ry="10" fill="#FFFFFF"/><text x="70" y="31" text-anchor="middle" font-size="16" fill="#1A202C">taciturn</text></g>
    <g class="word-card" transform="translate(100, 300)" cursor="pointer"><rect width="140" height="48" rx="10" ry="10" fill="#FFFFFF"/><text x="70" y="31" text-anchor="middle" font-size="16" fill="#1A202C">alacrity</text></g>

    <!-- An Expanded/Clicked Word Card -->
    <g class="word-card-expanded" transform="translate(400, 150)">
      <rect width="320" height="200" rx="16" ry="16" fill="#FFFFFF" style="filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1));"/>
      <text x="160" y="40" text-anchor="middle" font-size="24" font-weight="600" fill="#1A202C">laconic</text>
      <rect x="30" y="65" width="260" height="1" fill="#E2E8F0"/>
      <foreignObject x="35" y="80" width="250" height="100">
        <body xmlns="http://www.w3.org/1999/xhtml" style="margin:0; font-family: 'Source Han Sans CN'; font-size: 15px; color: #1A202C; line-height: 1.7;">
          <b>adj.</b> (指言语、写作风格) 简洁的，言简意赅的
          <br/>
          <span style="color: #718096;">using very few words.</span>
        </body>
      </foreignObject>
    </g>
    <g class="word-card" transform="translate(900, 450)" cursor="pointer"><rect width="140" height="48" rx="10" ry="10" fill="#FFFFFF"/><text x="70" y="31" text-anchor="middle" font-size="16" fill="#1A202C">prosaic</text></g>
    <g class="word-card" transform="translate(650, 480)" cursor="pointer"><rect width="140" height="48" rx="10" ry="10" fill="#FFFFFF"/><text x="70" y="31" text-anchor="middle" font-size="16" fill="#1A202C">veracity</text></g>
  </g>
</svg>
```

**设计详解 (4K 优化):**

1.  **空间利用:** 广阔的画布让单词卡片可以稀疏地随机分布，完美还原了在 A4 纸上“搜索”单词的感觉，避免了小屏幕上卡片拥挤的窘境。
2.  **尺寸与清晰度:** 卡片尺寸和内部字体都经过调整，确保在标准视距下清晰可辨。展开后的卡片信息更丰富、排版更从容。
3.  **操作焦点:** “随机打乱”按钮尺寸醒目，颜色突出，是页面上唯一的主色元素，引导用户执行核心操作。

**交互细节:**

- **单词卡片:**
  - **悬浮:** 卡片轻微上浮并出现柔和的边框 (`transform: translateY(-4px); border: 1px solid #4A69E2;`)。
  - **点击:** 卡片在原地平滑地展开为详细释义模式，周围的卡片会自动避让，避免遮挡。再次点击则平滑收起。
- **随机打乱:** 点击后，所有卡片会有一个快速而流畅的动画效果，模拟洗牌的过程，最终在新的随机位置上稳定下来。这个动画是提升产品“精密感”的关键细节。

---
