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
   * Track all emitted text content when outside thinking tags.
   * Used to retroactively classify as thinking when we encounter
   * </think> without a matching <think> (API inconsistency handling).
   */
  private preThinkTextBuffer: string = '';

  /**
   * Track chunks emitted in current processChunk call.
   * Used to retroactively reclassify text chunks as thinking
   * when encountering unmatched </think>.
   */
  private emittedTextInCurrentStream: string[] = [];

  /**
   * Process a raw chunk from the stream
   *
   * @param rawChunk - Raw text chunk from Perplexity API
   * @returns Array of structured chunks ready for consumption
   */
  processChunk(rawChunk: string): StructuredChunk[] {
    const chunks: StructuredChunk[] = [];

    // Task 4.2 Debug: Log every processChunk call
    console.log('[StreamProcessor] processChunk called:', {
      rawChunkLength: rawChunk.length,
      rawChunkPreview: rawChunk.substring(0, 100).replace(/\n/g, '\\n'),
      currentState: this.state,
      tagDepth: this.tagDepth,
      bufferLength: this.buffer.length,
      thinkingBufferLength: this.thinkingBuffer.length,
    });

    // When we're inside a thinking tag, process only the new chunk directly
    // without re-processing the buffer
    if (this.state === 'inside') {
      // PHASE 4.1 FIX: Use sliding window to detect closing tags across chunk boundaries
      // Create lookback buffer: last 8 chars from thinkingBuffer + current rawChunk
      // NOTE: </think> is 8 characters, so lookback must be at least 8 to detect split tags
      const maxLookbackSize = 8;
      const lookbackFromPrevious = this.thinkingBuffer.slice(-maxLookbackSize);
      // IMPORTANT: Use actual lookback size, not max, when thinkingBuffer has fewer chars
      const actualLookbackSize = lookbackFromPrevious.length;
      const lookbackBuffer = lookbackFromPrevious + rawChunk;

      let foundClosingTag = false;
      let closingTagPosition = -1;

      // Search for </think> in the combined lookback buffer
      for (let searchPos = 0; searchPos <= lookbackBuffer.length - 8; searchPos++) {
        if (lookbackBuffer.slice(searchPos, searchPos + 8) === '</think>') {
          closingTagPosition = searchPos;
          foundClosingTag = true;
          break;
        }
      }

      if (foundClosingTag) {
        this.tagDepth--;

        if (this.tagDepth === 0) {
          // Calculate where the closing tag ends in the lookback buffer
          // lookbackBuffer structure: [actualLookbackSize chars from thinkingBuffer] + [rawChunk]
          // closingTagPosition is where '</think>' starts in lookbackBuffer
          const tagEndInLookback = closingTagPosition + 8; // '</think>' is 8 chars

          // Calculate how much of the partial closing tag exists in thinkingBuffer
          // If tag starts before actualLookbackSize, part of it is in thinkingBuffer
          const charsToRemoveFromThinking = Math.max(0, actualLookbackSize - closingTagPosition);

          // Remove partial closing tag from thinkingBuffer if it exists
          if (charsToRemoveFromThinking > 0) {
            this.thinkingBuffer = this.thinkingBuffer.slice(0, -charsToRemoveFromThinking);
          }

          // Add content from rawChunk that comes before the closing tag
          // closingTagPosition is in lookbackBuffer coordinates
          // Content before tag in rawChunk starts at position 0 and ends at (closingTagPosition - actualLookbackSize)
          // FIX: Use >= instead of > to handle edge case when </think> is at exact boundary
          // (e.g., when </think> arrives as standalone chunk and closingTagPosition === actualLookbackSize)
          if (closingTagPosition >= actualLookbackSize) {
            const contentBeforeTagInRaw = rawChunk.slice(0, closingTagPosition - actualLookbackSize);
            if (contentBeforeTagInRaw) {
              this.thinkingBuffer += contentBeforeTagInRaw;
            }
          }

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

          // Task 4.2 Debug: Log state transition to outside
          console.log('[StreamProcessor] STATE TRANSITION: inside -> outside (closing tag found in sliding window)', {
            thinkingContentEmitted: thinkingContent.length,
          });

          // Calculate where remaining content starts in rawChunk
          // rawChunk starts at position actualLookbackSize in lookbackBuffer
          // Remaining content starts after the tag ends
          const remainingStartInRaw = Math.max(0, tagEndInLookback - actualLookbackSize);
          const remaining = rawChunk.slice(remainingStartInRaw);

          // Task 4.2 Debug: Log remaining content after </think>
          console.log('[StreamProcessor] REMAINING CONTENT after </think>:', {
            remainingStartInRaw,
            remainingLength: remaining.length,
            remainingPreview: remaining.substring(0, 150).replace(/\n/g, '\\n'),
            hasRemaining: !!remaining,
          });

          if (remaining) {
            // Recursively process the remaining part
            console.log('[StreamProcessor] RECURSIVE CALL to process remaining content');
            const remainingChunks = this.processChunk(remaining);
            console.log('[StreamProcessor] RECURSIVE RESULT:', {
              chunksReturned: remainingChunks.length,
              chunkTypes: remainingChunks.map(c => c.type),
            });
            chunks.push(...remainingChunks);
          }

          return chunks;
        } else {
          // Nested closing tag - add to thinking buffer
          this.thinkingBuffer += rawChunk;
          return chunks;
        }
      }

      // No closing tag found in sliding window - add all to thinking buffer
      // The sliding window logic (lines 93-109) already handles detecting closing tags
      // that span chunk boundaries by looking back into thinkingBuffer.
      // We simply add the entire rawChunk to thinkingBuffer and let the next chunk's
      // sliding window handle any split closing tags.
      this.thinkingBuffer += rawChunk;

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
          // Clear pre-think buffers - content before <think> was genuine text
          this.preThinkTextBuffer = '';
          this.emittedTextInCurrentStream = [];
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
        } else {
          // CRITICAL FIX: Handle unmatched </think> tag (tagDepth === 0)
          // This occurs when the Perplexity API sends thinking content WITHOUT
          // the opening <think> tag (API inconsistency). In this case:
          // 1. All content before </think> was actually THINKING content
          // 2. Content after </think> should be treated as TEXT (answer)
          //
          // Since text chunks from previous processChunk calls are already returned,
          // we emit a THINKING chunk with the accumulated content. The caller
          // may receive duplicate content (once as text, once as thinking) and
          // should handle this by using the thinking chunk when available.

          console.log('[StreamProcessor] UNMATCHED </think> DETECTED - API sent thinking without <think> tag');

          // Collect any content in current buffer before </think>
          let contentBeforeCloseTag = '';
          if (this.state === 'outside' && i > textStart) {
            contentBeforeCloseTag = this.buffer.slice(textStart, i).trim();
          }

          // Combine all accumulated "pre-think" text content
          const combinedThinkingContent = (this.preThinkTextBuffer + ' ' + contentBeforeCloseTag).trim();

          console.log('[StreamProcessor] Emitting accumulated content as thinking:', {
            preThinkTextBufferLength: this.preThinkTextBuffer.length,
            contentBeforeCloseTagLength: contentBeforeCloseTag.length,
            combinedLength: combinedThinkingContent.length,
            combinedPreview: combinedThinkingContent.substring(0, 100).replace(/\n/g, '\\n'),
          });

          // Emit as THINKING chunk (caller should prefer this over earlier text chunks)
          if (combinedThinkingContent) {
            this.accumulatedThinking.push(combinedThinkingContent);
            chunks.push({
              type: 'thinking',
              content: combinedThinkingContent,
              timestamp: Date.now(),
            });
          }

          // Reset tracking buffers - content after </think> is genuine text
          this.preThinkTextBuffer = '';
          this.emittedTextInCurrentStream = [];

          // Skip past the closing tag
          textStart = i + 8;
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
            // Task 4.2 Debug: Log text chunk emission (potential tag case)
            console.log('[StreamProcessor] EMITTING TEXT CHUNK (before potential tag):', {
              textContentLength: textContent.length,
              textContentPreview: textContent.substring(0, 100).replace(/\n/g, '\\n'),
            });
            chunks.push({
              type: 'text',
              content: textContent,
              timestamp: Date.now(),
            });
            // Track for potential retroactive reclassification
            this.emittedTextInCurrentStream.push(textContent);
            this.preThinkTextBuffer += textContent;
          }
        }

        // Keep potential tag in buffer for next chunk
        this.buffer = remaining.slice(potentialTagStart);
      } else {
        // No potential tag, emit all as text
        const textContent = remaining.trim();
        if (textContent) {
          // Task 4.2 Debug: Log text chunk emission (no potential tag)
          console.log('[StreamProcessor] EMITTING TEXT CHUNK (no potential tag):', {
            textContentLength: textContent.length,
            textContentPreview: textContent.substring(0, 100).replace(/\n/g, '\\n'),
          });
          chunks.push({
            type: 'text',
            content: textContent,
            timestamp: Date.now(),
          });
          // Track for potential retroactive reclassification
          this.emittedTextInCurrentStream.push(textContent);
          this.preThinkTextBuffer += textContent;
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
   * Find the start of a potential incomplete </think> closing tag
   *
   * Looks for patterns like "</", "</t", "</th", "</thi", etc. at the end of the string
   *
   * @param text - Text to search
   * @returns Index of potential closing tag start, or -1 if none found
   */
  private findPotentialClosingTag(text: string): number {
    // Check from the end for potential closing tag starts
    const patterns = ['</think', '</thin', '</thi', '</th', '</t', '</'];

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
    // Task 4.2 Debug: Log finalize state
    console.log('[StreamProcessor] finalize() called:', {
      currentState: this.state,
      bufferLength: this.buffer.length,
      bufferPreview: this.buffer.substring(0, 100).replace(/\n/g, '\\n'),
      thinkingBufferLength: this.thinkingBuffer.length,
      thinkingBufferPreview: this.thinkingBuffer.substring(0, 100).replace(/\n/g, '\\n'),
      tagDepth: this.tagDepth,
    });

    let finalContent = '';

    // If we're still inside a thinking tag, include it as thinking
    if (this.state === 'inside') {
      // PHASE 4.1 FIX: Clean partial closing tags from thinking buffer before outputting
      let thinkingContent = this.thinkingBuffer.trim();

      // Remove any incomplete closing tag at the end (e.g., "</thi", "</t", etc.)
      const partialClosingTags = ['</think', '</thin', '</thi', '</th', '</t', '</'];
      for (const partial of partialClosingTags) {
        if (thinkingContent.endsWith(partial)) {
          thinkingContent = thinkingContent.slice(0, -partial.length).trim();
          break;
        }
      }

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

    // Task 4.2 Debug: Log finalize result
    console.log('[StreamProcessor] finalize() returning:', {
      type: 'complete',
      finalContentLength: finalContent.length,
      finalContentPreview: finalContent.substring(0, 100).replace(/\n/g, '\\n'),
    });

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
    this.preThinkTextBuffer = '';
    this.emittedTextInCurrentStream = [];
  }
}
