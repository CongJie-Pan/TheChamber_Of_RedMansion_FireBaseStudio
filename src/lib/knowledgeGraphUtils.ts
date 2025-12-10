/**
 * @fileOverview Knowledge Graph Data Transformation Utilities
 *
 * This module provides comprehensive utilities for transforming raw chapter JSON data
 * into D3.js-compatible knowledge graph visualizations for Dream of the Red Chamber.
 * It implements domain-specific classification rules based on Chinese literary knowledge.
 *
 * Key features:
 * - Entity categorization using pattern matching (characters, locations, artifacts, concepts)
 * - Relationship classification with strength and distance metrics
 * - D3.js force-directed graph data transformation
 * - Multi-source data loading (API, local fallback)
 * - Color and size encoding for visual hierarchy
 *
 * Domain knowledge encoding:
 * - Character types: Mythological (女媧), Main (士隱, 雨村), Secondary (英蓮)
 * - Location types: Mystical (大荒山), Earthly (蘇州城)
 * - Artifact types: Important items (石頭記, 玉)
 * - Concept types: Philosophical (還淚, 情)
 * - Event types: Plot elements (功名夢)
 *
 * Force-directed graph parameters:
 * - Node radius: 18-35px based on importance
 * - Link distance: 60-120px based on relationship type
 * - Link strength: 0.5-0.9 based on relationship intimacy
 *
 * Architecture decisions:
 * - Hardcoded classification rules (domain expertise > ML for this use case)
 * - Graceful degradation (returns empty graph on error)
 * - API-first with local fallback (cloud → local → empty)
 *
 * Usage:
 * ```typescript
 * // Load and transform chapter data
 * const graphData = await loadChapterGraphData(1);
 *
 * // Use with D3.js force simulation
 * const simulation = d3.forceSimulation(graphData.nodes)
 *   .force("link", d3.forceLink(graphData.links).distance(d => d.distance))
 *   .force("charge", d3.forceManyBody().strength(-300));
 * ```
 *
 * @see {@link ../app/(main)/read-book/page.tsx} for usage in reading interface
 */

export interface ChapterGraphJson {
  entities: string[];
  relationships: string[];
  metadata: {
    version: string;
    description: string;
    processing_time: number;
    chunks_processed: number;
    total_characters: number;
    clustering_time: number;
    clustered_entities: number;
    phase3_time: number;
    synonym_merges_applied: number;
    entities_merged: number;
    total_processing_time: number;
    strategy: string;
    text_length: number;
    original_entities: number;
    streamlined_entities: number;
    original_relationships: number;
    streamlined_relationships: number;
    reduction_ratio: string;
    focus: string;
    creation_date: string;
    notes: string;
  };
}

export interface KnowledgeGraphNode {
  id: string;
  name: string;
  type: 'character' | 'location' | 'concept' | 'event' | 'artifact';
  importance: 'primary' | 'secondary' | 'tertiary';
  description: string;
  category: string;
  radius: number;
  color: string;
  group: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface KnowledgeGraphLink {
  source: string | KnowledgeGraphNode;
  target: string | KnowledgeGraphNode;
  relationship: string;
  strength: number;
  type: 'family' | 'friendship' | 'conflict' | 'literary' | 'conceptual';
  description: string;
  distance: number;
}

export interface KnowledgeGraphData {
  nodes: KnowledgeGraphNode[];
  links: KnowledgeGraphLink[];
}

/**
 * Entity categorization based on Chinese literature domain knowledge
 *
 * Reason for pattern-based classification vs machine learning:
 * - Domain expertise encoded in character patterns (氏, 仙, 媧)
 * - Deterministic results (no model training/serving overhead)
 * - Lightweight (no ML dependencies, smaller bundle size)
 * - Transparent rules (easy to debug and extend)
 * - Sufficient for Dream of the Red Chamber context
 *
 * Color scheme reasoning (muted palette for traditional aesthetics):
 * - Sepia (#8B6F47): Mythological beings - ancient divine presence
 * - Blue-gray (#5B7C8D): Main characters - ink wash aesthetic
 * - Taupe (#9B8B7E): Secondary characters - supporting harmony
 * - Indigo-gray (#6B7FA3): Mystical locations - mountain mist
 * - Olive-gray (#8B8B73): Earthly locations - grounded places
 * - Bronze (#A68A5C): Artifacts - precious objects
 * - Smoke blue (#7A8E92): Philosophical concepts - abstract ideas
 * - Charcoal (#6B5F56): Events - narrative elements
 * - Gray (#808080): Other - default fallback
 *
 * Radius encoding:
 * - 35px: Primary importance (most prominent in visualization)
 * - 28-30px: Important entities (clearly visible)
 * - 22-25px: Secondary entities (supporting elements)
 * - 18-20px: Tertiary entities (background elements)
 *
 * Rule Priority (IMPORTANT):
 * Rules are ordered by specificity to avoid misclassification.
 * More specific patterns (e.g., '封氏' for secondary character) are checked
 * before broader patterns (e.g., '氏' for mythological).
 */
const categorizeEntity = (entityName: string): {
  type: KnowledgeGraphNode['type'];
  category: string;
  importance: KnowledgeGraphNode['importance'];
  color: string;
  group: number;
  radius: number;
} => {
  // ============================================================
  // PRIORITY 1: Specific character names (check BEFORE broad patterns)
  // Reason: Names like "封氏" should be secondary character, not mythological
  // ============================================================

  // Main characters - 主要人物 (specific names)
  if (entityName.includes('甄士隱') || entityName.includes('士隱') ||
      entityName.includes('賈雨村') || entityName.includes('雨村')) {
    return {
      type: 'character',
      category: '主要人物',
      importance: 'primary',
      color: '#5B7C8D', // Muted blue-gray (青灰)
      group: 2,
      radius: 30
    };
  }

  // Secondary characters - 次要人物 (specific names, check BEFORE '氏' pattern)
  if (entityName.includes('英蓮') || entityName.includes('封氏') ||
      entityName.includes('封肅') || entityName.includes('霍啟') ||
      entityName === '甄士隱 與 封氏') {
    return {
      type: 'character',
      category: '次要人物',
      importance: 'secondary',
      color: '#9B8B7E', // Warm taupe (淺褐)
      group: 2,
      radius: 25
    };
  }

  // Taoist/Buddhist figures - 道人/仙人 (specific patterns)
  if (entityName.includes('道人') || entityName.includes('道士') ||
      entityName.includes('和尚') || entityName.includes('僧')) {
    return {
      type: 'character',
      category: '主要人物',
      importance: 'primary',
      color: '#5B7C8D', // Muted blue-gray (青灰)
      group: 2,
      radius: 28
    };
  }

  // ============================================================
  // PRIORITY 2: Mythological beings (broader '仙', '媧' patterns)
  // ============================================================
  if (entityName.includes('女媧') || entityName.includes('媧') ||
      entityName.includes('警幻') || entityName.includes('神瑛') ||
      (entityName.includes('仙') && !entityName.includes('仙子宮'))) {
    return {
      type: 'character',
      category: '神話人物',
      importance: 'primary',
      color: '#8B6F47', // Muted sepia (深褐)
      group: 1,
      radius: 35
    };
  }

  // ============================================================
  // PRIORITY 3: Locations - check specific names before broad patterns
  // Reason: "吳玉峰" is a person name, not a location
  // ============================================================

  // Person names that look like locations (exclusions)
  if (entityName === '吳玉峰' || entityName === '孔梅溪') {
    return {
      type: 'character',
      category: '其他人物',
      importance: 'tertiary',
      color: '#808080', // Neutral gray
      group: 7,
      radius: 20
    };
  }

  // Mystical locations - 神話地點
  if (entityName.includes('太虛幻境') || entityName.includes('幻境') ||
      entityName.includes('青埂峰') || entityName.includes('無稽崖') ||
      entityName.includes('赤瑕宮') || entityName.includes('北邙山') ||
      (entityName.includes('境') && !entityName.includes('夢境'))) {
    return {
      type: 'location',
      category: '神話地點',
      importance: 'primary',
      color: '#6B7FA3', // Muted indigo-gray (靛青)
      group: 3,
      radius: 28
    };
  }

  // Earthly locations - 世俗地點
  if (entityName.includes('姑蘇') || entityName.includes('蘇州') ||
      entityName.includes('葫蘆廟') || entityName.includes('仁清巷') ||
      entityName.includes('閶門') || entityName.includes('廟') ||
      entityName.includes('巷') || entityName.includes('城')) {
    return {
      type: 'location',
      category: '世俗地點',
      importance: 'secondary',
      color: '#8B8B73', // Muted olive-gray (橄榄灰)
      group: 3,
      radius: 24
    };
  }

  // ============================================================
  // PRIORITY 4: Important artifacts and texts
  // ============================================================
  if (entityName.includes('石頭記') || entityName.includes('紅樓夢') ||
      entityName.includes('通靈寶玉') || entityName.includes('金陵十二釵') ||
      entityName.includes('好了歌') || entityName.includes('對聯') ||
      entityName === '三生石' || entityName === '甘露' ||
      entityName.includes('玉') || entityName.includes('石頭')) {
    return {
      type: 'artifact',
      category: '重要物品/文獻',
      importance: 'primary',
      color: '#A68A5C', // Antique bronze (古銅)
      group: 4,
      radius: 30
    };
  }

  // ============================================================
  // PRIORITY 5: Philosophical concepts
  // ============================================================
  if (entityName.includes('紅塵') || entityName.includes('風流孽緣') ||
      entityName.includes('神話因緣') || entityName.includes('還淚') ||
      entityName.includes('溫柔') || entityName.includes('火坑') ||
      entityName === '人形' || entityName === '絳珠草' ||
      entityName === '鄉宦' || entityName === '胡州人') {
    return {
      type: 'concept',
      category: '哲學概念',
      importance: 'secondary',
      color: '#7A8E92', // Smoke blue (煙灰藍)
      group: 5,
      radius: 22
    };
  }

  // ============================================================
  // PRIORITY 6: Events and plot elements
  // ============================================================
  if (entityName.includes('功名') || entityName.includes('富貴') ||
      entityName.includes('夢境') || entityName.includes('火災') ||
      entityName.includes('失蹤') || entityName.includes('放置門檻') ||
      entityName.includes('銀兩') || entityName.includes('衣物')) {
    return {
      type: 'event',
      category: '情節事件',
      importance: 'secondary',
      color: '#6B5F56', // Deep charcoal taupe (深灰褐)
      group: 6,
      radius: 20
    };
  }

  // ============================================================
  // DEFAULT: Other entities
  // ============================================================
  return {
    type: 'character',
    category: '其他人物',
    importance: 'tertiary',
    color: '#808080', // Neutral gray (中灰)
    group: 7,
    radius: 18
  };
};

/**
 * Relationship type classification for force-directed graph
 *
 * Reason for strength and distance parameters:
 * - D3.js force simulation uses these for graph layout
 * - Strength: How strongly connected nodes attract each other (0-1)
 * - Distance: Ideal spacing between connected nodes (pixels)
 * - Family relations: High strength (0.9), short distance (60) → tight clusters
 * - Friendship: Medium strength (0.7), medium distance (90) → loosely connected
 * - Conceptual: Low strength (0.6), long distance (120) → separate but related
 *
 * Relationship hierarchy:
 * 1. family (0.9 strength, 60px) - Strongest, closest
 * 2. literary (0.8 strength, 100px) - Strong narrative connection
 * 3. friendship (0.7 strength, 90px) - Social connection
 * 4. conceptual (0.6 strength, 120px) - Abstract connection
 * 5. default (0.5 strength, 110px) - Weakest, farthest
 *
 * Visual effect:
 * - Family clusters form tight groups
 * - Conceptual links create sparse connections
 * - Balance prevents graph from collapsing or exploding
 */
const classifyRelationship = (relationshipText: string): {
  type: KnowledgeGraphLink['type'];
  strength: number;
  distance: number;
} => {
  const relationship = relationshipText.toLowerCase();

  // Family relationships - 家庭關係
  if (relationship.includes('女兒') || relationship.includes('妻子') || relationship.includes('夫妻')) {
    return { type: 'family', strength: 0.9, distance: 60 };
  }
  
  // Friendship/social relationships - 社交關係
  if (relationship.includes('資助') || relationship.includes('鄰居') || relationship.includes('寄居')) {
    return { type: 'friendship', strength: 0.7, distance: 90 };
  }
  
  // Literary/narrative relationships - 文學關係
  if (relationship.includes('煉') || relationship.includes('變化') || relationship.includes('抄錄') || relationship.includes('整理')) {
    return { type: 'literary', strength: 0.8, distance: 100 };
  }
  
  // Conceptual relationships - 概念關係
  if (relationship.includes('居住') || relationship.includes('位於') || relationship.includes('棄') || relationship.includes('象徵')) {
    return { type: 'conceptual', strength: 0.6, distance: 120 };
  }
  
  // Default relationship
  return { type: 'literary', strength: 0.5, distance: 110 };
};

// Transform chapter JSON data to D3.js compatible format
export const transformChapterDataToGraphData = (chapterData: ChapterGraphJson): KnowledgeGraphData => {
  // Create nodes from entities
  const nodes: KnowledgeGraphNode[] = chapterData.entities.map((entityName, index) => {
    const classification = categorizeEntity(entityName);

    // Dynamic radius calculation based on text length
    // Reason: Long entity names need larger nodes to prevent text overflow
    // Formula: base radius + (text length * 3.5) to accommodate ~1 char per 3.5px
    // Max radius capped at 60px to prevent oversized nodes
    const textLength = entityName.length;
    const baseRadius = classification.radius;
    const dynamicRadius = Math.min(
      Math.max(baseRadius, textLength * 3.5 + 10),
      60 // Maximum radius to prevent oversized nodes
    );

    return {
      id: `entity-${index}`,
      name: entityName,
      type: classification.type,
      importance: classification.importance,
      description: `來自第一回的重要${classification.category}：${entityName}`,
      category: classification.category,
      radius: dynamicRadius, // Use dynamic radius instead of fixed classification.radius
      color: classification.color,
      group: classification.group
    };
  });
  
  // Create links from relationships
  const links: KnowledgeGraphLink[] = chapterData.relationships.map((relationshipText, index) => {
    // Parse relationship text format: "entityA - relationship - entityB"
    const parts = relationshipText.split(' - ');
    if (parts.length !== 3) {
      console.warn(`Invalid relationship format: ${relationshipText}`);
      return null;
    }
    
    const [sourceEntity, relationshipType, targetEntity] = parts;
    
    // Find corresponding node IDs
    const sourceIndex = chapterData.entities.findIndex(entity => entity === sourceEntity);
    const targetIndex = chapterData.entities.findIndex(entity => entity === targetEntity);
    
    if (sourceIndex === -1 || targetIndex === -1) {
      console.warn(`Entity not found for relationship: ${relationshipText}`);
      return null;
    }
    
    const sourceId = `entity-${sourceIndex}`;
    const targetId = `entity-${targetIndex}`;
    
    const classification = classifyRelationship(relationshipType);
    
    return {
      source: sourceId,
      target: targetId,
      relationship: relationshipType,
      strength: classification.strength,
      type: classification.type,
      description: `${sourceEntity}與${targetEntity}的關係：${relationshipType}`,
      distance: classification.distance
    };
  }).filter(link => link !== null) as KnowledgeGraphLink[];
  
  return {
    nodes,
    links
  };
};

/**
 * Load chapter graph data with multi-source fallback strategy
 *
 * Data source hierarchy (API-first approach):
 * 1. API endpoint: /api/chapters/{chapterNumber}/graph (preferred)
 * 2. Local JSON file: /read/chapterGraph/chapter{chapterNumber}.json (fallback)
 * 3. Empty graph: [] (error fallback)
 *
 * Reason for dual-source strategy:
 * - API: Future cloud database integration (dynamic, updatable)
 * - Local: Works offline, faster initial load, development/demo
 * - Empty: Prevents component crashes on load failure
 *
 * Reason for not throwing errors:
 * - Graceful degradation: App remains functional without graph
 * - Better UX: Show empty state vs error screen
 * - Logging: Errors logged to console for debugging
 * - Flexibility: Different chapters may have different data availability
 *
 * Future enhancement:
 * - Cache successful API responses in localStorage
 * - Implement retry logic with exponential backoff
 * - Add loading indicators for each source attempt
 */
export const loadChapterGraphData = async (chapterNumber: number): Promise<KnowledgeGraphData> => {
  try {
    // Attempt 1: API endpoint (cloud database)
    const response = await fetch(`/api/chapters/${chapterNumber}/graph`);

    if (!response.ok) {
      // Attempt 2: Local file fallback
      const localResponse = await fetch(`/read/chapterGraph/chapter${chapterNumber}.json`);
      if (!localResponse.ok) {
        throw new Error(`Failed to load chapter ${chapterNumber} graph data`);
      }
      const chapterData: ChapterGraphJson = await localResponse.json();
      return transformChapterDataToGraphData(chapterData);
    }

    const chapterData: ChapterGraphJson = await response.json();
    return transformChapterDataToGraphData(chapterData);

  } catch (error) {
    console.error(`Error loading chapter ${chapterNumber} graph data:`, error);

    // Attempt 3: Return empty graph (graceful degradation)
    return {
      nodes: [],
      links: []
    };
  }
};

// Load chapter data from cloud database (future implementation)
export const loadChapterGraphFromDatabase = async (chapterNumber: number): Promise<KnowledgeGraphData> => {
  try {
    // This will be implemented when cloud database is ready
    // For now, return local file data
    return await loadChapterGraphData(chapterNumber);
    
  } catch (error) {
    console.error(`Error loading chapter ${chapterNumber} from database:`, error);
    return {
      nodes: [],
      links: []
    };
  }
}; 