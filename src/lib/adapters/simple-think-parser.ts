/**
 * @fileOverview SimpleThinkParser - 簡化版 <think> 標籤解析器
 *
 * 從 Side Project A 移植的核心解析邏輯，用於處理 Perplexity API
 * 回應中的 <think>...</think> 標籤，將思考過程與回答內容分離。
 *
 * 設計特點：
 * - 狀態機模式：追蹤是否在 <think> 標籤內
 * - Buffer 機制：正確處理跨 chunk 的不完整標籤
 * - 精簡實作：約 150 行，易於維護和除錯
 *
 * @example
 * ```typescript
 * const parser = new SimpleThinkParser();
 *
 * // 處理串流 chunk
 * const chunks1 = parser.parse('<think>思考中...');
 * const chunks2 = parser.parse('</think>這是答案');
 *
 * // chunks1: [{ type: 'thinking_start' }, { type: 'thinking_content', content: '思考中...' }]
 * // chunks2: [{ type: 'thinking_end' }, { type: 'content', content: '這是答案' }]
 * ```
 */

import type { ParsedChunk, ParsedChunkType } from './types';

/**
 * SimpleThinkParser
 *
 * 解析串流內容中的 <think> 標籤，將內容分類為：
 * - thinking_start: <think> 標籤開始
 * - thinking_content: 思考過程內容
 * - thinking_end: </think> 標籤結束
 * - content: 回答內容（在 </think> 之後）
 */
export class SimpleThinkParser {
  /** <think> 開始標籤 */
  private static readonly THINK_OPEN = '<think>';
  /** </think> 結束標籤 */
  private static readonly THINK_CLOSE = '</think>';
  /** 開始標籤長度 */
  private static readonly OPEN_LEN = 7;
  /** 結束標籤長度 */
  private static readonly CLOSE_LEN = 8;

  /** 是否在 <think> 標籤內 */
  private isInThinkTag = false;

  /** 內容緩衝區，用於處理跨 chunk 的不完整標籤 */
  private buffer = '';

  /**
   * 解析輸入文字，回傳解析後的區塊陣列
   *
   * @param text - 新的文字內容（可能是部分 chunk）
   * @returns 解析後的區塊陣列
   */
  parse(text: string): ParsedChunk[] {
    const chunks: ParsedChunk[] = [];
    this.buffer += text;

    while (this.buffer.length > 0) {
      if (!this.isInThinkTag) {
        // 狀態：在 <think> 標籤外，尋找開始標籤
        const openIndex = this.buffer.indexOf(SimpleThinkParser.THINK_OPEN);

        if (openIndex === -1) {
          // 沒找到 <think>，檢查是否有不完整的標籤在結尾
          const partialIndex = this.findPartialOpenTag(this.buffer);

          if (partialIndex !== -1) {
            // 有潛在的不完整標籤，輸出前面的內容，保留可能的標籤
            const content = this.buffer.slice(0, partialIndex);
            if (content) {
              chunks.push({ type: 'content', content });
            }
            this.buffer = this.buffer.slice(partialIndex);
            break;
          }

          // 沒有標籤，全部輸出為內容
          if (this.buffer) {
            chunks.push({ type: 'content', content: this.buffer });
          }
          this.buffer = '';
          break;
        }

        // 找到 <think>
        // 輸出標籤前的內容
        if (openIndex > 0) {
          const beforeContent = this.buffer.slice(0, openIndex);
          if (beforeContent) {
            chunks.push({ type: 'content', content: beforeContent });
          }
        }

        // 發出 thinking_start 事件
        chunks.push({ type: 'thinking_start' });
        this.isInThinkTag = true;
        this.buffer = this.buffer.slice(openIndex + SimpleThinkParser.OPEN_LEN);

      } else {
        // 狀態：在 <think> 標籤內，尋找結束標籤
        const closeIndex = this.buffer.indexOf(SimpleThinkParser.THINK_CLOSE);

        if (closeIndex === -1) {
          // 沒找到 </think>，檢查是否有不完整的結束標籤
          const partialIndex = this.findPartialCloseTag(this.buffer);

          if (partialIndex !== -1) {
            // 有潛在的不完整結束標籤，輸出前面的思考內容
            const content = this.buffer.slice(0, partialIndex);
            if (content) {
              chunks.push({ type: 'thinking_content', content });
            }
            this.buffer = this.buffer.slice(partialIndex);
            break;
          }

          // 沒有結束標籤，全部輸出為思考內容
          if (this.buffer) {
            chunks.push({ type: 'thinking_content', content: this.buffer });
          }
          this.buffer = '';
          break;
        }

        // 找到 </think>
        // 輸出結束標籤前的思考內容
        if (closeIndex > 0) {
          const thinkingContent = this.buffer.slice(0, closeIndex);
          if (thinkingContent) {
            chunks.push({ type: 'thinking_content', content: thinkingContent });
          }
        }

        // 發出 thinking_end 事件
        chunks.push({ type: 'thinking_end' });
        this.isInThinkTag = false;
        this.buffer = this.buffer.slice(closeIndex + SimpleThinkParser.CLOSE_LEN);
      }
    }

    return chunks;
  }

  /**
   * 尋找可能不完整的開始標籤
   *
   * 檢查字串結尾是否有 '<', '<t', '<th', '<thi', '<thin', '<think' 等模式
   *
   * @param text - 要檢查的文字
   * @returns 不完整標籤的起始位置，若無則回傳 -1
   */
  private findPartialOpenTag(text: string): number {
    const partials = ['<think', '<thin', '<thi', '<th', '<t', '<'];

    for (const partial of partials) {
      if (text.endsWith(partial)) {
        return text.length - partial.length;
      }
    }

    return -1;
  }

  /**
   * 尋找可能不完整的結束標籤
   *
   * 檢查字串結尾是否有 '</', '</t', '</th', '</thi', '</thin', '</think' 等模式
   *
   * @param text - 要檢查的文字
   * @returns 不完整標籤的起始位置，若無則回傳 -1
   */
  private findPartialCloseTag(text: string): number {
    const partials = ['</think', '</thin', '</thi', '</th', '</t', '</'];

    for (const partial of partials) {
      if (text.endsWith(partial)) {
        return text.length - partial.length;
      }
    }

    return -1;
  }

  /**
   * 重置解析器狀態
   *
   * 在開始新的對話或訊息時呼叫
   */
  reset(): void {
    this.isInThinkTag = false;
    this.buffer = '';
  }

  /**
   * 取得目前是否在思考標籤內
   */
  get isThinking(): boolean {
    return this.isInThinkTag;
  }

  /**
   * 取得目前緩衝區內容（用於除錯）
   */
  get currentBuffer(): string {
    return this.buffer;
  }

  /**
   * 取得目前緩衝區大小
   */
  get bufferSize(): number {
    return this.buffer.length;
  }
}

// 重新匯出類型，方便使用
export type { ParsedChunk, ParsedChunkType };
