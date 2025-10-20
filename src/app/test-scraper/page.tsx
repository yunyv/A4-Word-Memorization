'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ScraperResult {
  success: boolean;
  word: string;
  requestedType?: string;
  data?: any;
  error?: string;
}

export default function ScraperTestPage() {
  const [word, setWord] = useState('hello');
  const [type, setType] = useState<'all' | 'authoritative' | 'bilingual' | 'english'>('all');
  const [result, setResult] = useState<ScraperResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const testScraper = async () => {
    if (!word.trim()) return;
    
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch(`/api/dictionary?word=${encodeURIComponent(word.trim())}&type=${type}`);
      const data: ScraperResult = await response.json();
      setResult(data);
    } catch (error) {
      console.error('测试爬虫时出错:', error);
      setResult({
        success: false,
        word: word.trim(),
        error: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testWebsiteStructure = async () => {
    if (!word.trim()) return;
    
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch(`/api/dictionary?word=${encodeURIComponent(word.trim())}&type=${type}&test=true`);
      const data: ScraperResult = await response.json();
      setResult(data);
    } catch (error) {
      console.error('测试网站结构时出错:', error);
      setResult({
        success: false,
        word: word.trim(),
        error: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderPronunciationData = (pronunciationData: any) => {
    if (!pronunciationData) return <div>无音标数据</div>;
    
    return (
      <div style={{ marginBottom: '16px' }}>
        <h3>音标数据</h3>
        {pronunciationData.american && (
          <div style={{ marginBottom: '8px' }}>
            <strong>美式音标:</strong> {pronunciationData.american.phonetic}
            {pronunciationData.american.audioUrl && (
              <div>
                <strong>音频URL:</strong> 
                <a href={pronunciationData.american.audioUrl} target="_blank" rel="noopener noreferrer">
                  {pronunciationData.american.audioUrl}
                </a>
                <Button 
                  size="sm" 
                  style={{ marginLeft: '8px' }}
                  onClick={() => {
                    const audio = new Audio(pronunciationData.american.audioUrl);
                    audio.play().catch(e => console.error('播放失败:', e));
                  }}
                >
                  播放
                </Button>
              </div>
            )}
          </div>
        )}
        {pronunciationData.british && (
          <div style={{ marginBottom: '8px' }}>
            <strong>英式音标:</strong> {pronunciationData.british.phonetic}
            {pronunciationData.british.audioUrl && (
              <div>
                <strong>音频URL:</strong> 
                <a href={pronunciationData.british.audioUrl} target="_blank" rel="noopener noreferrer">
                  {pronunciationData.british.audioUrl}
                </a>
                <Button 
                  size="sm" 
                  style={{ marginLeft: '8px' }}
                  onClick={() => {
                    const audio = new Audio(pronunciationData.british.audioUrl);
                    audio.play().catch(e => console.error('播放失败:', e));
                  }}
                >
                  播放
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDefinitions = (definitions: any) => {
    if (!definitions) return <div>无释义数据</div>;
    
    return (
      <div style={{ marginBottom: '16px' }}>
        <h3>释义数据</h3>
        
        {/* 基本释义 */}
        {definitions.basic && definitions.basic.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <h4>基本释义 ({definitions.basic.length}条)</h4>
            {definitions.basic.map((def: any, index: number) => (
              <div key={index} style={{ marginBottom: '4px', marginLeft: '16px' }}>
                <strong>{def.partOfSpeech}</strong> {def.meaning}
              </div>
            ))}
          </div>
        )}
        
        {/* 网络释义 */}
        {definitions.web && definitions.web.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <h4>网络释义 ({definitions.web.length}条)</h4>
            {definitions.web.map((def: any, index: number) => (
              <div key={index} style={{ marginBottom: '4px', marginLeft: '16px' }}>
                {def.meaning}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAuthoritativeDefinitions = (definitions: any[]) => {
    if (!definitions || definitions.length === 0) return <div>无权威英汉释义</div>;
    
    return (
      <div style={{ marginBottom: '16px' }}>
        <h3>权威英汉释义 ({definitions.length}条)</h3>
        {definitions.map((authDef: any, index: number) => (
          <div key={index} style={{ marginBottom: '12px', border: '1px solid #e0e0e0', padding: '8px' }}>
            <h4>{authDef.partOfSpeech}</h4>
            {authDef.definitions && authDef.definitions.length > 0 && (
              <div>
                <h5>释义 ({authDef.definitions.length}条)</h5>
                {authDef.definitions.map((defItem: any, defIndex: number) => (
                  <div key={defIndex} style={{ marginBottom: '4px', marginLeft: '16px' }}>
                    <strong>{defItem.number}.</strong> {defItem.chineseMeaning}
                    {defItem.englishMeaning && <span> ({defItem.englishMeaning})</span>}
                    {defItem.examples && defItem.examples.length > 0 && (
                      <div style={{ marginLeft: '16px', fontSize: '14px', color: '#666' }}>
                        <h6>例句:</h6>
                        {defItem.examples.map((example: any, exIndex: number) => (
                          <div key={exIndex} style={{ fontStyle: 'italic' }}>
                            {example.english} {example.chinese && `(${example.chinese})`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {authDef.idioms && authDef.idioms.length > 0 && (
              <div>
                <h5>习语 ({authDef.idioms.length}条)</h5>
                {authDef.idioms.map((idiom: any, idiomIndex: number) => (
                  <div key={idiomIndex} style={{ marginBottom: '4px', marginLeft: '16px' }}>
                    <strong>{idiom.number}. {idiom.title}</strong> - {idiom.meaning}
                    {idiom.examples && idiom.examples.length > 0 && (
                      <div style={{ marginLeft: '16px', fontSize: '14px', color: '#666' }}>
                        <h6>例句:</h6>
                        {idiom.examples.map((example: any, exIndex: number) => (
                          <div key={exIndex} style={{ fontStyle: 'italic' }}>
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
    );
  };

  const renderBilingualDefinitions = (definitions: any[]) => {
    if (!definitions || definitions.length === 0) return <div>无英汉释义</div>;
    
    return (
      <div style={{ marginBottom: '16px' }}>
        <h3>英汉释义 ({definitions.length}条)</h3>
        {definitions.map((bilDef: any, index: number) => (
          <div key={index} style={{ marginBottom: '12px', border: '1px solid #e0e0e0', padding: '8px' }}>
            <h4>{bilDef.partOfSpeech}</h4>
            {bilDef.definitions && bilDef.definitions.length > 0 && (
              <div>
                {bilDef.definitions.map((defItem: any, defIndex: number) => (
                  <div key={defIndex} style={{ marginBottom: '4px', marginLeft: '16px' }}>
                    <strong>{defItem.number}.</strong> {defItem.meaning}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderEnglishDefinitions = (definitions: any[]) => {
    if (!definitions || definitions.length === 0) return <div>无英英释义</div>;
    
    return (
      <div style={{ marginBottom: '16px' }}>
        <h3>英英释义 ({definitions.length}条)</h3>
        {definitions.map((engDef: any, index: number) => (
          <div key={index} style={{ marginBottom: '12px', border: '1px solid #e0e0e0', padding: '8px' }}>
            <h4>{engDef.partOfSpeech}</h4>
            {engDef.definitions && engDef.definitions.length > 0 && (
              <div>
                {engDef.definitions.map((defItem: any, defIndex: number) => (
                  <div key={defIndex} style={{ marginBottom: '4px', marginLeft: '16px' }}>
                    <strong>{defItem.number}.</strong> {defItem.meaning}
                    {defItem.linkedWords && defItem.linkedWords.length > 0 && (
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        相关词: {defItem.linkedWords.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderSentences = (sentences: any[]) => {
    if (!sentences || sentences.length === 0) return <div>无例句</div>;
    
    return (
      <div style={{ marginBottom: '16px' }}>
        <h3>例句 ({sentences.length}条)</h3>
        {sentences.map((sentence: any, index: number) => (
          <div key={index} style={{ marginBottom: '8px', border: '1px solid #e0e0e0', padding: '8px' }}>
            <div style={{ fontStyle: 'italic' }}>{sentence.english}</div>
            {sentence.chinese && <div style={{ color: '#666' }}>{sentence.chinese}</div>}
            {sentence.audioUrl && (
              <div>
                <small>音频URL: </small>
                <a href={sentence.audioUrl} target="_blank" rel="noopener noreferrer">
                  {sentence.audioUrl}
                </a>
                <Button 
                  size="sm" 
                  style={{ marginLeft: '8px' }}
                  onClick={() => {
                    const audio = new Audio(sentence.audioUrl);
                    audio.play().catch(e => console.error('播放失败:', e));
                  }}
                >
                  播放
                </Button>
              </div>
            )}
            {sentence.source && <div><small>来源: {sentence.source}</small></div>}
          </div>
        ))}
      </div>
    );
  };

  const renderWordForms = (wordForms: any[]) => {
    if (!wordForms || wordForms.length === 0) return <div>无词形变化</div>;
    
    return (
      <div style={{ marginBottom: '16px' }}>
        <h3>词形变化 ({wordForms.length}条)</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {wordForms.map((form: any, index: number) => (
            <div key={index} style={{
              backgroundColor: '#f0f0f0',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              <strong>{form.form}:</strong> {form.word}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>词典爬虫测试工具</h1>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <Input
          type="text"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          placeholder="输入要测试的单词"
          style={{ width: '200px' }}
        />
        
        <select
          value={type}
          onChange={(e) => setType(e.target.value as any)}
          style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <option value="all">全部</option>
          <option value="authoritative">权威英汉释义</option>
          <option value="bilingual">英汉释义</option>
          <option value="english">英英释义</option>
        </select>
        
        <Button onClick={testScraper} disabled={isLoading}>
          {isLoading ? '测试中...' : '测试爬虫'}
        </Button>
        
        <Button onClick={testWebsiteStructure} disabled={isLoading} variant="outline">
          {isLoading ? '测试中...' : '测试网站结构'}
        </Button>
        
        <Button 
          onClick={() => setShowRaw(!showRaw)} 
          variant="outline"
          disabled={!result}
        >
          {showRaw ? '格式化显示' : '显示原始JSON'}
        </Button>
      </div>
      
      {result && (
        <div style={{ marginTop: '20px' }}>
          <h2>测试结果</h2>
          
          {!showRaw ? (
            <div>
              <div style={{ marginBottom: '16px' }}>
                <strong>单词:</strong> {result.word}
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <strong>请求类型:</strong> {result.requestedType || 'all'}
              </div>
              
              <div style={{ marginBottom: '16px' }}>
                <strong>成功状态:</strong> {result.success ? '成功' : '失败'}
              </div>
              
              {result.error && (
                <div style={{ marginBottom: '16px', color: 'red' }}>
                  <strong>错误:</strong> {result.error}
                </div>
              )}
              
              {result.data && (
                <div>
                  {renderPronunciationData(result.data.pronunciationData)}
                  {renderDefinitions(result.data.definitions)}
                  {renderAuthoritativeDefinitions(result.data.authoritativeDefinitions)}
                  {renderBilingualDefinitions(result.data.bilingualDefinitions)}
                  {renderEnglishDefinitions(result.data.englishDefinitions)}
                  {renderWordForms(result.data.wordForms)}
                  {renderSentences(result.data.sentences)}
                </div>
              )}
            </div>
          ) : (
            <div style={{ backgroundColor: '#f5f5f5', padding: '16px', borderRadius: '4px', overflow: 'auto' }}>
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}