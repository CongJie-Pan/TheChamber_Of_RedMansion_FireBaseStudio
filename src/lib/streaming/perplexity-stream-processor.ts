/**
 * @fileOverview Perplexity Stream Processor
 *
 * Professional buffered stream processor for handling incomplete <think> tags
 * during streaming responses from Perplexity API.
 *
 * Inspired by LobeChat's architecture:
 * - Single source of truth for parsing
 * - Buffered processing of incomplete tags
 * - Structured chunk emission
 *
 * @see LobeChat: /src/store/chat/slices/aiChat/actions/streamingExecutor.ts
 */

/**
 * Chunk types emitted by the processor
 */
export type StructuredChunkType = 'thinking' | 'text' | 'complete';

/**
 * Structured chunk interface
 */
export interface StructuredChunk {
  /** Chunk type for discriminated union */
  type: StructuredChunkType;

  /** Content of this chunk */
  content: string;

  /** Timestamp when this chunk was created */
  timestamp: number;
}

/**
 * Processor state for tracking tag parsing
 */
type ProcessorState = 'outside' | 'inside' | 'incomplete_open';

/**
 * Perplexity Stream Processor
 *
 * Handles buffered parsing of streaming content with <think> tags.
 * Correctly handles incomplete tags that span multiple chunks.
 *
 * @example
 * ```typescript
 * const processor = new PerplexityStreamProcessor();
 *
 * // Process chunks as they arrive
 * for (const rawChunk of stream) {
 *   const chunks = processor.processChunk(rawChunk);
 *   for (const chunk of chunks) {
 *     if (chunk.type === 'thinking') {
 *       console.log('Thinking:', chunk.content);
 *     } else if (chunk.type === 'text') {
 *       console.log('Answer:', chunk.content);
 *     }
 *   }
 * }
 *
 * // Finalize when stream ends
 * const finalChunk = processor.finalize();
 * ```
 */
export class PerplexityStreamProcessor {
  /** Buffer for accumulating incoming text */
  private buffer: string = '';

  /** Buffer specifically for incomplete thinking content */
  private thinkingBuffer: string = '';

  /** Current parsing state */
  private state: ProcessorState = 'outside';

  /** Track depth of nested <think> tags */
  private tagDepth: number = 0;

  /** Accumulated thinking content across chunks */
  private accumulatedThinking: string[] = [];

  /**
   * Process a raw chunk from the stream
   *
   * @param rawChunk - Raw text chunk from Perplexity API
   * @returns Array of structured chunks ready for consumption
   */
  processChunk(rawChunk: string): StructuredChunk[] {
    const chunks: StructuredChunk[] = [];

    // When we're inside a thinking tag, process only the new chunk directly
    // without re-processing the buffer
    if (this.state === 'inside') {
      let i = 0;
      while (i < rawChunk.length) {
        // Check for closing </think> tag
        if (rawChunk.slice(i, i + 8) === '</think>') {
          this.tagDepth--;

          if (this.tagDepth === 0) {
            // Complete thinking block
            const thinkingContent = this.thinkingBuffer.trim();
            if (thinkingContent) {
              this.accumulatedThinking.push(thinkingContent);
              chunks.push({
                type: 'thinking',
                content: thinkingContent,
                timestamp: Date.now(),
              });
            }

            this.state = 'outside';
            this.thinkingBuffer = '';

            // Process remaining content in this chunk as normal text/buffer
            const remaining = rawChunk.slice(i + 8);
            if (remaining) {
              // Recursively process the remaining part
              const remainingChunks = this.processChunk(remaining);
              chunks.push(...remainingChunks);
            }

            return chunks;
          } else {
            // Nested closing tag
            this.thinkingBuffer += '</think>';
          }

          i += 8;
          continue;
        }

        // Regular character - add to thinking buffer
        this.thinkingBuffer += rawChunk[i];
        i++;
      }

      // Finished processing rawChunk while still inside thinking tag
      return chunks;
    }

    // Add to buffer
    this.buffer += rawChunk;

    // Reset incomplete_open state when new chunk arrives - we'll re-evaluate the full buffer
    if (this.state === 'incomplete_open') {
      this.state = 'outside';
    }

    let i = 0;
    let textStart = 0;

    while (i < this.buffer.length) {
      // Check for opening <think> tag
      if (this.buffer.slice(i, i + 7) === '<think>') {
        // Emit any text before the tag as a text chunk
        if (this.state === 'outside' && i > textStart) {
          const textContent = this.buffer.slice(textStart, i).trim();
          if (textContent) {
            chunks.push({
              type: 'text',
              content: textContent,
              timestamp: Date.now(),
            });
          }
        }

        // Enter thinking state
        this.tagDepth++;
        if (this.tagDepth === 1) {
          this.state = 'inside';
          this.thinkingBuffer = '';
        } else {
          // Nested tag - include in thinking content
          this.thinkingBuffer += '<think>';
        }

        i += 7;
        textStart = i;
        continue;
      }

      // Check for closing </think> tag
      if (this.buffer.slice(i, i + 8) === '</think>') {
        if (this.tagDepth > 0) {
          this.tagDepth--;

          if (this.tagDepth === 0) {
            // Complete thinking block
            const thinkingContent = this.thinkingBuffer.trim();
            if (thinkingContent) {
              this.accumulatedThinking.push(thinkingContent);
              chunks.push({
                type: 'thinking',
                content: thinkingContent,
                timestamp: Date.now(),
              });
            }

            this.state = 'outside';
            this.thinkingBuffer = '';
            textStart = i + 8;
          } else {
            // Nested closing tag
            this.thinkingBuffer += '</think>';
          }
        }

        i += 8;
        continue;
      }

      // Regular character
      if (this.state === 'inside') {
        // Accumulate in thinking buffer
        this.thinkingBuffer += this.buffer[i];
      }

      i++;
    }

    // Handle remaining content in buffer
    if (this.state === 'outside' && textStart < this.buffer.length) {
      // Check if we have a potential incomplete opening tag at the end
      const remaining = this.buffer.slice(textStart);
      const potentialTagStart = this.findPotentialTagStart(remaining);

      if (potentialTagStart !== -1) {
        // Emit text before potential tag
        if (potentialTagStart > 0) {
          const textContent = remaining.slice(0, potentialTagStart).trim();
          if (textContent) {
            chunks.push({
              type: 'text',
              content: textContent,
              timestamp: Date.now(),
            });
          }
        }

        // Keep potential tag in buffer for next chunk
        this.buffer = remaining.slice(potentialTagStart);
      } else {
        // No potential tag, emit all as text
        const textContent = remaining.trim();
        if (textContent) {
          chunks.push({
            type: 'text',
            content: textContent,
            timestamp: Date.now(),
          });
        }
        this.buffer = '';
      }
    } else if (this.state === 'inside') {
      // Inside thinking tag - keep everything processed, clear buffer
      this.buffer = '';
    } else {
      // Clear buffer if we're outside and processed everything
      this.buffer = '';
    }

    return chunks;
  }

  /**
   * Find the start of a potential incomplete <think> tag
   *
   * Looks for patterns like "<", "<t", "<th", etc. at the end of the string
   *
   * @param text - Text to search
   * @returns Index of potential tag start, or -1 if none found
   */
  private findPotentialTagStart(text: string): number {
    // Check from the end for potential tag starts
    const patterns = ['<think', '<thin', '<thi', '<th', '<t', '<'];

    for (const pattern of patterns) {
      if (text.endsWith(pattern)) {
        return text.length - pattern.length;
      }
    }

    return -1;
  }

  /**
   * Finalize processing when stream ends
   *
   * Emits any remaining buffered content as appropriate chunks.
   *
   * @returns Final chunk with any remaining content
   */
  finalize(): StructuredChunk {
    let finalContent = '';

    // If we're still inside a thinking tag, include it as thinking
    if (this.state === 'inside') {
      const thinkingContent = this.thinkingBuffer.trim();
      if (thinkingContent) {
        this.accumulatedThinking.push(thinkingContent);
        finalContent = thinkingContent;
      }
    } else if (this.state === 'incomplete_open' || this.buffer.trim()) {
      // Any remaining buffer content is treated as text
      finalContent = this.buffer.trim();
    }

    // Reset state
    this.buffer = '';
    this.thinkingBuffer = '';
    this.state = 'outside';
    this.tagDepth = 0;

    return {
      type: 'complete',
      content: finalContent,
      timestamp: Date.now(),
    };
  }

  /**
   * Get all accumulated thinking content
   *
   * Useful for debugging or logging purposes.
   *
   * @returns All thinking content collected during processing
   */
  getAllThinking(): string {
    return this.accumulatedThinking.join('\n\n');
  }

  /**
   * Reset processor to initial state
   *
   * Useful for reusing the same processor instance.
   */
  reset(): void {
    this.buffer = '';
    this.thinkingBuffer = '';
    this.state = 'outside';
    this.tagDepth = 0;
    this.accumulatedThinking = [];
  }
}
