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
 * Options for configuring the StreamProcessor behavior
 */
export interface StreamProcessorOptions {
  /**
   * When true, assume content starts in "thinking" mode even without <think> tag.
   * This handles Perplexity sonar-reasoning API behavior where thinking content
   * is sent without the opening <think> tag, only with closing </think>.
   *
   * @default false
   */
  assumeThinkingFirst?: boolean;
}

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

  /** Whether to assume thinking mode at start (for APIs that don't send <think>) */
  private assumeThinkingFirst: boolean = false;

  /**
   * Create a new StreamProcessor
   *
   * @param options - Configuration options
   * @param options.assumeThinkingFirst - When true, start in 'inside' state for APIs
   *        that send thinking content without <think> opening tag
   */
  constructor(options?: StreamProcessorOptions) {
    if (options?.assumeThinkingFirst) {
      this.assumeThinkingFirst = true;
      this.state = 'inside';
      this.tagDepth = 1;
      console.log('[StreamProcessor] 🔧 Initialized with assumeThinkingFirst=true (state=inside, tagDepth=1)');
    }
  }

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
   * 🅱️ HYPOTHESIS B FIX: Track last emitted thinking length to emit only deltas
   * This prevents O(n²) data transfer by only sending new content, not the full buffer.
   */
  private lastEmittedThinkingLength: number = 0;

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
      // ═══════════════════════════════════════════════════════════════════════
      // 🅰️ HYPOTHESIS A FIX: Enhanced sliding window with proper initialization
      // ═══════════════════════════════════════════════════════════════════════
      // PHASE 4.1 FIX: Use sliding window to detect closing tags across chunk boundaries
      // Create lookback buffer: last 8 chars from thinkingBuffer + current rawChunk
      // NOTE: </think> is 8 characters, so lookback must be at least 8 to detect split tags
      const maxLookbackSize = 8;
      const lookbackFromPrevious = this.thinkingBuffer.slice(-maxLookbackSize);
      // IMPORTANT: Use actual lookback size, not max, when thinkingBuffer has fewer chars
      const actualLookbackSize = lookbackFromPrevious.length;
      const lookbackBuffer = lookbackFromPrevious + rawChunk;

      // 🅰️ FIX: Enhanced diagnostic logging for sliding window initialization
      console.log('[StreamProcessor] 🅰️ [HYPOTHESIS A] Sliding Window Initialization:', {
        thinkingBufferTotal: this.thinkingBuffer.length,
        thinkingBufferTail: this.thinkingBuffer.slice(-30).replace(/\n/g, '\\n'),
        maxLookbackSize,
        actualLookbackSize,
        lookbackFromPrevious: lookbackFromPrevious.replace(/\n/g, '\\n'),
        rawChunkLength: rawChunk.length,
        rawChunkFull: rawChunk.length < 100 ? rawChunk.replace(/\n/g, '\\n') : rawChunk.substring(0, 100).replace(/\n/g, '\\n') + '...',
      });

      let foundClosingTag = false;
      let closingTagPosition = -1;

      // Search for </think> in the combined lookback buffer
      // 🅰️ FIX: Also check for the tag in rawChunk alone (edge case when buffer is empty)
      for (let searchPos = 0; searchPos <= lookbackBuffer.length - 8; searchPos++) {
        if (lookbackBuffer.slice(searchPos, searchPos + 8) === '</think>') {
          closingTagPosition = searchPos;
          foundClosingTag = true;
          console.log('[StreamProcessor] 🅰️ [HYPOTHESIS A] ✅ Found </think> in lookback buffer at position:', searchPos);
          break;
        }
      }

      // 🅰️ FIX: If not found in sliding window, also do a direct check on rawChunk
      if (!foundClosingTag && rawChunk.includes('</think>')) {
        const directPosition = rawChunk.indexOf('</think>');
        console.log('[StreamProcessor] 🅰️ [HYPOTHESIS A] ⚠️ </think> found in rawChunk directly but missed by sliding window!', {
          directPosition,
          rawChunkAroundTag: rawChunk.substring(Math.max(0, directPosition - 20), directPosition + 28),
        });
        // Use the direct position (adjusted for lookback)
        closingTagPosition = actualLookbackSize + directPosition;
        foundClosingTag = true;
      }

      // BUG FIX (2025-12-02): Always log sliding window detection result
      console.log('[StreamProcessor] 🔎 Sliding window check:', {
        foundClosingTag,
        closingTagPosition,
        lookbackBufferLength: lookbackBuffer.length,
        lookbackBufferPreview: lookbackBuffer.substring(0, 50).replace(/\n/g, '\\n'),
        lookbackBufferEnd: lookbackBuffer.slice(-20).replace(/\n/g, '\\n'),
        thinkingBufferLength: this.thinkingBuffer.length,
        rawChunkLength: rawChunk.length,
        rawChunkPreview: rawChunk.substring(0, 30).replace(/\n/g, '\\n'),
      });

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
          this.lastEmittedThinkingLength = 0; // 🅱️ HYPOTHESIS B FIX: Reset delta tracking on state transition

          // Task 4.2 Debug: Log state transition to outside
          console.log('[StreamProcessor] STATE TRANSITION: inside -> outside (closing tag found in sliding window)', {
            thinkingContentEmitted: thinkingContent.length,
          });

          // ═══════════════════════════════════════════════════════════════════════
          // 🅲️ HYPOTHESIS C FIX: Improved remaining calculation with validation
          // ═══════════════════════════════════════════════════════════════════════
          // Calculate where remaining content starts in rawChunk
          // rawChunk starts at position actualLookbackSize in lookbackBuffer
          // Remaining content starts after the tag ends
          let remainingStartInRaw = Math.max(0, tagEndInLookback - actualLookbackSize);
          let remaining = rawChunk.slice(remainingStartInRaw);

          // 🅲️ FIX: Validate the calculation using direct string search as fallback
          const directCloseTagPos = rawChunk.indexOf('</think>');
          if (directCloseTagPos !== -1) {
            const directRemainingStart = directCloseTagPos + 8; // '</think>' is 8 chars
            const directRemaining = rawChunk.slice(directRemainingStart);

            // 🅲️ FIX: If direct search finds more content, use that instead
            if (directRemaining.length > remaining.length) {
              console.log('[StreamProcessor] 🅲️ [HYPOTHESIS C] ⚠️ Direct search found MORE remaining content!');
              console.log('[StreamProcessor] 🅲️ [HYPOTHESIS C] Using direct calculation instead of sliding window.');
              console.log('[StreamProcessor] 🅲️ [HYPOTHESIS C] Comparison:', {
                slidingWindowRemaining: remaining.length,
                directRemaining: directRemaining.length,
                difference: directRemaining.length - remaining.length,
              });
              remainingStartInRaw = directRemainingStart;
              remaining = directRemaining;
            }
          }

          // BUG FIX (2025-12-02): Enhanced debug logging for truncation diagnosis
          console.log('[StreamProcessor] ═══════════════════════════════════════════════════');
          console.log('[StreamProcessor] 🔍 REMAINING CALCULATION DEBUG:');
          console.log('[StreamProcessor] Input values:', {
            rawChunkLength: rawChunk.length,
            rawChunkPreview: rawChunk.substring(0, 200).replace(/\n/g, '\\n'),
            actualLookbackSize,
            closingTagPosition,
            tagEndInLookback,
          });
          console.log('[StreamProcessor] Calculation:', {
            formula: `remainingStartInRaw = max(0, ${tagEndInLookback} - ${actualLookbackSize}) = ${remainingStartInRaw}`,
            remainingLength: remaining.length,
            remainingPreview: remaining.substring(0, 200).replace(/\n/g, '\\n'),
          });

          // SAFEGUARD: Warn if remaining seems unexpectedly short
          if (rawChunk.length > 20 && remaining.length < rawChunk.length / 2) {
            console.warn('[StreamProcessor] ⚠️ WARNING: Remaining content is much shorter than rawChunk!');
            console.warn('[StreamProcessor] This might indicate a calculation error.');
            console.warn('[StreamProcessor] rawChunk full content:', rawChunk);

            // 🅲️ FIX: Last resort - try to extract content after </think> directly
            const lastResortMatch = rawChunk.match(/<\/think>(.*)$/s);
            if (lastResortMatch && lastResortMatch[1]) {
              const lastResortRemaining = lastResortMatch[1];
              if (lastResortRemaining.length > remaining.length) {
                console.log('[StreamProcessor] 🅲️ [HYPOTHESIS C] 🚨 LAST RESORT: Using regex match for remaining content');
                remaining = lastResortRemaining;
              }
            }
          }
          console.log('[StreamProcessor] ═══════════════════════════════════════════════════');

          if (remaining) {
            // Recursively process the remaining part
            console.log('[StreamProcessor] RECURSIVE CALL to process remaining content');
            const remainingChunks = this.processChunk(remaining);
            console.log('[StreamProcessor] RECURSIVE RESULT:', {
              chunksReturned: remainingChunks.length,
              chunkTypes: remainingChunks.map(c => c.type),
              chunkContents: remainingChunks.map(c => ({
                type: c.type,
                length: c.content.length,
                preview: c.content.substring(0, 100),
              })),
            });
            chunks.push(...remainingChunks);
          } else {
            console.log('[StreamProcessor] ℹ️ No remaining content after </think> - answer will come in next chunk(s)');
          }

          return chunks;
        } else {
          // Nested closing tag - add to thinking buffer
          this.thinkingBuffer += rawChunk;
          return chunks;
        }
      }

      // ═══════════════════════════════════════════════════════════════════════
      // 🅱️ HYPOTHESIS B FIX: Emit incremental thinking chunks while inside <think>
      // ═══════════════════════════════════════════════════════════════════════
      // No closing tag found in sliding window - add all to thinking buffer
      // The sliding window logic (lines 93-109) already handles detecting closing tags
      // that span chunk boundaries by looking back into thinkingBuffer.
      // We simply add the entire rawChunk to thinkingBuffer and let the next chunk's
      // sliding window handle any split closing tags.
      this.thinkingBuffer += rawChunk;

      // 🅱️ FIX (IMPROVED): Emit DELTA thinking chunks to prevent O(n²) data transfer
      // Previously, this function returned empty chunks[] when inside thinking,
      // causing totalChunks: 0 in logs and no visible thinking progress.
      // Now we emit only the NEW content (delta) since last emission.
      const currentBufferLength = this.thinkingBuffer.length;
      const deltaContent = this.thinkingBuffer.slice(this.lastEmittedThinkingLength);

      if (deltaContent.trim().length > 0) {
        console.log('[StreamProcessor] 🅱️ [HYPOTHESIS B] Emitting DELTA thinking chunk:', {
          totalThinkingBufferLength: currentBufferLength,
          lastEmittedLength: this.lastEmittedThinkingLength,
          deltaLength: deltaContent.length,
          deltaPreview: deltaContent.substring(0, 100).replace(/\n/g, '\\n'),
          chunkType: 'thinking',
          note: 'DELTA only - not full buffer (prevents O(n²) transfer)',
        });

        chunks.push({
          type: 'thinking',
          content: deltaContent.trim(),
          timestamp: Date.now(),
        });

        // Update the last emitted position
        this.lastEmittedThinkingLength = currentBufferLength;
      }

      return chunks;
    }

    // Add to buffer
    this.buffer += rawChunk;

    // BUG FIX (2025-12-02): Debug logging for state='outside' chunk processing
    console.log('[StreamProcessor] 📥 Processing chunk in OUTSIDE state:', {
      rawChunkLength: rawChunk.length,
      rawChunkPreview: rawChunk.substring(0, 150).replace(/\n/g, '\\n'),
      bufferLengthAfterAdd: this.buffer.length,
      isRecursiveCall: rawChunk.length < 100 && !rawChunk.includes('<think'), // Heuristic
    });

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

              // 🅱️ HYPOTHESIS B FIX: Prevent duplicate emission (same as sliding window path)
              const alreadyEmittedLength = this.lastEmittedThinkingLength;
              const totalLength = this.thinkingBuffer.length;

              if (alreadyEmittedLength < totalLength) {
                const remainingContent = this.thinkingBuffer.slice(alreadyEmittedLength).trim();
                if (remainingContent.length > 0) {
                  chunks.push({
                    type: 'thinking',
                    content: remainingContent,
                    timestamp: Date.now(),
                  });
                }
              } else if (alreadyEmittedLength === 0 && thinkingContent.length > 0) {
                chunks.push({
                  type: 'thinking',
                  content: thinkingContent,
                  timestamp: Date.now(),
                });
              }
            }

            this.state = 'outside';
            this.thinkingBuffer = '';
            this.lastEmittedThinkingLength = 0; // 🅱️ HYPOTHESIS B FIX: Reset delta tracking
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
            // BUG FIX (2025-12-02): Enhanced logging for text chunk emission
            console.log('[StreamProcessor] ════════════════════════════════════════════');
            console.log('[StreamProcessor] 📤 EMITTING TEXT CHUNK (before potential tag):');
            console.log('[StreamProcessor] Text content:', {
              length: textContent.length,
              fullContent: textContent.length < 500 ? textContent : textContent.substring(0, 500) + '...',
            });
            console.log('[StreamProcessor] Potential tag kept in buffer:', remaining.slice(potentialTagStart));
            console.log('[StreamProcessor] ════════════════════════════════════════════');
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
          // BUG FIX (2025-12-02): Enhanced logging for text chunk emission
          console.log('[StreamProcessor] ════════════════════════════════════════════');
          console.log('[StreamProcessor] 📤 EMITTING TEXT CHUNK (full content, no potential tag):');
          console.log('[StreamProcessor] Text content:', {
            length: textContent.length,
            fullContent: textContent.length < 500 ? textContent : textContent.substring(0, 500) + '...',
          });
          console.log('[StreamProcessor] ════════════════════════════════════════════');
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

      // 🅱️ HYPOTHESIS B FIX: Emit delta chunk when state became 'inside' during this processChunk call
      // This handles the case where <think>Content arrives in a single chunk
      const currentBufferLength = this.thinkingBuffer.length;
      const deltaContent = this.thinkingBuffer.slice(this.lastEmittedThinkingLength);

      if (deltaContent.trim().length > 0) {
        console.log('[StreamProcessor] 🅱️ [HYPOTHESIS B] Emitting DELTA thinking chunk (post-transition):', {
          totalThinkingBufferLength: currentBufferLength,
          lastEmittedLength: this.lastEmittedThinkingLength,
          deltaLength: deltaContent.length,
          deltaPreview: deltaContent.substring(0, 100).replace(/\n/g, '\\n'),
        });

        chunks.push({
          type: 'thinking',
          content: deltaContent.trim(),
          timestamp: Date.now(),
        });

        // Update the last emitted position
        this.lastEmittedThinkingLength = currentBufferLength;
      }
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
   * CRITICAL FIX (2025-12-04): Enhanced to handle missing </think> tag detection.
   * When the stream ends while still in 'inside' state, this method now:
   * 1. Searches for </think> in the accumulated thinkingBuffer (fallback detection)
   * 2. If found, extracts the answer content after </think>
   * 3. Properly separates thinking and answer content
   *
   * This fixes the bug where </think> was missed during chunk processing
   * (e.g., split across chunks or in a format the sliding window didn't catch).
   *
   * @returns Final chunk with answer content (or thinking content if no </think> found)
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
    let extractedAnswerContent = '';

    // If we're still inside a thinking tag, check if </think> exists in buffer
    if (this.state === 'inside') {
      // ═══════════════════════════════════════════════════════════════════════
      // 🔧 CRITICAL FIX: Fallback </think> detection in finalize()
      // ═══════════════════════════════════════════════════════════════════════
      // The stream ended while still in 'inside' state, meaning </think> was
      // never detected during chunk processing. This can happen when:
      // 1. </think> was split across chunks in an unexpected way
      // 2. The sliding window detection missed it
      // 3. API returned malformed response
      //
      // Solution: Search the entire thinkingBuffer for </think> as a last resort
      const thinkCloseIndex = this.thinkingBuffer.indexOf('</think>');

      console.log('[StreamProcessor] 🔧 FINALIZE FALLBACK: Checking for </think> in thinkingBuffer:', {
        thinkCloseIndex,
        thinkingBufferLength: this.thinkingBuffer.length,
        found: thinkCloseIndex !== -1,
      });

      if (thinkCloseIndex !== -1) {
        // Found </think>! Extract thinking and answer portions
        const thinkingPortion = this.thinkingBuffer.substring(0, thinkCloseIndex).trim();
        const answerPortion = this.thinkingBuffer.substring(thinkCloseIndex + 8).trim(); // 8 = '</think>'.length

        console.log('[StreamProcessor] 🔧 FINALIZE FALLBACK: Successfully extracted content:', {
          thinkingPortionLength: thinkingPortion.length,
          thinkingPortionPreview: thinkingPortion.substring(0, 100).replace(/\n/g, '\\n'),
          answerPortionLength: answerPortion.length,
          answerPortionPreview: answerPortion.substring(0, 200).replace(/\n/g, '\\n'),
        });

        // Store thinking content
        if (thinkingPortion) {
          this.accumulatedThinking.push(thinkingPortion);
        }

        // The answer portion becomes the final content (this is the KEY fix!)
        extractedAnswerContent = answerPortion;
        finalContent = answerPortion;

        // Transition state to outside (we found the closing tag)
        this.state = 'outside';
        this.tagDepth = 0;
      } else {
        // No </think> found - treat entire buffer as thinking content
        // This is the original behavior for cases where API truly never sends </think>
        let thinkingContent = this.thinkingBuffer.trim();

        // Remove any incomplete closing tag at the end (e.g., "</thi", "</t", etc.)
        const partialClosingTags = ['</think', '</thin', '</thi', '</th', '</t', '</'];
        for (const partial of partialClosingTags) {
          if (thinkingContent.endsWith(partial)) {
            thinkingContent = thinkingContent.slice(0, -partial.length).trim();
            console.log('[StreamProcessor] 🔧 Removed partial closing tag:', partial);
            break;
          }
        }

        if (thinkingContent) {
          this.accumulatedThinking.push(thinkingContent);
          // NOTE: We intentionally do NOT set finalContent here
          // The caller (perplexity-client.ts) will use deriveAnswerFromThinking() as fallback
        }

        console.log('[StreamProcessor] 🔧 FINALIZE FALLBACK: No </think> found, treating as pure thinking:', {
          thinkingContentLength: thinkingContent.length,
        });
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
      finalContentPreview: finalContent.substring(0, 200).replace(/\n/g, '\\n'),
      extractedAnswerFromFallback: extractedAnswerContent.length > 0,
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
   * Respects the assumeThinkingFirst option from constructor.
   */
  reset(): void {
    this.buffer = '';
    this.thinkingBuffer = '';
    this.accumulatedThinking = [];
    this.preThinkTextBuffer = '';
    this.emittedTextInCurrentStream = [];
    this.lastEmittedThinkingLength = 0; // 🅱️ HYPOTHESIS B FIX: Reset delta tracking

    // Restore initial state based on assumeThinkingFirst option
    if (this.assumeThinkingFirst) {
      this.state = 'inside';
      this.tagDepth = 1;
    } else {
      this.state = 'outside';
      this.tagDepth = 0;
    }
  }
}
