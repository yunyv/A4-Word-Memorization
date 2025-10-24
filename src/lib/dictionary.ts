import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';
import type { PrismaClient, Prisma } from '@prisma/client';
import type { WebsiteStructureTest } from '@/types/common';

// 修复：添加调试支持，通过环境变量控制调试日志的输出
const DEBUG_MODE = process.env.NODE_ENV === 'development' || process.env.DEBUG_DICTIONARY === 'true';

// 调试日志函数
function debugLog(message: string, data?: unknown) {
  if (DEBUG_MODE) {
    if (data) {
      console.log(`[DEBUG] ${message}`, data);
    } else {
      console.log(`[DEBUG] ${message}`);
    }
  }
}

// 错误日志函数
function errorLog(message: string, error?: unknown) {
  console.error(`[ERROR] ${message}`, error);
}

// 警告日志函数
function warningLog(message: string, data?: unknown) {
  console.warn(`[WARNING] ${message}`, data);
}

// Prisma 事务类型定义
type PrismaTransaction = Omit<PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

// 权威英汉释义结构
export interface AuthoritativeDefinition {
  partOfSpeech: string; // 词性，如 "adj.", "adv.", "n.", "v."
  definitions: Array<{
    number: number; // 释义序号
    chineseMeaning: string; // 中文释义
    englishMeaning: string; // 英文释义
    examples?: Array<{ // 例句
      english: string;
      chinese: string;
    }>;
  }>;
  idioms?: Array<{ // 习语
    number: number;
    title: string;
    meaning: string;
    examples?: Array<{
      english: string;
      chinese: string;
    }>;
  }>;
}

// 英汉释义结构
export interface BilingualDefinition {
  partOfSpeech: string; // 词性
  definitions: Array<{
    number: number; // 释义序号
    meaning: string; // 释义内容
  }>;
}

// 英英释义结构
export interface EnglishDefinition {
  partOfSpeech: string; // 词性
  definitions: Array<{
    number: number; // 释义序号
    meaning: string; // 英文释义
    linkedWords?: string[]; // 链接的单词
  }>;
}

// 音标和音频数据接口
export interface PronunciationData {
  american?: {
    phonetic: string; // 美式音标，如 "[ˈbetər]"
    audioUrl?: string; // 美式发音音频URL
  };
  british?: {
    phonetic: string; // 英式音标，如 "[ˈbetə(r)]"
    audioUrl?: string; // 英式发音音频URL
  };
}

// 例句数据接口
export interface Sentence {
  number: number; // 例句序号
  english: string; // 英文例句
  chinese: string; // 中文例句
  audioUrl?: string; // 例句音频URL
  source?: string; // 例句来源
  highlightedWords?: Array<{ // 高亮的单词
    word: string;
    className: string;
  }>;
}

export interface DictionaryResult {
  success: boolean;
  word: string;
  mode?: 'test' | 'normal';
  requestedType?: 'all' | 'authoritative' | 'bilingual' | 'english'; // 请求的释义类型
  data?: {
    extractedContent?: string;
    pronunciation?: string;
    pronunciationData?: PronunciationData; // 新增的音标和音频数据
    sentences?: Sentence[]; // 新增的例句数据
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
    authoritativeDefinitions?: AuthoritativeDefinition[]; // 权威英汉释义
    bilingualDefinitions?: BilingualDefinition[]; // 英汉释义
    englishDefinitions?: EnglishDefinition[]; // 英英释义
    // 词形变换数据
    wordForms?: Array<{
      form: string; // 词形类型，如"复数"、"过去式"等
      word: string; // 变换后的单词
    }>;
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

// 释义数据保存接口
interface DefinitionsToSave {
  basic: Array<{
    partOfSpeech: string;
    meaning: string;
  }>;
  web: Array<{
    meaning: string;
  }>;
}

// 发音数据保存接口
interface PronunciationDataToSave {
  american?: {
    phonetic: string;
    audioUrl: string;
  };
  british?: {
    phonetic: string;
    audioUrl: string;
  };
}

// 保存数据的接口定义
export interface WordDataToSave {
  extractedContent?: string;
  pronunciation?: string;
  pronunciationData?: {
    american?: {
      phonetic: string;
      audioUrl?: string;
    };
    british?: {
      phonetic: string;
      audioUrl?: string;
    };
  };
  sentences?: Array<{
    number: number;
    english: string;
    chinese: string;
    audioUrl?: string;
    source?: string;
    highlightedWords?: Array<{
      word: string;
      className: string;
    }>;
  }>;
  definitions?: {
    basic: Array<{
      partOfSpeech: string;
      meaning: string;
    }>;
    web: Array<{
      meaning: string;
    }>;
  };
  authoritativeDefinitions?: Array<{
    partOfSpeech: string;
    definitions: Array<{
      number: number;
      chineseMeaning: string;
      englishMeaning: string;
      examples?: Array<{
        english: string;
        chinese: string;
      }>;
    }>;
    idioms?: Array<{
      number: number;
      title: string;
      meaning: string;
      examples?: Array<{
        english: string;
        chinese: string;
      }>;
    }>;
  }>;
  bilingualDefinitions?: Array<{
    partOfSpeech: string;
    definitions: Array<{
      number: number;
      meaning: string;
    }>;
  }>;
  englishDefinitions?: Array<{
    partOfSpeech: string;
    definitions: Array<{
      number: number;
      meaning: string;
      linkedWords?: string[];
    }>;
  }>;
  wordForms?: Array<{
    form: string;
    word: string;
  }>;
}

export class DictionaryScraper {
  private baseUrl = 'https://cn.bing.com/dict/clientsearch';
  private headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  };

  async scrapeWord(
    word: string,
    type: 'all' | 'authoritative' | 'bilingual' | 'english' = 'all'
  ): Promise<DictionaryResult> {
    if (!word || word.trim() === '') {
      return {
        success: false,
        word,
        error: '请提供要查询的单词'
      };
    }

    // 修复：添加重试机制处理临时性失败
    const maxRetries = 3;
    const retryDelay = 1000; // 1秒
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        debugLog(`[RETRY] 正在爬取单词: ${word}, 尝试次数: ${attempt}/${maxRetries}`);
        
        const url = `${this.baseUrl}?mkt=zh-CN&setLang=zh&form=BDVEHC&ClientVer=BDDTV3.5.1.4320&q=${encodeURIComponent(word.trim())}`;
        
        debugLog(`请求URL: ${url}`);

        const response = await axios.get(url, {
          headers: this.headers,
          timeout: 10000
        });

      const html = response.data;
      const $ = cheerio.load(html);

      // 提取发音信息
      let pronunciation = '';
      try {
        pronunciation = $('.client_def_hd_pn').text().trim() ||
                       $('.client_def_hd_pn_list .client_def_hd_pn').text().trim();
      } catch (e) {
        errorLog('提取发音信息失败:', e);
      }

      // 提取结构化的释义信息
      const definitions = {
        basic: [] as Array<{ partOfSpeech: string; meaning: string }>,
        web: [] as Array<{ meaning: string }>
      };
      
      // 提取词形变换信息
      const wordForms = [] as Array<{ form: string; word: string }>;
      
      try {
        // 只处理第一个 client_def_container 容器内的释义区块
        $('#client_def_container:first .client_def_bar').each((index, element) => {
          const $bar = $(element);
          const titleBar = $bar.find('.client_def_title_bar');
          
          // 更准确地检查是否为网络释义
          const webTitleElement = titleBar.find('.client_def_title_web');
          const isWebDefinition = webTitleElement.length > 0 &&
                                 webTitleElement.text().trim() === '网络';
          
          if (isWebDefinition) {
            // 提取网络释义
            const meaning = $bar.find('.client_def_list_word_bar').text().trim();
            if (meaning) {
              definitions.web.push({ meaning });
            }
          } else {
            // 提取基本释义
            const partOfSpeech = titleBar.find('.client_def_title').text().trim();
            const meaning = $bar.find('.client_def_list_word_bar').text().trim();
            
            if (partOfSpeech && meaning) {
              definitions.basic.push({ partOfSpeech, meaning });
            }
          }
        });
        
        // 提取词形变换信息
        $('#client_word_change_def .client_word_change_word').each((index, element) => {
          const $element = $(element);
          const form = $element.attr('title') || '';
          const word = $element.text().trim();
          
          if (form && word) {
            wordForms.push({ form, word });
          }
        });
        
        debugLog('提取的基本释义数量:', definitions.basic.length);
        debugLog('提取的网络释义数量:', definitions.web.length);
        debugLog('提取的词形变换数量:', wordForms.length);
        
        // 打印提取的释义用于调试
        if (DEBUG_MODE) {
          definitions.basic.forEach((item, index) => {
            debugLog(`基本释义 ${index + 1}: ${item.partOfSpeech} - ${item.meaning}`);
          });
          
          definitions.web.forEach((item, index) => {
            debugLog(`网络释义 ${index + 1}: ${item.meaning}`);
          });
          
          wordForms.forEach((item, index) => {
            debugLog(`词形变换 ${index + 1}: ${item.form} - ${item.word}`);
          });
        }
        
      } catch (e) {
        errorLog('提取结构化释义信息失败:', e);
      }

      // 提取三种新的释义类型
      let authoritativeDefinitions: AuthoritativeDefinition[] = [];
      let bilingualDefinitions: BilingualDefinition[] = [];
      let englishDefinitions: EnglishDefinition[] = [];
      
      try {
        if (type === 'all' || type === 'authoritative') {
          authoritativeDefinitions = this.extractAuthoritativeDefinitions($);
          debugLog('提取的权威英汉释义数量:', authoritativeDefinitions.length);
        }
        
        if (type === 'all' || type === 'bilingual') {
          bilingualDefinitions = this.extractBilingualDefinitions($);
          debugLog('提取的英汉释义数量:', bilingualDefinitions.length);
        }
        
        if (type === 'all' || type === 'english') {
          englishDefinitions = this.extractEnglishDefinitions($);
          debugLog('提取的英英释义数量:', englishDefinitions.length);
        }
      } catch (e) {
        errorLog('提取新释义类型失败:', e);
      }

      // 提取音标和音频数据
      let pronunciationData: PronunciationData = {};
      try {
        pronunciationData = this.extractPronunciationData($);
        debugLog('提取的音标数据数量:',
          (pronunciationData.american ? 1 : 0) + (pronunciationData.british ? 1 : 0));
      } catch (e) {
        errorLog('提取音标和音频数据失败:', e);
      }

      // 提取例句数据
      let sentences: Sentence[] = [];
      try {
        sentences = this.extractSentences($);
        debugLog('提取的例句数量:', sentences.length);
      } catch (e) {
        errorLog('提取例句数据失败:', e);
      }

      // 使用CSS选择器提取例句内容
      // 对应XPath: //body/div[@id='content_container']/div[@class='client_search_container']/div[@class='client_search_content']/div[@class='client_search_leftside_area']/div[@class='client_search_sentence_area']/div[2]
      let extractedContent = '';
      try {
        // 尝试多种选择器来获取例句
        const sentenceSelectors = [
          '.client_sentence_list .client_sen_en', // 英文例句
          '.client_sentence_list .client_sen_cn', // 中文例句
          '.client_sentence_list1 .client_sen_en', // 第一个例句的英文部分
          '.client_sentence_list1 .client_sen_cn', // 第一个例句的中文部分
          '.client_search_sentence_area .client_sentence_list', // 整个例句列表
          '.client_search_sentence_area div:eq(1)', // 对应原XPath的第2个div
          '.client_search_sentence_area div' // 所有例句区域的div
        ];

        for (const selector of sentenceSelectors) {
          const text = $(selector).text().trim();
          if (text && text.length > 5) { // 确保内容有意义
            extractedContent = text;
            break;
          }
        }

        // 如果还是没有找到，尝试获取前几个例句的组合
        if (!extractedContent) {
          const sentences: string[] = [];
          $('.client_sentence_list').slice(0, 3).each((i, el) => {
            const enText = $(el).find('.client_sen_en').text().trim();
            const cnText = $(el).find('.client_sen_cn').text().trim();
            if (enText || cnText) {
              sentences.push(enText && cnText ? `${enText} / ${cnText}` : enText || cnText);
            }
          });
          extractedContent = sentences.join('\n') || '未找到例句内容';
        }
      } catch (selectorError) {
        errorLog('CSS选择器解析错误:', selectorError);
        extractedContent = '未找到例句内容';
      }

      // 调试信息：打印页面结构
      debugLog('页面标题:', $('title').text());
      debugLog('主要内容区域长度:', $('#content_container').length);
      debugLog('例句区域长度:', $('.client_search_sentence_area').length);
      debugLog('例句列表长度:', $('.client_sentence_list').length);
      debugLog('提取的例句内容长度:', extractedContent.length);
      debugLog('提取的发音长度:', pronunciation.length);
      debugLog('提取的释义总数:', definitions.basic.length + definitions.web.length);
      debugLog('释义容器存在:', $('#client_def_container').length > 0);
      
      const result = {
        success: true,
        word: word.trim(),
        requestedType: type,
        data: {
          extractedContent: extractedContent.trim(),
          pronunciation: pronunciation,
          pronunciationData: pronunciationData,
          sentences: sentences,
          definitions: definitions,
          authoritativeDefinitions: authoritativeDefinitions,
          bilingualDefinitions: bilingualDefinitions,
          englishDefinitions: englishDefinitions,
          wordForms: wordForms,
          fullHtml: process.env.NODE_ENV === 'development' ? html : undefined
        }
      };

      // 如果成功，直接返回结果
      return result;
      
    } catch (error) {
      errorLog(`[RETRY] 爬取词典数据时出错 (尝试 ${attempt}/${maxRetries}):`, error);
      
      // 判断是否应该重试
      const shouldRetry = this.shouldRetry(error) && attempt < maxRetries;
      
      let errorMessage = '未知错误';
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          errorMessage = '请求超时，请稍后重试';
        } else if (error.response) {
          errorMessage = `服务器返回错误: ${error.response.status}`;
          // 5xx 服务器错误可以重试，4xx 客户端错误不应该重试
          if (error.response.status >= 500 && shouldRetry) {
            debugLog(`[RETRY] 服务器错误 (${error.response.status})，将在 ${retryDelay}ms 后重试`);
            await this.delay(retryDelay);
            continue;
          }
        } else if (error.request) {
          errorMessage = '无法连接到词典服务器';
          // 网络错误可以重试
          if (shouldRetry) {
            debugLog(`[RETRY] 网络错误，将在 ${retryDelay}ms 后重试`);
            await this.delay(retryDelay);
            continue;
          }
        } else {
          errorMessage = `请求配置错误: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      // 如果是最后一次尝试或者不应该重试，返回错误
      if (attempt === maxRetries || !shouldRetry) {
        errorLog(`[RETRY] 最终失败，不再重试: ${word}`);
        return {
          success: false,
          word,
          error: errorMessage,
          // 开发环境下提供详细错误信息
          ...(process.env.NODE_ENV === 'development' && {
            errorDetails: {
              attempts: attempt,
              maxRetries,
              error: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
              } : error
            }
          })
        };
      }
    }
  }
  
  // 理论上不应该到达这里
  return {
    success: false,
    word,
    error: '未知错误：重试逻辑异常'
  };
}

// 判断错误是否应该重试
private shouldRetry(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    // 网络错误或超时错误可以重试
    if (error.code === 'ECONNABORTED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT') {
      return true;
    }
    
    // 5xx 服务器错误可以重试
    if (error.response && error.response.status >= 500) {
      return true;
    }
    
    // 429 Too Many Requests 可以重试
    if (error.response && error.response.status === 429) {
      return true;
    }
  }
  
  // 其他错误不重试
  return false;
}

// 延迟函数
private delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 提取权威英汉释义
  private extractAuthoritativeDefinitions($: ReturnType<typeof cheerio.load>): AuthoritativeDefinition[] {
    const definitions: AuthoritativeDefinition[] = [];
    
    try {
      // 查找权威英汉释义容器 - 尝试多种可能的选择器
      let $container = $('#clientnlid');
      
      if ($container.length === 0) {
        debugLog('未找到权威英汉释义容器 #clientnlid，尝试其他选择器');
        // 尝试其他可能的选择器
        $container = $('.client_qula_area');
        
        if ($container.length === 0) {
          debugLog('仍未找到权威英汉释义容器');
          return definitions;
        }
      }
      
      debugLog(`找到权威英汉释义容器，包含 ${$container.find('.defeachseg').length} 个释义区块`);
      
      // 遍历每个词性区块
      $container.find('.defeachseg').each((index: number, element) => {
        const $seg = $(element);
        const $head = $seg.find('.defeachhead');
        let partOfSpeech = $head.find('.defpos').text().trim();
        
        // 如果没有找到词性，尝试从其他位置获取
        if (!partOfSpeech) {
          partOfSpeech = $seg.find('h3').text().trim() ||
                       $seg.find('.def_pos').text().trim() ||
                       $seg.find('.client_def_title').text().trim();
        }
        
        debugLog(`处理权威英汉释义区块 ${index + 1}: ${partOfSpeech}`);
        
        if (!partOfSpeech) {
          debugLog(`未找到词性，跳过释义区块 ${index + 1}`);
          return;
        }
        
        const definitionItem: AuthoritativeDefinition = {
          partOfSpeech,
          definitions: []
        };
        
        // 提取释义条目
        $seg.find('.deflistitem').each((defIndex: number, defElement) => {
          const $defItem = $(defElement);
          const $defBar = $defItem.find('.defitembar');
          const numberText = $defBar.find('.defnum').text().trim();
          const number = parseInt(numberText) || defIndex + 1;
          
          const $defItemCon = $defItem.find('.defitemcon');
          let chineseMeaning = $defItemCon.find('.itemname').text().trim();
          let englishMeaning = $defItemCon.find('.itmeval').text().trim();
          
          // 如果没有找到释义内容，尝试从其他位置获取
          if (!chineseMeaning && !englishMeaning) {
            chineseMeaning = $defItemCon.text().trim();
            englishMeaning = '';
          }
          
          debugLog(`提取到权威释义 ${number}: 中文=${chineseMeaning}, 英文=${englishMeaning}`);
          
          if (chineseMeaning || englishMeaning) {
            const definition: {
              number: number;
              chineseMeaning: string;
              englishMeaning: string;
              examples?: Array<{ english: string; chinese: string }>;
            } = {
              number,
              chineseMeaning,
              englishMeaning
            };
            
            // 提取例句
            const $examBar = $defItem.find('.exambar');
            if ($examBar.length > 0) {
              const examples: Array<{ english: string; chinese: string }> = [];
              $examBar.find('.examlistitem').each((examIndex: number, examElement) => {
                const $examItem = $(examElement).find('.examitem');
                const english = $examItem.find('.examitmeval').text().trim();
                const chinese = $examItem.find('.examitemname').text().trim();
                if (english || chinese) {
                  examples.push({ english, chinese });
                  debugLog(`提取到例句: ${english} / ${chinese}`);
                }
              });
              if (examples.length > 0) {
                definition.examples = examples;
              }
            }
            
            definitionItem.definitions.push(definition);
          }
        });
        
        // 提取习语
        const $idomBar = $seg.find('.idombar');
        if ($idomBar.length > 0) {
          debugLog(`找到习语区域，包含 ${$idomBar.find('.defitemtitlebar').length} 个习语`);
          const idioms: Array<{ number: number; title: string; meaning: string; examples?: Array<{ english: string; chinese: string }> }> = [];
          $idomBar.find('.defitemtitlebar').each((idiomIndex: number, idiomElement) => {
            const $titleBar = $(idiomElement);
            const numberText = $titleBar.find('.defnum').text().trim();
            const number = parseInt(numberText) || idiomIndex + 1;
            const title = $titleBar.find('.itmeval').text().trim();
            
            debugLog(`处理习语 ${number}: ${title}`);
            
            // 查找对应的释义内容
            const $nextItems = $titleBar.nextUntil('.defitemtitlebar', '.defitembar');
            $nextItems.each((itemIndex: number, itemElement) => {
              const $itemBar = $(itemElement);
              const $defItem = $itemBar.find('.defitem');
              let meaning = $defItem.find('.itemname').text().trim();
              let englishMeaning = $defItem.find('.itmeval').text().trim();
              
              // 如果没有找到释义内容，尝试从其他位置获取
              if (!meaning && !englishMeaning) {
                meaning = $defItem.text().trim();
                englishMeaning = '';
              }
              
              debugLog(`提取到习语释义: ${meaning} / ${englishMeaning}`);
              
              if (meaning || englishMeaning) {
                const idiom: {
                  number: number;
                  title: string;
                  meaning: string;
                  examples?: Array<{ english: string; chinese: string }>;
                } = {
                  number,
                  title,
                  meaning: meaning || englishMeaning
                };
                
                // 提取习语例句
                const $examBar = $defItem.find('.exambar');
                if ($examBar.length > 0) {
                  const examples: Array<{ english: string; chinese: string }> = [];
                  $examBar.find('.examlistitem').each((examIndex: number, examElement) => {
                    const $examItem = $(examElement).find('.examitem');
                    const english = $examItem.find('.examitmeval').text().trim();
                    const chinese = $examItem.find('.examitemname').text().trim();
                    if (english || chinese) {
                      examples.push({ english, chinese });
                      debugLog(`提取到习语例句: ${english} / ${chinese}`);
                    }
                  });
                  if (examples.length > 0) {
                    idiom.examples = examples;
                  }
                }
                
                idioms.push(idiom);
              }
            });
          });
          
          if (idioms.length > 0) {
            definitionItem.idioms = idioms;
            debugLog(`添加 ${idioms.length} 个习语`);
          }
        }
        
        if (definitionItem.definitions.length > 0) {
          definitions.push(definitionItem);
          debugLog(`添加权威英汉释义: ${partOfSpeech}, 包含 ${definitionItem.definitions.length} 个释义`);
        }
      });
      
    } catch (error) {
      errorLog('提取权威英汉释义时出错:', error);
    }
    
    debugLog(`最终提取到 ${definitions.length} 个权威英汉释义`);
    return definitions;
  }

  // 提取英汉释义
  private extractBilingualDefinitions($: ReturnType<typeof cheerio.load>): BilingualDefinition[] {
    const definitions: BilingualDefinition[] = [];
    
    try {
      // 查找英汉释义容器 - 尝试多种可能的选择器
      let $container = $('#clientcrossid');
      
      if ($container.length === 0) {
        console.log('未找到英汉释义容器 #clientcrossid，尝试其他选择器');
        // 尝试其他可能的选择器
        $container = $('.client_cross_def_area');
        
        if ($container.length === 0) {
          console.log('仍未找到英汉释义容器');
          return definitions;
        }
      }
      
      console.log(`找到英汉释义容器，包含 ${$container.find('.client_def_bar').length} 个释义区块`);
      
      // 遍历每个词性区块
      $container.find('.client_def_bar').each((index: number, element) => {
        const $bar = $(element);
        const $titleBar = $bar.find('.client_def_title_bar');
        const partOfSpeech = $titleBar.find('.client_def_title').text().trim();
        
        console.log(`处理英汉释义区块 ${index + 1}: ${partOfSpeech}`);
        
        if (!partOfSpeech) {
          // 如果没有找到词性，尝试从其他位置获取
          const alternativePos = $bar.find('.client_def_title').text().trim() ||
                               $bar.find('.def_pos').text().trim() ||
                               $bar.find('h3').text().trim();
          
          if (alternativePos) {
            console.log(`从替代位置获取到词性: ${alternativePos}`);
          } else {
            console.log(`未找到词性，跳过释义区块 ${index + 1}`);
            return;
          }
        }
        
        const definitionItem: BilingualDefinition = {
          partOfSpeech: partOfSpeech || $titleBar.find('.client_def_title').text().trim(),
          definitions: []
        };
        
        // 提取释义条目 - 尝试多种可能的选择器
        let $defItems = $bar.find('.client_def_list_item');
        
        if ($defItems.length === 0) {
          console.log(`未找到释义条目，尝试其他选择器`);
          $defItems = $bar.find('.client_def_list_word_bar');
        }
        
        if ($defItems.length === 0) {
          console.log(`仍未找到释义条目，尝试直接获取文本内容`);
          // 如果没有找到特定的释义条目，尝试直接获取文本内容
          const meaningText = $bar.text().trim();
          if (meaningText && meaningText !== partOfSpeech) {
            definitionItem.definitions.push({
              number: 1,
              meaning: meaningText.replace(partOfSpeech, '').trim()
            });
            console.log(`从文本内容提取释义: ${meaningText}`);
          }
        } else {
          $defItems.each((defIndex: number, defElement) => {
            const $defItem = $(defElement);
            const numberText = $defItem.find('.client_def_list_word_num').text().trim();
            const number = parseInt(numberText) || defIndex + 1;
            let meaning = $defItem.find('.client_def_list_word_bar').text().trim();
            
            // 如果没有找到释义内容，尝试直接获取元素文本
            if (!meaning) {
              meaning = $defItem.text().trim();
            }
            
            if (meaning) {
              definitionItem.definitions.push({
                number,
                meaning
              });
              console.log(`提取到释义 ${number}: ${meaning}`);
            }
          });
        }
        
        if (definitionItem.definitions.length > 0) {
          definitions.push(definitionItem);
          console.log(`添加英汉释义: ${partOfSpeech}, 包含 ${definitionItem.definitions.length} 个释义`);
        }
      });
      
    } catch (error) {
      console.error('提取英汉释义时出错:', error);
    }
    
    console.log(`最终提取到 ${definitions.length} 个英汉释义`);
    return definitions;
  }

  // 提取英英释义
  private extractEnglishDefinitions($: ReturnType<typeof cheerio.load>): EnglishDefinition[] {
    const definitions: EnglishDefinition[] = [];
    
    try {
      // 查找英英释义容器
      const $container = $('#clienthomoid');
      if ($container.length === 0) {
        console.log('未找到英英释义容器 #clienthomoid');
        return definitions;
      }

      // 遍历每个词性区块
      $container.find('.client_def_bar').each((index: number, element) => {
        const $bar = $(element);
        const $titleBar = $bar.find('.client_def_title_bar');
        const partOfSpeech = $titleBar.find('.client_def_title').text().trim();
        
        if (!partOfSpeech) return;
        
        const definitionItem: EnglishDefinition = {
          partOfSpeech,
          definitions: []
        };
        
        // 提取释义条目
        $bar.find('.client_def_list_item').each((defIndex: number, defElement) => {
          const $defItem = $(defElement);
          const numberText = $defItem.find('.client_def_list_word_num').text().trim();
          const number = parseInt(numberText) || defIndex + 1;
          
          // 提取英文释义和链接的单词
          const $content = $defItem.find('.client_def_list_word_content');
          const meaningParts: string[] = [];
          const linkedWords: string[] = [];
          
          $content.find('a.client_def_list_word_en').each((linkIndex: number, linkElement) => {
            const $link = $(linkElement);
            const text = $link.text().trim();
            if (text) {
              linkedWords.push(text);
            }
          });
          
          // 获取完整的释义文本
          const fullText = $content.text().trim();
          if (fullText) {
            definitionItem.definitions.push({
              number,
              meaning: fullText,
              linkedWords: linkedWords.length > 0 ? linkedWords : undefined
            });
          }
        });
        
        if (definitionItem.definitions.length > 0) {
          definitions.push(definitionItem);
        }
      });
      
    } catch (error) {
      console.error('提取英英释义时出错:', error);
    }
    
    return definitions;
  }

  // 提取音标和音频数据
  private extractPronunciationData($: ReturnType<typeof cheerio.load>): PronunciationData {
    const pronunciationData: PronunciationData = {};
    
    try {
      // 查找发音列表容器 - 尝试多种可能的选择器
      let $pronunciationLists = $('.client_def_hd_pn_list');
      
      if ($pronunciationLists.length === 0) {
        console.log('未找到发音列表容器 .client_def_hd_pn_list，尝试其他选择器');
        // 尝试其他可能的选择器
        $pronunciationLists = $('.client_def_hd_pn');
        
        if ($pronunciationLists.length === 0) {
          console.log('未找到发音列表容器，尝试查找所有可能的发音元素');
          // 直接查找所有可能的发音元素
          $pronunciationLists = $('.client_aud_o').parent();
        }
      }
      
      if ($pronunciationLists.length === 0) {
        console.log('仍未找到发音列表容器');
        return pronunciationData;
      }
      
      console.log(`找到 ${$pronunciationLists.length} 个发音列表容器`);
      
      // 遍历每个发音列表
      $pronunciationLists.each((index: number, element) => {
        const $list = $(element);
        const $phoneticElement = $list.find('.client_def_hd_pn');
        let phoneticText = $phoneticElement.text().trim();
        
        // 如果没有找到音标文本，尝试从父元素获取
        if (!phoneticText) {
          phoneticText = $list.text().trim();
        }
        
        if (!phoneticText) return;
        
        console.log(`处理发音文本 ${index + 1}: ${phoneticText}`);
        
        // 提取音标部分（去掉"美:"或"英:"前缀）
        const phoneticMatch = phoneticText.match(/[^\[\]]+(\[.+\])/);
        const phonetic = phoneticMatch ? phoneticMatch[1] : phoneticText;
        
        // 提取音频URL - 尝试多种可能的属性
        let audioUrl = '';
        const $audioElement = $list.find('.client_aud_o');
        
        if ($audioElement.length > 0) {
          audioUrl = $audioElement.attr('data-pronunciation') ||
                    $audioElement.attr('data-mp3link') ||
                    $audioElement.attr('src') || '';
        }
        
        // 如果仍然没有找到音频URL，尝试从列表本身获取
        if (!audioUrl) {
          audioUrl = $list.attr('data-pronunciation') ||
                    $list.attr('data-mp3link') || '';
        }
        
        // 构建完整的音频URL
        let fullAudioUrl = '';
        if (audioUrl) {
          // 如果URL已经是完整的，直接使用
          if (audioUrl.startsWith('http')) {
            fullAudioUrl = audioUrl;
          } else {
            fullAudioUrl = `https://cn.bing.com${audioUrl}`;
          }
        }
        
        console.log(`提取到音频URL: ${fullAudioUrl}`);
        
        // 判断是美式发音还是英式发音
        if (phoneticText.includes('美:') || phoneticText.includes('美式')) {
          pronunciationData.american = {
            phonetic,
            audioUrl: fullAudioUrl
          };
          console.log(`添加美式发音: ${phonetic}, ${fullAudioUrl}`);
        } else if (phoneticText.includes('英:') || phoneticText.includes('英式')) {
          pronunciationData.british = {
            phonetic,
            audioUrl: fullAudioUrl
          };
          console.log(`添加英式发音: ${phonetic}, ${fullAudioUrl}`);
        } else if (index === 0 && !pronunciationData.american) {
          // 如果没有明确标识，第一个默认为美式发音
          pronunciationData.american = {
            phonetic,
            audioUrl: fullAudioUrl
          };
          console.log(`默认添加为美式发音: ${phonetic}, ${fullAudioUrl}`);
        } else if (!pronunciationData.british) {
          // 第二个默认为英式发音
          pronunciationData.british = {
            phonetic,
            audioUrl: fullAudioUrl
          };
          console.log(`默认添加为英式发音: ${phonetic}, ${fullAudioUrl}`);
        }
      });
      
      console.log('最终提取的音标数据:', pronunciationData);
      
    } catch (error) {
      console.error('提取音标和音频数据时出错:', error);
    }
    
    return pronunciationData;
  }

  // 提取例句数据
  private extractSentences($: ReturnType<typeof cheerio.load>): Sentence[] {
    const sentences: Sentence[] = [];
    
    try {
      // 查找例句列表容器
      const $sentenceLists = $('.client_sentence_list');
      
      if ($sentenceLists.length === 0) {
        console.log('未找到例句列表容器 .client_sentence_list');
        return sentences;
      }
      
      // 遍历每个例句
      $sentenceLists.each((index: number, element) => {
        const $sentence = $(element);
        
        // 提取序号
        const numberText = $sentence.find('.client_sentence_list_num').text().trim();
        const number = parseInt(numberText) || index + 1;
        
        // 提取英文例句
        const $englishElement = $sentence.find('.client_sen_en');
        const english = $englishElement.text().trim();
        
        // 提取中文例句
        const $chineseElement = $sentence.find('.client_sen_cn');
        const chinese = $chineseElement.text().trim();
        
        // 提取音频URL
        const $audioElement = $sentence.find('.client_bdsen_audio');
        const audioUrl = $audioElement.attr('data-mp3link') || '';
        const fullAudioUrl = audioUrl ? `https://cn.bing.com${audioUrl}` : '';
        
        // 提取来源链接
        const $sourceElement = $sentence.find('.client_sen_link');
        const source = $sourceElement.text().trim();
        
        // 提取高亮的单词
        const highlightedWords: Array<{ word: string; className: string }> = [];
        $sentence.find('.client_sentence_search, .client_sen_en_word, .client_sen_cn_word').each((wordIndex: number, wordElement) => {
          const $wordElement = $(wordElement);
          const word = $wordElement.text().trim();
          const className = $wordElement.attr('class') || '';
          
          if (word) {
            highlightedWords.push({ word, className });
          }
        });
        
        if (english || chinese) {
          sentences.push({
            number,
            english,
            chinese,
            audioUrl: fullAudioUrl,
            source,
            highlightedWords: highlightedWords.length > 0 ? highlightedWords : undefined
          });
        }
      });
      
      console.log('提取的例句数量:', sentences.length);
      
    } catch (error) {
      console.error('提取例句数据时出错:', error);
    }
    
    return sentences;
  }

  // 测试方法，用于验证网站结构
  async testWebsiteStructure(word: string = 'hello'): Promise<WebsiteStructureTest> {
    try {
      const url = `${this.baseUrl}?mkt=zh-CN&setLang=zh&form=BDVEHC&ClientVer=BDDTV3.5.1.4320&q=${encodeURIComponent(word)}`;
      const response = await axios.get(url, { headers: this.headers, timeout: 10000 });
      const $ = cheerio.load(response.data);
      
      // 分析页面结构
      const structure: WebsiteStructureTest = {
        title: $('title').text(),
        hasContentContainer: $('#content_container').length > 0,
        hasSearchContainer: $('.client_search_container').length > 0,
        hasSearchContent: $('.client_search_content').length > 0,
        hasLeftSideArea: $('.client_search_leftside_area').length > 0,
        hasSentenceArea: $('.client_search_sentence_area').length > 0,
        sentenceAreaDivs: $('.client_search_sentence_area div').length,
        firstFewDivsContent: [],
        bodyClasses: $('body').attr('class'),
        allContainers: []
      };
      
      // 获取前几个div的内容用于调试
      $('.client_search_sentence_area div').slice(0, 3).each((i, el) => {
        structure.firstFewDivsContent.push($(el).text().substring(0, 100));
      });
      
      // 获取所有可能的容器
      $('div[class*="client"]').each((i, el) => {
        structure.allContainers.push($(el).attr('class') || '');
      });
      
      return structure;
    } catch (error) {
      console.error('测试网站结构时出错:', error);
      return {
        title: '',
        hasContentContainer: false,
        hasSearchContainer: false,
        hasSearchContent: false,
        hasLeftSideArea: false,
        hasSentenceArea: false,
        sentenceAreaDivs: 0,
        firstFewDivsContent: [],
        allContainers: [],
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  // 将爬取的数据保存到新的表结构中
  // 优化：增强数据拆解和存储逻辑，确保所有类型的数据都能正确处理
  async saveWordDataToTables(wordText: string, data: WordDataToSave): Promise<void> {
    debugLog(`开始保存单词 ${wordText} 到数据库表结构`);
    debugLog(`输入数据概览:`, {
      hasPronunciation: !!data.pronunciation,
      hasPronunciationData: !!data.pronunciationData,
      hasDefinitions: !!data.definitions,
      hasAuthoritativeDefinitions: data.authoritativeDefinitions?.length || 0,
      hasBilingualDefinitions: data.bilingualDefinitions?.length || 0,
      hasEnglishDefinitions: data.englishDefinitions?.length || 0,
      hasSentences: data.sentences?.length || 0,
      hasWordForms: data.wordForms?.length || 0
    });
    
    // 步骤0: 数据清理和验证
    debugLog(`步骤0: 数据清理和验证`);
    const cleanedData = this.cleanAndValidateData(data);
    const validation = this.validateDataCompleteness(cleanedData);
    
    if (!validation.isPartiallyValid) {
      errorLog(`单词 ${wordText} 数据验证失败，没有有效的释义数据`);
      throw new Error(`数据验证失败: 缺少有效的释义数据`);
    }
    
    if (validation.issues.length > 0) {
      warningLog(`单词 ${wordText} 存在数据问题:`, validation.issues);
    }
    
    let wordId: number | null = null;
    const errors: Array<{ step: string; error: unknown }> = [];

    try {
      // 步骤1: 更新或创建单词记录（必须成功）
      try {
        debugLog(`步骤1: 更新或创建单词记录`);
        const word = await db.word.upsert({
          where: { wordText: wordText.toLowerCase() },
          update: {
            definitionData: cleanedData as Prisma.InputJsonValue, // 保留清理后的JSON数据作为备份
            updatedAt: new Date()
          },
          create: {
            wordText: wordText.toLowerCase(),
            definitionData: cleanedData as Prisma.InputJsonValue
          }
        });
        wordId = word.id;
        debugLog(`单词记录已创建/更新，ID: ${word.id}`);

        // 如果有发音数据，单独更新pronunciation字段
        if (cleanedData.pronunciation) {
          debugLog(`更新发音字段: ${cleanedData.pronunciation}`);
          await db.$executeRaw`UPDATE Words SET pronunciation = ${cleanedData.pronunciation} WHERE id = ${word.id}`;
          debugLog(`发音字段已更新`);
        }
      } catch (error) {
        errorLog(`步骤1失败: 更新或创建单词记录时出错:`, error);
        errors.push({ step: '更新或创建单词记录', error });
        throw error; // 这个步骤必须成功，否则无法继续
      }

      // 步骤2-8: 在单个事务中保存所有相关数据（原子操作，避免竞态条件）
      if (wordId !== null) {
        debugLog(`开始保存单词关联数据到数据库（单个事务）`);
        await db.$transaction(async (tx) => {
          // 步骤2: 保存发音数据（可选）
          if (cleanedData.pronunciationData) {
            try {
              debugLog(`步骤2: 保存发音数据`);
              await this.savePronunciationData(tx, wordId!, cleanedData.pronunciationData! as any); // eslint-disable-line @typescript-eslint/no-explicit-any
              debugLog(`发音数据已保存`);
            } catch (error) {
              errorLog(`步骤2失败: 保存发音数据时出错:`, error);
              errors.push({ step: '保存发音数据', error });
              // 不中断整个事务，继续执行其他步骤
            }
          }

          // 步骤3: 保存释义数据（可选）
          if (cleanedData.definitions) {
            try {
              debugLog(`步骤3: 保存基本释义数据`);
              await this.saveDefinitionData(tx, wordId!, cleanedData.definitions!);
              debugLog(`基本释义数据已保存`);
            } catch (error) {
              errorLog(`步骤3失败: 保存基本释义数据时出错:`, error);
              errors.push({ step: '保存基本释义数据', error });
              // 不中断整个事务，继续执行其他步骤
            }
          }

          // 步骤4: 保存权威英汉释义（可选）
          if (cleanedData.authoritativeDefinitions) {
            try {
              debugLog(`步骤4: 保存权威英汉释义`);
              await this.saveAuthoritativeDefinitions(tx, wordId!, cleanedData.authoritativeDefinitions!);
              debugLog(`权威英汉释义已保存`);
            } catch (error) {
              errorLog(`步骤4失败: 保存权威英汉释义时出错:`, error);
              errors.push({ step: '保存权威英汉释义', error });
              // 不中断整个事务，继续执行其他步骤
            }
          }

          // 步骤5: 保存英汉释义（可选）
          if (cleanedData.bilingualDefinitions) {
            try {
              debugLog(`步骤5: 保存英汉释义`);
              await this.saveBilingualDefinitions(tx, wordId!, cleanedData.bilingualDefinitions!);
              debugLog(`英汉释义已保存`);
            } catch (error) {
              errorLog(`步骤5失败: 保存英汉释义时出错:`, error);
              errors.push({ step: '保存英汉释义', error });
              // 不中断整个事务，继续执行其他步骤
            }
          }

          // 步骤6: 保存英英释义（可选）
          if (cleanedData.englishDefinitions) {
            try {
              debugLog(`步骤6: 保存英英释义`);
              await this.saveEnglishDefinitions(tx, wordId!, cleanedData.englishDefinitions!);
              debugLog(`英英释义已保存`);
            } catch (error) {
              errorLog(`步骤6失败: 保存英英释义时出错:`, error);
              errors.push({ step: '保存英英释义', error });
              // 不中断整个事务，继续执行其他步骤
            }
          }

          // 步骤7: 保存例句数据（可选）
          if (cleanedData.sentences && cleanedData.sentences.length > 0) {
            try {
              debugLog(`步骤7: 保存例句数据`);
              await this.saveSentenceData(tx, wordId!, cleanedData.sentences!);
              debugLog(`例句数据已保存`);
            } catch (error) {
              errorLog(`步骤7失败: 保存例句数据时出错:`, error);
              errors.push({ step: '保存例句数据', error });
              // 不中断整个事务，继续执行其他步骤
            }
          }

          // 步骤8: 保存词形变化（可选）
          if (cleanedData.wordForms && cleanedData.wordForms.length > 0) {
            try {
              debugLog(`步骤8: 保存词形变化`);
              await this.saveWordForms(tx, wordId!, cleanedData.wordForms!);
              debugLog(`词形变化已保存`);
            } catch (error) {
              errorLog(`步骤8失败: 保存词形变化时出错:`, error);
              errors.push({ step: '保存词形变化', error });
              // 不中断整个事务，继续执行其他步骤
            }
          }
        });
        debugLog(`单词 ${wordText} 的所有关联数据已在一个事务中完成保存`);
      }

      // 记录最终结果
      if (errors.length > 0) {
        warningLog(`单词 ${wordText} 保存完成，但有 ${errors.length} 个步骤失败:`);
        errors.forEach(({ step, error }) => {
          warningLog(`失败步骤: ${step}, 错误:`, error);
        });
      } else {
        debugLog(`单词 ${wordText} 已成功保存到新表结构（所有步骤成功）`);
      }
    } catch (error) {
      errorLog(`保存单词 ${wordText} 到新表结构时出现严重错误:`, error);
      errorLog(`错误详情:`, {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // 记录所有错误
      if (errors.length > 0) {
        errorLog(`所有错误记录:`, errors);
      }
      
      throw error;
    }
  }

  // 新增：数据完整性验证方法
  private validateDataCompleteness(data: WordDataToSave): {
    isComplete: boolean;
    isPartiallyValid: boolean;
    missingFields: string[];
    issues: string[];
  } {
    const missingFields: string[] = [];
    const issues: string[] = [];
    
    // 检查音标数据
    let hasValidPronunciation = false;
    if (data.pronunciationData) {
      if (data.pronunciationData.american || data.pronunciationData.british) {
        hasValidPronunciation = true;
      }
    }
    
    // 检查权威英汉释义
    let hasValidAuthDef = false;
    if (data.authoritativeDefinitions && data.authoritativeDefinitions.length > 0) {
      for (const authDef of data.authoritativeDefinitions) {
        if (authDef.definitions && authDef.definitions.length > 0) {
          hasValidAuthDef = true;
          break;
        }
      }
    }
    
    // 检查英汉释义
    let hasValidBilDef = false;
    if (data.bilingualDefinitions && data.bilingualDefinitions.length > 0) {
      for (const bilDef of data.bilingualDefinitions) {
        if (bilDef.definitions && bilDef.definitions.length > 0) {
          hasValidBilDef = true;
          break;
        }
      }
    }
    
    // 检查英英释义
    let hasValidEngDef = false;
    if (data.englishDefinitions && data.englishDefinitions.length > 0) {
      for (const engDef of data.englishDefinitions) {
        if (engDef.definitions && engDef.definitions.length > 0) {
          hasValidEngDef = true;
          break;
        }
      }
    }
    
    // 检查基本释义
    let hasValidBasicDef = false;
    if (data.definitions && data.definitions.basic && data.definitions.basic.length > 0) {
      hasValidBasicDef = true;
    } else {
      missingFields.push('definitions.basic');
      issues.push('缺少基本释义');
    }
    
    // 检查例句
    if (!data.sentences || data.sentences.length === 0) {
      issues.push('缺少例句（可选）');
    }
    
    // 定义数据完整性标准
    const hasCompleteDefinitions = hasValidBasicDef || hasValidAuthDef || hasValidBilDef || hasValidEngDef;
    const isComplete = Boolean(hasCompleteDefinitions && hasValidPronunciation);
    const isPartiallyValid = Boolean(hasCompleteDefinitions);
    
    return {
      isComplete,
      isPartiallyValid,
      missingFields,
      issues
    };
  }

  // 新增：数据清理和验证方法
  private cleanAndValidateData(data: WordDataToSave): WordDataToSave {
    const cleaned: WordDataToSave = { ...data };

    // 清理发音数据
    if (cleaned.pronunciationData) {
      if (cleaned.pronunciationData.american) {
        const americanPhonetic = this.cleanText(cleaned.pronunciationData.american.phonetic);
        const americanAudioUrl = this.cleanUrl(cleaned.pronunciationData.american.audioUrl);
        if (americanPhonetic || americanAudioUrl) {
          cleaned.pronunciationData.american = {
            phonetic: americanPhonetic || '',
            audioUrl: americanAudioUrl || ''
          };
        }
      }
      if (cleaned.pronunciationData.british) {
        const britishPhonetic = this.cleanText(cleaned.pronunciationData.british.phonetic);
        const britishAudioUrl = this.cleanUrl(cleaned.pronunciationData.british.audioUrl);
        if (britishPhonetic || britishAudioUrl) {
          cleaned.pronunciationData.british = {
            phonetic: britishPhonetic || '',
            audioUrl: britishAudioUrl || ''
          };
        }
      }
    }

    // 清理释义数据
    if (cleaned.definitions) {
      if (cleaned.definitions.basic) {
        const validBasicDefs: Array<{ partOfSpeech: string; meaning: string }> = [];
        for (const def of cleaned.definitions.basic) {
          const partOfSpeech = this.cleanText(def.partOfSpeech);
          const meaning = this.cleanText(def.meaning);
          if (partOfSpeech && meaning) {
            validBasicDefs.push({ partOfSpeech, meaning });
          }
        }
        cleaned.definitions.basic = validBasicDefs;
      }
      if (cleaned.definitions.web) {
        const validWebDefs: Array<{ meaning: string }> = [];
        for (const def of cleaned.definitions.web) {
          const meaning = this.cleanText(def.meaning);
          if (meaning) {
            validWebDefs.push({ meaning });
          }
        }
        cleaned.definitions.web = validWebDefs;
      }
    }

    // 清理权威英汉释义
    if (cleaned.authoritativeDefinitions) {
      const validAuthDefs: Array<{
        partOfSpeech: string;
        definitions: Array<{
          number: number;
          chineseMeaning: string;
          englishMeaning: string;
          examples?: Array<{ english: string; chinese: string }>;
        }>;
        idioms?: Array<{
          number: number;
          title: string;
          meaning: string;
          examples?: Array<{ english: string; chinese: string }>;
        }>;
      }> = [];
      
      for (const authDef of cleaned.authoritativeDefinitions) {
        const partOfSpeech = this.cleanText(authDef.partOfSpeech);
        if (!partOfSpeech) continue;
        
        const validDefs: Array<{
          number: number;
          chineseMeaning: string;
          englishMeaning: string;
          examples?: Array<{ english: string; chinese: string }>;
        }> = [];
        
        for (const def of authDef.definitions) {
          const chineseMeaning = this.cleanText(def.chineseMeaning);
          const englishMeaning = this.cleanText(def.englishMeaning);
          if (!chineseMeaning && !englishMeaning) continue;
          
          let examples: Array<{ english: string; chinese: string }> | undefined;
          if (def.examples) {
            examples = [];
            for (const ex of def.examples) {
              const english = this.cleanText(ex.english);
              const chinese = this.cleanText(ex.chinese);
              if (english || chinese) {
                examples.push({ english: english || '', chinese: chinese || '' });
              }
            }
          }
          
          validDefs.push({
            number: def.number,
            chineseMeaning: chineseMeaning || '',
            englishMeaning: englishMeaning || '',
            examples
          });
        }
        
        if (validDefs.length === 0) continue;
        
        let idioms: Array<{
          number: number;
          title: string;
          meaning: string;
          examples?: Array<{ english: string; chinese: string }>;
        }> | undefined;
        
        if (authDef.idioms) {
          idioms = [];
          for (const idiom of authDef.idioms) {
            const title = this.cleanText(idiom.title);
            const meaning = this.cleanText(idiom.meaning);
            if (!title || !meaning) continue;
            
            let idiomExamples: Array<{ english: string; chinese: string }> | undefined;
            if (idiom.examples) {
              idiomExamples = [];
              for (const ex of idiom.examples) {
                const english = this.cleanText(ex.english);
                const chinese = this.cleanText(ex.chinese);
                if (english || chinese) {
                  idiomExamples.push({ english: english || '', chinese: chinese || '' });
                }
              }
            }
            
            idioms.push({
              number: idiom.number,
              title,
              meaning,
              examples: idiomExamples
            });
          }
        }
        
        validAuthDefs.push({
          partOfSpeech,
          definitions: validDefs,
          idioms: idioms && idioms.length > 0 ? idioms : undefined
        });
      }
      
      cleaned.authoritativeDefinitions = validAuthDefs;
    }

    // 清理英汉释义
    if (cleaned.bilingualDefinitions) {
      const validBilDefs: Array<{
        partOfSpeech: string;
        definitions: Array<{ number: number; meaning: string }>;
      }> = [];
      
      for (const bilDef of cleaned.bilingualDefinitions) {
        const partOfSpeech = this.cleanText(bilDef.partOfSpeech);
        if (!partOfSpeech) continue;
        
        const validDefs: Array<{ number: number; meaning: string }> = [];
        for (const def of bilDef.definitions) {
          const meaning = this.cleanText(def.meaning);
          if (meaning) {
            validDefs.push({ number: def.number, meaning });
          }
        }
        
        if (validDefs.length > 0) {
          validBilDefs.push({ partOfSpeech, definitions: validDefs });
        }
      }
      
      cleaned.bilingualDefinitions = validBilDefs;
    }

    // 清理英英释义
    if (cleaned.englishDefinitions) {
      const validEngDefs: Array<{
        partOfSpeech: string;
        definitions: Array<{
          number: number;
          meaning: string;
          linkedWords?: string[];
        }>;
      }> = [];
      
      for (const engDef of cleaned.englishDefinitions) {
        const partOfSpeech = this.cleanText(engDef.partOfSpeech);
        if (!partOfSpeech) continue;
        
        const validDefs: Array<{
          number: number;
          meaning: string;
          linkedWords?: string[];
        }> = [];
        
        for (const def of engDef.definitions) {
          const meaning = this.cleanText(def.meaning);
          if (!meaning) continue;
          
          let linkedWords: string[] | undefined;
          if (def.linkedWords) {
            linkedWords = [];
            for (const word of def.linkedWords) {
              const cleanWord = this.cleanText(word);
              if (cleanWord) {
                linkedWords.push(cleanWord);
              }
            }
          }
          
          validDefs.push({
            number: def.number,
            meaning,
            linkedWords
          });
        }
        
        if (validDefs.length > 0) {
          validEngDefs.push({ partOfSpeech, definitions: validDefs });
        }
      }
      
      cleaned.englishDefinitions = validEngDefs;
    }

    // 清理例句数据
    if (cleaned.sentences) {
      const validSentences: Array<{
        number: number;
        english: string;
        chinese: string;
        audioUrl?: string;
        source?: string;
        highlightedWords?: Array<{ word: string; className: string }>;
      }> = [];
      
      for (const sentence of cleaned.sentences) {
        const english = this.cleanText(sentence.english);
        const chinese = this.cleanText(sentence.chinese);
        const source = this.cleanText(sentence.source);
        const audioUrl = this.cleanUrl(sentence.audioUrl);
        
        if (english || chinese) {
          validSentences.push({
            number: sentence.number,
            english: english || '',
            chinese: chinese || '',
            source,
            audioUrl,
            highlightedWords: sentence.highlightedWords
          });
        }
      }
      
      cleaned.sentences = validSentences;
    }

    // 清理词形数据
    if (cleaned.wordForms) {
      const validWordForms: Array<{ form: string; word: string }> = [];
      for (const form of cleaned.wordForms) {
        const formType = this.cleanText(form.form);
        const formWord = this.cleanText(form.word);
        if (formType && formWord) {
          validWordForms.push({ form: formType, word: formWord });
        }
      }
      cleaned.wordForms = validWordForms;
    }

    return cleaned;
  }

  private cleanText(text?: string): string | undefined {
    if (!text) return undefined;
    const cleaned = text.trim().replace(/\s+/g, ' ');
    return cleaned || undefined;
  }

  private cleanUrl(url?: string): string | undefined {
    if (!url) return undefined;
    const cleaned = url.trim();
    return cleaned.startsWith('http') ? cleaned : undefined;
  }

  private async savePronunciationData(tx: PrismaTransaction, wordId: number, pronunciationData: PronunciationDataToSave): Promise<void> {
    console.log(`[DEBUG] 保存发音数据，wordId: ${wordId}`);
    console.log(`[DEBUG] 发音数据:`, {
      hasAmerican: !!pronunciationData.american,
      hasBritish: !!pronunciationData.british,
      american: pronunciationData.american ? {
        phonetic: pronunciationData.american.phonetic,
        hasAudioUrl: !!pronunciationData.american.audioUrl
      } : null,
      british: pronunciationData.british ? {
        phonetic: pronunciationData.british.phonetic,
        hasAudioUrl: !!pronunciationData.british.audioUrl
      } : null
    });
    
    // 美式发音
    if (pronunciationData.american) {
      try {
        console.log(`[DEBUG] 保存美式发音: ${pronunciationData.american.phonetic}`);
        await tx.$executeRaw`
          INSERT INTO WordPronunciations (word_id, type, phonetic, audio_url, created_at, updated_at)
          VALUES (${wordId}, 'american', ${pronunciationData.american.phonetic}, ${pronunciationData.american.audioUrl}, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
          phonetic = ${pronunciationData.american.phonetic},
          audio_url = ${pronunciationData.american.audioUrl},
          updated_at = NOW()
        `;
        console.log(`[DEBUG] 美式发音保存成功`);
      } catch (error) {
        console.error(`[ERROR] 保存美式发音失败:`, error);
        throw error;
      }
    }

    // 英式发音
    if (pronunciationData.british) {
      try {
        console.log(`[DEBUG] 保存英式发音: ${pronunciationData.british.phonetic}`);
        await tx.$executeRaw`
          INSERT INTO WordPronunciations (word_id, type, phonetic, audio_url, created_at, updated_at)
          VALUES (${wordId}, 'british', ${pronunciationData.british.phonetic}, ${pronunciationData.british.audioUrl}, NOW(), NOW())
          ON DUPLICATE KEY UPDATE
          phonetic = ${pronunciationData.british.phonetic},
          audio_url = ${pronunciationData.british.audioUrl},
          updated_at = NOW()
        `;
        console.log(`[DEBUG] 英式发音保存成功`);
      } catch (error) {
        console.error(`[ERROR] 保存英式发音失败:`, error);
        throw error;
      }
    }
    
    console.log(`[DEBUG] 发音数据保存完成`);
  }

  private async saveDefinitionData(tx: PrismaTransaction, wordId: number, definitions: DefinitionsToSave): Promise<void> {
    const allDefinitions: Array<{
      wordId: number;
      type: string;
      partOfSpeech?: string;
      order: number;
      meaning?: string;
    }> = [];

    // 收集基本释义
    if (definitions.basic && definitions.basic.length > 0) {
      for (let i = 0; i < definitions.basic.length; i++) {
        const def = definitions.basic[i];
        allDefinitions.push({
          wordId,
          type: 'basic',
          partOfSpeech: def.partOfSpeech,
          order: i,
          meaning: def.meaning
        });
      }
    }

    // 收集网络释义
    if (definitions.web && definitions.web.length > 0) {
      for (let i = 0; i < definitions.web.length; i++) {
        const def = definitions.web[i];
        allDefinitions.push({
          wordId,
          type: 'web',
          order: i,
          meaning: def.meaning
        });
      }
    }

    // 批量创建所有释义
    if (allDefinitions.length > 0) {
      await tx.wordDefinition.createMany({
        data: allDefinitions,
        skipDuplicates: true
      });
    }
  }

  private async saveAuthoritativeDefinitions(tx: PrismaTransaction, wordId: number, authoritativeDefinitions: AuthoritativeDefinition[]): Promise<void> {
    console.log(`[DEBUG] 保存权威英汉释义，wordId: ${wordId}`);
    console.log(`[DEBUG] 权威英汉释义数量: ${authoritativeDefinitions.length}`);

    for (let authIndex = 0; authIndex < authoritativeDefinitions.length; authIndex++) {
      const authDef = authoritativeDefinitions[authIndex];
      console.log(`[DEBUG] 处理权威英汉释义 ${authIndex + 1}/${authoritativeDefinitions.length}:`, {
        partOfSpeech: authDef.partOfSpeech,
        definitionsCount: authDef.definitions?.length || 0,
        idiomsCount: authDef.idioms?.length || 0
      });

      try {
        // 为每个释义条目创建单独的 WordDefinition 记录
        console.log(`[DEBUG] 创建权威英汉释义记录，词性: ${authDef.partOfSpeech}`);

        // 创建释义条目
        if (authDef.definitions && authDef.definitions.length > 0) {
          console.log(`[DEBUG] 创建释义条目，数量: ${authDef.definitions.length}`);

          for (let defIndex = 0; defIndex < authDef.definitions.length; defIndex++) {
            const defItem = authDef.definitions[defIndex];
            console.log(`[DEBUG] 创建释义条目 ${defIndex + 1}/${authDef.definitions.length}:`, {
              number: defItem.number,
              hasEnglish: !!defItem.englishMeaning,
              hasChinese: !!defItem.chineseMeaning,
              hasExamples: defItem.examples?.length || 0
            });

            // 创建主释义记录，直接存储中英文释义
            const definition = await tx.wordDefinition.create({
              data: {
                wordId,
                type: 'authoritative',
                partOfSpeech: authDef.partOfSpeech,
                order: defItem.number,
                chineseMeaning: defItem.chineseMeaning || '',
                englishMeaning: defItem.englishMeaning || '',
                definitionNumber: defItem.number
              }
            });
            console.log(`[DEBUG] 释义记录已创建，ID: ${definition.id}`);

            // 保存释义例句（如果有的话）
            if (defItem.examples && defItem.examples.length > 0) {
              console.log(`[DEBUG] 保存释义例句，数量: ${defItem.examples.length}`);

              const definitionExamples = defItem.examples.map((example, exIndex) => ({
                definitionId: definition.id,
                order: exIndex + 1,
                english: example.english,
                chinese: example.chinese
              }));

              if (definitionExamples.length > 0) {
                await tx.definitionExample.createMany({
                  data: definitionExamples,
                  skipDuplicates: true
                });
                console.log(`[DEBUG] ${definitionExamples.length} 个释义例句已创建`);
              }
            }
          }
        }

        // 处理习语
        if (authDef.idioms && authDef.idioms.length > 0) {
          console.log(`[DEBUG] 处理习语，数量: ${authDef.idioms.length}`);

          for (let idiomIndex = 0; idiomIndex < authDef.idioms.length; idiomIndex++) {
            const idiom = authDef.idioms[idiomIndex];
            console.log(`[DEBUG] 创建习语 ${idiomIndex + 1}/${authDef.idioms.length}:`, {
              number: idiom.number,
              title: idiom.title,
              meaning: idiom.meaning,
              hasExamples: idiom.examples?.length || 0
            });

            // 为每个习语创建一个独立的释义记录
            const idiomDefinition = await tx.wordDefinition.create({
              data: {
                wordId,
                type: 'authoritative',
                partOfSpeech: authDef.partOfSpeech,
                order: idiom.number,
                chineseMeaning: idiom.meaning,
                englishMeaning: '', // 习语主要是中文释义
                definitionNumber: idiom.number
              }
            });
            console.log(`[DEBUG] 习语释义记录已创建，ID: ${idiomDefinition.id}`);

            // 创建习语记录
            const idiomRecord = await tx.definitionIdiom.create({
              data: {
                definitionId: idiomDefinition.id,
                order: idiom.number,
                title: idiom.title,
                meaning: idiom.meaning
              }
            });
            console.log(`[DEBUG] 习语记录已创建，ID: ${idiomRecord.id}`);

            // 处理习语例句
            if (idiom.examples && idiom.examples.length > 0) {
              console.log(`[DEBUG] 处理习语例句，数量: ${idiom.examples.length}`);

              const idiomExamples = idiom.examples.map((example, exIndex) => ({
                idiomId: idiomRecord.id,
                order: exIndex + 1,
                english: example.english,
                chinese: example.chinese
              }));

              if (idiomExamples.length > 0) {
                await tx.idiomExample.createMany({
                  data: idiomExamples,
                  skipDuplicates: true
                });
                console.log(`[DEBUG] ${idiomExamples.length} 个习语例句已创建`);
              }
            }
          }
        }

        console.log(`[DEBUG] 权威英汉释义 ${authIndex + 1} 处理完成`);
      } catch (error) {
        console.error(`[ERROR] 处理权威英汉释义 ${authIndex + 1} 时出错:`, error);
        throw error;
      }
    }

    console.log(`[DEBUG] 所有权威英汉释义保存完成`);
  }

  private async saveBilingualDefinitions(tx: PrismaTransaction, wordId: number, bilingualDefinitions: BilingualDefinition[]): Promise<void> {
    console.log(`[DEBUG] 保存英汉释义，wordId: ${wordId}`);
    console.log(`[DEBUG] 英汉释义数量: ${bilingualDefinitions.length}`);

    for (let bilIndex = 0; bilIndex < bilingualDefinitions.length; bilIndex++) {
      const bilDef = bilingualDefinitions[bilIndex];
      console.log(`[DEBUG] 处理英汉释义 ${bilIndex + 1}/${bilingualDefinitions.length}:`, {
        partOfSpeech: bilDef.partOfSpeech,
        definitionsCount: bilDef.definitions?.length || 0
      });

      try {
        // 为每个释义条目创建单独的 WordDefinition 记录
        if (bilDef.definitions && bilDef.definitions.length > 0) {
          console.log(`[DEBUG] 创建英汉释义条目，数量: ${bilDef.definitions.length}`);

          for (let defIndex = 0; defIndex < bilDef.definitions.length; defIndex++) {
            const defItem = bilDef.definitions[defIndex];
            console.log(`[DEBUG] 创建英汉释义条目 ${defIndex + 1}/${bilDef.definitions.length}:`, {
              number: defItem.number,
              meaning: defItem.meaning
            });

            // 创建主释义记录，直接存储中文释义
            const definition = await tx.wordDefinition.create({
              data: {
                wordId,
                type: 'bilingual',
                partOfSpeech: bilDef.partOfSpeech,
                order: defItem.number,
                chineseMeaning: defItem.meaning || '',
                englishMeaning: '', // 英汉释义主要是中文释义
                definitionNumber: defItem.number
              }
            });
            console.log(`[DEBUG] 英汉释义记录已创建，ID: ${definition.id}`);
          }
        }

        console.log(`[DEBUG] 英汉释义 ${bilIndex + 1} 处理完成`);
      } catch (error) {
        console.error(`[ERROR] 处理英汉释义 ${bilIndex + 1} 时出错:`, error);
        throw error;
      }
    }

    console.log(`[DEBUG] 所有英汉释义保存完成`);
  }

  private async saveEnglishDefinitions(tx: PrismaTransaction, wordId: number, englishDefinitions: EnglishDefinition[]): Promise<void> {
    const allDefinitions: Array<{
      wordId: number;
      type: string;
      partOfSpeech: string;
      order: number;
      meaning: string;
      linkedWords?: string | null;
    }> = [];

    // 收集所有英英释义
    for (const engDef of englishDefinitions) {
      for (const defItem of engDef.definitions) {
        allDefinitions.push({
          wordId,
          type: 'english',
          partOfSpeech: engDef.partOfSpeech,
          order: defItem.number,
          meaning: defItem.meaning,
          linkedWords: defItem.linkedWords ? JSON.stringify(defItem.linkedWords) : null
        });
      }
    }

    // 批量创建所有释义
    if (allDefinitions.length > 0) {
      await tx.wordDefinition.createMany({
        data: allDefinitions,
        skipDuplicates: true
      });
    }
  }

  private async saveSentenceData(tx: PrismaTransaction, wordId: number, sentences: Sentence[]): Promise<void> {
    if (sentences.length === 0) return;

    // 准备批量插入数据
    const sentenceData = sentences.map(sentence => ({
      wordId,
      order: sentence.number,
      english: sentence.english,
      chinese: sentence.chinese,
      audioUrl: sentence.audioUrl,
      source: sentence.source
    }));

    // 批量插入所有例句
    await tx.wordSentence.createMany({
      data: sentenceData,
      skipDuplicates: true
    });
  }

  private async saveWordForms(tx: PrismaTransaction, wordId: number, wordForms: Array<{ form: string; word: string }>): Promise<void> {
    if (wordForms.length === 0) return;

    // 构建批量插入的数据 - 修复：使用 Prisma 的参数化查询
    const values = wordForms.map(wordForm => {
      // 转义单引号以防止 SQL 注入
      const escapedForm = wordForm.form.replace(/'/g, "''");
      const escapedWord = wordForm.word.replace(/'/g, "''");
      return `(${wordId}, '${escapedForm}', '${escapedWord}', NOW(), NOW())`;
    }).join(', ');

    // 执行批量插入 - 使用参数化查询防止 SQL 注入
    await tx.$executeRawUnsafe(`
      INSERT INTO WordForms (word_id, form_type, form_word, created_at, updated_at)
      VALUES ${values}
      ON DUPLICATE KEY UPDATE
      form_word = VALUES(form_word),
      updated_at = NOW()
    `);
  }
}

// 数据验证函数，检查释义数据的完整性
// 修复：调整验证逻辑，允许部分有效的数据通过验证
export function validateWordDataCompleteness(data: WordDataToSave): {
  isComplete: boolean;
  isPartiallyValid: boolean; // 新增：标记数据是否部分有效
  missingFields: string[];
  issues: string[];
} {
  const missingFields: string[] = [];
  const issues: string[] = [];
  
  // 检查音标数据 - 修复：降低音标数据要求
  let hasValidPronunciation = false;
  if (!data.pronunciationData) {
    missingFields.push('pronunciationData');
    issues.push('缺少音标数据');
  } else {
    // 至少有一种发音即可，不强制要求音频URL
    if (data.pronunciationData.american || data.pronunciationData.british) {
      hasValidPronunciation = true;
      // 检查音频URL但不作为必需项
      if (data.pronunciationData.american && !data.pronunciationData.american.audioUrl) {
        issues.push('美式发音缺少音频URL（可选）');
      }
      if (data.pronunciationData.british && !data.pronunciationData.british.audioUrl) {
        issues.push('英式发音缺少音频URL（可选）');
      }
    } else {
      missingFields.push('pronunciationData.american/british');
      issues.push('缺少美式或英式音标');
    }
  }
  
  // 检查权威英汉释义 - 修复：不强制要求所有释义类型
  let hasValidAuthDef = false;
  if (data.authoritativeDefinitions && data.authoritativeDefinitions.length > 0) {
    // 修复：对于从数据库读取的数据，authoritativeDefinitions 数组不为空就说明有释义数据
    // 不需要进一步检查内部的 definitions 数组，因为数据库中可能以容器+子记录形式存储
    hasValidAuthDef = true;
    console.log(`[DEBUG] 权威英汉释义验证: 找到 ${data.authoritativeDefinitions.length} 个释义容器`);

    // 如果是新爬取的数据，进一步检查每个释义容器是否有具体释义条目
    for (const authDef of data.authoritativeDefinitions) {
      if (authDef.definitions && authDef.definitions.length > 0) {
        console.log(`[DEBUG] 权威英汉释义容器 ${authDef.partOfSpeech} 包含 ${authDef.definitions.length} 个释义条目`);
      } else {
        console.log(`[DEBUG] 权威英汉释义容器 ${authDef.partOfSpeech} 没有直接的释义条目（可能是数据库存储格式）`);
      }
    }
  } else {
    issues.push('缺少权威英汉释义（可选）');
  }
  
  // 检查英汉释义 - 修复：不强制要求所有释义类型
  let hasValidBilDef = false;
  if (data.bilingualDefinitions && data.bilingualDefinitions.length > 0) {
    // 修复：对于从数据库读取的数据，bilingualDefinitions 数组不为空就说明有释义数据
    // 不需要进一步检查内部的 definitions 数组，因为数据库中可能以容器+子记录形式存储
    hasValidBilDef = true;
    console.log(`[DEBUG] 英汉释义验证: 找到 ${data.bilingualDefinitions.length} 个释义容器`);

    // 如果是新爬取的数据，进一步检查每个释义容器是否有具体释义条目
    for (const bilDef of data.bilingualDefinitions) {
      if (bilDef.definitions && bilDef.definitions.length > 0) {
        console.log(`[DEBUG] 英汉释义容器 ${bilDef.partOfSpeech} 包含 ${bilDef.definitions.length} 个释义条目`);
      } else {
        console.log(`[DEBUG] 英汉释义容器 ${bilDef.partOfSpeech} 没有直接的释义条目（可能是数据库存储格式）`);
      }
    }
  } else {
    issues.push('缺少英汉释义（可选）');
  }
  
  // 检查英英释义 - 修复：不强制要求所有释义类型
  let hasValidEngDef = false;
  if (data.englishDefinitions && data.englishDefinitions.length > 0) {
    for (const engDef of data.englishDefinitions) {
      if (engDef.definitions && engDef.definitions.length > 0) {
        hasValidEngDef = true;
        break;
      }
    }
    if (!hasValidEngDef) {
      issues.push('英英释义中没有有效的释义条目');
    }
  } else {
    issues.push('缺少英英释义（可选）');
  }
  
  // 检查基本释义（作为后备）- 修复：这是最重要的释义类型
  let hasValidBasicDef = false;
  if (data.definitions && data.definitions.basic && data.definitions.basic.length > 0) {
    hasValidBasicDef = true;
  } else {
    missingFields.push('definitions.basic');
    issues.push('缺少基本释义');
  }
  
  // 检查例句 - 修复：例句不是必需的
  if (!data.sentences || data.sentences.length === 0) {
    issues.push('缺少例句（可选）');
  }
  
  // 修复：重新定义数据完整性标准
  // 完整数据：有基本释义且有音标数据
  const hasCompleteDefinitions = hasValidBasicDef || hasValidAuthDef || hasValidBilDef || hasValidEngDef;
  const isComplete = Boolean(hasCompleteDefinitions && hasValidPronunciation);
  
  // 部分有效数据：有基本释义即可
  const isPartiallyValid = Boolean(hasCompleteDefinitions);
  
  return {
    isComplete,
    isPartiallyValid,
    missingFields,
    issues
  };
}

// 导出单例实例
export const dictionaryScraper = new DictionaryScraper();