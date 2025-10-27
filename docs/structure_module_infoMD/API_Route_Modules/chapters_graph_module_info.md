# Module: `chapters/[chapterNumber]/graph`

## 1. Module Summary

This API route module serves chapter-specific knowledge graph data for the interactive reading interface. It handles retrieval of character relationships, entities, and narrative connections for each of the 120 chapters in "Dream of the Red Chamber". Currently loads data from local JSON files with planned migration to cloud database storage for scalability and real-time updates.

## 2. Module Dependencies

* **Internal Dependencies:** None (standalone API route)
* **External Dependencies:**
  * `next/server` - NextRequest, NextResponse for API routing
  * `path` - File path resolution for local data access
  * `fs/promises` - Asynchronous file system operations

## 3. Public API / Exports

* `GET(request, params)`: Retrieves knowledge graph data for a specific chapter number
* `POST(request, params)`: Accepts new knowledge graph data for upload (pending database implementation)

## 4. Code File Breakdown

### 4.1. `route.ts`

* **Purpose:** Implements REST endpoints for chapter knowledge graph data retrieval and storage. This file serves as the bridge between the frontend knowledge graph visualization components and the backend data storage layer. The module validates chapter numbers, handles file system operations for local data access, and provides graceful fallback responses when data is unavailable.

* **Functions:**
    * `GET(request: NextRequest, { params }: { params: Promise<{ chapterNumber: string }> }): Promise<NextResponse>` - Validates the chapter number (1-120 range), attempts to read corresponding JSON file from local storage at `src/app/(main)/read/chapterGraph/chapter{N}.json`, returns structured knowledge graph data with entities, relationships, and metadata, or returns empty data structure with Chinese error message if file doesn't exist. Throws 400 Bad Request for invalid chapter numbers, 500 Internal Server Error for system failures.

    * `POST(request: NextRequest, { params }: { params: Promise<{ chapterNumber: string }> }): Promise<NextResponse>` - Accepts JSON payload containing knowledge graph data for a specific chapter, logs the received metadata for debugging purposes, returns success acknowledgment with "pending_database_implementation" status. Currently non-functional (stub implementation) awaiting cloud database integration. Returns 200 OK with pending status, 500 Internal Server Error if processing fails.

* **Key Classes / Constants / Variables:**
    * `filePath` (local variable): Constructed absolute path to chapter JSON file using `process.cwd()` and path.join, points to local filesystem location of knowledge graph data before cloud migration

    * Empty data structure (returned on file read failure): Comprehensive fallback object containing empty arrays for `entities` and `relationships`, plus detailed metadata object with 19 fields including version, description (Chinese), processing times, entity counts, creation date, and explanatory notes about missing data

## 5. System and Data Flow

### 5.1. System Flowchart (Control Flow)

```mermaid
flowchart TD
    A[Start: GET Request] --> B{Parse chapterNumber from params};
    B --> C[Validate: parseInt chapterNumber];
    C --> D{Valid number AND 1 ≤ chapterNum ≤ 120?};
    D -- Invalid --> E[Return 400 Error: 'Invalid chapter number'];
    D -- Valid --> F[Construct file path to local JSON];
    F --> G{Try: Read file from filesystem};
    G -- File Exists --> H[Parse JSON content];
    H --> I[Return 200 OK with chapter data];
    G -- File Not Found --> J[Return 200 OK with empty data structure];
    G -- System Error --> K[Return 500 Error: 'Failed to load chapter graph data'];

    L[Start: POST Request] --> M[Parse chapterNumber and body];
    M --> N[Log received metadata];
    N --> O[Return 200 OK with 'pending_database_implementation'];
    O --> P[TODO: Cloud Database Storage];
```

### 5.2. Data Flow Diagram (Data Transformation)

```mermaid
graph LR
    Client[Frontend: KnowledgeGraphViewer] -- HTTP GET /api/chapters/{N}/graph --> Route[API Route Handler];
    Route -- Validate --> Valid{Chapter 1-120?};
    Valid -- Yes --> FS[File System: chapterGraph/];
    Valid -- No --> Error400[400 Bad Request];
    FS -- Read chapter{N}.json --> Parse[JSON Parser];
    Parse -- Success --> Transform[Knowledge Graph Data];
    Transform -- entities, relationships, metadata --> Client;
    FS -- File Missing --> Empty[Empty Data Structure];
    Empty -- entities: [], relationships: [], metadata --> Client;

    Client2[Admin/Upload Tool] -- HTTP POST /api/chapters/{N}/graph --> Route2[POST Handler];
    Route2 -- Log Metadata --> Console[Server Console];
    Route2 -- Pending Status --> Client2;
    Route2 -. Future Implementation .-> CloudDB[(Cloud Database)];
```

## 6. Usage Example & Testing

* **Usage:**
```typescript
// Frontend client call
const response = await fetch(`/api/chapters/1/graph`);
const graphData = await response.json(); // { entities: [...], relationships: [...], metadata: {...} }
```

* **Testing:** This API route does not have dedicated test files. Testing is recommended through:
  1. Integration tests verifying valid chapter numbers return 200 OK
  2. Edge case tests for invalid inputs (chapter 0, 121, non-numeric values)
  3. File system mocking tests for missing JSON files
  4. End-to-end tests with actual knowledge graph visualization components in `src/components/KnowledgeGraphViewer.tsx`
