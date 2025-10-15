'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AuthoritativeDefinition, BilingualDefinition, EnglishDefinition, PronunciationData, Sentence } from '@/lib/dictionary';

interface DictionaryResult {
  success: boolean;
  word: string;
  mode?: 'test' | 'normal';
  requestedType?: 'all' | 'authoritative' | 'bilingual' | 'english';
  data?: {
    extractedContent?: string;
    pronunciation?: string;
    fullHtml?: string;
    // 结构化的释义数据
    definitions?: {
      basic: Array<{
        partOfSpeech: string;
        meaning: string;
      }>;
      web: Array<{
        meaning: string;
      }>;
    };
    // 新增的三种释义类型
    authoritativeDefinitions?: AuthoritativeDefinition[];
    bilingualDefinitions?: BilingualDefinition[];
    englishDefinitions?: EnglishDefinition[];
    // 新增的音标和音频数据
    pronunciationData?: PronunciationData;
    // 新增的例句数据
    sentences?: Sentence[];
    // 测试模式可能返回的结构
    title?: string;
    hasContentContainer?: boolean;
    hasSearchContainer?: boolean;
    hasSearchContent?: boolean;
    hasLeftSideArea?: boolean;
    hasSentenceArea?: boolean;
    sentenceAreaDivs?: number;
    firstFewDivsContent?: string[];
    bodyClasses?: string;
    allContainers?: string[];
  };
  error?: string;
}

export default function DictionaryTestPage() {
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DictionaryResult | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [definitionType, setDefinitionType] = useState<'all' | 'authoritative' | 'bilingual' | 'english'>('all');

  // 释义类型选项
  const definitionTypes = [
    { value: 'all', label: '所有释义' },
    { value: 'authoritative', label: '权威英汉释义' },
    { value: 'bilingual', label: '英汉释义' },
    { value: 'english', label: '英英释义' }
  ];

  const handleSearch = async () => {
    if (!word.trim()) {
      alert('请输入要查询的单词');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const params = new URLSearchParams({
        word: encodeURIComponent(word),
        type: definitionType
      });
      
      if (testMode) {
        params.append('test', 'true');
      }
      
      const url = `/api/dictionary?${params.toString()}`;
      const response = await fetch(url);
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('请求错误:', error);
      setResult({
        success: false,
        word,
        error: '网络请求失败'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestStructure = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/dictionary?test=true');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('测试请求错误:', error);
      setResult({
        success: false,
        word: 'test',
        error: '测试请求失败'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>学单词网站 - 爬虫测试</CardTitle>
          <CardDescription>
            测试必应词典数据爬取功能，验证XPath选择器是否正常工作
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="输入要查询的单词"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <select
              value={definitionType}
              onChange={(e) => setDefinitionType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {definitionTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <Button
              onClick={handleSearch}
              disabled={loading}
            >
              {loading ? '查询中...' : '查询单词'}
            </Button>
          </div>
          
          <div className="flex gap-2 mb-4">
            <Button 
              variant="outline" 
              onClick={handleTestStructure}
              disabled={loading}
            >
              测试网站结构
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setTestMode(!testMode)}
            >
              {testMode ? '关闭测试模式' : '开启测试模式'}
            </Button>
          </div>
          
          {testMode && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                测试模式已开启：将分析网站结构而不是提取单词数据
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>
              查询结果: {result.word}
              <span className={`ml-2 text-sm font-normal ${
                result.success ? 'text-green-600' : 'text-red-600'
              }`}>
                {result.success ? '✓ 成功' : '✗ 失败'}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <div className="space-y-4">
                {result.mode === 'test' ? (
                  // 测试模式结果
                  <div>
                    <h3 className="font-semibold mb-2">网站结构分析:</h3>
                    <pre className="bg-gray-100 p-3 rounded-md overflow-auto text-sm">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                ) : (
                  // 正常查询结果
                  <>
                    <div>
                      <h3 className="font-semibold mb-2">发音:</h3>
                      <p className="text-gray-700">{result.data?.pronunciation || '未找到发音信息'}</p>
                    </div>
                    
                    {/* 新增的音标和音频显示 */}
                    {result.data?.pronunciationData && (
                      <div>
                        <h3 className="font-semibold mb-2">音标与发音:</h3>
                        <PronunciationDisplay pronunciationData={result.data.pronunciationData} />
                      </div>
                    )}
                    
                     
                    {/* 新增的三种释义类型选项卡 */}
                    <div>
                      <h3 className="font-semibold mb-2">详细释义:</h3>
                      <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                          <TabsTrigger value="basic">基本释义</TabsTrigger>
                          <TabsTrigger value="authoritative">权威英汉</TabsTrigger>
                          <TabsTrigger value="bilingual">英汉释义</TabsTrigger>
                          <TabsTrigger value="english">英英释义</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="basic" className="space-y-4">
                          {result.data?.definitions ? (
                            <div className="space-y-3">
                              {/* 基本释义 */}
                              {result.data.definitions.basic.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-blue-700 mb-1">基本释义:</h4>
                                  {result.data.definitions.basic.map((item, index) => (
                                    <div key={index} className="ml-4 mb-1">
                                      <span className="font-medium text-green-600">{item.partOfSpeech}</span>
                                      <span className="ml-2 text-gray-700">{item.meaning}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* 网络释义 */}
                              {result.data.definitions.web.length > 0 && (
                                <div>
                                  <h4 className="font-medium text-blue-700 mb-1">网络释义:</h4>
                                  {result.data.definitions.web.map((item, index) => (
                                    <div key={index} className="ml-4 mb-1">
                                      <span className="text-gray-700">{item.meaning}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* 如果没有任何释义 */}
                              {result.data.definitions.basic.length === 0 && result.data.definitions.web.length === 0 && (
                                <p className="text-gray-500">未找到释义信息</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-gray-700">未找到释义信息</p>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="authoritative" className="space-y-4">
                          {result.data?.authoritativeDefinitions && result.data.authoritativeDefinitions.length > 0 ? (
                            <AuthoritativeDefinitionDisplay definitions={result.data.authoritativeDefinitions} />
                          ) : (
                            <p className="text-gray-500">未找到权威英汉释义</p>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="bilingual" className="space-y-4">
                          {result.data?.bilingualDefinitions && result.data.bilingualDefinitions.length > 0 ? (
                            <BilingualDefinitionDisplay definitions={result.data.bilingualDefinitions} />
                          ) : (
                            <p className="text-gray-500">未找到英汉释义</p>
                          )}
                        </TabsContent>
                        
                        <TabsContent value="english" className="space-y-4">
                          {result.data?.englishDefinitions && result.data.englishDefinitions.length > 0 ? (
                            <EnglishDefinitionDisplay definitions={result.data.englishDefinitions} />
                          ) : (
                            <p className="text-gray-500">未找到英英释义</p>
                          )}
                        </TabsContent>
                      </Tabs>
                    </div>
                    
                    {/* 新增的结构化例句显示 */}
                    {result.data?.sentences && result.data.sentences.length > 0 ? (
                      <div>
                        <h3 className="font-semibold mb-2">例句:</h3>
                        <SentenceDisplay sentences={result.data.sentences} />
                      </div>
                    ) : (
                      <div>
                        <h3 className="font-semibold mb-2">例句 (XPath提取内容):</h3>
                        <div className="bg-blue-50 p-3 rounded-md">
                          <p className="text-gray-700">
                            {result.data?.extractedContent || '未找到例句内容'}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {process.env.NODE_ENV === 'development' && result.data?.fullHtml && (
                      <details className="mt-4">
                        <summary className="cursor-pointer font-semibold">查看完整HTML (开发模式)</summary>
                        <div className="mt-2">
                          <textarea
                            className="w-full h-64 p-2 border rounded-md text-xs font-mono"
                            value={result.data.fullHtml}
                            readOnly
                          />
                        </div>
                      </details>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="text-red-600">
                <p className="font-semibold">错误:</p>
                <p>{result.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 权威英汉释义显示组件
const AuthoritativeDefinitionDisplay = ({ definitions }: { definitions: AuthoritativeDefinition[] }) => (
  <div className="space-y-4">
    {definitions.map((def, index) => (
      <div key={index} className="border rounded-lg p-4">
        <h4 className="font-semibold text-lg mb-2 text-blue-700">{def.partOfSpeech}</h4>
        <div className="space-y-2">
          {def.definitions.map((item, itemIndex) => (
            <div key={itemIndex} className="ml-4">
              <div className="flex items-start">
                <span className="font-medium text-gray-500 mr-2">{item.number}.</span>
                <div className="flex-1">
                  <p className="text-gray-800 font-medium">{item.chineseMeaning}</p>
                  <p className="text-gray-600 text-sm italic">{item.englishMeaning}</p>
                  {/* 默认隐藏例句 */}
                  {/* {item.examples && item.examples.length > 0 && (
                    <div className="mt-2 ml-4 space-y-1">
                      {item.examples.map((example, exIndex) => (
                        <div key={exIndex} className="text-sm">
                          <p className="text-gray-700">{example.english}</p>
                          <p className="text-gray-600">{example.chinese}</p>
                        </div>
                      ))}
                    </div>
                  )} */}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* 默认隐藏习语 */}
        {/* {def.idioms && def.idioms.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h5 className="font-medium text-purple-700 mb-2">习语</h5>
            <div className="space-y-2">
              {def.idioms.map((idiom, idiomIndex) => (
                <div key={idiomIndex} className="ml-4">
                  <div className="flex items-start">
                    <span className="font-medium text-gray-500 mr-2">{idiom.number}.</span>
                    <div className="flex-1">
                      <p className="text-purple-600 font-medium">{idiom.title}</p>
                      <p className="text-gray-700">{idiom.meaning}</p>
                      {idiom.examples && idiom.examples.length > 0 && (
                        <div className="mt-2 ml-4 space-y-1">
                          {idiom.examples.map((example, exIndex) => (
                            <div key={exIndex} className="text-sm">
                              <p className="text-gray-700">{example.english}</p>
                              <p className="text-gray-600">{example.chinese}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )} */}
      </div>
    ))}
  </div>
);

// 英汉释义显示组件
const BilingualDefinitionDisplay = ({ definitions }: { definitions: BilingualDefinition[] }) => (
  <div className="space-y-4">
    {definitions.map((def, index) => (
      <div key={index} className="border rounded-lg p-4">
        <h4 className="font-semibold text-lg mb-2 text-green-700">{def.partOfSpeech}</h4>
        <div className="space-y-2">
          {def.definitions.map((item, itemIndex) => (
            <div key={itemIndex} className="ml-4">
              <div className="flex items-start">
                <span className="font-medium text-gray-500 mr-2">{item.number}.</span>
                <p className="text-gray-800">{item.meaning}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// 英英释义显示组件
const EnglishDefinitionDisplay = ({ definitions }: { definitions: EnglishDefinition[] }) => (
  <div className="space-y-4">
    {definitions.map((def, index) => (
      <div key={index} className="border rounded-lg p-4">
        <h4 className="font-semibold text-lg mb-2 text-orange-700">{def.partOfSpeech}</h4>
        <div className="space-y-2">
          {def.definitions.map((item, itemIndex) => (
            <div key={itemIndex} className="ml-4">
              <div className="flex items-start">
                <span className="font-medium text-gray-500 mr-2">{item.number}.</span>
                <div className="flex-1">
                  <p className="text-gray-800">{item.meaning}</p>
                  {/* 默认隐藏相关词汇 */}
                  {/* {item.linkedWords && item.linkedWords.length > 0 && (
                    <div className="mt-1">
                      <span className="text-sm text-gray-500">相关词汇: </span>
                      {item.linkedWords.map((word, wordIndex) => (
                        <span key={wordIndex} className="text-sm text-blue-600 hover:underline cursor-pointer ml-1">
                          {word}{wordIndex < item.linkedWords!.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  )} */}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);


// 音标和音频显示组件
const PronunciationDisplay = ({ pronunciationData }: { pronunciationData: PronunciationData }) => {
  const [audioError, setAudioError] = useState<{ [key: string]: boolean }>({});

  const handleAudioError = (type: string) => {
    setAudioError(prev => ({ ...prev, [type]: true }));
  };

  return (
    <div className="space-y-3">
      {pronunciationData.american && (
        <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
          <span className="font-medium text-blue-700">美式:</span>
          <span className="text-gray-700">{pronunciationData.american.phonetic}</span>
          {pronunciationData.american.audioUrl && !audioError.american ? (
            <audio 
              controls 
              src={pronunciationData.american.audioUrl}
              onError={() => handleAudioError('american')}
              className="h-8"
            >
              您的浏览器不支持音频播放。
            </audio>
          ) : (
            <span className="text-sm text-gray-500">
              {audioError.american ? '音频加载失败' : '无音频文件'}
            </span>
          )}
        </div>
      )}
      
      {pronunciationData.british && (
        <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
          <span className="font-medium text-green-700">英式:</span>
          <span className="text-gray-700">{pronunciationData.british.phonetic}</span>
          {pronunciationData.british.audioUrl && !audioError.british ? (
            <audio 
              controls 
              src={pronunciationData.british.audioUrl}
              onError={() => handleAudioError('british')}
              className="h-8"
            >
              您的浏览器不支持音频播放。
            </audio>
          ) : (
            <span className="text-sm text-gray-500">
              {audioError.british ? '音频加载失败' : '无音频文件'}
            </span>
          )}
        </div>
      )}
      
      {!pronunciationData.american && !pronunciationData.british && (
        <p className="text-gray-500">未找到音标和音频信息</p>
      )}
    </div>
  );
};


// 例句显示组件
const SentenceDisplay = ({ sentences }: { sentences: Sentence[] }) => {
  const [audioError, setAudioError] = useState<{ [key: string]: boolean }>({});

  const handleAudioError = (index: number) => {
    setAudioError(prev => ({ ...prev, [index]: true }));
  };

  const renderHighlightedText = (text: string, highlightedWords?: Array<{ word: string; className: string }>) => {
    if (!highlightedWords || highlightedWords.length === 0) {
      return text;
    }

    let result = text;
    highlightedWords.forEach(({ word, className }) => {
      if (word && result.includes(word)) {
        const isHighlighted = className.includes('client_sentence_search');
        const colorClass = isHighlighted ? 'text-blue-600 font-semibold' : 'text-gray-700';
        result = result.replace(new RegExp(word, 'g'), `<span class="${colorClass}">${word}</span>`);
      }
    });

    return <span dangerouslySetInnerHTML={{ __html: result }} />;
  };

  return (
    <div className="space-y-4">
      {sentences.map((sentence, index) => (
        <div key={index} className="border rounded-lg p-4 bg-gray-50">
          <div className="flex items-start justify-between mb-2">
            <span className="font-medium text-gray-500 bg-white px-2 py-1 rounded">
              {sentence.number}.
            </span>
            {sentence.source && (
              <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                来源: {sentence.source}
              </span>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="text-gray-800">
              {renderHighlightedText(sentence.english, sentence.highlightedWords)}
            </div>
            
            <div className="text-gray-600">
              {renderHighlightedText(sentence.chinese, sentence.highlightedWords)}
            </div>
            
            {sentence.audioUrl && !audioError[index] && (
              <div className="mt-2">
                <audio 
                  controls 
                  src={sentence.audioUrl}
                  onError={() => handleAudioError(index)}
                  className="h-8"
                >
                  您的浏览器不支持音频播放。
                </audio>
              </div>
            )}
            
            {sentence.audioUrl && audioError[index] && (
              <div className="mt-2 text-sm text-red-500">
                音频加载失败
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
