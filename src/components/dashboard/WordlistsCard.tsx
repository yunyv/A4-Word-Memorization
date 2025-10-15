'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWordlists, validateWordlistFile, parseWordlistFile } from '@/hooks/useWordlist';
import { WordlistWithCount, WordlistItemProps } from '@/types/wordlist';
import { Upload, Plus, Trash2, BookOpen, FileText } from 'lucide-react';

// 词书项组件
function WordlistItem({ wordlist, onStartLearning, onStartTest, onDelete }: WordlistItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (window.confirm(`确定要删除词书 "${wordlist.name}" 吗？此操作不可撤销。`)) {
      setIsDeleting(true);
      await onDelete(wordlist.id);
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border-b hover:bg-gray-50 transition-colors">
      <div className="flex-1">
        <h3 className="font-medium text-gray-900">{wordlist.name}</h3>
        <p className="text-sm text-gray-500">{wordlist.wordCount} 个单词</p>
      </div>
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onStartLearning(wordlist.id)}
          className="flex items-center gap-1"
        >
          <BookOpen className="h-4 w-4" />
          学习
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onStartTest(wordlist.id)}
          className="flex items-center gap-1"
        >
          <FileText className="h-4 w-4" />
          测试
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
          {isDeleting ? '删除中...' : '删除'}
        </Button>
      </div>
    </div>
  );
}

// 上传词书弹窗组件
function UploadWordlistModal({ 
  isOpen, 
  onClose, 
  onUpload 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onUpload: (name: string, file: File) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validation = validateWordlistFile(selectedFile);
      if (validation.isValid) {
        setFile(selectedFile);
        setError(null);
        
        // 如果名称为空，使用文件名（去掉扩展名）作为默认名称
        if (!name) {
          const fileName = selectedFile.name.replace(/\.[^/.]+$/, '');
          setName(fileName);
        }
      } else {
        setError(validation.error || '文件验证失败');
        setFile(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('请输入词书名称');
      return;
    }
    
    if (!file) {
      setError('请选择要上传的文件');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      await onUpload(name.trim(), file);
      onClose();
      // 重置表单
      setName('');
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError('上传失败，请重试');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      onClose();
      setError(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>上传新词书</CardTitle>
          <CardDescription>
            上传包含单词列表的 .txt 或 .csv 文件
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">
                词书名称
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如：GRE核心词汇"
                disabled={isUploading}
              />
            </div>
            
            <div>
              <label htmlFor="file" className="block text-sm font-medium mb-2">
                选择文件
              </label>
              <input
                id="file"
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isUploading}
              />
              {file && (
                <p className="mt-1 text-sm text-gray-500">
                  已选择: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
            
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isUploading}
                className="flex-1"
              >
                取消
              </Button>
              
              <Button
                type="submit"
                disabled={isUploading || !name.trim() || !file}
                className="flex-1"
              >
                {isUploading ? '上传中...' : '上传'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// 词书卡片主组件
export function WordlistsCard({ 
  onStartLearning, 
  onStartTest 
}: { 
  onStartLearning: (id: number) => void;
  onStartTest: (id: number) => void;
}) {
  const { wordlists, isLoading, error, uploadWordlist, deleteWordlist } = useWordlists();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const handleUpload = async (name: string, file: File) => {
    const result = await uploadWordlist(name, file);
    if (!result.success) {
      throw new Error(result.error);
    }
  };

  const handleDelete = async (id: number) => {
    await deleteWordlist(id);
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>我的词书</CardTitle>
              <CardDescription>管理您的单词列表</CardDescription>
            </div>
            
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              上传词书
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 mb-2">{error}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                重试
              </Button>
            </div>
          ) : wordlists.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <Upload className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">还没有词书</h3>
              <p className="text-gray-500 mb-4">上传您的第一个词书开始学习</p>
              <Button onClick={() => setIsUploadModalOpen(true)}>
                上传词书
              </Button>
            </div>
          ) : (
            <div className="space-y-0">
              {wordlists.map((wordlist) => (
                <WordlistItem
                  key={wordlist.id}
                  wordlist={wordlist}
                  onStartLearning={onStartLearning}
                  onStartTest={onStartTest}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      <UploadWordlistModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
      />
    </>
  );
}