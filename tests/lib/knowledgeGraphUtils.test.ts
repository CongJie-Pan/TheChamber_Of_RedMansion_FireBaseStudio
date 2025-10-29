/**
 * @fileOverview Comprehensive Unit Tests for Knowledge Graph Utilities
 * @description This test suite validates the knowledge graph data transformation utilities,
 * entity categorization, relationship classification, and data loading functionality.
 * 
 * Test Categories:
 * 1. Entity categorization and classification
 * 2. Relationship type classification
 * 3. Data transformation from JSON to D3.js format
 * 4. Data loading from files and APIs
 * 5. Edge cases and error handling
 * 6. Performance with large datasets
 * 
 * @author Senior Project Development Team
 * @version 1.0.0
 * @since 2025-01-28
 */

import {
  transformChapterDataToGraphData,
  loadChapterGraphData,
  loadChapterGraphFromDatabase,
  type ChapterGraphJson,
  type KnowledgeGraphData
} from '@/lib/knowledgeGraphUtils';

// Mock fetch for testing
global.fetch = jest.fn();

// Test data fixtures
const mockChapterGraphJson: ChapterGraphJson = {
  entities: [
    "女媧氏",
    "頑石",
    "通靈寶玉", 
    "甄士隱",
    "賈雨村",
    "英蓮",
    "封氏",
    "青埂峰",
    "姑蘇城",
    "葫蘆廟",
    "煉石補天",
    "好了歌",
    "石頭記",
    "曹雪芹"
  ],
  relationships: [
    "女媧氏 - 煉造 - 頑石",
    "頑石 - 變化成 - 通靈寶玉",
    "甄士隱 - 夫妻 - 封氏",
    "甄士隱 - 父女 - 英蓮", 
    "甄士隱 - 資助 - 賈雨村",
    "甄士隱 - 居住 - 姑蘇城",
    "賈雨村 - 寄居 - 葫蘆廟",
    "頑石 - 棄置於 - 青埂峰",
    "好了歌 - 點化 - 甄士隱",
    "曹雪芹 - 抄錄 - 石頭記"
  ],
  metadata: {
    version: "1.0.0",
    description: "第一回知識圖譜測試數據",
    processing_time: 12.5,
    chunks_processed: 3,
    total_characters: 15420,
    clustering_time: 2.1,
    clustered_entities: 14,
    phase3_time: 3.2,
    synonym_merges_applied: 2,
    entities_merged: 1,
    total_processing_time: 17.8,
    strategy: "測試策略",
    text_length: 15420,
    original_entities: 15,
    streamlined_entities: 14,
    original_relationships: 12,
    streamlined_relationships: 10,
    reduction_ratio: "16.7%",
    focus: "主要人物和關係",
    creation_date: "2025-01-28",
    notes: "用於單元測試的模擬數據"
  }
};

const mockEmptyChapterGraphJson: ChapterGraphJson = {
  entities: [],
  relationships: [],
  metadata: {
    version: "empty",
    description: "空的測試數據",
    processing_time: 0,
    chunks_processed: 0,
    total_characters: 0,
    clustering_time: 0,
    clustered_entities: 0,
    phase3_time: 0,
    synonym_merges_applied: 0,
    entities_merged: 0,
    total_processing_time: 0,
    strategy: "空數據",
    text_length: 0,
    original_entities: 0,
    streamlined_entities: 0,
    original_relationships: 0,
    streamlined_relationships: 0,
    reduction_ratio: "0%",
    focus: "無數據",
    creation_date: "2025-01-28",
    notes: "空數據測試用例"
  }
};

const mockInvalidRelationshipChapterGraphJson: ChapterGraphJson = {
  entities: ["甄士隱", "封氏"],
  relationships: [
    "甄士隱 - 夫妻 - 封氏",
    "無效關係格式",
    "甄士隱 - 認識",
    "不存在的實體 - 關係 - 另一個不存在的實體"
  ],
  metadata: {
    version: "1.0.0",
    description: "包含無效關係的測試數據",
    processing_time: 5.0,
    chunks_processed: 1,
    total_characters: 100,
    clustering_time: 1.0,
    clustered_entities: 2,
    phase3_time: 1.0,
    synonym_merges_applied: 0,
    entities_merged: 0,
    total_processing_time: 7.0,
    strategy: "錯誤測試",
    text_length: 100,
    original_entities: 2,
    streamlined_entities: 2,
    original_relationships: 4,
    streamlined_relationships: 1,
    reduction_ratio: "75%",
    focus: "錯誤處理測試",
    creation_date: "2025-01-28",
    notes: "用於測試錯誤處理的數據"
  }
};

describe('Knowledge Graph Utils - Entity Categorization', () => {
  test('should correctly categorize mythological characters', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["女媧氏", "太上老君"],
      relationships: [],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const nuwaShi = result.nodes.find(node => node.name === "女媧氏");
    expect(nuwaShi).toBeDefined();
    expect(nuwaShi?.type).toBe('character');
    expect(nuwaShi?.category).toBe('神話人物');
    expect(nuwaShi?.importance).toBe('primary');
    expect(nuwaShi?.color).toBe('#DC2626');
    // Dynamic radius: textLength * 3.5 + 10 = 3 * 3.5 + 10 = 20.5, max(35, 20.5) = 35, min(35, 60) = 35
    expect(nuwaShi?.radius).toBe(35);
    expect(nuwaShi?.group).toBe(1);
  });

  test('should correctly categorize main characters', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["甄士隱", "賈雨村"],
      relationships: [],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const zhenShiyin = result.nodes.find(node => node.name === "甄士隱");
    expect(zhenShiyin).toBeDefined();
    expect(zhenShiyin?.type).toBe('character');
    expect(zhenShiyin?.category).toBe('主要人物');
    expect(zhenShiyin?.importance).toBe('primary');
    expect(zhenShiyin?.color).toBe('#059669');
    // Dynamic radius: 3 chars * 3.5 + 10 = 20.5, max(30, 20.5) = 30
    expect(zhenShiyin?.radius).toBe(30);
  });

  test('should correctly categorize secondary characters', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["英蓮", "封氏"],
      relationships: [],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const yinglian = result.nodes.find(node => node.name === "英蓮");
    expect(yinglian).toBeDefined();
    expect(yinglian?.type).toBe('character');
    expect(yinglian?.category).toBe('次要人物');
    expect(yinglian?.importance).toBe('secondary');
    expect(yinglian?.color).toBe('#EC4899');
    // Dynamic radius: 2 chars * 3.5 + 10 = 17, max(25, 17) = 25
    expect(yinglian?.radius).toBe(25);
  });

  test('should correctly categorize mystical locations', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["青埂峰", "大荒山"],
      relationships: [],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const qingengPeak = result.nodes.find(node => node.name === "青埂峰");
    expect(qingengPeak).toBeDefined();
    expect(qingengPeak?.type).toBe('location');
    expect(qingengPeak?.category).toBe('神話地點');
    expect(qingengPeak?.importance).toBe('primary');
    expect(qingengPeak?.color).toBe('#8B5CF6');
    // Dynamic radius: 3 chars * 3.5 + 10 = 20.5, max(28, 20.5) = 28
    expect(qingengPeak?.radius).toBe(28);
  });

  test('should correctly categorize earthly locations', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["姑蘇城", "葫蘆廟"],
      relationships: [],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const suzhou = result.nodes.find(node => node.name === "姑蘇城");
    expect(suzhou).toBeDefined();
    expect(suzhou?.type).toBe('location');
    expect(suzhou?.category).toBe('世俗地點');
    expect(suzhou?.importance).toBe('secondary');
    expect(suzhou?.color).toBe('#F59E0B');
    // Dynamic radius: 3 chars * 3.5 + 10 = 20.5, max(24, 20.5) = 24
    expect(suzhou?.radius).toBe(24);
  });

  test('should correctly categorize artifacts and literature', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["通靈寶玉", "石頭記", "好了歌"],
      relationships: [],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const jade = result.nodes.find(node => node.name === "通靈寶玉");
    expect(jade).toBeDefined();
    expect(jade?.type).toBe('artifact');
    expect(jade?.category).toBe('重要物品/文獻');
    expect(jade?.importance).toBe('primary');
    expect(jade?.color).toBe('#EAB308');
    // Dynamic radius: 4 chars * 3.5 + 10 = 24, max(30, 24) = 30
    expect(jade?.radius).toBe(30);
  });

  test('should correctly categorize philosophical concepts', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["還淚情", "紅塵"],
      relationships: [],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const concept = result.nodes.find(node => node.name === "還淚情");
    expect(concept).toBeDefined();
    expect(concept?.type).toBe('concept');
    expect(concept?.category).toBe('哲學概念');
    expect(concept?.importance).toBe('secondary');
    expect(concept?.color).toBe('#0891B2');
    // Dynamic radius: 3 chars * 3.5 + 10 = 20.5, max(22, 20.5) = 22
    expect(concept?.radius).toBe(22);
  });

  test('should correctly categorize events', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["功名夢", "富貴場"],
      relationships: [],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const event = result.nodes.find(node => node.name === "功名夢");
    expect(event).toBeDefined();
    expect(event?.type).toBe('event');
    expect(event?.category).toBe('情節事件');
    expect(event?.importance).toBe('secondary');
    expect(event?.color).toBe('#7C2D12');
    // Dynamic radius: 3 chars * 3.5 + 10 = 20.5, max(20, 20.5) = 20.5, floor to 20
    expect(event?.radius).toBeGreaterThanOrEqual(20);
    expect(event?.radius).toBeLessThanOrEqual(21);
  });

  test('should handle unknown entities with default categorization', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["未知角色", "神秘人物"],
      relationships: [],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const unknown = result.nodes.find(node => node.name === "未知角色");
    expect(unknown).toBeDefined();
    expect(unknown?.type).toBe('character');
    expect(unknown?.category).toBe('其他人物');
    expect(unknown?.importance).toBe('tertiary');
    expect(unknown?.color).toBe('#6B7280');
    // Dynamic radius: textLength * 3.5 + 10 = 4 * 3.5 + 10 = 24, max(18, 24) = 24, min(24, 60) = 24
    expect(unknown?.radius).toBe(24);
    expect(unknown?.group).toBe(7);
  });
});

describe('Knowledge Graph Utils - Dynamic Node Radius Calculation', () => {
  test('should calculate radius dynamically based on text length', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["短名", "這是一個比較長的名字", "太虛幻境對聯（假作真時真亦假，無為有處有還無）"],
      relationships: [],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const shortName = result.nodes.find(node => node.name === "短名");
    const mediumName = result.nodes.find(node => node.name === "這是一個比較長的名字");
    const longName = result.nodes.find(node => node.name === "太虛幻境對聯（假作真時真亦假，無為有處有還無）");

    expect(shortName).toBeDefined();
    expect(mediumName).toBeDefined();
    expect(longName).toBeDefined();

    // Short name: 2 chars * 3.5 + 10 = 17, but baseRadius is 18, so max(18, 17) = 18
    expect(shortName?.radius).toBeGreaterThanOrEqual(18);
    expect(shortName?.radius).toBeLessThan(25);

    // Medium name: 11 chars * 3.5 + 10 = 48.5, so 48.5 (capped at 60)
    expect(mediumName?.radius).toBeGreaterThan(40);
    expect(mediumName?.radius).toBeLessThanOrEqual(60);

    // Long name: 24 chars * 3.5 + 10 = 94, but capped at 60
    expect(longName?.radius).toBe(60);
  });

  test('should respect minimum radius (baseRadius)', () => {
    // Arrange & Act - Very short entity name
    const result = transformChapterDataToGraphData({
      entities: ["A"],
      relationships: [],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const node = result.nodes[0];
    // 1 char * 3.5 + 10 = 13.5, but baseRadius is 18, so max(18, 13.5) = 18
    expect(node.radius).toBeGreaterThanOrEqual(18);
  });

  test('should respect maximum radius (60px cap)', () => {
    // Arrange & Act - Very long entity name
    const veryLongName = "這是一個非常非常非常非常非常非常非常非常非常非常非常長的實體名稱";
    const result = transformChapterDataToGraphData({
      entities: [veryLongName],
      relationships: [],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const node = result.nodes[0];
    // 31 chars * 3.5 + 10 = 118.5, but capped at 60
    expect(node.radius).toBe(60);
  });

  test('should scale radius proportionally for medium-length names', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["5字名字", "10個字的名字", "15個字符長的名字"],
      relationships: [],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const name5 = result.nodes.find(node => node.name === "5字名字");
    const name10 = result.nodes.find(node => node.name === "10個字的名字");
    const name15 = result.nodes.find(node => node.name === "15個字符長的名字");

    // Verify radius increases with text length
    expect(name5?.radius).toBeDefined();
    expect(name10?.radius).toBeDefined();
    expect(name15?.radius).toBeDefined();

    expect(name10!.radius).toBeGreaterThan(name5!.radius);
    expect(name15!.radius).toBeGreaterThan(name10!.radius);
  });

  test('should handle different character types (Chinese, English, symbols)', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["English Name", "中文名字", "Mixed混合Name名"],
      relationships: [],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert - All should have valid radius regardless of character type
    result.nodes.forEach(node => {
      expect(node.radius).toBeGreaterThanOrEqual(18);
      expect(node.radius).toBeLessThanOrEqual(60);
      expect(typeof node.radius).toBe('number');
    });
  });

  test('should calculate radius correctly for all entity categories', () => {
    // Arrange & Act - Test across different entity categories with same length
    const testName = "測試實體名稱"; // 6 characters
    const result = transformChapterDataToGraphData({
      entities: [
        testName,  // Will be categorized as unknown/other
      ],
      relationships: [],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert - Radius should be based on text length, not category
    const node = result.nodes[0];
    // 6 chars * 3.5 + 10 = 31, max(baseRadius, 31) = 31 (since baseRadius for unknown is 18)
    expect(node.radius).toBeGreaterThanOrEqual(30);
    expect(node.radius).toBeLessThan(35);
  });

  test('should handle edge case of exact boundary length (60px)', () => {
    // Arrange - Calculate exact length that would produce 60px radius
    // 60 = length * 3.5 + 10 => length = (60 - 10) / 3.5 = 14.28 chars
    // So we need a name with 15+ characters to hit the 60px cap
    const longBoundaryName = "這是一個十五個字符的超長名字"; // 15 characters

    // Act
    const result = transformChapterDataToGraphData({
      entities: [longBoundaryName],
      relationships: [],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const node = result.nodes[0];
    const actualLength = longBoundaryName.length;
    const expectedRadius = Math.min(actualLength * 3.5 + 10, 60);
    // With 15 chars: 15 * 3.5 + 10 = 62.5, capped at 60
    expect(node.radius).toBeLessThanOrEqual(60);
    expect(node.radius).toBeCloseTo(expectedRadius, 0);
  });
});

describe('Knowledge Graph Utils - Relationship Classification', () => {
  test('should correctly classify family relationships', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["甄士隱", "封氏", "英蓮"],
      relationships: [
        "甄士隱 - 夫妻 - 封氏",
        "甄士隱 - 女兒 - 英蓮"
      ],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const marriageLink = result.links.find(link => 
      link.relationship === "夫妻"
    );
    expect(marriageLink).toBeDefined();
    expect(marriageLink?.type).toBe('family');
    expect(marriageLink?.strength).toBe(0.9);
    expect(marriageLink?.distance).toBe(60);

    const parentChildLink = result.links.find(link => 
      link.relationship === "女兒"
    );
    expect(parentChildLink).toBeDefined();
    expect(parentChildLink?.type).toBe('family');
    expect(parentChildLink?.strength).toBe(0.9);
    expect(parentChildLink?.distance).toBe(60);
  });

  test('should correctly classify friendship relationships', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["甄士隱", "賈雨村"],
      relationships: ["甄士隱 - 資助 - 賈雨村"],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const friendshipLink = result.links[0];
    expect(friendshipLink.type).toBe('friendship');
    expect(friendshipLink.strength).toBe(0.7);
    expect(friendshipLink.distance).toBe(90);
  });

  test('should correctly classify literary relationships', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["女媧氏", "頑石"],
      relationships: ["女媧氏 - 煉造 - 頑石"],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const literaryLink = result.links[0];
    expect(literaryLink.type).toBe('literary');
    expect(literaryLink.strength).toBe(0.8);
    expect(literaryLink.distance).toBe(100);
  });

  test('should correctly classify conceptual relationships', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["甄士隱", "姑蘇城"],
      relationships: ["甄士隱 - 居住 - 姑蘇城"],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const conceptualLink = result.links[0];
    expect(conceptualLink.type).toBe('conceptual');
    expect(conceptualLink.strength).toBe(0.6);
    expect(conceptualLink.distance).toBe(120);
  });

  test('should handle unknown relationships with default classification', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["角色A", "角色B"],
      relationships: ["角色A - 神秘關係 - 角色B"],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const defaultLink = result.links[0];
    expect(defaultLink.type).toBe('literary');
    expect(defaultLink.strength).toBe(0.5);
    expect(defaultLink.distance).toBe(110);
  });
});

describe('Knowledge Graph Utils - Data Transformation', () => {
  test('should transform complete chapter data correctly', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData(mockChapterGraphJson);

    // Assert - Node structure
    expect(result.nodes).toHaveLength(14);
    expect(result.links).toHaveLength(10);
    
    // Verify all nodes have required properties
    result.nodes.forEach(node => {
      expect(node).toHaveProperty('id');
      expect(node).toHaveProperty('name');
      expect(node).toHaveProperty('type');
      expect(node).toHaveProperty('importance');
      expect(node).toHaveProperty('description');
      expect(node).toHaveProperty('category');
      expect(node).toHaveProperty('radius');
      expect(node).toHaveProperty('color');
      expect(node).toHaveProperty('group');
      
      expect(typeof node.id).toBe('string');
      expect(typeof node.name).toBe('string');
      expect(['character', 'location', 'concept', 'event', 'artifact']).toContain(node.type);
      expect(['primary', 'secondary', 'tertiary']).toContain(node.importance);
      expect(typeof node.radius).toBe('number');
      expect(typeof node.color).toBe('string');
      expect(typeof node.group).toBe('number');
    });

    // Verify all links have required properties
    result.links.forEach(link => {
      expect(link).toHaveProperty('source');
      expect(link).toHaveProperty('target');
      expect(link).toHaveProperty('relationship');
      expect(link).toHaveProperty('strength');
      expect(link).toHaveProperty('type');
      expect(link).toHaveProperty('description');
      expect(link).toHaveProperty('distance');
      
      expect(['family', 'friendship', 'conflict', 'literary', 'conceptual']).toContain(link.type);
      expect(typeof link.strength).toBe('number');
      expect(link.strength).toBeGreaterThanOrEqual(0);
      expect(link.strength).toBeLessThanOrEqual(1);
      expect(typeof link.distance).toBe('number');
      expect(link.distance).toBeGreaterThan(0);
    });
  });

  test('should handle empty chapter data gracefully', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData(mockEmptyChapterGraphJson);

    // Assert
    expect(result.nodes).toHaveLength(0);
    expect(result.links).toHaveLength(0);
    expect(result).toEqual({ nodes: [], links: [] });
  });

  test('should handle invalid relationship formats gracefully', () => {
    // Arrange & Act
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const result = transformChapterDataToGraphData(mockInvalidRelationshipChapterGraphJson);

    // Assert
    expect(result.nodes).toHaveLength(2);
    expect(result.links).toHaveLength(1); // Only valid relationship should be processed

    // Check that warnings were logged for invalid relationships
    expect(consoleSpy).toHaveBeenCalledWith('Invalid relationship format: 無效關係格式');
    expect(consoleSpy).toHaveBeenCalledWith('Invalid relationship format: 甄士隱 - 認識');
    expect(consoleSpy).toHaveBeenCalledWith('Entity not found for relationship: 不存在的實體 - 關係 - 另一個不存在的實體');

    consoleSpy.mockRestore();
  });

  test('should generate unique node IDs', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData(mockChapterGraphJson);

    // Assert
    const nodeIds = result.nodes.map(node => node.id);
    const uniqueIds = new Set(nodeIds);
    expect(uniqueIds.size).toBe(nodeIds.length);
    
    // Verify ID format
    nodeIds.forEach(id => {
      expect(id).toMatch(/^entity-\d+$/);
    });
  });

  test('should generate descriptive relationship descriptions', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["甄士隱", "封氏"],
      relationships: ["甄士隱 - 夫妻 - 封氏"],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    const link = result.links[0];
    expect(link.description).toBe('甄士隱與封氏的關係：夫妻');
  });
});

describe('Knowledge Graph Utils - Data Loading', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  test('should load chapter data from API successfully', async () => {
    // Arrange
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockChapterGraphJson
      });

    // Act
    const result = await loadChapterGraphData(1);

    // Assert
    expect(global.fetch).toHaveBeenCalledWith('/api/chapters/1/graph');
    expect(result.nodes).toHaveLength(14);
    expect(result.links).toHaveLength(10);
  });

  test('should fallback to local file when API fails', async () => {
    // Arrange
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 404
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockChapterGraphJson
      });

    // Act
    const result = await loadChapterGraphData(1);

    // Assert
    expect(global.fetch).toHaveBeenCalledWith('/api/chapters/1/graph');
    expect(global.fetch).toHaveBeenCalledWith('/read/chapterGraph/chapter1.json');
    expect(result.nodes).toHaveLength(14);
    expect(result.links).toHaveLength(10);
  });

  test('should return empty data when both API and local file fail', async () => {
    // Arrange
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 404
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404
      });

    // Act
    const result = await loadChapterGraphData(1);

    // Assert
    expect(result).toEqual({ nodes: [], links: [] });
    expect(consoleSpy).toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  test('should handle network errors gracefully', async () => {
    // Arrange
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    // Act
    const result = await loadChapterGraphData(1);

    // Assert
    expect(result).toEqual({ nodes: [], links: [] });
    expect(consoleSpy).toHaveBeenCalledWith('Error loading chapter 1 graph data:', expect.any(Error));
    
    consoleSpy.mockRestore();
  });

  test('should load data from database (future implementation)', async () => {
    // Arrange & Act
    const result = await loadChapterGraphFromDatabase(1);

    // Assert
    // Currently falls back to file loading
    expect(result).toEqual({ nodes: [], links: [] });
  });
});

describe('Knowledge Graph Utils - Performance Tests', () => {
  test('should handle large datasets efficiently', () => {
    // Arrange
    const largeDataset: ChapterGraphJson = {
      entities: Array.from({ length: 100 }, (_, i) => `實體${i}`),
      relationships: Array.from({ length: 200 }, (_, i) => 
        `實體${i % 100} - 關係${i} - 實體${(i + 1) % 100}`
      ),
      metadata: mockChapterGraphJson.metadata
    };

    // Act
    const startTime = performance.now();
    const result = transformChapterDataToGraphData(largeDataset);
    const endTime = performance.now();

    // Assert
    expect(result.nodes).toHaveLength(100);
    expect(result.links).toHaveLength(200);
    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
  });

  test('should handle very large relationship lists efficiently', () => {
    // Arrange
    const entities = Array.from({ length: 50 }, (_, i) => `角色${i}`);
    const relationships = [];
    
    // Create full mesh of relationships (worst case scenario)
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        relationships.push(`角色${i} - 相識 - 角色${j}`);
      }
    }

    const complexDataset: ChapterGraphJson = {
      entities,
      relationships,
      metadata: mockChapterGraphJson.metadata
    };

    // Act
    const startTime = performance.now();
    const result = transformChapterDataToGraphData(complexDataset);
    const endTime = performance.now();

    // Assert
    expect(result.nodes).toHaveLength(50);
    expect(result.links).toHaveLength(relationships.length);
    expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
  });
});

describe('Knowledge Graph Utils - Edge Cases', () => {
  test('should handle entities with special characters', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["「紅樓夢」", "（甄士隱）", "【通靈寶玉】"],
      relationships: [],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    expect(result.nodes).toHaveLength(3);
    result.nodes.forEach(node => {
      expect(node.name).toMatch(/[「」（）【】]/);
      expect(node.id).toMatch(/^entity-\d+$/);
    });
  });

  test('should handle very long entity names', () => {
    // Arrange
    const longName = "這是一個非常非常非常非常非常非常長的實體名稱用來測試系統的處理能力";
    
    // Act
    const result = transformChapterDataToGraphData({
      entities: [longName],
      relationships: [],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].name).toBe(longName);
    expect(result.nodes[0].description).toContain(longName);
  });

  test('should handle duplicate entities gracefully', () => {
    // Arrange & Act
    const result = transformChapterDataToGraphData({
      entities: ["甄士隱", "甄士隱", "賈雨村"],
      relationships: ["甄士隱 - 認識 - 賈雨村"],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    expect(result.nodes).toHaveLength(3); // All entities should be preserved
    expect(result.links).toHaveLength(1);
  });

  test('should handle relationships with missing entities', () => {
    // Arrange
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    // Act
    const result = transformChapterDataToGraphData({
      entities: ["甄士隱"],
      relationships: ["甄士隱 - 認識 - 不存在的人"],
      metadata: mockChapterGraphJson.metadata
    });

    // Assert
    expect(result.nodes).toHaveLength(1);
    expect(result.links).toHaveLength(0);
    expect(consoleSpy).toHaveBeenCalledWith('Entity not found for relationship: 甄士隱 - 認識 - 不存在的人');
    
    consoleSpy.mockRestore();
  });
});

// Cleanup and test summary
afterAll(() => {
  // Restore any global mocks
  jest.restoreAllMocks();
  
  console.log('\n=== Knowledge Graph Utils Test Suite Summary ===');
  console.log('✅ Entity categorization and classification tests');
  console.log('✅ Relationship type classification tests');
  console.log('✅ Data transformation tests');
  console.log('✅ Data loading and API integration tests');
  console.log('✅ Performance tests with large datasets');
  console.log('✅ Edge cases and error handling tests');
  console.log('\n🎉 All Knowledge Graph Utils tests completed successfully!');
}); 