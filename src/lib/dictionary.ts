import axios from 'axios';
import * as cheerio from 'cheerio';

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

export interface DictionaryResult {
  success: boolean;
  word: string;
  mode?: 'test' | 'normal';
  requestedType?: 'all' | 'authoritative' | 'bilingual' | 'english'; // 请求的释义类型
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
      // 查找权威英汉释义容器
      const $container = $('#clientnlid');
      if ($container.length === 0) {
        console.log('未找到权威英汉释义容器 #clientnlid');
        return definitions;
      }

      // 遍历每个词性区块
      $container.find('.defeachseg').each((index: number, element: any) => {
        const $seg = $(element);
        const $head = $seg.find('.defeachhead');
        const partOfSpeech = $head.find('.defpos').text().trim();
        
        if (!partOfSpeech) return;
        
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
          const chineseMeaning = $defItemCon.find('.itemname').text().trim();
          const englishMeaning = $defItemCon.find('.itmeval').text().trim();
          
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
          const idioms: Array<{ number: number; title: string; meaning: string; examples?: Array<{ english: string; chinese: string }> }> = [];
          $idomBar.find('.defitemtitlebar').each((idiomIndex: number, idiomElement: any) => {
            const $titleBar = $(idiomElement);
            const numberText = $titleBar.find('.defnum').text().trim();
            const number = parseInt(numberText) || idiomIndex + 1;
            const title = $titleBar.find('.itmeval').text().trim();
            
            // 查找对应的释义内容
            const $nextItems = $titleBar.nextUntil('.defitemtitlebar', '.defitembar');
            $nextItems.each((itemIndex: number, itemElement: any) => {
              const $itemBar = $(itemElement);
              const $defItem = $itemBar.find('.defitem');
              const meaning = $defItem.find('.itemname').text().trim();
              const englishMeaning = $defItem.find('.itmeval').text().trim();
              
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
          }
        }
        
        if (definitionItem.definitions.length > 0) {
          definitions.push(definitionItem);
        }
      });
      
    } catch (error) {
      console.error('提取权威英汉释义时出错:', error);
    }
    
    return definitions;
  }

  // 提取英汉释义
  private extractBilingualDefinitions($: any): BilingualDefinition[] {
    const definitions: BilingualDefinition[] = [];
    
    try {
      // 查找英汉释义容器
      const $container = $('#clientcrossid');
      if ($container.length === 0) {
        console.log('未找到英汉释义容器 #clientcrossid');
        return definitions;
      }

      // 遍历每个词性区块
      $container.find('.client_def_bar').each((index: number, element: any) => {
        const $bar = $(element);
        const $titleBar = $bar.find('.client_def_title_bar');
        const partOfSpeech = $titleBar.find('.client_def_title').text().trim();
        
        if (!partOfSpeech) return;
        
        const definitionItem: BilingualDefinition = {
          partOfSpeech,
          definitions: []
        };
        
        // 提取释义条目
        $bar.find('.client_def_list_item').each((defIndex: number, defElement: any) => {
          const $defItem = $(defElement);
          const numberText = $defItem.find('.client_def_list_word_num').text().trim();
          const number = parseInt(numberText) || defIndex + 1;
          const meaning = $defItem.find('.client_def_list_word_bar').text().trim();
          
          if (meaning) {
            definitionItem.definitions.push({
              number,
              meaning
            });
          }
        });
        
        if (definitionItem.definitions.length > 0) {
          definitions.push(definitionItem);
        }
      });
      
    } catch (error) {
      console.error('提取英汉释义时出错:', error);
    }
    
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
}

// 导出单例实例
export const dictionaryScraper = new DictionaryScraper();