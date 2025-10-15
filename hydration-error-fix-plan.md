# React Hydration 错误修复计划

## 问题描述
在 Next.js 应用中出现 React Hydration 错误，具体错误信息：
```
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.
```

错误发生在 `src/app/layout.tsx` 文件的第29行，`body` 元素的 `style` 属性中 `fontFamily` 的格式不一致：
- 服务器端：`font-family: "Inter, \"Source Han Sans CN\", sans-serif"`
- 客户端：`fontFamily: "Inter, \"Source Han Sans CN\", sans-serif"`

## 根本原因分析
1. 在 `layout.tsx` 中使用了内联样式对象设置 `fontFamily`
2. 同时在 CSS 文件（`globals.css` 和 `styles/globals.css`）中也有相同的字体设置
3. 这种重复设置导致了服务器端和客户端渲染的不一致

## 修复方案
采用最稳妥的方法：使用 Next.js 的字体优化功能，通过 Geist 字体变量来设置字体，并移除可能导致冲突的内联样式。

### 具体步骤

#### 1. 修改 layout.tsx
- 移除 `body` 元素上的内联 `style` 属性
- 保留 `className` 属性中的字体变量
- 确保使用正确的字体变量引用

#### 2. 确保 CSS 文件中的字体样式一致
- 检查 `src/app/globals.css` 和 `src/styles/globals.css` 中的字体设置
- 确保字体栈一致
- 考虑合并或统一这两个文件，避免重复定义

#### 3. 使用 CSS 变量统一管理字体
- 在 CSS 中定义字体变量
- 在 layout.tsx 中通过 className 引用这些变量
- 确保服务器端和客户端使用相同的字体定义

## 预期结果
修复后，服务器端和客户端将使用一致的字体样式，消除 hydration 错误。

## 验证方法
1. 重新启动开发服务器
2. 检查控制台是否还有 hydration 错误
3. 确认页面字体显示正确
4. 测试不同页面的字体一致性

## 备选方案
如果主要方案无效，可以考虑：
1. 完全移除内联样式，只使用 CSS 类
2. 使用 `suppressHydrationWarning` 属性（不推荐，仅作为最后手段）
3. 将字体设置移到全局 CSS 中，确保服务器端和客户端一致性