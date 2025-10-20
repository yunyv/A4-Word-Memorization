import axios from 'axios';
import * as cheerio from 'cheerio';
import { db } from './db';

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
    audioUrl: string; // 美式发音音频URL
  };
  british?: {
    phonetic: string; // 英式音标，如 "[ˈbetə(r)]"
    audioUrl: string; // 英式发音音频URL
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

    try {
      const url = `${this.baseUrl}?mkt=zh-CN&setLang=zh&form=BDVEHC&ClientVer=BDDTV3.5.1.4320&q=${encodeURIComponent(word.trim())}`;
      
      console.log(`正在爬取单词: ${word}`);
      console.log(`请求URL: ${url}`);

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
        console.error('提取发音信息失败:', e);
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
        
        console.log('提取的基本释义数量:', definitions.basic.length);
        console.log('提取的网络释义数量:', definitions.web.length);
        console.log('提取的词形变换数量:', wordForms.length);
        
        // 打印提取的释义用于调试
        definitions.basic.forEach((item, index) => {
          console.log(`基本释义 ${index + 1}: ${item.partOfSpeech} - ${item.meaning}`);
        });
        
        definitions.web.forEach((item, index) => {
          console.log(`网络释义 ${index + 1}: ${item.meaning}`);
        });
        
        wordForms.forEach((item, index) => {
          console.log(`词形变换 ${index + 1}: ${item.form} - ${item.word}`);
        });
        
      } catch (e) {
        console.error('提取结构化释义信息失败:', e);
      }

      // 提取三种新的释义类型
      let authoritativeDefinitions: AuthoritativeDefinition[] = [];
      let bilingualDefinitions: BilingualDefinition[] = [];
      let englishDefinitions: EnglishDefinition[] = [];
      
      try {
        if (type === 'all' || type === 'authoritative') {
          authoritativeDefinitions = this.extractAuthoritativeDefinitions($ as any);
          console.log('提取的权威英汉释义数量:', authoritativeDefinitions.length);
        }
        
        if (type === 'all' || type === 'bilingual') {
          bilingualDefinitions = this.extractBilingualDefinitions($ as any);
          console.log('提取的英汉释义数量:', bilingualDefinitions.length);
        }
        
        if (type === 'all' || type === 'english') {
          englishDefinitions = this.extractEnglishDefinitions($ as any);
          console.log('提取的英英释义数量:', englishDefinitions.length);
        }
      } catch (e) {
        console.error('提取新释义类型失败:', e);
      }

      // 提取音标和音频数据
      let pronunciationData: PronunciationData = {};
      try {
        pronunciationData = this.extractPronunciationData($ as any);
        console.log('提取的音标数据数量:',
          (pronunciationData.american ? 1 : 0) + (pronunciationData.british ? 1 : 0));
      } catch (e) {
        console.error('提取音标和音频数据失败:', e);
      }

      // 提取例句数据
      let sentences: Sentence[] = [];
      try {
        sentences = this.extractSentences($ as any);
        console.log('提取的例句数量:', sentences.length);
      } catch (e) {
        console.error('提取例句数据失败:', e);
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
        console.error('CSS选择器解析错误:', selectorError);
        extractedContent = '未找到例句内容';
      }

      // 调试信息：打印页面结构
      console.log('页面标题:', $('title').text());
      console.log('主要内容区域长度:', $('#content_container').length);
      console.log('例句区域长度:', $('.client_search_sentence_area').length);
      console.log('例句列表长度:', $('.client_sentence_list').length);
      console.log('提取的例句内容长度:', extractedContent.length);
      console.log('提取的发音长度:', pronunciation.length);
      console.log('提取的释义总数:', definitions.basic.length + definitions.web.length);
      console.log('释义容器存在:', $('#client_def_container').length > 0);
      
      return {
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

    } catch (error) {
      console.error('爬取词典数据时出错:', error);
      
      let errorMessage = '未知错误';
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          errorMessage = '请求超时，请稍后重试';
        } else if (error.response) {
          errorMessage = `服务器返回错误: ${error.response.status}`;
        } else if (error.request) {
          errorMessage = '无法连接到词典服务器';
        } else {
          errorMessage = `请求配置错误: ${error.message}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        word,
        error: errorMessage
      };
    }
  }

  // 提取权威英汉释义
  private extractAuthoritativeDefinitions($: any): AuthoritativeDefinition[] {
    const definitions: AuthoritativeDefinition[] = [];
    
    try {
      // 查找权威英汉释义容器 - 尝试多种可能的选择器
      let $container = $('#clientnlid');
      
      if ($container.length === 0) {
        console.log('未找到权威英汉释义容器 #clientnlid，尝试其他选择器');
        // 尝试其他可能的选择器
        $container = $('.client_qula_area');
        
        if ($container.length === 0) {
          console.log('仍未找到权威英汉释义容器');
          return definitions;
        }
      }
      
      console.log(`找到权威英汉释义容器，包含 ${$container.find('.defeachseg').length} 个释义区块`);
      
      // 遍历每个词性区块
      $container.find('.defeachseg').each((index: number, element: any) => {
        const $seg = $(element);
        const $head = $seg.find('.defeachhead');
        let partOfSpeech = $head.find('.defpos').text().trim();
        
        // 如果没有找到词性，尝试从其他位置获取
        if (!partOfSpeech) {
          partOfSpeech = $seg.find('h3').text().trim() ||
                       $seg.find('.def_pos').text().trim() ||
                       $seg.find('.client_def_title').text().trim();
        }
        
        console.log(`处理权威英汉释义区块 ${index + 1}: ${partOfSpeech}`);
        
        if (!partOfSpeech) {
          console.log(`未找到词性，跳过释义区块 ${index + 1}`);
          return;
        }
        
        const definitionItem: AuthoritativeDefinition = {
          partOfSpeech,
          definitions: []
        };
        
        // 提取释义条目
        $seg.find('.deflistitem').each((defIndex: number, defElement: any) => {
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
          
          console.log(`提取到权威释义 ${number}: 中文=${chineseMeaning}, 英文=${englishMeaning}`);
          
          if (chineseMeaning || englishMeaning) {
            const definition: any = {
              number,
              chineseMeaning,
              englishMeaning
            };
            
            // 提取例句
            const $examBar = $defItem.find('.exambar');
            if ($examBar.length > 0) {
              const examples: Array<{ english: string; chinese: string }> = [];
              $examBar.find('.examlistitem').each((examIndex: number, examElement: any) => {
                const $examItem = $(examElement).find('.examitem');
                const english = $examItem.find('.examitmeval').text().trim();
                const chinese = $examItem.find('.examitemname').text().trim();
                if (english || chinese) {
                  examples.push({ english, chinese });
                  console.log(`提取到例句: ${english} / ${chinese}`);
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
          console.log(`找到习语区域，包含 ${$idomBar.find('.defitemtitlebar').length} 个习语`);
          const idioms: Array<{ number: number; title: string; meaning: string; examples?: Array<{ english: string; chinese: string }> }> = [];
          $idomBar.find('.defitemtitlebar').each((idiomIndex: number, idiomElement: any) => {
            const $titleBar = $(idiomElement);
            const numberText = $titleBar.find('.defnum').text().trim();
            const number = parseInt(numberText) || idiomIndex + 1;
            const title = $titleBar.find('.itmeval').text().trim();
            
            console.log(`处理习语 ${number}: ${title}`);
            
            // 查找对应的释义内容
            const $nextItems = $titleBar.nextUntil('.defitemtitlebar', '.defitembar');
            $nextItems.each((itemIndex: number, itemElement: any) => {
              const $itemBar = $(itemElement);
              const $defItem = $itemBar.find('.defitem');
              let meaning = $defItem.find('.itemname').text().trim();
              let englishMeaning = $defItem.find('.itmeval').text().trim();
              
              // 如果没有找到释义内容，尝试从其他位置获取
              if (!meaning && !englishMeaning) {
                meaning = $defItem.text().trim();
                englishMeaning = '';
              }
              
              console.log(`提取到习语释义: ${meaning} / ${englishMeaning}`);
              
              if (meaning || englishMeaning) {
                const idiom: any = {
                  number,
                  title,
                  meaning: meaning || englishMeaning
                };
                
                // 提取习语例句
                const $examBar = $defItem.find('.exambar');
                if ($examBar.length > 0) {
                  const examples: Array<{ english: string; chinese: string }> = [];
                  $examBar.find('.examlistitem').each((examIndex: number, examElement: any) => {
                    const $examItem = $(examElement).find('.examitem');
                    const english = $examItem.find('.examitmeval').text().trim();
                    const chinese = $examItem.find('.examitemname').text().trim();
                    if (english || chinese) {
                      examples.push({ english, chinese });
                      console.log(`提取到习语例句: ${english} / ${chinese}`);
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
            console.log(`添加 ${idioms.length} 个习语`);
          }
        }
        
        if (definitionItem.definitions.length > 0) {
          definitions.push(definitionItem);
          console.log(`添加权威英汉释义: ${partOfSpeech}, 包含 ${definitionItem.definitions.length} 个释义`);
        }
      });
      
    } catch (error) {
      console.error('提取权威英汉释义时出错:', error);
    }
    
    console.log(`最终提取到 ${definitions.length} 个权威英汉释义`);
    return definitions;
  }

  // 提取英汉释义
  private extractBilingualDefinitions($: any): BilingualDefinition[] {
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
      $container.find('.client_def_bar').each((index: number, element: any) => {
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
          $defItems.each((defIndex: number, defElement: any) => {
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
  private extractEnglishDefinitions($: any): EnglishDefinition[] {
    const definitions: EnglishDefinition[] = [];
    
    try {
      // 查找英英释义容器
      const $container = $('#clienthomoid');
      if ($container.length === 0) {
        console.log('未找到英英释义容器 #clienthomoid');
        return definitions;
      }

      // 遍历每个词性区块
      $container.find('.client_def_bar').each((index: number, element: any) => {
        const $bar = $(element);
        const $titleBar = $bar.find('.client_def_title_bar');
        const partOfSpeech = $titleBar.find('.client_def_title').text().trim();
        
        if (!partOfSpeech) return;
        
        const definitionItem: EnglishDefinition = {
          partOfSpeech,
          definitions: []
        };
        
        // 提取释义条目
        $bar.find('.client_def_list_item').each((defIndex: number, defElement: any) => {
          const $defItem = $(defElement);
          const numberText = $defItem.find('.client_def_list_word_num').text().trim();
          const number = parseInt(numberText) || defIndex + 1;
          
          // 提取英文释义和链接的单词
          const $content = $defItem.find('.client_def_list_word_content');
          const meaningParts: string[] = [];
          const linkedWords: string[] = [];
          
          $content.find('a.client_def_list_word_en').each((linkIndex: number, linkElement: any) => {
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
  private extractPronunciationData($: any): PronunciationData {
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
      $pronunciationLists.each((index: number, element: any) => {
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
  private extractSentences($: any): Sentence[] {
    const sentences: Sentence[] = [];
    
    try {
      // 查找例句列表容器
      const $sentenceLists = $('.client_sentence_list');
      
      if ($sentenceLists.length === 0) {
        console.log('未找到例句列表容器 .client_sentence_list');
        return sentences;
      }
      
      // 遍历每个例句
      $sentenceLists.each((index: number, element: any) => {
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
        $sentence.find('.client_sentence_search, .client_sen_en_word, .client_sen_cn_word').each((wordIndex: number, wordElement: any) => {
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
  async testWebsiteStructure(word: string = 'hello'): Promise<any> {
    try {
      const url = `${this.baseUrl}?mkt=zh-CN&setLang=zh&form=BDVEHC&ClientVer=BDDTV3.5.1.4320&q=${encodeURIComponent(word)}`;
      const response = await axios.get(url, { headers: this.headers, timeout: 10000 });
      const $ = cheerio.load(response.data);
      
      // 分析页面结构
      const structure = {
        title: $('title').text(),
        hasContentContainer: $('#content_container').length > 0,
        hasSearchContainer: $('.client_search_container').length > 0,
        hasSearchContent: $('.client_search_content').length > 0,
        hasLeftSideArea: $('.client_search_leftside_area').length > 0,
        hasSentenceArea: $('.client_search_sentence_area').length > 0,
        sentenceAreaDivs: $('.client_search_sentence_area div').length,
        firstFewDivsContent: [] as string[],
        bodyClasses: $('body').attr('class'),
        allContainers: [] as string[]
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
      return { error: error instanceof Error ? error.message : '未知错误' };
    }
  }

  // 将爬取的数据保存到新的表结构中
  async saveWordDataToTables(wordText: string, data: any): Promise<void> {
    try {
      // 使用事务确保数据一致性
      await db.$transaction(async (tx) => {
        // 1. 更新或创建单词记录
        const word = await tx.word.upsert({
          where: { wordText: wordText.toLowerCase() },
          update: {
            definitionData: data, // 保留JSON数据作为备份
            updatedAt: new Date()
          },
          create: {
            wordText: wordText.toLowerCase(),
            definitionData: data
          }
        });

        // 如果有发音数据，单独更新pronunciation字段
        if (data.pronunciation) {
          await tx.$executeRaw`UPDATE Words SET pronunciation = ${data.pronunciation} WHERE id = ${word.id}`;
        }

        // 2. 保存发音数据
        if (data.pronunciationData) {
          await this.savePronunciationData(tx, word.id, data.pronunciationData);
        }

        // 3. 保存释义数据
        if (data.definitions) {
          await this.saveDefinitionData(tx, word.id, data.definitions);
        }

        // 4. 保存权威英汉释义
        if (data.authoritativeDefinitions) {
          await this.saveAuthoritativeDefinitions(tx, word.id, data.authoritativeDefinitions);
        }

        // 5. 保存英汉释义
        if (data.bilingualDefinitions) {
          await this.saveBilingualDefinitions(tx, word.id, data.bilingualDefinitions);
        }

        // 6. 保存英英释义
        if (data.englishDefinitions) {
          await this.saveEnglishDefinitions(tx, word.id, data.englishDefinitions);
        }

        // 7. 保存例句数据
        if (data.sentences && data.sentences.length > 0) {
          await this.saveSentenceData(tx, word.id, data.sentences);
        }

        // 8. 保存词形变化
        if (data.wordForms && data.wordForms.length > 0) {
          await this.saveWordForms(tx, word.id, data.wordForms);
        }
      });

      console.log(`单词 ${wordText} 已保存到新表结构`);
    } catch (error) {
      console.error(`保存单词 ${wordText} 到新表结构时出错:`, error);
      throw error;
    }
  }

  private async savePronunciationData(tx: any, wordId: number, pronunciationData: any): Promise<void> {
    // 美式发音
    if (pronunciationData.american) {
      await tx.$executeRaw`
        INSERT INTO WordPronunciations (word_id, type, phonetic, audio_url, created_at, updated_at)
        VALUES (${wordId}, 'american', ${pronunciationData.american.phonetic}, ${pronunciationData.american.audioUrl}, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
        phonetic = ${pronunciationData.american.phonetic},
        audio_url = ${pronunciationData.american.audioUrl},
        updated_at = NOW()
      `;
    }

    // 英式发音
    if (pronunciationData.british) {
      await tx.$executeRaw`
        INSERT INTO WordPronunciations (word_id, type, phonetic, audio_url, created_at, updated_at)
        VALUES (${wordId}, 'british', ${pronunciationData.british.phonetic}, ${pronunciationData.british.audioUrl}, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
        phonetic = ${pronunciationData.british.phonetic},
        audio_url = ${pronunciationData.british.audioUrl},
        updated_at = NOW()
      `;
    }
  }

  private async saveDefinitionData(tx: any, wordId: number, definitions: any): Promise<void> {
    // 基本释义
    if (definitions.basic && definitions.basic.length > 0) {
      for (let i = 0; i < definitions.basic.length; i++) {
        const def = definitions.basic[i];
        await tx.wordDefinition.create({
          data: {
            wordId,
            type: 'basic',
            partOfSpeech: def.partOfSpeech,
            order: i,
            meaning: def.meaning
          }
        });
      }
    }

    // 网络释义
    if (definitions.web && definitions.web.length > 0) {
      for (let i = 0; i < definitions.web.length; i++) {
        const def = definitions.web[i];
        await tx.wordDefinition.create({
          data: {
            wordId,
            type: 'web',
            order: i,
            meaning: def.meaning
          }
        });
      }
    }
  }

  private async saveAuthoritativeDefinitions(tx: any, wordId: number, authoritativeDefinitions: any[]): Promise<void> {
    for (const authDef of authoritativeDefinitions) {
      // 创建主释义记录
      const definition = await tx.wordDefinition.create({
        data: {
          wordId,
          type: 'authoritative',
          partOfSpeech: authDef.partOfSpeech,
          order: 0 // 可以根据需要调整排序
        }
      });

      // 创建释义条目
      for (const defItem of authDef.definitions) {
        await tx.definitionExample.create({
          data: {
            definitionId: definition.id,
            order: defItem.number,
            english: defItem.englishMeaning || '',
            chinese: defItem.chineseMeaning || ''
          }
        });

        // 如果有例句，创建例句记录
        if (defItem.examples && defItem.examples.length > 0) {
          for (const example of defItem.examples) {
            await tx.definitionExample.create({
              data: {
                definitionId: definition.id,
                order: defItem.number,
                english: example.english,
                chinese: example.chinese
              }
            });
          }
        }
      }

      // 处理习语
      if (authDef.idioms && authDef.idioms.length > 0) {
        for (const idiom of authDef.idioms) {
          const idiomRecord = await tx.definitionIdiom.create({
            data: {
              definitionId: definition.id,
              order: idiom.number,
              title: idiom.title,
              meaning: idiom.meaning
            }
          });

          // 创建习语例句
          if (idiom.examples && idiom.examples.length > 0) {
            for (const example of idiom.examples) {
              await tx.idiomExample.create({
                data: {
                  idiomId: idiomRecord.id,
                  order: 0,
                  english: example.english,
                  chinese: example.chinese
                }
              });
            }
          }
        }
      }
    }
  }

  private async saveBilingualDefinitions(tx: any, wordId: number, bilingualDefinitions: any[]): Promise<void> {
    for (const bilDef of bilingualDefinitions) {
      const definition = await tx.wordDefinition.create({
        data: {
          wordId,
          type: 'bilingual',
          partOfSpeech: bilDef.partOfSpeech,
          order: 0
        }
      });

      // 创建释义条目
      for (const defItem of bilDef.definitions) {
        await tx.definitionExample.create({
          data: {
            definitionId: definition.id,
            order: defItem.number,
            english: '',
            chinese: defItem.meaning
          }
        });
      }
    }
  }

  private async saveEnglishDefinitions(tx: any, wordId: number, englishDefinitions: any[]): Promise<void> {
    for (const engDef of englishDefinitions) {
      // 创建释义条目
      for (const defItem of engDef.definitions) {
        await tx.wordDefinition.create({
          data: {
            wordId,
            type: 'english',
            partOfSpeech: engDef.partOfSpeech,
            order: defItem.number,
            meaning: defItem.meaning,
            linkedWords: defItem.linkedWords ? JSON.stringify(defItem.linkedWords) : null
          }
        });
      }
    }
  }

  private async saveSentenceData(tx: any, wordId: number, sentences: any[]): Promise<void> {
    for (const sentence of sentences) {
      await tx.wordSentence.create({
        data: {
          wordId,
          order: sentence.number,
          english: sentence.english,
          chinese: sentence.chinese,
          audioUrl: sentence.audioUrl,
          source: sentence.source
        }
      });
    }
  }

  private async saveWordForms(tx: any, wordId: number, wordForms: any[]): Promise<void> {
    for (const wordForm of wordForms) {
      await tx.$executeRaw`
        INSERT INTO WordForms (word_id, form_type, form_word, created_at, updated_at)
        VALUES (${wordId}, ${wordForm.form}, ${wordForm.word}, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
        form_word = ${wordForm.word},
        updated_at = NOW()
      `;
    }
  }
}

// 导出单例实例
export const dictionaryScraper = new DictionaryScraper();