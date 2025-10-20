'use client';

export function WordSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 animate-pulse">
      {/* 单词骨架 */}
      <div className="h-12 bg-gray-200 rounded-lg w-32 mb-4"></div>

      {/* 音标骨架 */}
      <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>

      {/* 按钮骨架 */}
      <div className="h-10 bg-gray-200 rounded-lg w-24 mb-6"></div>

      {/* 释义区域骨架 */}
      <div className="w-full max-w-2xl bg-white rounded-lg shadow-lg p-6 border">
        {/* 标题骨架 */}
        <div className="h-6 bg-gray-200 rounded w-24 mb-3"></div>

        {/* 释义内容骨架 */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-4/5"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>

        {/* 例句骨架 */}
        <div className="mt-6">
          <div className="h-6 bg-gray-200 rounded w-20 mb-3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>

      {/* 提示文字骨架 */}
      <div className="h-4 bg-gray-200 rounded w-32 mt-4"></div>
    </div>
  );
}