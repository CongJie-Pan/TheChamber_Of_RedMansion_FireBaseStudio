/**
 * @fileOverview Interactive Book Reading Interface for Dream of the Red Chamber
 * 
 * This is the core reading experience component that provides an immersive, AI-powered
 * interface for studying classical Chinese literature. It combines traditional text
 * with modern technology to create an engaging and educational reading experience.
 * 
 * Key features:
 * - Immersive full-screen reading interface with customizable themes and typography
 * - AI-powered text analysis and explanation using Google GenKit and Gemini 2.0 Flash
 * - Interactive text selection with contextual AI assistance
 * - Side-by-side classical and vernacular Chinese text display
 * - Knowledge graph visualization for character relationships
 * - Advanced search functionality with text highlighting
 * - Responsive column layouts (single, double, triple) for different reading preferences
 * - Text-to-speech integration for accessibility
 * - Chapter navigation with table of contents
 * - Note-taking capabilities with text annotation
 * - Customizable reading settings (themes, fonts, sizes)
 * - Multi-language support with dynamic content transformation
 * 
 * Educational design principles:
 * - Minimizes cognitive load while maximizing learning opportunities
 * - Provides multiple ways to engage with classical text
 * - Supports different learning styles through varied interaction modes
 * - Maintains cultural authenticity while leveraging modern UX practices
 */

"use client"; // Required for client-side interactivity and AI integration

// React imports for state management and lifecycle
import React, { useState, useEffect, useRef, useCallback } from 'react';

// Next.js navigation and dynamic loading for routing and performance
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

// UI component imports from design system
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
// Progress bar removed per new design for double-column pagination controls
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

// Icon imports for reading interface controls
import {
  Search as SearchIcon,         // Text search functionality
  Maximize,                     // Fullscreen toggle
  Map as MapIcon,               // Knowledge graph access (aliased to avoid shadowing built-in Map)
  X,                            // Close/cancel actions
  Edit3,                        // Note-taking features
  Eye,                          // Show vernacular text
  EyeOff,                       // Hide vernacular text
  AlignLeft,                    // Single column layout
  AlignCenter,                  // Double column layout
  AlignJustify,                 // Triple column layout
  CornerUpLeft,                 // Return/back navigation
  List,                         // Table of contents
  Lightbulb,                    // AI assistance indicator
  Minus,                        // Decrease font size
  Plus,                         // Increase font size
  Check,                        // Confirm/accept actions
  Minimize,                     // Exit fullscreen
  Trash2 as Trash2,            // Clear search
  Baseline,                     // Typography settings
  Volume2,                      // Text-to-speech
  Copy,                         // Copy selected text
  Quote,                        // Quote/annotation
  ChevronDown,                  // Dropdown indicators
  ChevronLeft,                  // Task 4.5: Edge navigation zone indicator
  ChevronRight,                 // Task 4.5: Edge navigation zone indicator
  ArrowUp,                      // Submit question button (circular design)
  Square,                       // Stop streaming button (for Phase 2)
  Menu                          // Mobile menu trigger
} from "lucide-react";

// Third-party libraries for content rendering
// Phase 4-T4: Lazy load ReactMarkdown to reduce initial bundle size (~30KB)
const ReactMarkdown = dynamic(
  () => import('react-markdown'),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-muted/30 rounded h-4 w-full" />
    ),
  }
);

// Custom components and utilities
import { cn } from "@/lib/utils";
import { SimulatedKnowledgeGraph } from '@/components/SimulatedKnowledgeGraph';

// Phase 4-T3: Lazy load KnowledgeGraphViewer (D3.js is heavy ~200KB)
const KnowledgeGraphViewer = dynamic(
  () => import('@/components/KnowledgeGraphViewer'),
  {
    ssr: false, // Disable server-side rendering for client-only component
    loading: () => (
      <div className="flex items-center justify-center h-[600px] bg-muted/20 rounded-lg">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-sm text-muted-foreground">載入知識圖譜...</p>
        </div>
      </div>
    ),
  }
);

// AI integration for text analysis
// Note: legacy Genkit explainTextSelection not used in unified QA flow

// Perplexity AI integration
import {
  perplexityRedChamberQA,
  createPerplexityQAInputForFlow
} from '@/ai/flows/perplexity-red-chamber-qa';
import type { PerplexityQAResponse, PerplexityStreamingChunk } from '@/types/perplexity-qa';
// Deprecated local analysis UI and terminal logger imports removed in unified flow

// New QA Module Components (Phase 2 Implementation)
import { ThinkingProcessIndicator } from '@/components/ui/ThinkingProcessIndicator';
import type { ThinkingStatus } from '@/components/ui/ThinkingProcessIndicator';
import { ConversationFlow } from '@/components/ui/ConversationFlow';
import type { ConversationMessage, MessageRole } from '@/components/ui/ConversationFlow';
import { AIMessageBubble, type ThinkingExpandedPreference } from '@/components/ui/AIMessageBubble';

// Citation and Error Handling Utilities
// Citation processing handled within AI bubble components
import { classifyError, formatErrorForUser, logError } from '@/lib/perplexity-error-handler';

// Custom hooks for application functionality
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from '@/hooks/useLanguage';
import { useIsMobile } from '@/hooks/use-mobile';

// Utility for text transformation based on language
import type { Note } from '@/types/notes-api';
import type { CreatePostData, CreatePostResponse } from '@/types/community';
import { useAuth } from '@/hooks/useAuth';

// XP Integration for gamification (using shared types, not service directly)
import { XP_REWARDS, type AwardXPResponse } from '@/types/user-level-api';
import { LevelUpModal, LevelBadge } from '@/components/gamification';

// Dynamic chapter loading from JSON files
import type { ChapterData, ChapterMeta } from '@/lib/chapter-loader';

// Development logging control - 僅在明確啟用時才輸出分頁除錯日誌
const DEBUG_PAGINATION = typeof window !== 'undefined' && process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEBUG_PAGINATION === 'true';

// Task 4.5: Fixed toolbar height for consistent pagination (2025-12-01)
// Using fixed height avoids pagination recalculation when toolbar content changes
const TOOLBAR_HEIGHT = 96; // Fixed height in pixels (p-2 padding + content height)


interface Annotation {
  text: string;
  note: string; // Base text (zh-TW)
  id: string;
}

interface Paragraph {
  content: Array<string | Annotation>; // Base text (zh-TW)
  vernacular?: string; // Base text (zh-TW)
}

interface Chapter {
  id: number;
  titleKey: string; // Translation key
  subtitleKey?: string; // Translation key
  summaryKey: string; // Translation key
  paragraphs: Paragraph[]; // Content remains base zh-TW
}

// CHAPTER DATA: Base content is zh-TW. Keys are used for translatable metadata.
const chapters_base_data: Omit<Chapter, 'titleKey' | 'subtitleKey' | 'summaryKey'>[] = [
  {
    id: 1,
    paragraphs: [
      { content: ["此開卷第一回也。作者自云：因曾歷過一番夢幻之後，故將真事隱去，而借「通靈」之說，撰此《石頭記》一書也。故曰「甄士隱」云云。但書中所記何事何人？自又云：「今風塵碌碌，一事無成，忽念及當日所有之女子，一一細考較去，覺其行止見識，皆出我之上。我堂堂鬚眉，誠不若彼裙釵。我實愧則有餘，悔又無益，大無可如何之日也！当此日，欲將已往所賴天恩祖德，錦衣紈褲之時，飫甘饜肥之日，背父兄教育之恩，負師友規訓之德，以致今日一技無成，半生潦倒之罪，編述一集，以告天下。知我之負罪固多，然閨閣中歷歷有人，萬不可因我之不肖，自護己短，一併使其泯滅也。故當此時，自欲將以往經歷，及素所聞識，逐細編次，作為小說，聊以表我這些姊妹。雖不敢比類自己，自謂可以傳世，亦可使閨閣昭傳。復可破一時之悶，醒同人之目，不亦宜乎？」故曰「賈雨村」云云。"], vernacular: "（白話文）這是本書的第一回。作者自己說：因為曾經經歷過一番夢幻般的事情，所以把真實的事情隱藏起來，借用「通靈寶玉」的說法，寫成了這本《石頭記》。所以書中稱「甄士隱」等等。但書中記載的是什麼事、什麼人呢？作者又說：「現在我到處奔波，一事無成，忽然想起當年的那些女子，一個個仔細回想比較，覺得她們的言行見識，都在我之上。我一個堂堂男子，實在不如那些女性。我實在是慚愧有餘，後悔也沒用，真是非常無奈啊！在那時，我想把自己過去依仗著上天的恩賜和祖先的功德，過著富裕悠閒生活的時候，享受著美味佳餚的日子，卻違背了父兄的教誨，辜負了老師朋友的規勸，以致今日一無所長，半生潦倒的罪過，編寫成一本書，告訴世人。我知道我的罪過很多，但是女性當中確實有很多傑出的人物，千萬不能因為我的不成才，只顧著掩飾自己的缺點，而讓她们的事蹟也跟著被埋沒了。所以在這個時候，我自己想把過去的經歷，以及平時聽到見到的事情，詳細地編排起來，寫成小說，來表彰我這些姐妹們。雖然不敢和自己相提並論，自認為可以流傳後世，也可以讓女性們的事蹟顯揚。又可以解除一時的煩悶，提醒世人，不也是件好事嗎？」所以書中稱「賈雨村」等等。" },
      {
        content: [
          "你道此書從何而起？說來雖近荒唐，細玩頗有趣味。卻說那",
          {
            text: "女媧氏煉石補天",
            note: "女媧氏煉石補天——古代神話：天原來不整齊，女媧氏煉五色石把它修補起來。後又被共工氏闖壞，天塌了西北角，地陷了東南角。見《列子》。《列子》注說女媧氏是「古天子」，「風」姓。所以又稱「媧皇」。",
            id: "ch1-p2-anno-nuwa"
          },
          "之時，於大荒山無稽崖煉成高十二丈、見方二十四丈大的頑石三萬六千五百零一塊。那媧皇只用了三萬六千五百塊，單單剩下一塊未用，棄在此山青埂峰下。誰知此石自經鍛煉之後，靈性已通，自去自來，可大可小。因見眾石俱得補天，獨自己無才不堪入選，遂自怨自愧，日夜悲哀。"
        ],
        vernacular: "（白話文）你說這本書是從哪裡開始的呢？說起來雖然近乎荒誕，但仔細品味卻很有趣味。話說那女媧娘娘煉石補天的時候，在大荒山無稽崖煉成了高十二丈、寬二十四丈的石頭三萬六千五百零一塊。女媧娘娘只用了三萬六千五百塊，偏偏剩下一塊沒用，丟棄在這座山的青埂峰下。誰知道這塊石頭經過鍛煉之後，已經有了靈性，能夠自己來去，可大可小。因為看見所有的石頭都能補天，只有自己沒有才能不能入選，於是自己埋怨自己慚愧，日夜悲傷。"
      },
      { content: ["一日，正当嗟悼之際，俄見一僧一道，遠遠而來，生得骨格不凡，豐神迥異，來到這青埂峰下，席地而坐，長談闊論。見到這塊鮮瑩明潔的石頭，左瞧右看，先是嘆息，後又大笑，攜手問道：「你這蠢物，有何好處？倒是把你的形狀，出身，來歷，明白寫在那上面，待我帶你到那花柳繁華地，溫柔富貴鄉去走一遭。」石頭聽了大喜，因答道：「我師何必勞神？弟子願隨二師前去。」那僧道：「你是不中用的。況且，你這本體也過大了些，須得再鐫上幾個字，使人一見便知你是件奇物，然後攜你到那經歷富貴的所在，受用一番。再把你送回來，豈不兩全？」石頭聽了，益發歡喜，忙叩頭拜謝。"], vernacular: "（白話文）有一天，正當它傷心感嘆的時候，忽然看見一個和尚和一個道士，遠遠地走過來，長得骨骼不凡，神采與眾不同，來到這青埂峰下，就地坐下，高談闊論。看到這塊光潔明亮的石頭，左看右看，先是嘆息，後來又大笑起來，拉著手問道：「你這個笨東西，有什麼好處？不如把你的形狀、出身、來歷，清楚地寫在上面，等我帶你到那花紅柳綠的繁華地方，溫柔富貴的去處去走一趟。」石頭聽了非常高興，於是回答說：「師父何必勞神？弟子願意跟隨兩位師父前去。」那和尚道士說：「你是不中用的。況且，你這本來的形體也太大了些，必須再刻上幾個字，讓人一看就知道你是件奇物，然後帶你到那經歷富貴的地方，享受一番。再把你送回來，豈不是兩全其美？」石頭聽了，更加高興，連忙磕頭拜謝。" },
      { content: ["那僧便念咒書符，大展幻術，將一塊大石登時變成一塊鮮明瑩潔的美玉，又縮成扇墜一般大小，托在掌上。笑道：「形體倒也是個寶物了！還只沒有實在的好處。」因回頭問道士：「你道這一番塵世，何處為樂？」道士道：「此事說來話長，一時難以说完。不過，歷來風流儻灑之輩，多情好色之徒，悉皆生成在東南地界。那裡雖好，然斷不可久居。況且，目今正值太平盛世，文章顯赫之時，我輩正可借此機會，到那繁華昌盛之處，訪幾位仙友，也不枉此一行。」那僧道：「妙哉，妙哉！正合吾意。」二人遂相攜飄然而去，不知所蹤。"], vernacular: "（白話文）那和尚便念起咒語，畫起符籙，施展出高超的幻術，把一塊大石頭立刻變成一塊鮮明光潔的美玉，又縮小成扇墜一般大小，托在手掌上。笑著說：「形體倒也是個寶物了！還只是沒有實際的好處。」於是回頭問道士：「你說這人世間，什麼地方最快樂？」道士說：「這件事說來話長，一時難以說完。不過，歷來風流倜傥的人，多情好色的人，大多都出生在東南地區。那裡雖然好，但是決不能長久居住。況且，現在正是太平盛世，文章顯赫的時候，我們正好可以藉此機會，到那繁華昌盛的地方，拜訪幾位仙友，也不枉此行。」那和尚說：「好啊，好啊！正合我的意思。」於是兩個人便互相攙扶著飄然離去，不知道去了哪裡。" },
      { content: ["卻說姑蘇城關外，有個葫蘆廟，廟旁住着一家鄉宦，姓甄名費，字士隱。嫡妻封氏，情性賢淑，深明禮義。家中雖不甚富貴，然本地便也推為望族了。因這甄士隱稟性恬淡，不以功名為念，每日只以觀花種竹、酌酒吟詩為樂，倒是神仙一流人物。只是一件不足：年過半百，膝下無兒，只有一女，乳名英蓮，年方三歲。"], vernacular: "（白話文）再說姑蘇城外，有個葫蘆廟，廟旁邊住著一家鄉紳，姓甄名費，字士隱。他的正妻封氏，性情賢淑，深明禮儀。家裡雖然不算非常富貴，但在當地也被推崇為有聲望的家族。因為這甄士隱生性恬靜淡泊，不把功名利祿放在心上，每天只是以觀賞花草、種植竹子、飲酒賦詩為樂，倒像是神仙一般的人物。只有一件不如意的事：年紀過了五十，膝下沒有兒子，只有一個女兒，乳名叫英蓮，才三歲。" },
      { content: ["這日，甄士隱炎夏永晝，閒坐書齋，手拈素珠，默默無言。忽聞窗外鼓樂之聲，回頭一看，只見一人，方面大耳，形狀魁梧，布衣草履，醉步而來。士隱認得，是本地的一個窮儒，姓賈名化，表字時飛，別號雨村。這賈雨村原系湖州人氏，亦系讀書人，因他生於末世，父母祖宗根基已盡，人口衰喪，只剩下他一身一口，在家鄉無益，因進京求取功名，再整基業。自前歲來此，又淹蹇住了，暫寄姑蘇城關外葫蘆廟內安身，每日賣文作字為生，故士隱常與他交接。"], vernacular: "（白話文）這一天，甄士隱因為夏天白晝長，閒坐在書房裡，手裡捻著佛珠，默默無言。忽然聽到窗外傳來鼓樂的聲音，回頭一看，只見一個人，方臉大耳，身材魁梧，穿著布衣草鞋，醉醺醺地走來。士隱認得，是本地的一個窮書生，姓賈名化，表字時飛，別號雨村。這賈雨村原是湖州人，也是讀書人出身，因為他生在末世，父母祖宗的基業已經敗光，家裡人口也稀少了，只剩下他孤身一人，在家鄉沒有什麼出路，於是進京謀求功名，想再重振家業。從前年來到這裡，又因時運不濟而滯留下來，暫時寄居在姑蘇城外的葫蘆廟裡安身，每天靠賣文章、寫字為生，所以士隱常常和他來往。" },
      { content: ["雨村見士隱，忙施禮陪笑道：「適聞老先生在家，故來一會，不想老先生早已知道了。」士隱笑道：「是，才聽得外面鼓樂喧鬧，想是老兄到了。」雨村道：「正是。小弟此來，一則為賀喜，二則也為告辭。目今小弟正該力圖進取，怎奈囊中羞澀，行止兩難。適蒙老先生厚贈，又承嚴老爺情，許以盤費，兼以薦函，進京鄉試，倘僥倖得中，他日回家拜望，不忘今日之德。」士隱忙笑道：「何出此言！弟少時不知檢束，如今寸心已灰。況且，我輩相交，原無這些俗套。老兄此去，一路順風，高奏凱歌。弟在此靜候佳音便了。」二人敘了些寒溫，雨村便起身作別。士隱直送出門，又囑咐了些言語，方回來。"], vernacular: "（白話文）雨村見到士隱，連忙行禮陪笑說：「剛才聽說老先生在家，所以特地來拜會，沒想到老先生早就知道了。」士隱笑著說：「是的，剛才聽到外面鼓樂喧鬧，想必是兄台到了。」雨村說：「正是。小弟這次來，一是為了道賀，二也是為了告辭。現在小弟正應該努力上進，無奈口袋裡沒錢，去留兩難。剛才承蒙老先生厚贈，又承蒙嚴老爺的情分，答應給予路費，並且還有推薦信，讓我可以進京參加鄉試，如果僥倖考中，將來回家拜望，決不會忘記今天的恩德。」士隱連忙笑著說：「說這些客氣話幹什麼！我年輕時不知道约束自己，如今已經心灰意冷了。況且，我們交往，本來就沒有這些俗套。兄台這次去，一路順風，馬到成功。我就在這裡靜候佳音了。」兩人說了些客套話，雨村便起身告辭。士隱一直把他送到門外，又叮囑了幾句話，才回來。" },
      { content: ["一日，士隱在書房中閒坐，看見一個跛足道人，瘋狂落拓，麻鞋鶉衣，口內念着幾句言詞，道是：「世人都曉神仙好，惟有功名忘不了！古今將相在何方？荒塚一堆草沒了。世人都曉神仙好，只有金銀忘不了！終朝只恨聚無多，及到多時眼閉了。世人都曉神仙好，只有嬌妻忘不了！君生日日說恩情，君死又隨人去了。世人都曉神仙好，只有兒孫忘不了！痴心父母古來多，孝順兒孫誰見了？」士隱聽了，心下早已悟徹，因笑道：「你滿口說些什麼？只聽見些『好了』，『好了』。」那道人笑道：「你若果聽見『好了』二字，還算你明白。可知世上萬般，好便是了，了便是好。若不了，便不好；若要好，須是了。我這歌兒，便名《好了歌》。」"], vernacular: "（白話文）有一天，士隱閒坐在書房裡，看見一個跛脚的道士，瘋瘋癲癲，不修邊幅，穿著麻鞋破衣，嘴裡念叨著幾句話，說的是：「世上的人都知道神仙好，只有功名利祿忘不了！從古到今的將軍宰相在哪裡？只剩下荒墳一堆，長滿了野草。世上的人都知道神仙好，只有金銀財寶忘不了！整天只怨恨聚集得不夠多，等到錢財多了的時候，眼睛卻閉上了。世上的人都知道神仙好，只有漂亮的妻子忘不了！你活著的時候天天說恩愛，你死了之後她又跟別人跑了。世上的人都知道神仙好，只有兒孫後代忘不了！痴心的父母自古以來就很多，孝順的兒孫誰見過呢？」士隱聽了，心裡早已完全明白了，於是笑著說：「你滿口說些什麼？只聽到一些『好了』，『好了』。」那道人笑著說：「你如果真的聽見『好了』兩個字，還算你明白。要知道世上的萬事萬物，好就是了結，了結就是好。如果不能了結，就不好；如果要好，必須了結。我這首歌，就叫《好了歌》。」" },
      { content: ["士隱本是有宿慧的，一聞此言，心中早已徹悟。便走上前道：「這位禪師，請問你從何而來，到何處去？」道人道：「你問我從何而來，我並無來處；你問我到何處去，我亦無去處。天地廣大，我自遨遊。」士隱聽了，點頭稱善。那道人便將葫蘆中之藥，傾入士隱掌中，道：「你將此藥敷在眼上，便可看破一切。」士隱依言，將藥敷上，頓覺神清氣爽，心明眼亮，回頭再看那道人時，已渺無蹤跡。士隱心下感歎不已，遂將家中所有，盡數施捨。隨後便尋訪那跛足道人，不知所之。"], vernacular: "（白話文）士隱本來就有天生的悟性，一聽到這話，心裡早已徹底醒悟。便走上前說：「這位禪師，請問您從哪裡來，要到哪裡去？」道士說：「你問我從哪裡來，我並沒有來處；你問我到何處去，我也沒有去處。天地廣大，我自由自在地遨遊。」士隱聽了，點頭稱好。那道士便將葫蘆裡的藥，倒在士隱的手掌中，說：「你把這藥敷在眼睛上，就可以看破一切了。」士隱依照他的話，把藥敷上，頓時覺得神清氣爽，心明眼亮，回頭再看那道士時，已經不見蹤影了。士隱心裡感慨不已，於是將家裡所有的財產，全部施捨出去。隨後便去尋訪那個跛脚的道士，卻不知道他去了哪裡。" },
      { content: ["此回中，甄士隱夢見一僧一道，談論石頭下凡歷劫之事。賈雨村寄居甄家，中秋與甄士隱賞月吟詩，後得甄家資助，上京赴考。甄士隱之女英蓮元宵燈節被拐，甄家隨後又遭火災，家道中落。甄士隱看破紅塵，隨跛足道人出家。"], vernacular: "（白話文）這一回裡，甄士隱夢見一個和尚和一個道士，談論石頭下凡間歷劫的事情。賈雨村寄住在甄家，中秋節和甄士隱一起賞月作詩，後來得到甄家的資助，到京城參加科舉考試。甄士隱的女兒英蓮在元宵節看花燈時被人拐走，甄家隨後又遭遇火災，家境衰落。甄士隱看破紅塵，跟著一個跛脚的道士出家了。" }
    ]
  },
  ...Array.from({ length: 24 }, (_, i) => {
    const chapterNum = i + 2;
    return {
      id: chapterNum,
      paragraphs: [
        { content: [`此為第 ${chapterNum} 回示例原文段落一。話說 [某角色] 如何如何...`], vernacular: `（白話文）這是第 ${chapterNum} 回的白話示例段落一。[某角色] 做了些什麼...` },
        { content: [`第 ${chapterNum} 回示例原文段落二，又提及 [另一事件或人物]。此處略去更多內容，僅為演示。`], vernacular: `（白話文）第 ${chapterNum} 回白話示例段落二。又說到了 [其他事情]。` },
      ]
    };
  })
];

const chapters: Chapter[] = chapters_base_data.map(ch_base => {
  const chapterNum = ch_base.id;
  if (chapterNum === 1) {
    return {
      ...ch_base,
      titleKey: 'chapterContent.ch1.title',
      subtitleKey: 'chapterContent.ch1.subtitle',
      summaryKey: 'chapterContent.ch1.summary',
    };
  }
  return {
    ...ch_base,
    titleKey: `chapterContent.ch_generic.title#${chapterNum}`, // Using # to pass number for replacement
    subtitleKey: `chapterContent.ch_generic.subtitle#${chapterNum}`,
    summaryKey: `chapterContent.ch_generic.summary#${chapterNum}`,
  };
});


type AIInteractionState = 'asking' | 'answering' | 'answered' | 'error' | 'streaming';
type ColumnLayout = 'single' | 'double';

const themes = {
  white: { key: 'white', nameKey: 'labels.themes.white', readingBgClass: 'bg-white', readingTextClass: 'text-neutral-800', swatchClass: 'bg-white border-neutral-300', toolbarBgClass: 'bg-neutral-100/90', toolbarTextClass: 'text-neutral-700', toolbarAccentTextClass: 'text-[hsl(45_70%_50%)]', toolbarBorderClass: 'border-neutral-300/50' },
  yellow: { key: 'yellow', nameKey: 'labels.themes.yellow', readingBgClass: 'bg-yellow-50', readingTextClass: 'text-yellow-950', swatchClass: 'bg-yellow-200 border-yellow-400', toolbarBgClass: 'bg-yellow-100/90', toolbarTextClass: 'text-yellow-800', toolbarAccentTextClass: 'text-amber-600', toolbarBorderClass: 'border-yellow-300/50' },
  green: { key: 'green', nameKey: 'labels.themes.green', readingBgClass: 'bg-green-100', readingTextClass: 'text-green-900', swatchClass: 'bg-green-500 border-green-700', toolbarBgClass: 'bg-green-200/90', toolbarTextClass: 'text-green-700', toolbarAccentTextClass: 'text-emerald-600', toolbarBorderClass: 'border-green-400/50' },
  night: { key: 'night', nameKey: 'labels.themes.night', readingBgClass: 'bg-neutral-800', readingTextClass: 'text-neutral-200', swatchClass: 'bg-black border-neutral-500', toolbarBgClass: 'bg-neutral-900/90', toolbarTextClass: 'text-neutral-300', toolbarAccentTextClass: 'text-primary', toolbarBorderClass: 'border-neutral-700/50' },
};

// Font family options. We apply the `family` via inline style to ensure
// the font takes effect even if Tailwind doesn't ship a utility for it.
const fontFamilies = {
  notoSerifSC: {
    key: 'notoSerifSC',
    class: '',
    family: "'Noto Serif SC', 'NotoSerifSC', 'Source Han Serif SC', serif",
    nameKey: 'labels.fonts.notoSerifSC'
  },
  system: {
    key: 'system',
    class: 'font-sans',
    family: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', sans-serif",
    nameKey: 'labels.fonts.system'
  },
  kai: {
    key: 'kai',
    class: '',
    family: "'Kaiti SC', 'KaiTi', 'STKaiti', '楷体', serif",
    nameKey: 'labels.fonts.kai'
  },
  hei: {
    key: 'hei',
    class: '',
    family: "'PingFang SC', 'Heiti SC', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif",
    nameKey: 'labels.fonts.hei'
  },
};

const FONT_SIZE_MIN = 12;
const FONT_SIZE_MAX = 32;
const FONT_SIZE_STEP = 2;
const FONT_SIZE_INITIAL = 20;

const highlightText = (text: string, highlight: string): React.ReactNode[] => {
  if (!highlight.trim()) {
    return [text];
  }
  const searchTerm = highlight.trim();
  if (searchTerm === "") return [text];

  const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  let lastIndex = 0;
  const result: React.ReactNode[] = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.substring(lastIndex, match.index));
    }
    result.push(<mark key={`mark-${lastIndex}-${match.index}`} className="bg-yellow-300 text-black px-0.5 rounded-sm">{match[0]}</mark>);
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    result.push(text.substring(lastIndex));
  }

  return result.length > 0 ? result : [text];
};

/**
 * ========================================
 * API Wrapper Functions
 * ========================================
 * These functions call server-side API routes to avoid loading SQLite in browser
 */

/**
 * Award XP to user via API route
 */
async function awardXP(
  userId: string,
  amount: number,
  reason: string,
  source: 'reading' | 'daily_task' | 'community' | 'note' | 'achievement' | 'admin',
  sourceId?: string
): Promise<AwardXPResponse> {
  // Phase 3-T3: Client-side validation before API call
  if (!userId || userId.trim() === '') {
    throw new Error('Invalid userId: must be non-empty string');
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(`Invalid amount: must be positive integer, got ${amount}`);
  }
  if (!reason || reason.length === 0 || reason.length > 200) {
    throw new Error(`Invalid reason: must be 1-200 characters, got ${reason.length} characters`);
  }

  // Phase 3-T3: Enhanced logging for debugging
  console.log(`[XP Award] Request params:`, {
    userId: userId.substring(0, 8) + '...',
    amount,
    reason: reason.substring(0, 50) + (reason.length > 50 ? '...' : ''),
    source,
    sourceId: sourceId || '(none)'
  });

  const response = await fetch('/api/user-level/award-xp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      amount,
      reason,
      source,
      sourceId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    console.error(`[XP Award] API error (${response.status}):`, errorData);
    throw new Error(errorData.error || `Failed to award XP (${response.status})`);
  }

  const result: AwardXPResponse = await response.json();

  if (!result.success) {
    console.error(`[XP Award] Service error:`, result);
    throw new Error(result.error || 'Failed to award XP');
  }

  console.log(`[XP Award] Success:`, { newTotalXP: result.newTotalXP, leveledUp: result.leveledUp });
  return result;
}

/**
 * Fetch notes for user and chapter via API route
 */
async function fetchNotes(userId: string, chapterId: number): Promise<Note[]> {
  const response = await fetch(
    `/api/notes?userId=${encodeURIComponent(userId)}&chapterId=${chapterId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to fetch notes (${response.status})`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch notes');
  }

  return result.notes || [];
}

/**
 * Save note via API route
 */
async function saveNoteAPI(note: Omit<Note, 'id' | 'createdAt'>): Promise<string> {
  const response = await fetch('/api/notes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(note),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to save note (${response.status})`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to save note');
  }

  return result.noteId;
}

/**
 * Update note via API route
 */
async function updateNoteAPI(id: string, content: string): Promise<void> {
  const response = await fetch('/api/notes', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, content }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to update note (${response.status})`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to update note');
  }
}

/**
 * Delete note via API route
 */
async function deleteNoteAPI(id: string): Promise<void> {
  const response = await fetch(`/api/notes?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to delete note (${response.status})`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete note');
  }
}

/**
 * Update note visibility via API route
 */
async function updateNoteVisibilityAPI(id: string, isPublic: boolean): Promise<void> {
  const response = await fetch('/api/notes/visibility', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, isPublic }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to update note visibility (${response.status})`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to update note visibility');
  }
}

export default function ReadBookPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const isMobile = useIsMobile();

  // Dynamic chapter loading state
  const [availableChapters, setAvailableChapters] = useState<ChapterMeta[]>([]);
  const [loadedChaptersMap, setLoadedChaptersMap] = useState<Map<number, ChapterData>>(new Map());
  const [isLoadingChapter, setIsLoadingChapter] = useState(true);
  const [currentChapterId, setCurrentChapterId] = useState(1); // Track by ID instead of index

  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  // Removed vernacular toggle per product decision
  const [columnLayout, setColumnLayout] = useState<ColumnLayout>('single');

  const [isKnowledgeGraphSheetOpen, setIsKnowledgeGraphSheetOpen] = useState(false);
  const [isTocSheetOpen, setIsTocSheetOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isNoteSheetOpen, setIsNoteSheetOpen] = useState(false);
  const [currentNote, setCurrentNote] = useState("");
  const [currentNoteObj, setCurrentNoteObj] = useState<Note | null>(null);
  const [isNotePublic, setIsNotePublic] = useState(false);
  const [isViewingNote, setIsViewingNote] = useState(false);

  // XP and Level System States
  const [levelUpData, setLevelUpData] = useState<{
    show: boolean;
    fromLevel: number;
    toLevel: number;
  }>({ show: false, fromLevel: 0, toLevel: 0 });
  const [readingStartTime, setReadingStartTime] = useState<number>(Date.now());
  const [completedChapters, setCompletedChapters] = useState<Set<number>>(new Set());
  const chapterTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Chapter scroll completion tracking - user must scroll to bottom before chapter is marked complete
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const SCROLL_COMPLETION_THRESHOLD = 0.9; // 90% scroll required to mark chapter as read

  // AI Interface States
  const [isAiSheetOpen, setIsAiSheetOpen] = useState(false);
  const [aiMode, setAiMode] = useState<'new-conversation' | 'book-sources' | 'ai-analysis' | 'perplexity-qa'>('new-conversation');
  const [userQuestionInput, setUserQuestionInput] = useState<string>('');
  const [textExplanation, setTextExplanation] = useState<string | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [aiInteractionState, setAiInteractionState] = useState<AIInteractionState>('asking');
  const [aiAnalysisContent, setAiAnalysisContent] = useState<string | null>(null);

  // Perplexity AI States - Default to Perplexity since Gemini is disabled
  const [usePerplexityAI, setUsePerplexityAI] = useState(true);
  const [perplexityResponse, setPerplexityResponse] = useState<PerplexityQAResponse | null>(null);
  const [perplexityStreamingChunks, setPerplexityStreamingChunks] = useState<PerplexityStreamingChunk[]>([]);
  const [perplexityModel, setPerplexityModel] = useState<'sonar-pro' | 'sonar-reasoning' | 'sonar-reasoning-pro'>('sonar-reasoning');
  const [reasoningEffort, setReasoningEffort] = useState<'low' | 'medium' | 'high'>('medium');
  // Fix #6 - Streaming always enabled per user requirement
  const ENABLE_STREAMING = true;  // Constant - cannot be toggled

  // New QA Module States (Phase 2 Implementation)
  // Conversation sessions model
  type ConversationSession = {
    id: string;
    title?: string;
    createdAt: Date;
    messages: ConversationMessage[];
  };

  const [sessions, setSessions] = useState<ConversationSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  // Task 4.2 Fix: Track session initialization for SSR/Vercel hydration compatibility
  const [isSessionInitialized, setIsSessionInitialized] = useState(false);
  const [thinkingContent, setThinkingContent] = useState<string>('');
  const [thinkingStatus, setThinkingStatus] = useState<ThinkingStatus>('idle');
  const [streamingProgress, setStreamingProgress] = useState<number>(0);
  const streamingAIMessageIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null); // Fix Issue #3
  // Task 3.3: Track timing for thinking duration (submit -> first token)
  const questionSubmittedAtRef = useRef<number | null>(null);
  const responseStartedAtRef = useRef<number | null>(null);
  const firstChunkSeenRef = useRef<boolean>(false);
  // Track last processed chunk index to avoid duplicate appends on SSE retries/duplicates
  const lastChunkIndexRef = useRef<number>(-1);

  // Auto-scroll control (Fix Issue #7)
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const lastScrollTopRef = useRef(0);

  // Task 4.2 Fix - Bug #3: User's thinking panel preference (persists across messages)
  // Using useState to trigger re-render when preference changes
  const [thinkingExpandedPreference, setThinkingExpandedPreference] = useState<ThinkingExpandedPreference>('auto');

  const [selectedTextInfo, setSelectedTextInfo] = useState<{ text: string; position: { top: number; left: number; } | null; range: Range | null; } | null>(null);
  const [activeHighlightInfo, setActiveHighlightInfo] = useState<{ text: string; position: { top: number; left: number; } } | null>(null);
  const [noteSelectedText, setNoteSelectedText] = useState<string>(''); // Preserve selected text for note sheet

  const chapterContentRef = useRef<HTMLDivElement>(null);
  const toolbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current chapter from dynamic data or fallback to hardcoded
  const getDynamicChapter = useCallback((): Chapter | null => {
    const dynamicChapter = loadedChaptersMap.get(currentChapterId);
    if (dynamicChapter) {
      // Convert ChapterData to Chapter format (compatible with existing code)
      return {
        id: dynamicChapter.id,
        titleKey: `chapterContent.ch${dynamicChapter.id}.title`,
        subtitleKey: `chapterContent.ch${dynamicChapter.id}.subtitle`,
        summaryKey: `chapterContent.ch${dynamicChapter.id}.summary`,
        paragraphs: dynamicChapter.paragraphs as Paragraph[],
        // Store original title for direct display
        _dynamicTitle: dynamicChapter.title,
        _dynamicTitleText: dynamicChapter.titleText,
      } as Chapter & { _dynamicTitle?: string; _dynamicTitleText?: string };
    }
    return null;
  }, [loadedChaptersMap, currentChapterId]);

  // Use dynamically loaded chapter if available, fallback to hardcoded chapters
  const dynamicChapter = getDynamicChapter();
  const currentChapter = dynamicChapter || chapters[currentChapterIndex];

  const [isSettingsPopoverOpen, setIsSettingsPopoverOpen] = useState(false);
  const [activeThemeKey, setActiveThemeKey] = useState<keyof typeof themes>('white');
  const [currentNumericFontSize, setCurrentNumericFontSize] = useState<number>(FONT_SIZE_INITIAL);
  const [activeFontFamilyKey, setActiveFontFamilyKey] = useState<keyof typeof fontFamilies>('notoSerifSC');

  const [isSearchPopoverOpen, setIsSearchPopoverOpen] = useState(false);
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");

  const [isFullscreenActive, setIsFullscreenActive] = useState(false);
  const [highlights, setHighlights] = useState<string[]>([]);

  // Pagination state (enabled for double-column layout)
  const [isPaginationMode, setIsPaginationMode] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  // Task 4.5 V2: Native div viewport ref for bi-column mode (bypasses Radix ScrollArea limitations)
  const paginationViewportRef = useRef<HTMLDivElement>(null);

  // Task 4.5 Fix: Dynamic toolbar height measurement (replaces hardcoded TOOLBAR_HEIGHT)
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [dynamicToolbarHeight, setDynamicToolbarHeight] = useState<number>(TOOLBAR_HEIGHT);

  // Task 4.5 Phase 2: Touch/swipe ref for mobile navigation (2025-12-01)
  // Using ref instead of state to avoid unnecessary re-renders during touch handling
  const touchStartXRef = useRef<number | null>(null);

  // Refs to store latest pagination values (避免 useCallback dependencies 導致函數重新創建)
  const currentPageRef = useRef<number>(1);
  const totalPagesRef = useRef<number>(1);

  // Sync state to refs for use in stable callbacks
  useEffect(() => {
    currentPageRef.current = currentPage;
    totalPagesRef.current = totalPages;
  }, [currentPage, totalPages]);

  // Dynamic Chapter Loading - Fetch available chapters and load content from JSON files
  useEffect(() => {
    async function loadAvailableChapters() {
      try {
        const response = await fetch('/api/chapters');
        if (response.ok) {
          const chaptersData: ChapterMeta[] = await response.json();
          setAvailableChapters(chaptersData);
          // If we have chapters, load the first one
          if (chaptersData.length > 0) {
            const firstChapterId = chaptersData[0].id;
            setCurrentChapterId(firstChapterId);
            await loadChapterContent(firstChapterId);
          }
        }
      } catch (error) {
        console.error('Failed to load available chapters:', error);
      }
      setIsLoadingChapter(false);
    }

    loadAvailableChapters();
  }, []);

  // Load chapter content from API
  const loadChapterContent = async (chapterId: number): Promise<ChapterData | null> => {
    // Check if already loaded
    if (loadedChaptersMap.has(chapterId)) {
      return loadedChaptersMap.get(chapterId) || null;
    }

    try {
      setIsLoadingChapter(true);
      const response = await fetch(`/api/chapters/${chapterId}/content`);
      if (response.ok) {
        const chapterData: ChapterData = await response.json();
        setLoadedChaptersMap(prev => new Map(prev).set(chapterId, chapterData));
        return chapterData;
      }
    } catch (error) {
      console.error(`Failed to load chapter ${chapterId}:`, error);
    } finally {
      setIsLoadingChapter(false);
    }
    return null;
  };

  // Task 4.5 Fix: Measure toolbar height dynamically using ResizeObserver
  useEffect(() => {
    const measureToolbar = () => {
      if (toolbarRef.current) {
        const height = toolbarRef.current.getBoundingClientRect().height;
        if (height > 0 && Math.abs(height - dynamicToolbarHeight) > 2) {
          setDynamicToolbarHeight(height);
          if (DEBUG_PAGINATION) {
            console.log('[Pagination] Toolbar height measured:', height);
          }
        }
      }
    };

    // Initial measurement
    measureToolbar();

    // Re-measure on resize
    const resizeObserver = new ResizeObserver(measureToolbar);
    if (toolbarRef.current) {
      resizeObserver.observe(toolbarRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [dynamicToolbarHeight]);

  const selectedTheme = themes[activeThemeKey];

  // Storage keys (new sessions model + legacy migration)
  const SESSIONS_STORAGE_KEY = 'redmansion_qa_sessions_v1';
  const LEGACY_MESSAGES_KEY = 'redmansion_qa_conversations';

  // Helpers
  // Wrapped in useCallback to prevent infinite re-renders in useEffect
  const createSession = useCallback((title?: string): ConversationSession => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    createdAt: new Date(),
    messages: [],
  }), []);

  const getActiveSession = () => sessions.find(s => s.id === activeSessionId) || null;

  const setActiveSessionMessages = (updater: (msgs: ConversationMessage[]) => ConversationMessage[]) => {
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === activeSessionId);
      if (idx === -1) return prev;
      const updated = [...prev];
      const current = updated[idx];
      updated[idx] = { ...current, messages: updater(current.messages) };
      return updated;
    });
  };

  // Wrapped in useCallback to prevent infinite re-renders in useEffect
  const startNewSession = useCallback((title?: string) => {
    const newSession = createSession(title);
    setSessions(prev => [...prev, newSession]);
    setActiveSessionId(newSession.id);
    return newSession.id;
  }, [createSession]);

  /**
   * Share note to community via API route
   *
   * This function calls the server-side API to create a community post.
   * Replaces direct communityService.createPost() calls to avoid
   * client-side imports of SQLite dependencies.
   *
   * @param postData - Post data to share
   * @returns Promise that resolves when post is created
   * @throws Error if API request fails
   */
  const shareToCommunity = async (postData: CreatePostData): Promise<void> => {
    // Task 4.9/4.10 Debug Logging
    console.log(`📤 [ShareToCommunity] Starting share with data:`, {
      authorId: postData.authorId,
      contentLength: postData.content.length,
      tags: postData.tags,
      sourceNoteId: postData.sourceNoteId || 'NOT PROVIDED'
    });

    const response = await fetch('/api/community/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error(`❌ [ShareToCommunity] API request failed:`, { status: response.status, error: errorData });
      throw new Error(errorData.error || `Failed to share note to community (${response.status})`);
    }

    const result: CreatePostResponse = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to create community post');
    }

    console.log(`✅ [ShareToCommunity] Post created successfully:`, {
      postId: result.postId,
      sourceNoteId: postData.sourceNoteId || 'NONE'
    });
  };

  // Load sessions (with legacy migration)
  // Task 4.2 Fix: Added isSessionInitialized flag for Vercel SSR/hydration compatibility
  useEffect(() => {
    // Task 4.2 Logging: Track SSR/hydration flow
    console.log('[QA Module] Session useEffect triggered - typeof window:', typeof window);
    // Guard: Only run on client side (localStorage not available during SSR)
    if (typeof window === 'undefined') return;

    try {
      const storedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (storedSessions) {
        const parsed: any[] = JSON.parse(storedSessions);
        const restored: ConversationSession[] = parsed.map((s: any) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          messages: (s.messages || []).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
        }));
        setSessions(restored);
        // Task 4.2 Logging: Sessions loaded from localStorage
        console.log('[QA Module] Sessions loaded from localStorage: count=' + restored.length);
        // Select last session or create a fresh one if none
        if (restored.length > 0) {
          setActiveSessionId(restored[restored.length - 1].id);
        } else {
          const sid = startNewSession();
          setActiveSessionId(sid);
        }
        console.log('[QA Module] Setting isSessionInitialized=true (from stored sessions)');
        setIsSessionInitialized(true); // Mark initialization complete
        return;
      }

      // Legacy migration from flat messages
      const legacy = localStorage.getItem(LEGACY_MESSAGES_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        const messagesWithDates: ConversationMessage[] = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        const historical: ConversationSession = {
          id: `${Date.now()}-legacy`,
          title: 'History',
          createdAt: new Date(),
          messages: messagesWithDates,
        };
        const fresh = createSession();
        setSessions([historical, fresh]);
        setActiveSessionId(fresh.id);
        console.log('[QA Module] Setting isSessionInitialized=true (from legacy migration)');
        setIsSessionInitialized(true); // Mark initialization complete
        return;
      }

      // Nothing stored → create fresh session
      const sid = startNewSession();
      setActiveSessionId(sid);
      console.log('[QA Module] Setting isSessionInitialized=true (fresh session)');
      setIsSessionInitialized(true); // Mark initialization complete
    } catch (error) {
      console.error('[QA Module] Failed to load conversation sessions:', error);
      const sid = startNewSession();
      setActiveSessionId(sid);
      console.log('[QA Module] Setting isSessionInitialized=true (error fallback)');
      setIsSessionInitialized(true); // Mark initialization complete even on error
    }
  }, [createSession, startNewSession]);

  // Persist sessions
  useEffect(() => {
    try {
      const serializable = sessions.map(s => ({
        ...s,
        // Dates will be stringified; restore on load
      }));
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.error('Failed to save conversation sessions:', error);
    }
  }, [sessions]);
  const selectedFontFamily = fontFamilies[activeFontFamilyKey];

  const changeFontSize = (delta: number) => {
    setCurrentNumericFontSize(prev => {
      const newSize = prev + delta;
      if (newSize < FONT_SIZE_MIN) return FONT_SIZE_MIN;
      if (newSize > FONT_SIZE_MAX) return FONT_SIZE_MAX;
      return newSize;
    });
  };

  const hideToolbarAfterDelay = useCallback(() => {
    if (toolbarTimeoutRef.current) {
      clearTimeout(toolbarTimeoutRef.current);
    }
    toolbarTimeoutRef.current = setTimeout(() => {
      if (!isAiSheetOpen && !isNoteSheetOpen && !isKnowledgeGraphSheetOpen && !isTocSheetOpen && !isSettingsPopoverOpen && !isSearchPopoverOpen && !selectedTextInfo) {
        setIsToolbarVisible(false);
      }
    }, 5000);
  }, [isAiSheetOpen, isNoteSheetOpen, isKnowledgeGraphSheetOpen, isTocSheetOpen, isSettingsPopoverOpen, isSearchPopoverOpen, selectedTextInfo]);


  const handleInteraction = useCallback(() => {
    setIsToolbarVisible(true);
    hideToolbarAfterDelay();
  }, [hideToolbarAfterDelay]);

  useEffect(() => {
    if (isToolbarVisible) {
      hideToolbarAfterDelay();
    }
    return () => {
      if (toolbarTimeoutRef.current) {
        clearTimeout(toolbarTimeoutRef.current);
      }
    };
  }, [isToolbarVisible, hideToolbarAfterDelay, currentChapterIndex, isAiSheetOpen, isNoteSheetOpen, isKnowledgeGraphSheetOpen, isTocSheetOpen, isSettingsPopoverOpen, isSearchPopoverOpen, selectedTextInfo]);


  useEffect(() => {
    setSelectedTextInfo(null);
    setIsNoteSheetOpen(false);
    setCurrentNote("");
    setIsAiSheetOpen(false);
    setTextExplanation(null);
    setUserQuestionInput('');
    setAiInteractionState('asking');
    setIsKnowledgeGraphSheetOpen(false);
    setIsTocSheetOpen(false);
    setCurrentSearchTerm("");
    setIsSearchPopoverOpen(false);
    setIsToolbarVisible(true);
    // Reset chapter scroll completion state when changing chapters
    setHasScrolledToBottom(false);
    // Task 4.5 V2: Reset pagination state when chapter changes
    setCurrentPage(1);
    // Task 4.5 V2: Scroll to top of chapter content when chapter changes
    if (chapterContentRef.current) {
      const viewportEl = paginationViewportRef.current ||
        (document.getElementById('chapter-content-viewport') as HTMLElement | null) ||
        (document.getElementById('chapter-content-scroll-area') as HTMLElement | null);
      if (viewportEl) {
        viewportEl.scrollTop = 0;
        viewportEl.scrollLeft = 0;
      }
    }
  }, [currentChapterIndex]);

  // Task 3.1: Style enforcement utility (2025-11-24)
  // Prevent content CSS from overriding critical layout styles
  const setImportantStyles = useCallback((element: HTMLElement, styles: Record<string, string>) => {
    Object.entries(styles).forEach(([property, value]) => {
      element.style.setProperty(property, value, 'important');
    });
  }, []);

  // Task 4.5 V2: Updated computePagination (2025-12-01)
  // - Prioritizes paginationViewportRef for native div (bypasses ScrollArea)
  // - Falls back to DOM query for compatibility
  const computePagination = useCallback(() => {
    if (!isPaginationMode) return;
    // Task 4.5 V2: Use ref first, then fallback to DOM query
    const viewportEl = paginationViewportRef.current ||
      (document.getElementById('chapter-content-viewport') as HTMLElement | null) ||
      (document.getElementById('chapter-content-scroll-area') as HTMLElement | null);
    if (!viewportEl) return;

    const contentEl = chapterContentRef.current as HTMLElement | null;
    if (!contentEl) return;

    // Verify columns are actually rendered
    const computedStyle = window.getComputedStyle(contentEl);
    const columnCount = computedStyle.columnCount;

    if (columnCount === 'auto' || columnCount === '1') {
      if (DEBUG_PAGINATION) {
        console.warn('[Pagination] Columns not rendered, falling back to single page. columnCount:', columnCount);
      }
      setTotalPages(1);
      setCurrentPage(1);
      return;
    }

    // Task 4.5: epub.js padding model - gap/2 on each side for UI avoidance (2025-12-01)
    const gap = 48; // 3rem = 48px
    const sidePadding = gap / 2; // 24px each side

    // Task 1.1: Container Dynamic Expansion (2025-11-24 fix)
    // Use single page width as base unit, not total width
    const singlePageWidth = Math.max(1, viewportEl.clientWidth || viewportEl.offsetWidth || 0);

    // Use Range API to precisely measure actual content boundaries
    const range = document.createRange();
    range.selectNodeContents(contentEl);
    const contentRect = range.getBoundingClientRect();
    const contentWidth = contentRect.width;

    // Calculate correct page count
    const pageCount = Math.max(1, Math.ceil(contentWidth / singlePageWidth));

    // Dynamically expand container to accommodate all columns
    const expandedWidth = pageCount * singlePageWidth;

    // Task 4.5: Apply critical layout styles with epub.js patterns (2025-12-01)
    // - Uses dynamicToolbarHeight for responsive height calculation
    // - Adds padding-based spacing for UI avoidance
    // - Includes WebKit glyph optimization
    setImportantStyles(contentEl, {
      'width': `${expandedWidth}px`,
      'column-count': '2',
      'column-gap': `${gap}px`,
      'column-fill': 'auto',
      'height': `calc(100vh - ${dynamicToolbarHeight}px)`,
      'box-sizing': 'border-box',
      'position': 'relative',
      'padding-left': `${sidePadding}px`,
      'padding-right': `${sidePadding}px`,
      'margin': '0',
      '-webkit-line-box-contain': 'block glyphs replaced', // WebKit glyph optimization
    });

    // Validation: verify expansion succeeded and columns rendered
    requestAnimationFrame(() => {
      const actualWidth = contentEl.offsetWidth;
      if (Math.abs(actualWidth - expandedWidth) > 10) {
        if (DEBUG_PAGINATION) {
          console.warn('[Pagination] Width mismatch:', {
            expected: expandedWidth,
            actual: actualWidth,
            difference: Math.abs(actualWidth - expandedWidth),
          });
        }
      }

      // Task 4.5 Fix: Verify columns actually rendered, force recovery if not
      const verifyStyle = window.getComputedStyle(contentEl);
      const renderedColumnCount = verifyStyle.columnCount;

      if (renderedColumnCount === 'auto' || renderedColumnCount === '1') {
        console.error('[Pagination] CRITICAL: Columns failed to render!', {
          expected: 2,
          actual: renderedColumnCount,
          height: contentEl.offsetHeight,
          width: contentEl.scrollWidth,
        });

        // Force column styles with !important as recovery
        contentEl.style.setProperty('column-count', '2', 'important');
        contentEl.style.setProperty('height', `${window.innerHeight - dynamicToolbarHeight}px`, 'important');
      }
    });

    // Task 4.5 Phase 3: Toolbar/Height calculation logging (2025-12-01)
    if (DEBUG_PAGINATION) {
      console.log('[Pagination] Toolbar/Height calculation:', {
        dynamicToolbarHeight,
        viewportHeightCSS: `calc(100vh - ${dynamicToolbarHeight}px)`,
        actualViewportHeight: viewportEl.clientHeight,
        windowInnerHeight: window.innerHeight,
        expectedContentHeight: window.innerHeight - dynamicToolbarHeight,
        heightDiff: Math.abs(viewportEl.clientHeight - (window.innerHeight - dynamicToolbarHeight)),
      });
    }

    // Task 4.5 Phase 3: epub.js styles logging (2025-12-01)
    if (DEBUG_PAGINATION) {
      console.log('[Pagination] epub.js styles applied:', {
        gap,
        sidePadding,
        columnCount: 2,
        columnGap: `${gap}px`,
        paddingLeft: `${sidePadding}px`,
        paddingRight: `${sidePadding}px`,
        boxSizing: 'border-box',
        webkitOptimization: '-webkit-line-box-contain: block glyphs replaced',
      });
    }

    // Task 4.5 Phase 3: Page calculation logging (2025-12-01)
    if (DEBUG_PAGINATION) {
      console.log('[Pagination] Page calculation:', {
        singlePageWidth,
        contentWidth,
        contentRect: { width: contentRect.width, height: contentRect.height },
        pageCount,
        expandedWidth,
        columnCount: computedStyle.columnCount,
        currentPage,
      });
    }

    setTotalPages(pageCount);
    const clamped = Math.min(pageCount, Math.max(1, currentPage));
    setCurrentPage(clamped);
  }, [isPaginationMode, currentPage, setImportantStyles, dynamicToolbarHeight]);

  // Enable pagination automatically for double-column layout
  useEffect(() => {
    const enable = columnLayout === 'double' && !isMobile;
    setIsPaginationMode(enable);
    // Reset to first page when toggling mode
    setCurrentPage(1);
    // Recompute pages after multi-column layout finishes
    if (enable) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        computePagination();

        // Task 4.5 V2: Auto-focus using ref first
        const viewportEl = paginationViewportRef.current ||
          (document.getElementById('chapter-content-viewport') as HTMLElement | null) ||
          (document.getElementById('chapter-content-scroll-area') as HTMLElement | null);

        if (viewportEl) {
          viewportEl.focus();
          if (DEBUG_PAGINATION) console.log('[Pagination] Viewport focused for keyboard navigation');
        } else {
          if (DEBUG_PAGINATION) console.warn('[Pagination] Could not find viewport element to focus');
        }
      }));
    }
  }, [columnLayout, isMobile, currentChapterIndex, currentNumericFontSize, activeFontFamilyKey, activeThemeKey, computePagination]);

  const handleMouseUp = useCallback((event: globalThis.MouseEvent) => {
    const targetElement = event.target as HTMLElement;

    // 如果點擊的是工具列、彈窗、或 data-no-selection 的元素，不要清空選取內容
    if (
      targetElement?.closest('[data-radix-dialog-content]') ||
      targetElement?.closest('[data-radix-popover-content]') ||
      targetElement?.closest('[data-selection-action-toolbar="true"]') ||
      targetElement?.closest('[data-no-selection="true"]') ||
      targetElement?.closest('[data-highlight="true"]')
    ) {
      setTimeout(() => handleInteraction(), 0);
      return;
    }

    // 只在點擊章節內容區域時，才根據選取狀態決定是否清空
    const selection = window.getSelection();
    const text = selection?.toString().trim() || '';

    if (
      text.length > 0 &&
      chapterContentRef.current &&
      selection &&
      selection.rangeCount > 0 &&
      chapterContentRef.current.contains(selection.getRangeAt(0).commonAncestorContainer)
    ) {
      // 有選取內容，設置 selectedTextInfo
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      // Task 4.5 V2: Use ref first
      const scrollAreaElement = paginationViewportRef.current ||
        (document.getElementById('chapter-content-viewport') as HTMLElement | null) ||
        (document.getElementById('chapter-content-scroll-area') as HTMLElement | null);
      const scrollTop = scrollAreaElement?.scrollTop || 0;
      const scrollLeft = scrollAreaElement?.scrollLeft || 0;
      const top = rect.top + scrollTop;
      const left = rect.left + scrollLeft + (rect.width / 2);
      setSelectedTextInfo({ text, position: { top, left }, range: range.cloneRange() });
      setIsNoteSheetOpen(false);
      setIsAiSheetOpen(false);
      setActiveHighlightInfo(null); // Clear active highlight when new text is selected
    } else if (chapterContentRef.current?.contains(targetElement)) {
      // 只有在點擊章節內容區域時才清空
      setSelectedTextInfo(null);
      setActiveHighlightInfo(null);
    }
    setTimeout(() => handleInteraction(), 0);
  }, [handleInteraction]);

  const handleScroll = useCallback(() => {
    if (selectedTextInfo || activeHighlightInfo) {
      setSelectedTextInfo(null);
      setActiveHighlightInfo(null);
    }
    handleInteraction();
  }, [selectedTextInfo, activeHighlightInfo, handleInteraction]);

  /**
   * Check if user has scrolled to the bottom of the chapter
   * This is required before awarding chapter completion XP
   * Fix: Prevent premature chapter completion when user stays at top
   */
  const checkChapterScrollCompletion = useCallback(() => {
    // Skip if already marked as scrolled to bottom
    if (hasScrolledToBottom) return;

    // Task 4.5 V2: Use ref first
    const scrollAreaElement = paginationViewportRef.current ||
      (document.getElementById('chapter-content-viewport') as HTMLElement | null) ||
      (document.getElementById('chapter-content-scroll-area') as HTMLElement | null);

    if (!scrollAreaElement) return;

    const scrollTop = scrollAreaElement.scrollTop;
    const scrollHeight = scrollAreaElement.scrollHeight;
    const clientHeight = scrollAreaElement.clientHeight;

    // Calculate scroll percentage (0.0 to 1.0)
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // If scrolled beyond 90%, mark as completed
    if (scrollPercentage >= SCROLL_COMPLETION_THRESHOLD) {
      console.log(`✅ User scrolled to bottom of chapter (${(scrollPercentage * 100).toFixed(1)}%)`);
      setHasScrolledToBottom(true);
    }
  }, [hasScrolledToBottom, SCROLL_COMPLETION_THRESHOLD]);


  useEffect(() => {
    document.addEventListener('mouseup', handleMouseUp);
    // Task 4.5 V2: Use ref first
    const scrollAreaElement = paginationViewportRef.current ||
      (document.getElementById('chapter-content-viewport') as HTMLElement | null) ||
      (document.getElementById('chapter-content-scroll-area') as HTMLElement | null);
    scrollAreaElement?.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    // Add chapter scroll completion detection
    scrollAreaElement?.addEventListener('scroll', checkChapterScrollCompletion, { passive: true, capture: true });
    document.addEventListener('mousemove', handleInteraction, { passive: true, capture: true });

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      scrollAreaElement?.removeEventListener('scroll', handleScroll, { capture: true });
      scrollAreaElement?.removeEventListener('scroll', checkChapterScrollCompletion, { capture: true });
      document.removeEventListener('mousemove', handleInteraction, { capture: true });
      if (toolbarTimeoutRef.current) clearTimeout(toolbarTimeoutRef.current);
    };
  }, [handleInteraction, handleMouseUp, handleScroll, checkChapterScrollCompletion]);

  // Task 5.1: Enhanced ResizeObserver for responsive pagination (2025-11-24 fix)
  // Monitor both viewport and content element size changes
  useEffect(() => {
    if (!isPaginationMode) return;

    // Task 4.5 V2: Use ref first
    const viewportEl = paginationViewportRef.current ||
      (document.getElementById('chapter-content-viewport') as HTMLElement | null) ||
      (document.getElementById('chapter-content-scroll-area') as HTMLElement | null);
    const contentEl = chapterContentRef.current as HTMLElement | null;

    if (!viewportEl || !contentEl) return;

    // Create ResizeObserver to monitor size changes
    const resizeObserver = new ResizeObserver((entries) => {
      // Task 6.1: Log resize trigger (2025-11-24)
      if (DEBUG_PAGINATION) {
        console.log('[Pagination] ResizeObserver triggered:', {
          entriesCount: entries.length,
          targets: entries.map(e => ({
            target: e.target.id || e.target.className,
            contentRect: {
              width: e.contentRect.width,
              height: e.contentRect.height,
            },
          })),
        });
      }

      // double-rAF to ensure multi-column layout settles before measuring
      requestAnimationFrame(() => requestAnimationFrame(() => {
        computePagination();
      }));
    });

    // Observe both viewport and content elements
    resizeObserver.observe(viewportEl);
    resizeObserver.observe(contentEl);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };
  }, [isPaginationMode, computePagination]);

  // Task 4.5 V2: Refactored goToPage - uses paginationViewportRef first (2025-12-01)
  // State is now managed by goNextPage/goPrevPage to avoid race conditions
  const goToPage = useCallback((page: number) => {
    // Task 4.5 V2: Use ref first, then fallback to DOM query
    const el = paginationViewportRef.current ||
      (document.getElementById('chapter-content-viewport') as HTMLElement | null) ||
      (document.getElementById('chapter-content-scroll-area') as HTMLElement | null);
    if (!el) {
      if (DEBUG_PAGINATION) console.warn('[Pagination] goToPage: viewport element not found');
      return;
    }

    // Task 4.5 Fix: Verify columns are rendered, trigger recovery if not
    const contentEl = chapterContentRef.current;
    if (contentEl) {
      const computedStyle = window.getComputedStyle(contentEl);
      const actualColumnCount = parseInt(computedStyle.columnCount) || 1;

      if (actualColumnCount < 2 && isPaginationMode) {
        if (DEBUG_PAGINATION) console.warn('[Pagination] goToPage: columns not rendered, triggering recovery...');
        // Force recompute pagination
        requestAnimationFrame(() => computePagination());
        return;
      }
    }

    // Task 4.5: Verify column layout is still active before scrolling (2025-12-01)
    const computedStyle = window.getComputedStyle(el);
    if (computedStyle.columnCount === 'auto' || computedStyle.columnCount === '1') {
      if (DEBUG_PAGINATION) console.warn('[Pagination] goToPage: viewport columns not rendered, skipping navigation');
      return;
    }

    // Task 4.1: Use stored page width for consistency (2025-11-24 fix)
    const singlePageWidth = el.clientWidth;

    // Page 1 = scroll 0, Page 2 = scroll singlePageWidth, etc.
    const target = Math.max(0, (page - 1) * singlePageWidth);

    // Task 4.5 Phase 3: Enhanced scroll position logging with before/after (2025-12-01)
    if (DEBUG_PAGINATION) {
      console.log('[Pagination] goToPage:', {
        targetPage: page,
        singlePageWidth,
        scrollTarget: target,
        currentScrollLeft: el.scrollLeft,
        viewportWidth: el.clientWidth,
        columnCount: computedStyle.columnCount,
      });
    }

    el.scrollTo({ left: target, behavior: 'smooth' });

    // Task 4.5 Phase 3: Log scroll completion after animation settles (2025-12-01)
    if (DEBUG_PAGINATION) {
      requestAnimationFrame(() => {
        console.log('[Pagination] goToPage complete:', {
          actualScrollLeft: el.scrollLeft,
          expectedScrollLeft: target,
          scrollDiff: Math.abs(el.scrollLeft - target),
        });
      });
    }
    // Note: setCurrentPage is now handled by caller (goNextPage/goPrevPage)
  }, [isPaginationMode, computePagination]);

  // Task 4.5: Fixed navigation using functional state updates (2025-12-01)
  // This fixes the "cannot go to previous page" bug caused by stale ref values
  const goNextPage = useCallback(() => {
    if (!isPaginationMode) return;
    setCurrentPage(prev => {
      const next = Math.min(totalPagesRef.current, prev + 1);
      // Task 4.5 Phase 3: Navigation state logging (2025-12-01)
      if (DEBUG_PAGINATION) {
        console.log('[Pagination] goNextPage called:', {
          isPaginationMode,
          currentPage: prev,
          nextPage: next,
          totalPages: totalPagesRef.current,
          willNavigate: next !== prev,
        });
      }
      if (next !== prev) {
        // Schedule scroll in next frame to ensure state is updated
        requestAnimationFrame(() => goToPage(next));
      }
      return next;
    });
  }, [isPaginationMode, goToPage]);

  // Task 4.5: Fixed navigation using functional state updates (2025-12-01)
  const goPrevPage = useCallback(() => {
    if (!isPaginationMode) return;
    setCurrentPage(prev => {
      const newPage = Math.max(1, prev - 1);
      // Task 4.5 Phase 3: Navigation state logging (2025-12-01)
      if (DEBUG_PAGINATION) {
        console.log('[Pagination] goPrevPage called:', {
          isPaginationMode,
          currentPage: prev,
          prevPage: newPage,
          willNavigate: newPage !== prev,
        });
      }
      if (newPage !== prev) {
        // Schedule scroll in next frame to ensure state is updated
        requestAnimationFrame(() => goToPage(newPage));
      }
      return newPage;
    });
  }, [isPaginationMode, goToPage]);

  // Task 4.5 V2: Wheel handler for bi-column pagination mode (2025-12-01)
  // Extracted as standalone callback to use with native div (not ScrollArea's viewportProps)
  const handlePaginationWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!isPaginationMode) return;
    e.preventDefault();
    if (DEBUG_PAGINATION) {
      console.log('[Pagination] Wheel event:', {
        deltaY: e.deltaY,
        direction: e.deltaY > 0 ? 'down (next)' : 'up (prev)',
      });
    }
    if (e.deltaY > 0) {
      goNextPage();
    } else if (e.deltaY < 0) {
      goPrevPage();
    }
  }, [isPaginationMode, goNextPage, goPrevPage]);

  // Task 4.5 Phase 2: Touch/swipe handlers using ref for better performance (2025-12-01)
  // Using ref instead of state avoids function recreation on every touch
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isPaginationMode) return;
    touchStartXRef.current = e.touches[0].clientX;
    // Task 4.5 Phase 3: Touch start logging (2025-12-01)
    if (DEBUG_PAGINATION) {
      console.log('[Pagination] Touch start:', {
        clientX: e.touches[0].clientX,
        isPaginationMode,
      });
    }
  }, [isPaginationMode]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isPaginationMode || touchStartXRef.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartXRef.current - touchEndX;
    const threshold = 50; // Minimum swipe distance in pixels

    // Task 4.5 Phase 3: Touch end logging (2025-12-01)
    if (DEBUG_PAGINATION) {
      console.log('[Pagination] Touch end:', {
        startX: touchStartXRef.current,
        endX: touchEndX,
        diff,
        threshold,
        direction: diff > 0 ? 'left (next)' : 'right (prev)',
        willNavigate: Math.abs(diff) > threshold,
      });
    }

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        goNextPage(); // Swipe left = next page
      } else {
        goPrevPage(); // Swipe right = previous page
      }
    }
    touchStartXRef.current = null;
  }, [isPaginationMode, goNextPage, goPrevPage]); // Removed touchStartX from dependencies

  // Keyboard navigation for pagination:
  // - Left/Right = prev/next page
  // - Up/Down/PageUp/PageDown/Space: prevent vertical scroll; map Up/PageUp to prev, Down/PageDown/Space to next
  useEffect(() => {
    if (!isPaginationMode) {
      if (DEBUG_PAGINATION) console.log('[Pagination] Keyboard navigation disabled: isPaginationMode =', isPaginationMode);
      return;
    }

    if (DEBUG_PAGINATION) console.log('[Pagination] Keyboard navigation enabled for dual-column mode');

    const onKeyDown = (e: KeyboardEvent) => {
      // Skip if event already handled
      if (e.defaultPrevented) {
        if (DEBUG_PAGINATION) console.log('[Pagination] Event already prevented, skipping');
        return;
      }

      // Do not intercept when typing in inputs or editable areas
      const target = e.target as HTMLElement | null;
      const tag = (target?.tagName || '').toUpperCase();
      const isEditable = !!target && (target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT');
      if (isEditable) {
        if (DEBUG_PAGINATION) console.log('[Pagination] Skipping keyboard event in editable element:', tag);
        return;
      }

      let handled = false;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (DEBUG_PAGINATION) console.log('[Pagination] ArrowRight pressed - going to next page');
        goNextPage();
        handled = true;
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (DEBUG_PAGINATION) console.log('[Pagination] ArrowLeft pressed - going to previous page');
        goPrevPage();
        handled = true;
      } else if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        if (DEBUG_PAGINATION) console.log('[Pagination] Down/PageDown/Space pressed - going to next page');
        goNextPage();
        handled = true;
      } else if (e.key === 'ArrowUp' || e.key === 'PageUp') {
        e.preventDefault();
        if (DEBUG_PAGINATION) console.log('[Pagination] Up/PageUp pressed - going to previous page');
        goPrevPage();
        handled = true;
      }

      if (!handled && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', ' '].includes(e.key)) {
        if (DEBUG_PAGINATION) console.log('[Pagination] Key pressed but not handled:', e.key, 'currentPage:', currentPageRef.current, 'totalPages:', totalPagesRef.current);
      }
    };

    window.addEventListener('keydown', onKeyDown, { capture: true });
    if (DEBUG_PAGINATION) console.log('[Pagination] Keyboard event listener attached');

    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true } as any);
      if (DEBUG_PAGINATION) console.log('[Pagination] Keyboard event listener removed');
    };
  }, [isPaginationMode, goNextPage, goPrevPage]); // 移除 currentPage, totalPages 避免頻繁重新綁定

  /**
   * Global scroll lock and wheel interception for dual-column pagination
   *
   * When pagination mode is enabled (i.e., dual-column reading), we must prevent
   * default vertical scrolling at the page level and map mouse wheel motions to
   * page navigation. We still allow scrolling inside overlays such as dialogs,
   * popovers, and the QA sheet viewport.
   */
  useEffect(() => {
    if (!isPaginationMode) return;

    // Lock page-level vertical scrolling to avoid accidental free scroll
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflowY = html.style.overflowY;
    const prevBodyOverflowY = body.style.overflowY;
    const prevHtmlOverscroll = (html.style as any).overscrollBehaviorY;
    const prevBodyOverscroll = (body.style as any).overscrollBehaviorY;

    html.style.overflowY = 'hidden';
    body.style.overflowY = 'hidden';
    (html.style as any).overscrollBehaviorY = 'none';
    (body.style as any).overscrollBehaviorY = 'none';

    const shouldBypass = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      // Allow wheel/scroll in overlays and explicit no-selection regions
      if (
        el.closest('#qa-viewport') ||
        el.closest('[data-radix-dialog-content]') ||
        el.closest('[data-radix-popover-content]') ||
        el.closest('[data-no-selection="true"]')
      ) {
        return true;
      }
      // Do not intercept when interacting with editable controls
      const tag = (el.tagName || '').toUpperCase();
      if (el.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return true;
      }
      return false;
    };

    const onGlobalWheel = (e: WheelEvent) => {
      if (!isPaginationMode) return;
      if (shouldBypass(e.target)) return; // let overlays handle their own scroll

      // Prevent default page scrolling and convert to page navigation
      e.preventDefault();
      e.stopPropagation();

      if (e.deltaY > 0) {
        goNextPage();
      } else if (e.deltaY < 0) {
        goPrevPage();
      }
    };

    window.addEventListener('wheel', onGlobalWheel, { capture: true, passive: false });

    return () => {
      window.removeEventListener('wheel', onGlobalWheel, { capture: true } as any);
      html.style.overflowY = prevHtmlOverflowY;
      body.style.overflowY = prevBodyOverflowY;
      (html.style as any).overscrollBehaviorY = prevHtmlOverscroll;
      (body.style as any).overscrollBehaviorY = prevBodyOverscroll;
    };
  }, [isPaginationMode, goNextPage, goPrevPage]);

  // Observe content size changes (font size/theme/layout) to recompute pagination
  useEffect(() => {
    if (!isPaginationMode) return;
    const contentEl = chapterContentRef.current;
    if (!contentEl || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(() => requestAnimationFrame(() => computePagination()));
    });
    ro.observe(contentEl);
    return () => ro.disconnect();
  }, [isPaginationMode, computePagination]);


  const handleOpenNoteSheet = () => {
    if (toolbarInfo?.text) {
      // Save selected text before clearing selection info
      setNoteSelectedText(toolbarInfo.text);
      const existingNote = userNotes.find(note => note.selectedText === toolbarInfo.text);
      setCurrentNote(existingNote?.note || '');
      setCurrentNoteObj(existingNote || null);
      setIsNotePublic(existingNote?.isPublic || false);
      setIsViewingNote(!!existingNote); // View mode if note exists, edit mode if new
      setIsNoteSheetOpen(true);
      // It's important to hide the selection toolbar when the note sheet opens
      // to avoid UI overlap and confusion.
      setSelectedTextInfo(null);
      setActiveHighlightInfo(null);
    }
  };

  const handleOpenAiSheet = () => {
    if (toolbarInfo?.text) {
      setAiInteractionState('asking');
      setUserQuestionInput(''); 
      setTextExplanation(null);
      setIsAiSheetOpen(true);
      handleInteraction();
    }
  };

  const handleCopySelectedText = () => {
    if (toolbarInfo?.text) {
      navigator.clipboard.writeText(toolbarInfo.text)
        .then(() => {
          toast({ title: t('buttons.copy'), description: t('buttons.copiedToClipboard') });
        })
        .catch(err => {
          console.error("Failed to copy text: ", err);
          toast({ variant: "destructive", title: t('buttons.copyFailed'), description: String(err) });
        });
      setSelectedTextInfo(null); 
      setActiveHighlightInfo(null);
    }
  };

  const handlePlaceholderAction = (actionNameKey: string) => {
    toast({ title: t('buttons.featureComingSoon'), description: `${t(actionNameKey)} ${t('buttons.featureComingSoon')}` });
    setSelectedTextInfo(null); 
    setActiveHighlightInfo(null);
  };

  // Suggestion questions for the AI interface
  const suggestionQuestions = [
    "第一回的主要宗旨所在？",
    "賈寶玉的玉有甚麼意涵？",
    "林黛玉為何是絳珠仙草？"
  ];

  // Handle clicking on suggestion questions
  const handleSuggestionClick = (question: string) => {
    setUserQuestionInput(question);
    // Use unified send path to keep UI consistent
    setAiMode('perplexity-qa');
    setUsePerplexityAI(true);
    // Defer to next tick to allow state update
    setTimeout(() => handleUserSubmitQuestion(question), 0);
  };

  // Handle switching to book sources mode
  const handleBookSourcesMode = () => {
    setAiMode('book-sources');
  };

  // Handle AI action buttons
  const handleBookHighlights = async () => {
    // Unify to Perplexity streaming flow for consistent UI
    const analysisPrompt = `請分析《紅樓夢》第${currentChapterIndex + 1}回「${getChapterTitle(currentChapter.titleKey)}」的主要亮點和重要內容，包括：
1. 文學價值的體現
2. 人物刻畫的精彩之處  
3. 情節發展的關鍵轉折
4. 文化內涵與藝術手法
5. 敘事與象徵的藝術亮點`;
    setAiMode('perplexity-qa');
    setUsePerplexityAI(true);
    setUserQuestionInput(analysisPrompt);
    setTimeout(() => handleUserSubmitQuestion(analysisPrompt), 0);
  };

  const handleBackgroundReading = async () => {
    const analysisPrompt = `請提供《紅樓夢》第${currentChapterIndex + 1}回「${getChapterTitle(currentChapter.titleKey)}」的背景解讀，包括：
1. 歷史背景與時代意義
2. 文學史地位
3. 作者創作意圖  
4. 文化內涵與社會反映
5. 與其他章回的關聯性`;
    setAiMode('perplexity-qa');
    setUsePerplexityAI(true);
    setUserQuestionInput(analysisPrompt);
    setTimeout(() => handleUserSubmitQuestion(analysisPrompt), 0);
  };

  const handleKeyConcepts = async () => {
    const analysisPrompt = `請分析《紅樓夢》第${currentChapterIndex + 1}回「${getChapterTitle(currentChapter.titleKey)}」中的關鍵概念和重要主題，包括：
1. 核心主題思想
2. 重要文學概念
3. 人物性格特點
4. 情感與心理描寫
5. 象徵意義與隱喻`;
    setAiMode('perplexity-qa');
    setUsePerplexityAI(true);
    setUserQuestionInput(analysisPrompt);
    setTimeout(() => handleUserSubmitQuestion(analysisPrompt), 0);
  };

  // Double-send guard
  const isSubmittingRef = useRef(false);
  const lastSubmitAtRef = useRef(0);

  /**
   * Detect user scroll intent
   * Fix Issue #7 - Allow free scrolling during AI response
   */
  const handleScrollIntent = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    // Distance from bottom; positive means above bottom
    const distanceFromBottom = Math.max(0, scrollHeight - scrollTop - clientHeight);
    const NEAR_BOTTOM_THRESHOLD = 200;      // generous threshold for showing the button
    const STRICT_BOTTOM_THRESHOLD = 12;     // very close to bottom

    // Detect scroll direction
    const prevTop = lastScrollTopRef.current;
    const scrollingDown = scrollTop > prevTop;
    const scrollingUp = scrollTop < prevTop;
    lastScrollTopRef.current = scrollTop;

    // Disable auto-scroll as soon as user is not essentially at the bottom
    if (autoScrollEnabled && distanceFromBottom > STRICT_BOTTOM_THRESHOLD) {
      setAutoScrollEnabled(false);
      return; // avoid immediate re-enable in the same tick
    }

    // Only re-enable when user intentionally scrolls down to the very bottom
    if (!autoScrollEnabled && scrollingDown && distanceFromBottom <= STRICT_BOTTOM_THRESHOLD) {
      setAutoScrollEnabled(true);
      setUnreadMessageCount(0);
      return;
    }

    // No-op otherwise; this prevents the "pull to bottom" feeling
  }, [autoScrollEnabled]);

  /**
   * Stop currently streaming AI response
   * Fix Issue #3 - Allow users to stop long-running responses
   */
  const handleStopStreaming = () => {
    console.log('[QA Module] User requested to stop streaming');

    // Abort the fetch request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // Finalize current AI message with partial content
    if (streamingAIMessageIdRef.current) {
      const msgId = streamingAIMessageIdRef.current;
      setActiveSessionMessages(prev =>
        prev.map(msg =>
          msg.id === msgId
            ? {
                ...msg,
                isStreaming: false,
                content: msg.content + '\n\n_[回答已中止]_',
              }
            : msg
        )
      );
      streamingAIMessageIdRef.current = null;
    }

    // Reset states
    setIsLoadingExplanation(false);
    setThinkingStatus('idle');
    setAiInteractionState('answered');

    // Reset timing refs to avoid stale duration for next question (Task 3.3)
    questionSubmittedAtRef.current = null;
    responseStartedAtRef.current = null;
    firstChunkSeenRef.current = false;

    toast({
      title: '已停止回答',
      description: '部分回答已保留',
    });
  };

  const handleUserSubmitQuestion = async (overrideQuestion?: string) => {
    // Prevent duplicate submission - check all blocking conditions first
    const now = Date.now();
    if (isSubmittingRef.current || (now - lastSubmitAtRef.current) < 800 || isLoadingExplanation) {
      console.log('[QA Module] Submission blocked - already processing a request');
      return;
    }
    isSubmittingRef.current = true;
    lastSubmitAtRef.current = now;

    // Defensive type check to prevent .trim() error
    const rawInput = overrideQuestion ?? userQuestionInput;
    const effectiveInput = (typeof rawInput === 'string' ? rawInput : '').trim();
    if (!effectiveInput || !currentChapter) {
      console.log('[QA Module] Submission blocked - invalid input or no chapter:', {
        hasInput: !!effectiveInput,
        hasChapter: !!currentChapter
      });
      isSubmittingRef.current = false;
      return;
    }

    console.log('[QA Module] Starting question submission:', {
      question: effectiveInput.substring(0, 50),
      timestamp: new Date().toISOString()
    });

    // Store question text before any state changes (Fix Issue #2)
    const questionText = effectiveInput;

    // Set appropriate mode based on AI provider choice
    setAiMode(usePerplexityAI ? 'perplexity-qa' : 'ai-analysis');

    // Set loading state IMMEDIATELY to prevent duplicate submissions
    setIsLoadingExplanation(true);
    setTextExplanation(null);
    setAiAnalysisContent(null);
    setPerplexityResponse(null);
    setPerplexityStreamingChunks([]);
    streamingAIMessageIdRef.current = null;
    lastChunkIndexRef.current = -1;

    try {
      const chapterContextSnippet = currentChapter.paragraphs
        .slice(0, 5) 
        .map(p => p.content.map(c => typeof c === 'string' ? c : c.text).join(''))
        .join('\n')
        .substring(0, 1000); 

      if (usePerplexityAI) {
        // Use Perplexity API
        const perplexityInput = await createPerplexityQAInputForFlow(
          userQuestionInput,
          selectedTextInfo,
          chapterContextSnippet,
          currentChapter.titleKey,
          {
            modelKey: perplexityModel,
            reasoningEffort: reasoningEffort,
            enableStreaming: ENABLE_STREAMING,
            showThinkingProcess: true,
            questionContext: 'general',
          }
        );

        if (ENABLE_STREAMING) {  // Always true (Fix #6)
          // Handle streaming response via SSE API endpoint
          setAiInteractionState('streaming');
          const chunks: PerplexityStreamingChunk[] = [];

          // Add user message to conversation
          // Ensure there is an active session
          if (!activeSessionId) {
            startNewSession();
          }
          const userMessage: ConversationMessage = {
            id: `user-${Date.now()}`,
            role: 'user' as MessageRole,
            content: questionText,
            timestamp: new Date(),
          };
          console.log('[QA Module] Adding user message:', userMessage);
          setActiveSessionMessages(prev => [...prev, userMessage]);

          // Award XP for first AI question (one-time achievement)
          if (user?.id) {
            let xpResult: any = null;
            let xpError: any = null;

            try {
              console.log(`🎯 Attempting to award first AI question achievement...`);

              xpResult = await awardXP(
                user.id,
                XP_REWARDS.AI_FIRST_QUESTION_ACHIEVEMENT,
                '心有疑，隨札記 - First AI question asked',
                'achievement',
                'achievement-first-ai-question' // Fixed sourceId for one-time achievement
              );

              // Only refresh profile if not duplicate
              if (!xpResult.isDuplicate) {
                console.log(`🏆 Achievement unlocked: 心有疑，隨札記 (+20 XP)`);
                await refreshUserProfile();
              } else {
                console.log(`ℹ️ User has already unlocked this achievement, no XP awarded`);
              }
            } catch (error) {
              console.error('Error awarding AI interaction XP:', error);
              xpError = error;
              // Continue with question processing even if XP fails
            }

            // Show toast notification OUTSIDE try-catch to ensure it always displays
            // This prevents toast from being blocked by any errors in XP award process
            const achievementKey = 'achievement-first-ai-question';
            const hasNotifiedKey = `achievement-notified-${achievementKey}`;
            const hasAlreadyNotified = typeof window !== 'undefined' && localStorage.getItem(hasNotifiedKey) === 'true';

            if (xpResult && !xpResult.isDuplicate && !xpError && !hasAlreadyNotified) {
              // First time unlocking achievement - show success toast
              toast({
                title: `🏆 ${t('achievements.achievementUnlocked')}`,
                description: `${t('achievements.firstAIQuestion.name')} | +20 XP`,
                variant: 'default',
                duration: 6000, // Increased from 5s to 6s for better visibility
              });

              // Mark achievement as notified in localStorage
              if (typeof window !== 'undefined') {
                localStorage.setItem(hasNotifiedKey, 'true');
              }

              // Show level-up modal if leveled up
              if (xpResult.leveledUp) {
                setLevelUpData({
                  show: true,
                  fromLevel: xpResult.fromLevel!,
                  toLevel: xpResult.newLevel,
                });
              }
            } else if (xpResult && xpResult.isDuplicate) {
              // Achievement already unlocked - silently log instead of showing toast
              // This prevents repeated notifications that annoy users
              console.log(`ℹ️ Achievement '${achievementKey}' already unlocked, skipping notification`);
            } else if (xpError) {
              // Error occurred while awarding XP - show error toast
              toast({
                title: '成就獎勵異常',
                description: '無法獲得成就 XP，但問答功能正常運作',
                variant: 'destructive',
                duration: 4000,
              });
            }
          }

          // Clear input field immediately after submission (Fix Issue #2)
          setUserQuestionInput('');

          // Release quick-submit guard; long-running guarded by isLoadingExplanation
          isSubmittingRef.current = false;

          // Initialize thinking process
          // FIX: Use empty string instead of hardcoded text to avoid mixing
          // placeholder with actual AI thinking content. The UI component
          // (AIMessageBubble) will show "Thinking..." when thinkingProcess is empty
          // but isThinkingComplete is false.
          setThinkingStatus('thinking');
          setThinkingContent('');
          setStreamingProgress(0);
          // Task 3.3: mark submission time for duration calculation
          questionSubmittedAtRef.current = Date.now();
          responseStartedAtRef.current = null;
          firstChunkSeenRef.current = false;

          // BUG FIX: Create AI placeholder message IMMEDIATELY after user submits
          // This ensures the AI response appears in the correct position (within ConversationFlow)
          // instead of below the "--開啟新對話--" separator
          const aiPlaceholderId = `ai-thinking-${Date.now()}`;
          streamingAIMessageIdRef.current = aiPlaceholderId;
          const aiPlaceholderMessage: ConversationMessage = {
            id: aiPlaceholderId,
            role: 'ai' as MessageRole,
            content: '', // Empty - AIMessageBubble will show loading skeleton
            timestamp: new Date(),
            citations: [],
            thinkingProcess: '', // Will be updated during streaming
            isStreaming: true,
          };
          setActiveSessionMessages(prev => [...prev, aiPlaceholderMessage]);
          // Declare watchdog timer outside try/catch so it is visible in catch blocks
          let watchdogInterval: ReturnType<typeof setInterval> | null = null;

          try {
            // Create new AbortController for this request (Fix Issue #3)
            abortControllerRef.current = new AbortController();

            // 🚀 DIAGNOSTIC: Log when AI QA is triggered (visible in browser F12 console)
            console.log('%c[QA Module] 🚀 AI 問答已觸發！', 'background: #4CAF50; color: white; font-size: 18px; padding: 8px;', {
              question: questionText,
              timestamp: new Date().toISOString(),
              model: perplexityModel,
            });

            // Call the streaming API endpoint instead of direct async generator
            const response = await fetch('/api/perplexity-qa-stream', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              signal: abortControllerRef.current.signal, // Add abort signal
              body: JSON.stringify({
                userQuestion: questionText,
                selectedTextInfo: selectedTextInfo,
                chapterContext: chapterContextSnippet,
                currentChapter: currentChapter.titleKey,
                modelKey: perplexityModel,
                reasoningEffort: reasoningEffort,
                questionContext: 'general',
                showThinkingProcess: true,
              }),
            });

            if (!response.ok) {
              throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            if (!response.body) {
              throw new Error('Response body is null');
            }

            // Process SSE stream with timeout protection
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let lastChunkTime = Date.now();
            const STREAM_TIMEOUT_MS = 30000; // 30 seconds without data = timeout
            let isStreamActive = true;
            let timeoutError: Error | null = null;
            // Capture latest thinking text from server-extracted <think> content
            let latestThinkingText: string = '';

            console.log('[QA Module] Starting stream processing with timeout protection');
            // Setup watchdog timer to detect stream stalls
            watchdogInterval = setInterval(() => {
              if (!isStreamActive) {
                if (watchdogInterval) {
                  clearInterval(watchdogInterval);
                  watchdogInterval = null;
                }
                return;
              }

              const timeSinceLastChunk = Date.now() - lastChunkTime;
              console.log('[QA Module] Watchdog check:', {
                timeSinceLastChunk: `${(timeSinceLastChunk / 1000).toFixed(1)}s`,
                timeoutThreshold: `${STREAM_TIMEOUT_MS / 1000}s`
              });

              if (timeSinceLastChunk > STREAM_TIMEOUT_MS) {
                console.error('[QA Module] Stream timeout - no data received for 30s');
                isStreamActive = false;
                timeoutError = new Error('串流超時：30秒內未收到任何資料。請重試您的問題。');
                reader.cancel('Stream timeout');
                if (watchdogInterval) {
                  clearInterval(watchdogInterval);
                  watchdogInterval = null;
                }
              }
            }, 5000); // Check every 5 seconds

            // Safety: Prevent runaway loops in UI (lower than backend since this affects browser)
            const MAX_UI_READ_ITERATIONS = 5000;
            let readCount = 0;

            try {
              let sawCompletion = false;
              while (true) {
                // Safety check: prevent runaway loops that could freeze browser tab
                if (++readCount > MAX_UI_READ_ITERATIONS) {
                  console.error('[QA Module] Stream processing exceeded iteration limit', {
                    iterations: readCount,
                    chunksReceived: chunks.length,
                  });
                  throw new Error(
                    '串流處理超過最大迭代限制。請重新嘗試或聯繫支援。'
                  );
                }

                // Check for timeout error from watchdog
                if (timeoutError) {
                  throw timeoutError;
                }

                const { done, value } = await reader.read();

                if (done) {
                  console.log('[QA Module] Stream complete');
                  isStreamActive = false;
                  if (watchdogInterval) {
                    clearInterval(watchdogInterval);
                    watchdogInterval = null;
                  }
                  // If no explicit isComplete chunk was received, finalize using last chunk
                  if (!sawCompletion && chunks.length > 0) {
                    const last = chunks[chunks.length - 1];
                    // Server already separated thinking and answer via StreamProcessor
                    const combined = last.fullContent || '';
                    if (!latestThinkingText && last.thinkingContent) {
                      latestThinkingText = last.thinkingContent;
                    }
                    if (latestThinkingText && latestThinkingText !== thinkingContent) {
                      setThinkingContent(latestThinkingText);
                    }
                    try {
                      setThinkingStatus('complete');
                      setStreamingProgress(100);

                      const finalResponse: PerplexityQAResponse = {
                        question: questionText,
                        answer: combined,
                        citations: last.citations || [],
                        groundingMetadata: (last.metadata as any) || { searchQueries: [], webSources: [], groundingSuccessful: false },
                        modelUsed: perplexityInput.modelKey || 'sonar-reasoning-pro',
                        modelKey: perplexityInput.modelKey || 'sonar-reasoning-pro',
                        reasoningEffort: perplexityInput.reasoningEffort,
                        questionContext: perplexityInput.questionContext,
                        processingTime: last.responseTime || 0,
                        success: !last.error,
                        streaming: true,
                        chunkCount: last.chunkIndex,
                        stoppedByUser: false,
                        timestamp: last.timestamp,
                        answerLength: combined.length,
                        questionLength: questionText.length,
                        citationCount: (last.citations || []).length,
                        error: last.error,
                      };
                      setPerplexityResponse(finalResponse);

                      if (streamingAIMessageIdRef.current) {
                        const msgId = streamingAIMessageIdRef.current;
                        setActiveSessionMessages(prev => prev.map(m => m.id === msgId ? {
                          ...m,
                          content: combined,
                          citations: last.citations || m.citations,
                          thinkingProcess: latestThinkingText || m.thinkingProcess || thinkingContent,
                          thinkingDuration: (m.thinkingDuration && m.thinkingDuration > 0)
                            ? m.thinkingDuration
                            : Math.round((last.responseTime || 0) / 1000),
                          isStreaming: false,
                        } : m));
                        streamingAIMessageIdRef.current = null;
                        // Increment unread count if auto-scroll is disabled (Fix Issue #7 - Task 2.3)
                        if (!autoScrollEnabled) {
                          setUnreadMessageCount(prev => prev + 1);
                        }
                      } else {
                        const measuredSec = (questionSubmittedAtRef.current != null && responseStartedAtRef.current != null)
                          ? Math.max(0, Math.round((responseStartedAtRef.current - questionSubmittedAtRef.current) / 1000))
                          : Math.round((last.responseTime || 0) / 1000);
                        const aiMessage: ConversationMessage = {
                          id: `ai-${Date.now()}`,
                          role: 'ai' as MessageRole,
                          content: combined,
                          timestamp: new Date(),
                          citations: last.citations || [],
                          thinkingProcess: latestThinkingText || thinkingContent,
                          thinkingDuration: measuredSec,
                          isStreaming: false,
                        };
                        setActiveSessionMessages(prev => [...prev, aiMessage]);
                        // Increment unread count if auto-scroll is disabled (Fix Issue #7 - Task 2.3)
                        if (!autoScrollEnabled) {
                          setUnreadMessageCount(prev => prev + 1);
                        }
                      }
                      setAiInteractionState('answered');
                    } catch (finalizeErr) {
                      console.error('[QA Module] Finalization error on stream end:', finalizeErr);
                    }
                  }
                  break;
                }

                // Update last chunk time to reset timeout counter
                lastChunkTime = Date.now();
                console.log('[QA Module] Received chunk:', {
                  size: value.length,
                  timestamp: new Date().toISOString()
                });

                // Decode chunk and add to buffer
                buffer += decoder.decode(value, { stream: true });

              // Process complete SSE messages
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // Keep incomplete line in buffer

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6); // Remove 'data: ' prefix

                  // Check for completion signal
                  if (data === '[DONE]') {
                    console.log('%c[QA Module] ✅ Received [DONE] signal', 'background: #0f0; color: #000; font-size: 16px;');
                    // Finalize if generator didn't send explicit isComplete chunk
                    if (!sawCompletion && chunks.length > 0) {
                      const last = chunks[chunks.length - 1];
                      // Server already separated thinking and answer via StreamProcessor
                      // FALLBACK: If fullContent is empty, use thinkingContent as answer
                      const combined = last.fullContent?.trim()
                        ? last.fullContent
                        : ((last as any).thinkingContent?.trim() || '');

                      // ═══════════════════════════════════════════════════════════════
                      // 🔧 FINAL STATE ANALYSIS - ALL 3 HYPOTHESES
                      // ═══════════════════════════════════════════════════════════════
                      console.log('%c╔═══════════════════════════════════════════════════════════════╗', 'color: #4CAF50; font-weight: bold;');
                      console.log('%c║  🏁 STREAM COMPLETE - FINAL HYPOTHESIS ANALYSIS              ║', 'color: #4CAF50; font-weight: bold; font-size: 14px;');
                      console.log('%c╚═══════════════════════════════════════════════════════════════╝', 'color: #4CAF50; font-weight: bold;');

                      // 🅰️ HYPOTHESIS A: Did sliding window work?
                      const hadFullContent = chunks.some(c => c.fullContent?.trim().length > 10);
                      console.log('%c🅰️ [HYPOTHESIS A] Final Sliding Window Status:', 'background: #2196F3; color: white; padding: 4px 8px; border-radius: 4px;');
                      console.log(`   └─ Any chunk had fullContent > 10 chars: ${hadFullContent ? '✅ YES' : '❌ NO'}`);
                      if (!hadFullContent) {
                        console.log('%c   └─ ⚠️ SLIDING WINDOW MAY HAVE FAILED - Check backend logs for "🅰️ [HYPOTHESIS A]"', 'color: #f44336;');
                      }

                      // 🅱️ HYPOTHESIS B: Did incremental chunks work?
                      const thinkingChunks = chunks.filter(c => (c as any).thinkingContent?.trim().length > 0);
                      const textChunks = chunks.filter(c => c.fullContent?.trim().length > 0 && !(c as any).contentDerivedFromThinking);
                      console.log('%c🅱️ [HYPOTHESIS B] Final Chunk Distribution:', 'background: #FF9800; color: black; padding: 4px 8px; border-radius: 4px;');
                      console.log(`   └─ Total chunks: ${chunks.length}`);
                      console.log(`   └─ Thinking chunks: ${thinkingChunks.length}`);
                      console.log(`   └─ Text chunks (real answer): ${textChunks.length}`);
                      if (textChunks.length === 0 && thinkingChunks.length > 0) {
                        console.log('%c   └─ ⚠️ NO TEXT CHUNKS - Answer may be missing!', 'color: #f44336;');
                      }

                      // 🅲️ HYPOTHESIS C: Is final content reasonable?
                      console.log('%c🅲️ [HYPOTHESIS C] Final Content Verification:', 'background: #9C27B0; color: white; padding: 4px 8px; border-radius: 4px;');
                      console.log(`   └─ Final fullContent length: ${last.fullContent?.length || 0}`);
                      console.log(`   └─ Final thinkingContent length: ${(last as any).thinkingContent?.length || 0}`);
                      console.log(`   └─ Combined output length: ${combined.length}`);
                      console.log(`   └─ Used fallback (thinking as answer): ${!last.fullContent?.trim() ? '⚠️ YES' : '✅ NO'}`);

                      if (combined.length < 50) {
                        console.log('%c   └─ 🚨 FINAL CONTENT VERY SHORT - Possible truncation!', 'color: #f44336; font-weight: bold;');
                      }

                      // Task 4.2: Log final state for debugging
                      console.log('%c[QA Module] 🏁 FINAL STATE on [DONE]', 'background: #00f; color: #fff; font-size: 16px;', {
                        totalChunks: chunks.length,
                        lastChunkIndex: last.chunkIndex,
                        lastFullContentLength: last.fullContent?.length || 0,
                        lastFullContentPreview: last.fullContent?.substring(0, 300) || '(empty)',
                        lastThinkingContentLength: (last as any).thinkingContent?.length || 0,
                        combinedContentLength: combined.length,
                        combinedPreview: combined.substring(0, 300) || '(empty)',
                        usedFallback: !last.fullContent?.trim(),
                      });
                      if (!latestThinkingText && last.thinkingContent) {
                        latestThinkingText = last.thinkingContent;
                      }
                      if (latestThinkingText && latestThinkingText !== thinkingContent) {
                        setThinkingContent(latestThinkingText);
                      }
                      setThinkingStatus('complete');
                      setStreamingProgress(100);

                      const finalResponse: PerplexityQAResponse = {
                        question: questionText,
                        answer: combined,
                        citations: last.citations || [],
                        groundingMetadata: (last.metadata as any) || { searchQueries: [], webSources: [], groundingSuccessful: false },
                        modelUsed: perplexityInput.modelKey || 'sonar-reasoning-pro',
                        modelKey: perplexityInput.modelKey || 'sonar-reasoning-pro',
                        reasoningEffort: perplexityInput.reasoningEffort,
                        questionContext: perplexityInput.questionContext,
                        processingTime: last.responseTime || 0,
                        success: !last.error,
                        streaming: true,
                        chunkCount: last.chunkIndex,
                        stoppedByUser: false,
                        timestamp: last.timestamp,
                        answerLength: combined.length,
                        questionLength: questionText.length,
                        citationCount: (last.citations || []).length,
                        error: last.error,
                      };
                      setPerplexityResponse(finalResponse);

                      // Finalize existing streaming message if present; otherwise create one
                      if (streamingAIMessageIdRef.current) {
                        const msgId = streamingAIMessageIdRef.current;
                        setActiveSessionMessages(prev => prev.map(m => m.id === msgId ? {
                          ...m,
                          content: combined,
                          citations: last.citations || m.citations,
                          thinkingProcess: latestThinkingText || m.thinkingProcess || thinkingContent,
                          thinkingDuration: Math.round((last.responseTime || 0) / 1000),
                          isStreaming: false,
                        } : m));
                        streamingAIMessageIdRef.current = null;
                        // Increment unread count if auto-scroll is disabled (Fix Issue #7 - Task 2.3)
                        if (!autoScrollEnabled) {
                          setUnreadMessageCount(prev => prev + 1);
                        }
                      } else {
                        const aiMessage: ConversationMessage = {
                          id: `ai-${Date.now()}`,
                          role: 'ai' as MessageRole,
                          content: combined,
                          timestamp: new Date(),
                          citations: last.citations || [],
                          thinkingProcess: latestThinkingText || thinkingContent,
                          thinkingDuration: Math.round((last.responseTime || 0) / 1000),
                          isStreaming: false,
                        };
                        setActiveSessionMessages(prev => [...prev, aiMessage]);
                        // Increment unread count if auto-scroll is disabled (Fix Issue #7 - Task 2.3)
                        if (!autoScrollEnabled) {
                          setUnreadMessageCount(prev => prev + 1);
                        }
                      }
                      setAiInteractionState('answered');
                      sawCompletion = true;
                    }
                    continue;
                  }

                  try {
                    const chunk: PerplexityStreamingChunk = JSON.parse(data);

                    // ═══════════════════════════════════════════════════════════════
                    // 🅱️ HYPOTHESIS B (Frontend View): Data Received from Backend
                    // ═══════════════════════════════════════════════════════════════
                    const hasFullContent = !!(chunk.fullContent && chunk.fullContent.trim().length > 0);
                    const hasThinkingContent = !!((chunk as any).thinkingContent && (chunk as any).thinkingContent.trim().length > 0);
                    const contentDerivedFromThinking = (chunk as any).contentDerivedFromThinking === true;

                    // ═══════════════════════════════════════════════════════════════
                    // 🔧 ENHANCED DEBUGGING FOR ALL 3 HYPOTHESES (Frontend)
                    // ═══════════════════════════════════════════════════════════════
                    console.log('%c╔═══════════════════════════════════════════════════════════════╗', 'color: #4CAF50; font-weight: bold;');
                    console.log('%c║  📦 CHUNK RECEIVED FROM BACKEND - HYPOTHESIS ANALYSIS        ║', 'color: #4CAF50; font-weight: bold; font-size: 14px;');
                    console.log('%c╚═══════════════════════════════════════════════════════════════╝', 'color: #4CAF50; font-weight: bold;');

                    // 🅰️ HYPOTHESIS A: Sliding window detection
                    console.log('%c🅰️ [HYPOTHESIS A] Sliding Window Detection Status:', 'background: #2196F3; color: white; padding: 4px 8px; border-radius: 4px;');
                    console.log('   └─ If thinkingContent exists but fullContent is empty, sliding window may have failed to detect </think>');
                    console.log('   └─ Check backend logs for "🅰️ [HYPOTHESIS A]" messages');

                    // 🅱️ HYPOTHESIS B: State transition / incremental chunks
                    console.log('%c🅱️ [HYPOTHESIS B] State Transition & Incremental Chunks:', 'background: #FF9800; color: black; padding: 4px 8px; border-radius: 4px;');
                    if (hasThinkingContent && !hasFullContent) {
                      console.log('%c   └─ ⚠️ STILL IN THINKING MODE - No answer content yet', 'color: #FF9800;');
                      console.log('   └─ This is EXPECTED during <think>...</think> processing');
                      console.log('   └─ Answer should appear after </think> is detected');
                    } else if (hasFullContent && !contentDerivedFromThinking) {
                      console.log('%c   └─ ✅ ANSWER CONTENT RECEIVED - </think> was detected', 'color: #4CAF50;');
                    } else if (hasFullContent && contentDerivedFromThinking) {
                      console.log('%c   └─ ⚠️ FALLBACK MODE - fullContent derived from thinking', 'color: #FF9800;');
                      console.log('   └─ This means </think> was NOT found, using thinking as answer');
                    }

                    // 🅲️ HYPOTHESIS C: Remaining calculation
                    console.log('%c🅲️ [HYPOTHESIS C] Remaining Calculation Verification:', 'background: #9C27B0; color: white; padding: 4px 8px; border-radius: 4px;');
                    console.log('   └─ If fullContent is much shorter than expected, check backend logs for "🅲️ [HYPOTHESIS C]"');
                    console.log('   └─ Backend will log warnings if remaining content calculation seems wrong');

                    console.log('%c───────────────────────────────────────────────────', 'color: #888;');
                    console.log('%c[HYPOTHESIS B - Frontend] 🅱️ Chunk Received from Backend',
                      'background: #ff9800; color: #000; font-size: 16px; padding: 6px; border-radius: 4px;');

                    console.table({
                      'Chunk Index': chunk.chunkIndex,
                      'fullContent': hasFullContent ? `✅ ${chunk.fullContent?.length} chars` : '❌ EMPTY',
                      'content': chunk.content?.length ? `${chunk.content?.length} chars` : '❌ EMPTY',
                      'thinkingContent': hasThinkingContent ? `${(chunk as any).thinkingContent?.length} chars` : '❌ EMPTY',
                      'contentDerivedFromThinking': contentDerivedFromThinking ? '⚠️ YES' : '✅ NO',
                      'isComplete': chunk.isComplete ? '✅ YES' : '❌ NO',
                    });

                    // CRITICAL: Alert if backend didn't provide real fullContent
                    if (!hasFullContent && hasThinkingContent) {
                      console.log('%c[HYPOTHESIS B] 🚨 CRITICAL: Backend sent NO fullContent!',
                        'background: #f44336; color: #fff; font-size: 18px; padding: 8px;');
                      console.log('%c[HYPOTHESIS B] This means StreamProcessor did NOT detect </think> tag correctly!',
                        'background: #f44336; color: #fff; font-size: 14px; padding: 4px;');
                      console.log('%c[HYPOTHESIS B] The answer content is likely still inside the thinking buffer.',
                        'background: #f44336; color: #fff; font-size: 14px; padding: 4px;');
                    }

                    if (contentDerivedFromThinking) {
                      console.log('%c[HYPOTHESIS B] ⚠️ fullContent was derived from thinking (backend fallback)',
                        'background: #ff9800; color: #000; font-size: 14px; padding: 4px;');
                    }

                    // Log content previews
                    console.log('%c[HYPOTHESIS B] 📝 Content Previews from Backend:', 'color: #888; font-size: 12px;', {
                      fullContentPreview: chunk.fullContent?.substring(0, 300) || '(empty)',
                      contentPreview: chunk.content?.substring(0, 300) || '(empty)',
                      thinkingContentPreview: (chunk as any).thinkingContent?.substring(0, 300) || '(empty)',
                    });
                    console.log('%c═══════════════════════════════════════════════════', 'color: #888;');

                    chunks.push(chunk);
                    setPerplexityStreamingChunks([...chunks]);

                    // Task 3.3: record first response time and update message's thinkingDuration
                    if (!firstChunkSeenRef.current) {
                      firstChunkSeenRef.current = true;
                      responseStartedAtRef.current = Date.now();
                      if (questionSubmittedAtRef.current != null && streamingAIMessageIdRef.current) {
                        const elapsed = Math.max(0, Math.round((responseStartedAtRef.current - questionSubmittedAtRef.current) / 1000));
                        const msgId = streamingAIMessageIdRef.current;
                        setActiveSessionMessages(prev => prev.map(m => m.id === msgId ? { ...m, thinkingDuration: elapsed } : m));
                      }
                    }

                    // Update thinking content with search queries or progress (also push into message)
                    if (chunk.searchQueries && chunk.searchQueries.length > 0) {
                      const sq = `搜尋查詢: ${chunk.searchQueries.join(', ')}`;
                      setThinkingContent(sq);
                      latestThinkingText = sq;
                      if (streamingAIMessageIdRef.current) {
                        const msgId = streamingAIMessageIdRef.current;
                        setActiveSessionMessages(prev => prev.map(m => {
                          if (m.id !== msgId) return m;
                          const base = (m.thinkingProcess || '').trim();
                          if (!base) return { ...m, thinkingProcess: sq };
                          if (base.includes(sq)) return m;
                          return { ...m, thinkingProcess: `${base}\n\n${sq}` };
                        }));
                      }
                    }

                    // Update streaming progress (Fix Issue #1 - realistic progress estimation)
                    if (chunk.chunkIndex > 0) {
                      // More realistic progress estimation with smoother growth
                      // Start fast, then slow down to avoid getting stuck
                      const progress = Math.min(
                        20 + (chunk.chunkIndex * 1.5),  // Starts at 20%, grows 1.5% per chunk
                        98  // Cap at 98% to show we're almost done but not complete
                      );
                      setStreamingProgress(Math.round(progress));
                    }

                    // Extract and separate thinking content from answer content
                    // Fix: Always clean fullContent to prevent thinking duplication in answer area
                    // Trust server-side StreamProcessor - no client-side cleaning needed
                    let extractedThinkingText: string | null = null;

                    // Use server-extracted thinking content from StreamProcessor
                    if ((chunk as any).thinkingContent && (chunk as any).thinkingContent.trim().length > 0) {
                      extractedThinkingText = (chunk as any).thinkingContent.trim();
                      if (extractedThinkingText) {
                        latestThinkingText = extractedThinkingText;
                        if (extractedThinkingText !== thinkingContent) {
                          setThinkingContent(extractedThinkingText);
                        }
                      }
                    }

                    if (streamingAIMessageIdRef.current) {
                      const msgId = streamingAIMessageIdRef.current;
                      // Skip duplicate/out-of-order chunkIndex to prevent repeated appends
                      if (typeof chunk.chunkIndex === 'number' && chunk.chunkIndex <= lastChunkIndexRef.current) {
                        console.warn('[QA Module] Skipping duplicate/out-of-order chunkIndex', {
                          chunkIndex: chunk.chunkIndex,
                          lastChunkIndex: lastChunkIndexRef.current,
                        });
                        continue;
                      }
                      if (typeof chunk.chunkIndex === 'number' && chunk.chunkIndex > lastChunkIndexRef.current) {
                        lastChunkIndexRef.current = chunk.chunkIndex;
                      }

                      setActiveSessionMessages(prev => prev.map(m => {
                        if (m.id !== msgId) return m;

                        // ═══════════════════════════════════════════════════════════════
                        // 🅰️ HYPOTHESIS A: Content vs ThinkingProcess Separation Logic
                        // ═══════════════════════════════════════════════════════════════
                        // RULE: NEVER assign thinkingContent to message.content
                        // content = actual answer from AI
                        // thinkingProcess = AI's reasoning/thinking process
                        // These MUST remain separate!

                        const hasFull = !!(chunk.fullContent && chunk.fullContent.trim().length > 0);
                        const hasContent = !!(chunk.content && chunk.content.trim().length > 0);
                        const hasThinking = !!((chunk as any).thinkingContent && (chunk as any).thinkingContent.trim().length > 0);
                        const contentDerivedFromThinking = (chunk as any).contentDerivedFromThinking === true;

                        // Determine the actual answer content (NOT thinking content)
                        let updatedText: string;
                        let contentSource: string;

                        if (hasFull && !contentDerivedFromThinking) {
                          updatedText = chunk.fullContent;
                          contentSource = '✅ CASE 1: fullContent (real answer)';
                        } else if (hasContent) {
                          updatedText = `${m.content || ''}${chunk.content}`;
                          contentSource = '⚠️ CASE 2: content (incremental append)';
                        } else {
                          // CRITICAL: Do NOT fallback to thinkingContent!
                          updatedText = m.content || '';
                          contentSource = '➖ CASE 3: unchanged (NO fallback to thinking)';
                        }

                        // ═══════════════════════════════════════════════════════════════
                        // 🅰️ HYPOTHESIS A LOGGING - Content Assignment Decision
                        // ═══════════════════════════════════════════════════════════════
                        console.log('%c[HYPOTHESIS A] 🅰️ Content Assignment', 'background: #0066cc; color: #fff; font-size: 16px; padding: 6px; border-radius: 4px;');
                        console.table({
                          'Chunk Index': chunk.chunkIndex,
                          'Has fullContent': hasFull ? '✅ YES' : '❌ NO',
                          'Has content': hasContent ? '✅ YES' : '❌ NO',
                          'Has thinkingContent': hasThinking ? '✅ YES' : '❌ NO',
                          'Content Derived From Thinking': contentDerivedFromThinking ? '⚠️ YES (ignored)' : '✅ NO',
                          'fullContent Length': chunk.fullContent?.length || 0,
                          'content Length': chunk.content?.length || 0,
                          'thinkingContent Length': (chunk as any).thinkingContent?.length || 0,
                          'Decision': contentSource,
                          'Result updatedText Length': updatedText?.length || 0,
                          'Previous content Length': m.content?.length || 0,
                        });

                        // Log content previews
                        console.log('%c[HYPOTHESIS A] 📝 Content Previews', 'background: #333; color: #fff; font-size: 12px; padding: 4px;', {
                          fullContentPreview: chunk.fullContent?.substring(0, 200) || '(empty)',
                          contentPreview: chunk.content?.substring(0, 200) || '(empty)',
                          thinkingContentPreview: (chunk as any).thinkingContent?.substring(0, 200) || '(empty)',
                          updatedTextPreview: updatedText?.substring(0, 200) || '(empty)',
                        });

                        // ═══════════════════════════════════════════════════════════════
                        // 🅲️ HYPOTHESIS C: Confirm NO duplicate splitThinkingFromContent
                        // ═══════════════════════════════════════════════════════════════
                        console.log('%c[HYPOTHESIS C] 🅲️ No duplicate processing - trusting backend separation', 'background: #9c27b0; color: #fff; font-size: 12px; padding: 4px;', {
                          note: 'Frontend does NOT call splitThinkingFromContent() - using server-provided values directly',
                          thinkingFromServer: (chunk as any).thinkingContent?.length || 0,
                          contentFromServer: chunk.fullContent?.length || 0,
                        });

                        // Update thinking process separately (this is correct behavior)
                        const newThinking = extractedThinkingText || latestThinkingText || m.thinkingProcess || '';

                        return {
                          ...m,
                          content: updatedText,
                          citations: chunk.citations && chunk.citations.length ? chunk.citations : m.citations,
                          thinkingProcess: newThinking,
                          isStreaming: !chunk.isComplete,
                        };
                      }));
                    } else {
                      // Fallback: This should rarely happen since we create placeholder on submit
                      // But keep it as safety net for edge cases
                      // BUG FIX: Add duplicate message prevention check
                      console.warn('[QA Module] No streaming message ID found - checking for existing streaming message');
                      setActiveSessionMessages(prev => {
                        // Check if there's already a streaming AI message to prevent duplicates
                        const existingStreamingMsg = prev.find(m => m.role === 'ai' && m.isStreaming);
                        if (existingStreamingMsg) {
                          // Update existing message instead of creating new one
                          console.warn('[QA Module] Found existing streaming message, updating instead of creating new');
                          streamingAIMessageIdRef.current = existingStreamingMsg.id;
                          return prev.map(m => {
                            if (m.id !== existingStreamingMsg.id) return m;
                            return {
                              ...m,
                              content: chunk.fullContent?.trim()
                                ? chunk.fullContent
                                : (chunk.content?.trim()
                                  ? `${m.content || ''}${chunk.content}`
                                  : m.content),
                              citations: chunk.citations || m.citations,
                              thinkingProcess: extractedThinkingText || latestThinkingText || m.thinkingProcess || '',
                            };
                          });
                        }
                        // No existing streaming message, create new one
                        const aiMsgId = `ai-stream-${Date.now()}`;
                        streamingAIMessageIdRef.current = aiMsgId;
                        const aiStreamingMessage: ConversationMessage = {
                          id: aiMsgId,
                          role: 'ai',
                          content: chunk.fullContent || chunk.content || '',
                          timestamp: new Date(),
                          citations: chunk.citations || [],
                          thinkingProcess: extractedThinkingText || latestThinkingText || thinkingContent || '',
                          isStreaming: true,
                        };
                        return [...prev, aiStreamingMessage];
                      });
                    }

                    if (chunk.isComplete) {
                      sawCompletion = true;
                      // Task 4.2 Logging: Track stream completion
                      console.log('[QA Module] Stream complete - sawCompletion:', sawCompletion);
                      // Mark thinking as complete
                      setThinkingStatus('complete');
                      setStreamingProgress(100);

                      // Create final response from last chunk
                      // Server already cleaned content via StreamProcessor
                      const finalServerThinking = (chunk as any).thinkingContent || '';
                      // FALLBACK: If fullContent is empty, use thinkingContent as the answer
                      const cleaned = chunk.fullContent?.trim()
                        ? chunk.fullContent
                        : (finalServerThinking.trim() || chunk.content || '');
                      console.log('[QA Module] Final content - cleaned.length:', cleaned.length, ', thinkingLength:', finalServerThinking.length);

                      // DEBUG: Log final content to diagnose "《" bug (Task 4.2)
                      console.log('[QA Module DEBUG] FINAL chunk - isComplete=true:', {
                        fullContentLength: chunk.fullContent?.length || 0,
                        contentLength: chunk.content?.length || 0,
                        cleanedLength: cleaned.length,
                        thinkingLength: finalServerThinking.length,
                        cleanedPreview: cleaned.substring(0, 200) || '(empty)',
                        fullContentPreview: chunk.fullContent?.substring(0, 200) || '(empty)',
                      });
                      const finalResponse: PerplexityQAResponse = {
                        question: questionText,
                        answer: cleaned,
                        citations: chunk.citations,
                        groundingMetadata: chunk.metadata as any,
                        modelUsed: perplexityInput.modelKey || 'sonar-reasoning-pro',
                        modelKey: perplexityInput.modelKey || 'sonar-reasoning-pro',
                        reasoningEffort: perplexityInput.reasoningEffort,
                        questionContext: perplexityInput.questionContext,
                        processingTime: chunk.responseTime,
                        success: !chunk.error,
                        streaming: true,
                        chunkCount: chunk.chunkIndex,
                        stoppedByUser: false,
                        timestamp: chunk.timestamp,
                        answerLength: cleaned.length,
                        questionLength: questionText.length,
                        citationCount: chunk.citations.length,
                        error: chunk.error,
                      };
                      setPerplexityResponse(finalResponse);
                      // Finalize streaming message in place
                      if (streamingAIMessageIdRef.current) {
                        const msgId = streamingAIMessageIdRef.current;
                        setActiveSessionMessages(prev => prev.map(m => m.id === msgId ? {
                          ...m,
                          content: cleaned || m.content,
                          citations: chunk.citations || m.citations,
                          thinkingProcess: finalServerThinking || m.thinkingProcess || thinkingContent,
                          thinkingDuration: (m.thinkingDuration && m.thinkingDuration > 0)
                            ? m.thinkingDuration
                            : Math.round(chunk.responseTime / 1000),
                          isStreaming: false,
                        } : m));
                        streamingAIMessageIdRef.current = null;
                      } else if (cleaned && cleaned.trim().length > 0) {
                        // Final chunk delivered full answer but no streaming message was created yet (e.g., think-only chunks earlier)
                        const finalMsgId = `ai-${Date.now()}`;
                        const measuredSec = (questionSubmittedAtRef.current != null && responseStartedAtRef.current != null)
                          ? Math.max(0, Math.round((responseStartedAtRef.current - questionSubmittedAtRef.current) / 1000))
                          : Math.round(chunk.responseTime / 1000);
                        setActiveSessionMessages(prev => [
                          ...prev,
                          {
                            id: finalMsgId,
                            role: 'ai',
                            content: cleaned,
                            timestamp: new Date(),
                            citations: chunk.citations || [],
                            thinkingProcess: finalServerThinking || thinkingContent,
                            thinkingDuration: measuredSec,
                            isStreaming: false,
                          },
                        ]);
                      }

                      setAiInteractionState('answered');
                      break;
                    }
                  } catch (parseError) {
                    console.error('Failed to parse SSE message:', data, parseError);
                  }
                }
              }
            }
            } catch (innerStreamError: any) {
              // Clean up watchdog on inner stream error
              isStreamActive = false;
              if (watchdogInterval) {
                clearInterval(watchdogInterval);
                watchdogInterval = null;
              }
              throw innerStreamError;
            }
          } catch (streamingError: any) {
            // Handle abort specifically (user-initiated stop) - Fix Issue #3
            if (streamingError.name === 'AbortError') {
              console.log('[QA Module] Stream aborted by user');
              return; // Don't show error toast for user-initiated abort
            }

            // Ensure watchdog is always cleared
            if (watchdogInterval) {
              clearInterval(watchdogInterval);
              watchdogInterval = null;
            }

            console.error('[QA Module] Streaming QA error:', streamingError);

            // Update thinking status to error
            setThinkingStatus('error');
            setThinkingContent(`錯誤: ${streamingError?.message || 'Unknown error'}`);

            // Classify error using error handler
            const classifiedError = classifyError(streamingError, {
              modelKey: perplexityModel,
              reasoningEffort: reasoningEffort,
              questionLength: questionText.length,
            });
            const formattedError = formatErrorForUser(classifiedError);

            // Set error state
            setPerplexityResponse({
              question: questionText,
              answer: `${formattedError.message}\n\n建議:\n${formattedError.suggestions.join('\n')}`,
              citations: [],
              groundingMetadata: { searchQueries: [], webSources: [], groundingSuccessful: false },
              modelUsed: perplexityModel,
              modelKey: perplexityModel,
              reasoningEffort: reasoningEffort,
              questionContext: 'general',
              processingTime: 0,
              success: false,
              streaming: true,
              stoppedByUser: false,
              timestamp: new Date().toISOString(),
              answerLength: 0,
              questionLength: questionText.length,
              citationCount: 0,
              error: classifiedError.technicalMessage,
            });

            // Add error message to conversation
            const errorMessage: ConversationMessage = {
              id: `ai-error-${Date.now()}`,
              role: 'ai' as MessageRole,
              content: `${formattedError.message}\n\n建議:\n${formattedError.suggestions.join('\n')}`,
              timestamp: new Date(),
              citations: [],
            };
            setActiveSessionMessages(prev => [...prev, errorMessage]);

            setAiInteractionState('answered');

            // Reset loading state to allow user to retry
            setIsLoadingExplanation(false);
          }
        }
        // Fix #7 - Removed non-streaming fallback (streaming always enabled)
      } else {
        // Use Perplexity approach for all AI analysis
        const perplexityInput = await createPerplexityQAInputForFlow(
          userQuestionInput,
          selectedTextInfo,
          chapterContextSnippet,
          currentChapter.titleKey,
          {
            modelKey: perplexityModel,
            reasoningEffort: reasoningEffort,
            enableStreaming: false, // Non-streaming for fallback mode
            showThinkingProcess: false,
            questionContext: 'general',
          }
        );

        const result = await perplexityRedChamberQA(perplexityInput);
        if (result.success) {
          setAiAnalysisContent(result.answer);
        } else {
          setAiAnalysisContent(`處理問題時發生錯誤：${result.error}`);
        }
        setAiInteractionState('answered');
      }
    } catch (error) {
      console.error("Error in AI question handling:", error);
      const errorMessage = error instanceof Error ? error.message : t('readBook.errorAIExplain');
      
      if (usePerplexityAI) {
        setPerplexityResponse({
          question: questionText,
          answer: `處理問題時發生錯誤：${errorMessage}`,
          citations: [],
          groundingMetadata: {
            searchQueries: [],
            webSources: [],
            groundingSuccessful: false,
          },
          modelUsed: perplexityModel,
          modelKey: perplexityModel,
          processingTime: 0,
          success: false,
          streaming: false,
          stoppedByUser: false,
          timestamp: new Date().toISOString(),
          answerLength: 0,
          questionLength: questionText.length,
          citationCount: 0,
          error: errorMessage,
        });
      } else {
        setAiAnalysisContent(errorMessage);
      }
      setAiInteractionState('error');
    }
    setIsLoadingExplanation(false);
  };

  const getColumnClass = () => {
    switch (columnLayout) {
      case 'single': return 'columns-1';
      case 'double': return 'columns-2'; // Two-column layout for horizontal reading; mobile protection via !isMobile check (line 832)
      default: return 'columns-1';
    }
  };

  const handleSelectChapterFromToc = async (indexOrId: number, isDynamicChapter = false) => {
    if (isDynamicChapter && availableChapters.length > 0) {
      // Use chapter ID directly for dynamic chapters
      setCurrentChapterId(indexOrId);
      await loadChapterContent(indexOrId);
    } else {
      // Fallback to index-based navigation for hardcoded chapters
      setCurrentChapterIndex(indexOrId);
    }
    setIsTocSheetOpen(false);
    setHasScrolledToBottom(false); // Reset scroll tracking for new chapter
    handleInteraction();
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreenActive(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleReadAloudClick = () => {
    toast({
      title: t('buttons.featureComingSoon'),
      description: `${t('buttons.readAloud')} ${t('buttons.featureComingSoon')}`,
    });
    handleInteraction();
  };

  const toolbarButtonBaseClass = "flex flex-col items-center justify-center h-auto p-2";
  const toolbarIconClass = "h-6 w-6";
  const toolbarLabelClass = "mt-1 text-xs leading-none";
  
  const getChapterTitle = (titleKey: string) => {
    if (titleKey.includes('#')) {
      const [baseKey, num] = titleKey.split('#');
      return t(baseKey).replace('{chapterNum}', num);
    }
    return t(titleKey);
  };
  
  const currentChapterTitle = getChapterTitle(currentChapter.titleKey);
  const currentChapterSubtitle = currentChapter.subtitleKey ? getChapterTitle(currentChapter.subtitleKey) : undefined;

  const { user, userProfile, refreshUserProfile } = useAuth();
  const [userNotes, setUserNotes] = useState<Note[]>([]);

  // Phase 3-T1: Track welcome bonus attempt to prevent repeated API calls in same session
  const welcomeBonusAttemptedRef = useRef(false);

  useEffect(() => {
    if (user?.id && currentChapter) {
      fetchNotes(user.id, currentChapter.id).then(setUserNotes);
    } else {
      setUserNotes([]);
    }
  }, [user?.id, currentChapter]);

  // One-time welcome bonus for new users entering reading page
  useEffect(() => {
    if (!user?.id || !userProfile) return;

    // Phase 3-T1: Check if we've already attempted welcome bonus in this session
    if (welcomeBonusAttemptedRef.current) {
      return; // Already attempted in this session, skip to prevent polling
    }

    // Check if user has already received welcome bonus
    if (userProfile.hasReceivedWelcomeBonus) {
      welcomeBonusAttemptedRef.current = true; // Mark as checked
      return; // User already received bonus, skip
    }

    const awardWelcomeBonus = async () => {
      // Phase 3-T1: Mark as attempted immediately to prevent retry loops
      welcomeBonusAttemptedRef.current = true;

      try {
        console.log('[Welcome Bonus] Attempting to award welcome bonus');
        const result = await awardXP(
          user.id,
          XP_REWARDS.NEW_USER_WELCOME_BONUS,
          'Welcome to reading! First-time reader bonus',
          'reading',
          `welcome-bonus-${user.id}` // Unique ID per user to prevent duplicates
        );

        console.log('[Welcome Bonus] XP award result:', {
          success: result.success,
          isDuplicate: result.isDuplicate
        });

          // SQLITE-025: Firebase removed - TODO: Use user-repository to update hasReceivedWelcomeBonus
          //         // Update hasReceivedWelcomeBonus flag in user profile
          //           // SQLITE-025: Firebase removed - TODO: Use user-repository to update hasReceivedWelcomeBonus
          //           //         if (result.success && !result.isDuplicate) {
          //           // SQLITE-025: Firebase removed - TODO: Use user-repository to update hasReceivedWelcomeBonus
          //           //           const userRef = doc(db, 'users', user.id);
          //           // SQLITE-025: Firebase removed - TODO: Use user-repository to update hasReceivedWelcomeBonus
          //           await updateDoc(userRef, {
          // SQLITE-025: Firebase removed - TODO: Use user-repository to update hasReceivedWelcomeBonus
          //             hasReceivedWelcomeBonus: true,
          // SQLITE-025: Firebase removed - TODO: Use user-repository to update hasReceivedWelcomeBonus
          //           });
          // SQLITE-025: Firebase removed - TODO: Use user-repository to update hasReceivedWelcomeBonus
          //         }

        await refreshUserProfile();

        // Show level-up modal if leveled up
        if (result.leveledUp) {
          setLevelUpData({
            show: true,
            fromLevel: result.fromLevel!,
            toLevel: result.newLevel,
          });
        }
      } catch (error) {
        console.error('[Welcome Bonus] Error awarding welcome bonus:', error);
        // Phase 3-T1: Don't retry on error - ref already marked as attempted
      }
    };

    // Award welcome bonus immediately
    awardWelcomeBonus();
  }, [user?.id, userProfile, refreshUserProfile]);

  // Reading time tracking - award 3 XP every 15 minutes
  useEffect(() => {
    if (!user?.id || !userProfile) return;

    // Award reading time XP function
    const awardReadingTimeXP = async () => {
      try {
        // Generate timestamp-based sourceId to prevent duplicate awards
        const timestamp = Date.now();
        const sourceId = `reading-time-${user.id}-${timestamp}`;

        const result = await awardXP(
          user.id,
          XP_REWARDS.READING_TIME_15MIN,
          'Reading for 15 minutes',
          'reading',
          sourceId
        );

        // Show toast notification if XP was awarded
        if (result.success && !result.isDuplicate) {
          toast({
            title: t('xpAwarded'),
            description: `+${XP_REWARDS.READING_TIME_15MIN} XP`,
            variant: 'default',
          });

          // Refresh user profile to update XP display
          await refreshUserProfile();

          // Show level-up modal if leveled up
          if (result.leveledUp) {
            setLevelUpData({
              show: true,
              fromLevel: result.fromLevel!,
              toLevel: result.newLevel,
            });
          }
        }
      } catch (error) {
        console.error('Error awarding reading time XP:', error);
      }
    };

    // Set interval to award XP every 15 minutes (900000ms)
    const intervalId = setInterval(awardReadingTimeXP, 15 * 60 * 1000);

    // Cleanup on unmount or when dependencies change
    return () => {
      clearInterval(intervalId);
    };
  }, [user?.id, userProfile, refreshUserProfile, t, toast]);

  // Reading time persistence - save accumulated reading time to database
  useEffect(() => {
    if (!user?.id) return;

    let accumulatedMinutes = 0;
    const SAVE_INTERVAL_MS = 5 * 60 * 1000; // Save every 5 minutes
    const MINUTE_MS = 60 * 1000;

    // Track reading time every minute
    const minuteTracker = setInterval(() => {
      accumulatedMinutes += 1;
    }, MINUTE_MS);

    // Save accumulated time to database periodically
    const saveReadingTime = async () => {
      if (accumulatedMinutes > 0) {
        try {
          const response = await fetch('/api/user/reading-time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ minutes: accumulatedMinutes }),
          });
          if (response.ok) {
            console.log(`📖 Saved ${accumulatedMinutes} minutes of reading time`);
            accumulatedMinutes = 0; // Reset after successful save
          }
        } catch (error) {
          console.error('Failed to save reading time:', error);
        }
      }
    };

    const saveInterval = setInterval(saveReadingTime, SAVE_INTERVAL_MS);

    // Save on page unload/visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveReadingTime();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup: save remaining time and clear intervals
    return () => {
      clearInterval(minuteTracker);
      clearInterval(saveInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Final save on unmount
      if (accumulatedMinutes > 0) {
        fetch('/api/user/reading-time', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ minutes: accumulatedMinutes }),
          keepalive: true, // Ensure request completes even if page is closing
        }).catch(() => {}); // Ignore errors on unmount
      }
    };
  }, [user?.id]);

  // Sync completedChapters from userProfile to local state
  // This ensures we don't show achievement notifications for already-completed chapters
  useEffect(() => {
    if (userProfile?.completedChapters) {
      setCompletedChapters(new Set(userProfile.completedChapters));
    }
  }, [userProfile]);

  // Chapter completion tracking - award XP when navigating to new chapter
  useEffect(() => {
    if (!user?.id || !currentChapter) {
      // Clear timer if user logs out or chapter disappears
      if (chapterTimerRef.current) {
        clearTimeout(chapterTimerRef.current);
        chapterTimerRef.current = null;
      }
      return;
    }

    // Clear any existing timer first
    if (chapterTimerRef.current) {
      clearTimeout(chapterTimerRef.current);
      chapterTimerRef.current = null;
    }

    // Check if chapter already completed (from persistent data or local state)
    const isAlreadyCompleted =
      userProfile?.completedChapters?.includes(currentChapter.id) ||
      completedChapters.has(currentChapter.id);

    if (isAlreadyCompleted) {
      return; // Already completed, no need to set timer
    }

    // Check if user has scrolled to bottom - required before awarding chapter completion
    if (!hasScrolledToBottom) {
      console.log(`⏳ Chapter ${currentChapter.id}: Waiting for user to scroll to bottom before awarding completion XP`);
      return; // Not scrolled to bottom yet, don't start timer
    }

    // Award XP function
    const awardChapterXP = async () => {
      try {
        // Double-check user and chapter still exist
        if (!user?.id || !currentChapter) return;

        // Check again if already completed (from persistent data or local state)
        // This handles cases where state changed during the 5-second timer
        const alreadyCompleted =
          userProfile?.completedChapters?.includes(currentChapter.id) ||
          completedChapters.has(currentChapter.id);

        if (alreadyCompleted) {
          console.log(`⚠️ Chapter ${currentChapter.id} already completed, skipping XP award`);
          return;
        }

        // Determine if this is the first chapter
        const isFirstChapter = currentChapter.id === 1;
        const xpAmount = isFirstChapter ? XP_REWARDS.FIRST_CHAPTER_COMPLETED : XP_REWARDS.CHAPTER_COMPLETED;

          const result = await awardXP(
            user.id,
            xpAmount,
            `Completed chapter ${currentChapter.id}`,
          'reading',
            `chapter-${currentChapter.id}`
          );

        // Skip notifications if this is a duplicate reward
        if (result.isDuplicate) {
          // Silently log instead of showing toast - prevents repeated notifications that annoy users
          console.log(`⚠️ Skipping duplicate chapter XP notification for chapter ${currentChapter.id}`);
          return;
        }

        await refreshUserProfile();

        // Show XP reward toast
        toast({
          title: `+${xpAmount} XP`,
          description: isFirstChapter
            ? `完成第一章！獲得 ${xpAmount} XP`
            : `完成第${currentChapter.id}章！獲得 ${xpAmount} XP`,
          duration: 3000,
        });

        // Mark chapter as completed
        setCompletedChapters(prev => new Set([...prev, currentChapter.id]));

        // Show level-up modal if leveled up
        if (result.leveledUp) {
          setLevelUpData({
            show: true,
            fromLevel: result.fromLevel!,
            toLevel: result.newLevel,
          });
        }
      } catch (error) {
        console.error('Error awarding chapter completion XP:', error);
      } finally {
        // Clear ref after award completes
        chapterTimerRef.current = null;
      }
    };

    // Set timer: Award XP after user has scrolled to bottom AND stayed for 2 seconds
    // Reduced from 5s to 2s since user already demonstrated intent by scrolling to bottom
    chapterTimerRef.current = setTimeout(awardChapterXP, 2000);

    // Cleanup function
    return () => {
      if (chapterTimerRef.current) {
        clearTimeout(chapterTimerRef.current);
        chapterTimerRef.current = null;
      }
    };
  }, [user?.id, currentChapter, completedChapters, hasScrolledToBottom, refreshUserProfile, toast, userProfile?.completedChapters]);

  const handleSaveNote = async () => {
    if (!user?.id || (!noteSelectedText && !toolbarInfo?.text && !selectedTextInfo?.text)) return;

    try {
      const selectedTextContent = noteSelectedText || toolbarInfo?.text || selectedTextInfo?.text || '';

      if (currentNoteObj?.id) {
        // Update existing note - no XP for updates
        await updateNoteAPI(currentNoteObj.id, currentNote);

        // Update visibility if changed
        const previousPublicStatus = currentNoteObj.isPublic || false;
        if (isNotePublic !== previousPublicStatus) {
          await updateNoteVisibilityAPI(currentNoteObj.id, isNotePublic);

          // If changed from private to public, share to community
          if (isNotePublic && !previousPublicStatus) {
            // Task 4.9/4.10 Debug Logging
            console.log(`🔄 [NoteSync] Visibility changed from private to public for note:`, {
              noteId: currentNoteObj.id,
              chapterId: currentChapter.id,
              contentLength: currentNote.length
            });
            try {
              const chapterTitle = getChapterTitle(currentChapter.titleKey);
              const postContent = `我的閱讀筆記

${currentNote}

---
${selectedTextContent}

來源：《紅樓夢》第${currentChapter.id}回《${chapterTitle}》`;

              const postData: CreatePostData = {
                authorId: user.id,
                authorName: user.name || '匿名讀者',
                content: postContent,
                tags: [`第${currentChapter.id}回`, '筆記分享', chapterTitle],
                category: 'discussion',
                sourceNoteId: currentNoteObj.id  // Task 4.9/4.10: Link note to post
              };

              await shareToCommunity(postData);
              console.log(`✅ [NoteSync] Updated note shared to community (linked to note ${currentNoteObj.id})`);
            } catch (communityError) {
              console.error('Error sharing updated note to community:', communityError);
            }
          }
        }

        toast({ title: t('筆記更新'), description: t('buttons.noteUpdated') });
      } else {
        // Create new note
        const noteToSave: Omit<Note, 'id' | 'createdAt'> = {
          userId: user.id,
          chapterId: currentChapter.id, // Use number, not string
          selectedText: selectedTextContent,
          note: currentNote,
          isPublic: isNotePublic,
        };
        const noteId = await saveNoteAPI(noteToSave);
        // Task 4.9/4.10 Debug Logging
        console.log(`📝 [NoteSync] Note saved with ID: ${noteId}`, {
          contentLength: currentNote.length,
          isPublic: isNotePublic,
          chapterId: currentChapter.id
        });

        // If note is public, share it to community
        if (isNotePublic) {
          console.log(`📝 [NoteSync] New public note created, sharing to community...`, {
            noteId,
            chapterId: currentChapter.id
          });
          try {
            const chapterTitle = getChapterTitle(currentChapter.titleKey);
            // Format community post with simplified format to avoid content filter
            const postContent = `我的閱讀筆記

${currentNote}

---
${selectedTextContent}

來源：《紅樓夢》第${currentChapter.id}回《${chapterTitle}》`;

            const postData: CreatePostData = {
              authorId: user.id,
              authorName: user.name || '匿名讀者',
              content: postContent,
              tags: [`第${currentChapter.id}回`, '筆記分享', chapterTitle],
              category: 'discussion',
              sourceNoteId: noteId  // Task 4.9/4.10: Link note to post
            };

            await shareToCommunity(postData);
            console.log(`✅ [NoteSync] Public note shared to community (linked to note ${noteId})`);
          } catch (communityError) {
            console.error('Error sharing note to community:', communityError);
            // Don't fail note save if community post fails
          }
        }

        // Award XP for creating note
        try {
          const isQualityNote = currentNote.length > 100;
          const xpAmount = isQualityNote ? XP_REWARDS.NOTE_QUALITY_BONUS : XP_REWARDS.NOTE_CREATED;
          console.log(`💎 Attempting to award XP: ${xpAmount} (isQualityNote: ${isQualityNote})`);

          // Generate unique sourceId based on content (selected text + chapter)
          // This prevents duplicate XP for saving the same content multiple times
          const simpleHash = (str: string) => {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
              const char = str.charCodeAt(i);
              hash = ((hash << 5) - hash) + char;
              hash = hash & hash; // Convert to 32bit integer
            }
            return Math.abs(hash).toString(36);
          };
          const contentHash = simpleHash(noteSelectedText || toolbarInfo?.text || selectedTextInfo?.text || '');
          const sourceId = `note-ch${currentChapter.id}-${contentHash}`;

          const result = await awardXP(
            user.id,
            xpAmount,
            isQualityNote ? 'Created quality note' : 'Created note',
            'note',
            sourceId
          );

          // Check if this is a duplicate reward
          if (result.isDuplicate) {
            console.log(`⚠️ Duplicate note reward prevented, showing note saved without XP`);
            toast({
              title: t('筆記儲存'),
              description: t('buttons.noteSaved') + ' (相同內容已獲得過 XP 獎勵)',
              variant: 'default',
            });
          } else {
            console.log(`✅ New note created with XP reward: +${xpAmount} XP${isQualityNote ? ' (quality)' : ''}`);
            // New note with XP reward
            await refreshUserProfile();

            // Show level-up modal if leveled up
            if (result.leveledUp) {
              setLevelUpData({
                show: true,
                fromLevel: result.fromLevel!,
                toLevel: result.newLevel,
              });
            }

            toast({
              title: t('筆記儲存'),
              description: `+${xpAmount} XP${isQualityNote ? ' (優質筆記)' : ''}`,
              variant: 'default',
            });
          }
        } catch (xpError) {
          console.error('Error awarding note XP:', xpError);
          // Still show success for note save even if XP fails
          toast({ title: t('筆記儲存'), description: t('buttons.noteSaved') });
        }
      }

      // Refresh notes, close panel, and clear state
      await fetchNotesForChapter();
      setIsNoteSheetOpen(false);
      setSelectedTextInfo(null);
      setActiveHighlightInfo(null);
      setNoteSelectedText('');
      setCurrentNote('');
      setCurrentNoteObj(null);
      setIsNotePublic(false);
      setIsViewingNote(false);
    } catch (error) {
      console.error("Failed to save note:", error);
      toast({
        title: t('Error'),
        description: t('errors.failedToSaveNote'),
        variant: "destructive"
      });
    }
  };

  const handleDeleteNote = async () => {
    if (!user?.id || !currentNoteObj?.id) return;

    try {
      await deleteNoteAPI(currentNoteObj.id);
      await fetchNotesForChapter(); // Refresh notes from the database

      // Close sheet and reset states
      setIsNoteSheetOpen(false);
      setSelectedTextInfo(null);
      setActiveHighlightInfo(null);
      setNoteSelectedText('');
      setCurrentNote('');
      setCurrentNoteObj(null);
      setIsNotePublic(false);
      setIsViewingNote(false);
      toast({ title: t('筆記刪除'), description: t('buttons.noteDeleted') });
    } catch (error) {
      console.error("Failed to delete note:", error);
      toast({
        title: t('Error'),
        description: t('errors.failedToDeleteNote'),
        variant: "destructive"
      });
    }
  };

  const handleHighlight = () => {
    if (toolbarInfo?.text && !highlights.includes(toolbarInfo.text)) {
      setHighlights(prev => [...prev, toolbarInfo.text]);
      setSelectedTextInfo(null);
      setActiveHighlightInfo(null);
      toast({ title: "畫線", description: "文字已畫線" });
    }
  };

  const handleDeleteHighlight = () => {
    if (activeHighlightInfo?.text) {
      setHighlights(prev => prev.filter(h => h !== activeHighlightInfo.text));
      setActiveHighlightInfo(null);
      toast({ title: "刪除畫線", description: "畫線已移除" });
    }
  };

  const underlineText = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    userNotes.forEach((note, index) => {
      const noteText = note.selectedText;
      let startIndex = text.indexOf(noteText, lastIndex);
      
      while (startIndex !== -1) {
        // Add preceding text
        parts.push(text.substring(lastIndex, startIndex));
        
        // Add underlined text with click handler to view/edit note
        parts.push(
          <u
            key={`${index}-${startIndex}`}
            className={cn(
              // Keep consistent underline styling and interaction affordance
              "decoration-red-500 decoration-2 underline-offset-2 cursor-pointer transition-colors relative z-10",
              // Ensure sufficient contrast on hover for both light and night themes
              activeThemeKey === 'night'
                ? "hover:bg-red-900/30 hover:text-neutral-100"
                : "hover:bg-red-100 hover:text-neutral-900"
            )}
            onClick={(e) => {
              e.stopPropagation();
              // Load the existing note into the editor
              setNoteSelectedText(note.selectedText);
              setCurrentNote(note.note);
              setCurrentNoteObj(note);
              setIsNotePublic(note.isPublic || false);
              setIsViewingNote(true); // Open in viewing mode for existing notes
              setIsNoteSheetOpen(true);
              // Clear any active selections
              setSelectedTextInfo(null);
              setActiveHighlightInfo(null);
              handleInteraction();
            }}
            title="Click to view/edit note"
            data-no-selection="true"
          >
            {noteText}
          </u>
        );
        
        lastIndex = startIndex + noteText.length;
        startIndex = text.indexOf(noteText, lastIndex);
      }
    });

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  const applyHighlights = (nodes: React.ReactNode[]): React.ReactNode[] => {
    if (!highlights.length) return nodes;

    let currentNodes = nodes;

    highlights.forEach(highlight => {
      const newNodes: React.ReactNode[] = [];
      currentNodes.forEach(node => {
        if (typeof node === 'string') {
          if (!node.includes(highlight)) {
            newNodes.push(node);
            return;
          }
          const parts = node.split(highlight);
          parts.forEach((part, index) => {
            if (part) newNodes.push(part);
            if (index < parts.length - 1) {
              const handleHighlightClick = (event: React.MouseEvent<HTMLElement>) => {
                event.stopPropagation();
                const rect = event.currentTarget.getBoundingClientRect();
      const scrollAreaElement =
        (document.getElementById('chapter-content-viewport') as HTMLElement | null) ||
        (document.getElementById('chapter-content-scroll-area') as HTMLElement | null);
                const scrollTop = scrollAreaElement?.scrollTop || 0;
                const scrollLeft = scrollAreaElement?.scrollLeft || 0;
                const top = rect.top + scrollTop;
                const left = rect.left + scrollLeft + (rect.width / 2);
                
                setActiveHighlightInfo({ text: highlight, position: { top, left } });
                setSelectedTextInfo(null); // Ensure selection toolbar is hidden
              };

              newNodes.push(
                <mark 
                  key={`${highlight}-${index}`} 
                  className="bg-yellow-300/70 text-black px-0.5 rounded-sm cursor-pointer"
                  onClick={handleHighlightClick}
                  data-highlight="true"
                >
                  {highlight}
                </mark>
              );
            }
          });
        } else {
          newNodes.push(node);
        }
      });
      currentNodes = newNodes;
    });

    return currentNodes;
  };

  // Use state-managed currentNoteObj set when opening the note sheet
  const isTextSelected = !!selectedTextInfo?.text && !!selectedTextInfo.position;
  const isHighlightClicked = !!activeHighlightInfo?.text && !!activeHighlightInfo.position;
  
  const toolbarInfo = isTextSelected 
    ? { ...selectedTextInfo, type: 'selection' } 
    : isHighlightClicked 
    ? { ...activeHighlightInfo, type: 'highlight' } 
    : null;

  const fetchNotesForChapter = useCallback(async () => {
    if (user?.id && currentChapter) {
      const notes = await fetchNotes(user.id, currentChapter.id);
      setUserNotes(notes);
    }
  }, [user, currentChapter]);

  useEffect(() => {
    fetchNotesForChapter();
  }, [fetchNotesForChapter]);

  const processContent = (chapter: Chapter) => {
    let contentNodes: React.ReactNode[] = chapter.paragraphs.flatMap((p, i) => {
      const paragraphContent = p.content
        .map(item => (typeof item === 'string' ? item : item.text))
        .join('');

      // 1) Preserve underline markers (user note selections)
      let nodes = underlineText(paragraphContent);

      // 2) Apply search highlight within each paragraph without flattening the structure
      if (currentSearchTerm && currentSearchTerm.trim()) {
        const highlightNodes = (arr: React.ReactNode[]): React.ReactNode[] =>
          arr.flatMap(n => (typeof n === 'string' ? highlightText(n, currentSearchTerm) : [n]));
        nodes = highlightNodes(nodes);
      }

      return [
        <div key={`p-${i}`} className="mb-4 break-inside-avoid">
          {nodes}
        </div>,
      ];
    });

    // 3) Apply user-defined highlights for remaining plain-text nodes.
    //    Underlines and search highlights are already handled per paragraph above.
    contentNodes = applyHighlights(contentNodes);

    return contentNodes;
  };

  const activeSessionMessages = getActiveSession()?.messages || [];
  const hasStreamingAiMessage = activeSessionMessages.some(
    (message) => message.role === 'ai' && message.isStreaming
  );

  // Show loading state when fetching chapter content
  if (isLoadingChapter && !currentChapter) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-lg text-muted-foreground">{t('readBook.loadingChapter') || '載入章節中...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div
        ref={toolbarRef}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 backdrop-blur-md shadow-lg p-2 transition-all duration-300 ease-in-out",
          isToolbarVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full",
          selectedTheme.toolbarBgClass
        )}
        data-no-selection="true"
        onClick={(e) => { e.stopPropagation(); handleInteraction(); }}
      >
        <div className={cn("container mx-auto flex items-center justify-between max-w-screen-xl")}>
          {/* Left Section - Return button always visible, others hidden on mobile */}
          <div className="flex items-center gap-2 md:gap-3">
            <Button variant="ghost" className={cn(toolbarButtonBaseClass, selectedTheme.toolbarTextClass)} onClick={() => router.push('/dashboard')} title={t('buttons.return')}>
              <CornerUpLeft className={toolbarIconClass} />
              <span className={cn(toolbarLabelClass, "hidden md:block")}>{t('buttons.return')}</span>
            </Button>

            {/* Desktop only: Settings and Column Layout */}
            <div className="hidden md:flex items-center gap-2 md:gap-3">
              <Popover open={isSettingsPopoverOpen} onOpenChange={(isOpen) => {setIsSettingsPopoverOpen(isOpen); handleInteraction();}}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className={cn(toolbarButtonBaseClass, selectedTheme.toolbarTextClass)} title={t('buttons.settings')}>
                     <i className={cn("fa fa-font", toolbarIconClass)} aria-hidden="true" style={{fontSize: '24px'}}></i>
                    <span className={toolbarLabelClass}>{t('buttons.settings')}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-80 bg-card text-card-foreground p-4 space-y-6"
                  data-no-selection="true"
                  onClick={(e) => e.stopPropagation()}
                  onInteractOutside={() => {setIsSettingsPopoverOpen(false); handleInteraction();}}
                  side="bottom"
                  align="start"
                >
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground">{t('labels.theme')}</h4>
                    <div className="flex justify-around items-center">
                      {Object.values(themes).map((theme) => (
                        <div key={theme.key} className="flex flex-col items-center gap-1.5">
                          <button
                            onClick={() => {setActiveThemeKey(theme.key as keyof typeof themes); setIsSettingsPopoverOpen(false);}}
                            className={cn(
                              "h-8 w-8 rounded-full border-2 flex items-center justify-center",
                              theme.swatchClass,
                              activeThemeKey === theme.key ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : 'border-transparent'
                            )}
                            title={t(theme.nameKey)}
                            aria-label={t(theme.nameKey)}
                          >
                             {activeThemeKey === theme.key && theme.key === 'white' && <Check className="h-4 w-4 text-neutral-600"/>}
                             {activeThemeKey === theme.key && theme.key !== 'white' && <Check className="h-4 w-4 text-white"/>}
                          </button>
                          <span className="text-xs text-muted-foreground">{t(theme.nameKey)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-foreground">{t('labels.text')}</h4>
                    <div className="flex items-center justify-between gap-3">
                      <Button variant="outline" size="icon" onClick={() => changeFontSize(-FONT_SIZE_STEP)} className="h-10 w-10 rounded-full p-0">
                        <Minus className="h-5 w-5" />
                        <span className="sr-only">Decrease font size</span>
                      </Button>
                      <div className="text-center">
                        <div className="text-2xl font-semibold text-primary">{currentNumericFontSize}</div>
                        <div className="text-xs text-muted-foreground">{t('labels.currentFontSize')}</div>
                      </div>
                      <Button variant="outline" size="icon" onClick={() => changeFontSize(FONT_SIZE_STEP)} className="h-10 w-10 rounded-full p-0">
                        <Plus className="h-5 w-5" />
                        <span className="sr-only">Increase font size</span>
                      </Button>
                    </div>
                    <div className="mt-2 p-2 bg-muted/50 rounded-md text-xs text-muted-foreground text-center">
                      {t('labels.fontHint')}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {Object.values(fontFamilies).map((font) => (
                        <Button
                          key={font.key}
                          variant={activeFontFamilyKey === font.key ? "default" : "outline"}
                          onClick={() => {setActiveFontFamilyKey(font.key as keyof typeof fontFamilies); setIsSettingsPopoverOpen(false);}}
                          className={cn("w-full h-10 text-sm justify-center", activeFontFamilyKey === font.key ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background/70 hover:bg-accent/50")}
                        >
                          {t(font.nameKey)}
                        </Button>
                      ))}
                    </div>
                  </div>
                   <PopoverClose className="absolute top-1 right-1 rounded-full p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                      <X className="h-4 w-4" />
                   </PopoverClose>
                </PopoverContent>
              </Popover>

              <div className={cn("h-10 border-l mx-2 md:mx-3", selectedTheme.toolbarBorderClass)}></div>
              <Button
                variant={columnLayout === 'single' ? 'secondary' : 'ghost'}
                className={cn(toolbarButtonBaseClass, columnLayout === 'single' ? '' : selectedTheme.toolbarTextClass )}
                onClick={() => setColumnLayout('single')}
                title={t('buttons.singleColumn')}
              >
                <AlignLeft className={cn(toolbarIconClass, columnLayout === 'single' ? 'text-secondary-foreground' : selectedTheme.toolbarTextClass)}/>
                <span className={cn(toolbarLabelClass, columnLayout === 'single' ? 'text-secondary-foreground' : selectedTheme.toolbarTextClass)}>{t('buttons.singleColumn')}</span>
              </Button>
              <Button
                variant={columnLayout === 'double' ? 'secondary' : 'ghost'}
                 className={cn(toolbarButtonBaseClass, columnLayout === 'double' ? '' : selectedTheme.toolbarTextClass)}
                onClick={() => setColumnLayout('double')}
                title={t('buttons.doubleColumn')}
              >
                <AlignCenter className={cn(toolbarIconClass, columnLayout === 'double' ? 'text-secondary-foreground' : selectedTheme.toolbarTextClass)}/>
                <span className={cn(toolbarLabelClass, columnLayout === 'double' ? 'text-secondary-foreground' : selectedTheme.toolbarTextClass)}>{t('buttons.doubleColumn')}</span>
              </Button>
            </div>
          </div>

          {/* Center Section - Chapter Title (simplified on mobile) */}
          <div className="flex-1 text-center overflow-hidden px-2 mx-2 md:mx-4 min-w-0">
            <h1 className={cn("text-sm md:text-lg font-semibold truncate", selectedTheme.toolbarAccentTextClass)} title={currentChapterTitle}>{currentChapterTitle}</h1>
            {currentChapterSubtitle && <p className={cn("text-sm truncate hidden md:block", selectedTheme.toolbarTextClass)} title={currentChapterSubtitle}>{currentChapterSubtitle}</p>}
          </div>

          {/* Right Section - AI always visible, others hidden on mobile, menu trigger on mobile */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Desktop only buttons */}
            <div className="hidden md:flex items-center gap-2 md:gap-3">
              <Button variant="ghost" className={cn(toolbarButtonBaseClass, selectedTheme.toolbarTextClass)} onClick={() => { setIsKnowledgeGraphSheetOpen(true); handleInteraction(); }} title={t('buttons.knowledgeGraph')}>
                <MapIcon className={toolbarIconClass}/>
                <span className={toolbarLabelClass}>{t('buttons.knowledgeGraph')}</span>
              </Button>
              <Button variant="ghost" className={cn(toolbarButtonBaseClass, selectedTheme.toolbarTextClass)} onClick={() => { setIsTocSheetOpen(true); handleInteraction(); }} title={t('buttons.toc')}>
                <List className={toolbarIconClass}/>
                <span className={toolbarLabelClass}>{t('buttons.toc')}</span>
              </Button>
            </div>

            {/* AI button - always visible */}
            <Button variant="ghost" className={cn(toolbarButtonBaseClass, selectedTheme.toolbarTextClass)} onClick={() => {
              const activeSession = getActiveSession();
              const hasHistory = activeSession && activeSession.messages.length > 0;
              console.log('[QA Module] AI button clicked - activeSession:', !!activeSession, ', hasHistory:', hasHistory, ', setting aiMode to:', hasHistory ? 'perplexity-qa' : 'new-conversation');
              setAiMode(hasHistory ? 'perplexity-qa' : 'new-conversation');
              setIsAiSheetOpen(true);
              handleInteraction();
            }} title={t('buttons.ai')}>
              <Lightbulb className={toolbarIconClass}/>
              <span className={cn(toolbarLabelClass, "hidden md:block")}>{t('buttons.ai')}</span>
            </Button>

            {/* Desktop only: Search, Fullscreen, Level Badge */}
            <div className="hidden md:flex items-center gap-2 md:gap-3">
              <div className={cn("h-10 border-l mx-2 md:mx-3", selectedTheme.toolbarBorderClass)}></div>

              <Popover open={isSearchPopoverOpen} onOpenChange={(isOpen) => { setIsSearchPopoverOpen(isOpen); handleInteraction(); if (!isOpen) setCurrentSearchTerm(""); }}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className={cn(toolbarButtonBaseClass, selectedTheme.toolbarTextClass)} title={t('buttons.search')}>
                    <SearchIcon className={toolbarIconClass} />
                    <span className={toolbarLabelClass}>{t('buttons.search')}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="end"
                  className="w-72 p-2 bg-card border-border shadow-xl"
                  data-no-selection="true"
                  onClick={(e) => e.stopPropagation()}
                  onInteractOutside={() => {setIsSearchPopoverOpen(false); handleInteraction(); if (!currentSearchTerm) setCurrentSearchTerm("");}}
                >
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder={t('placeholders.searchInBook')}
                      value={currentSearchTerm}
                      onChange={(e) => setCurrentSearchTerm(e.target.value)}
                      className="h-9 text-sm bg-background/80 focus:ring-primary"
                    />
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => setCurrentSearchTerm("")} title={t('buttons.clearSearch')}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                   <PopoverClose className="absolute top-1 right-1 rounded-full p-1 text-muted-foreground hover:text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
                      <X className="h-4 w-4" />
                   </PopoverClose>
                </PopoverContent>
              </Popover>

              <Button variant="ghost" className={cn(toolbarButtonBaseClass, selectedTheme.toolbarTextClass)} title={isFullscreenActive ? t('buttons.exitFullscreen') : t('buttons.fullscreen')} onClick={toggleFullscreen}>
                {isFullscreenActive ? <Minimize className={toolbarIconClass} /> : <Maximize className={toolbarIconClass} />}
                <span className={toolbarLabelClass}>{isFullscreenActive ? t('buttons.exitFullscreen') : t('buttons.fullscreen')}</span>
              </Button>

              {/* Level Badge XP Indicator */}
              {userProfile && (
                <>
                  <div className={cn("h-10 border-l mx-2 md:mx-3", selectedTheme.toolbarBorderClass)}></div>
                  <LevelBadge variant="compact" showTitle={false} className="cursor-pointer hover:scale-105 transition-transform" />
                </>
              )}
            </div>

            {/* Mobile menu trigger */}
            <Button
              variant="ghost"
              className={cn(toolbarButtonBaseClass, selectedTheme.toolbarTextClass, "md:hidden")}
              onClick={() => { setIsMobileMenuOpen(true); handleInteraction(); }}
              title={t('buttons.menu')}
              aria-label={t('buttons.menu')}
            >
              <Menu className={toolbarIconClass} />
            </Button>
          </div>
        </div>
      </div>

      {/* Task 4.5 V2: Conditional rendering - Native div for bi-column, ScrollArea for single-column */}
      {/* Radix ScrollArea's internal structure breaks CSS multi-column layout, so we bypass it in pagination mode */}
      {isPaginationMode ? (
        // Bi-column mode: Use native div to bypass Radix ScrollArea limitations
        <div
          id="chapter-content-viewport"
          ref={paginationViewportRef}
          tabIndex={0}
          className={cn(
            "flex-grow px-4 md:px-8",
            selectedTheme.readingBgClass,
          )}
          style={{
            paddingTop: `${dynamicToolbarHeight}px`,
            height: '100vh',
            overflowX: 'scroll',
            overflowY: 'hidden',
            scrollBehavior: 'smooth',
            scrollbarWidth: 'none', // Hide scrollbar (Firefox)
            msOverflowStyle: 'none', // Hide scrollbar (IE/Edge)
            overscrollBehavior: 'contain',
            outline: 'none',
          } as React.CSSProperties}
          onWheel={handlePaginationWheel}
          aria-label="雙欄閱讀模式 - 使用左右方向鍵翻頁"
        >
          <div
            ref={chapterContentRef}
            className={cn(
              "prose prose-sm sm:prose-base lg:prose-lg max-w-none mx-auto select-text",
              selectedFontFamily.class || '',
              selectedTheme.readingTextClass,
              activeThemeKey === 'night' ? 'prose-invert' : ''
            )}
            style={{
              fontSize: `${currentNumericFontSize}px`,
              fontFamily: (selectedFontFamily as any).family || undefined,
              // CSS Multi-column layout for bi-column reading
              height: `calc(100vh - ${dynamicToolbarHeight}px)`,
              width: 'auto',
              columnCount: 2,
              columnGap: '3rem',
              columnFill: 'auto',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            {processContent(currentChapter)}
          </div>
        </div>
      ) : (
        // Single-column mode: Use ScrollArea (preserves original behavior)
        <ScrollArea
          className={cn(
            "flex-grow pb-10 px-4 md:px-8",
            selectedTheme.readingBgClass,
          )}
          style={{ paddingTop: `${dynamicToolbarHeight}px` }}
          id="chapter-content-scroll-area"
          ref={scrollAreaRef as any}
        >
          <div
            ref={chapterContentRef}
            className={cn(
              "prose prose-sm sm:prose-base lg:prose-lg max-w-none mx-auto select-text",
              getColumnClass(),
              selectedFontFamily.class || '',
              selectedTheme.readingTextClass,
              activeThemeKey === 'night' ? 'prose-invert' : ''
            )}
            style={{
              fontSize: `${currentNumericFontSize}px`,
              fontFamily: (selectedFontFamily as any).family || undefined,
            }}
          >
            {processContent(currentChapter)}
          </div>
        </ScrollArea>
      )}

      {/* Task 4.5: Kindle-style Edge Navigation Zones (2025-12-01) */}
      {/* Invisible click/tap zones on left and right edges for intuitive page navigation */}
      {isPaginationMode && (
        <>
          {/* Left edge zone - Previous page */}
          <div
            onClick={() => {
              // Task 4.5 Phase 3: Edge zone click logging (2025-12-01)
              if (DEBUG_PAGINATION) {
                console.log('[Pagination] Left edge zone clicked - going to previous page');
              }
              goPrevPage();
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="fixed left-0 z-30 cursor-w-resize group"
            style={{
              top: `${dynamicToolbarHeight}px`,
              width: '8%', // Task 4.5 Phase 2: Reduced from 15% to minimize text selection interference
              height: `calc(100vh - ${dynamicToolbarHeight}px)`,
              background: 'transparent',
            }}
            aria-label="上一頁"
            role="button"
            tabIndex={-1}
            data-no-selection="true"
          >
            {/* Subtle hover indicator */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity duration-200">
              <ChevronLeft className="w-10 h-10 text-gray-500" />
            </div>
          </div>

          {/* Right edge zone - Next page */}
          <div
            onClick={() => {
              // Task 4.5 Phase 3: Edge zone click logging (2025-12-01)
              if (DEBUG_PAGINATION) {
                console.log('[Pagination] Right edge zone clicked - going to next page');
              }
              goNextPage();
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="fixed right-0 z-30 cursor-e-resize group"
            style={{
              top: `${dynamicToolbarHeight}px`,
              width: '8%', // Task 4.5 Phase 2: Reduced from 15% to minimize text selection interference
              height: `calc(100vh - ${dynamicToolbarHeight}px)`,
              background: 'transparent',
            }}
            aria-label="下一頁"
            role="button"
            tabIndex={-1}
            data-no-selection="true"
          >
            {/* Subtle hover indicator */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity duration-200">
              <ChevronRight className="w-10 h-10 text-gray-500" />
            </div>
          </div>

          {/* Page indicator at bottom center */}
          <div
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 px-3 py-1 rounded-full bg-black/50 text-white text-sm"
            data-no-selection="true"
          >
            {currentPage} / {totalPages}
          </div>
        </>
      )}

      {toolbarInfo && (
        <div
          className="fixed flex items-center gap-1 p-1.5 rounded-md shadow-xl bg-neutral-800 text-white"
          style={{
            top: `${toolbarInfo.position!.top - 10}px`, 
            left: `${toolbarInfo.position!.left}px`,
            transform: 'translateX(-50%) translateY(-100%)', 
            zIndex: 60,
          }}
          data-selection-action-toolbar="true" 
        >
          <button
            className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-neutral-700 w-[60px]"
            onClick={handleOpenNoteSheet}
            data-selection-action-toolbar="true"
            title={t('buttons.writeNote')}
          >
            <Edit3 className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] leading-none">{t('buttons.writeNote')}</span>
          </button>

          {toolbarInfo.type === 'selection' ? (
            <button
              className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-neutral-700 w-[60px]"
              onClick={handleHighlight}
              data-selection-action-toolbar="true"
              title="畫線"
            >
              <Baseline className="h-5 w-5 mb-0.5" />
              <span className="text-[10px] leading-none">畫線</span>
            </button>
          ) : (
            <button
              className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-neutral-700 w-[60px]"
              onClick={handleDeleteHighlight}
              data-selection-action-toolbar="true"
              title="刪除畫線"
            >
              <Trash2 className="h-5 w-5 mb-0.5" />
              <span className="text-[10px] leading-none">刪除畫線</span>
            </button>
          )}

          <button
            className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-neutral-700 w-[60px]"
            onClick={() => handlePlaceholderAction('buttons.listenCurrent')}
            data-selection-action-toolbar="true"
            title={t('buttons.listenCurrent')}
          >
            <Volume2 className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] leading-none">{t('buttons.listenCurrent')}</span>
          </button>
          <button
            className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-neutral-700 w-[60px]"
            onClick={handleCopySelectedText}
            data-selection-action-toolbar="true"
            title={t('buttons.copy')}
          >
            <Copy className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] leading-none">{t('buttons.copy')}</span>
          </button>

          <button
            className="flex flex-col items-center justify-center p-1.5 rounded-md hover:bg-neutral-700 w-[60px]"
            onClick={handleOpenAiSheet}
            data-selection-action-toolbar="true"
            title={t('buttons.askAI')}
          >
            <Lightbulb className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] leading-none">{t('buttons.askAI')}</span>
          </button>
           
          <div
            className="absolute left-1/2 -translate-x-1/2 top-full"
            style={{
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #262626', 
            }}
            data-selection-action-toolbar="true"
          />
        </div>
      )}

      <Sheet open={isKnowledgeGraphSheetOpen} onOpenChange={(open) => {setIsKnowledgeGraphSheetOpen(open); if (!open) handleInteraction();}}>
        <SheetContent
            side="bottom"
            className="h-screen w-screen bg-black text-white p-0 flex flex-col fixed inset-0 z-50"
            data-no-selection="true"
            onClick={(e) => {e.stopPropagation(); handleInteraction();}}
            onCloseAutoFocus={(e) => e.preventDefault()} 
            onInteractOutside={(e) => e.preventDefault()} 
        >
          {/* Hidden title for accessibility */}
          <SheetHeader className="sr-only">
            <SheetTitle>知識圖譜全屏檢視</SheetTitle>
            <SheetDescription>第{currentChapter.id}回知識圖譜的全屏互動檢視</SheetDescription>
          </SheetHeader>
          
          {/* Fullscreen Knowledge Graph Container */}
          <div className="flex-grow overflow-hidden relative">
            <KnowledgeGraphViewer 
              className="w-full h-full"
              width={typeof window !== 'undefined' ? window.innerWidth : 1920}
              height={typeof window !== 'undefined' ? window.innerHeight : 1080}
              fullscreen={true}
              chapterNumber={currentChapter.id}
              onNodeClick={(node) => {
                console.log('Node clicked:', node);
                // Could add future functionality like showing node details
              }}
            />
            {currentChapter.id !== 1 && (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-900/20 via-amber-900/20 to-yellow-900/20">
                <div className="text-center p-8">
                  <div className="text-6xl mb-4 text-red-400">🏮</div>
                  <h3 className="text-xl font-bold text-red-300 mb-2">知識圖譜建構中</h3>
                  <p className="text-gray-300">第{currentChapter.id}回的知識圖譜正在專家審核中</p>
                  <p className="text-sm text-gray-400 mt-2">目前僅提供第一回的完整知識圖譜</p>
                </div>
              </div>
            )}
          </div>
          

        </SheetContent>
      </Sheet>

      <Sheet open={isTocSheetOpen} onOpenChange={(open) => {setIsTocSheetOpen(open); if (!open) handleInteraction();}}>
        <SheetContent
            side="left"
            className="w-[300px] sm:w-[350px] bg-card text-card-foreground p-0 flex flex-col"
            data-no-selection="true"
            onClick={(e) => {e.stopPropagation(); handleInteraction();}}
        >
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="text-primary text-xl font-artistic">{t('readBook.tocSheetTitle')}</SheetTitle>
            <SheetDescription>
              {t('readBook.tocSheetDesc')}
            </SheetDescription>
          </SheetHeader>
          <ScrollArea className="flex-grow">
            <div className="p-2 space-y-1">
            {/* Prefer dynamic chapters from JSON files, fallback to hardcoded */}
            {availableChapters.length > 0 ? (
              availableChapters.map((chapter) => (
                <Button
                  key={chapter.id}
                  variant={currentChapterId === chapter.id ? "default" : "ghost"}
                  className="w-full justify-start text-left h-auto py-1.5 px-3 text-sm"
                  onClick={() => handleSelectChapterFromToc(chapter.id, true)}
                >
                  {chapter.title}
                </Button>
              ))
            ) : (
              chapters.map((chapter, index) => (
                <Button
                  key={chapter.id}
                  variant={currentChapterIndex === index ? "default" : "ghost"}
                  className="w-full justify-start text-left h-auto py-1.5 px-3 text-sm"
                  onClick={() => handleSelectChapterFromToc(index)}
                >
                  {getChapterTitle(chapter.titleKey)}
                </Button>
              ))
            )}
            </div>
          </ScrollArea>
          <SheetFooter className="p-4 border-t border-border">
             <SheetClose asChild>
                <Button variant="outline" onClick={() => handleInteraction()}>{t('buttons.close')}</Button>
             </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Mobile Menu Bottom Sheet */}
      <Sheet open={isMobileMenuOpen} onOpenChange={(open) => { setIsMobileMenuOpen(open); if (!open) handleInteraction(); }}>
        <SheetContent
          side="bottom"
          className="h-auto max-h-[70vh] bg-card text-card-foreground rounded-t-2xl"
          data-no-selection="true"
          onClick={(e) => { e.stopPropagation(); handleInteraction(); }}
        >
          <SheetHeader className="pb-4">
            <SheetTitle className="text-primary text-lg font-semibold">{t('buttons.menu')}</SheetTitle>
            <SheetDescription className="sr-only">
              {t('readBook.mobileMenuDescription') || 'Access reading settings and navigation options'}
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-4 gap-4 py-4">
            {/* Settings */}
            <button
              type="button"
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent/50 transition-colors"
              onClick={() => { setIsMobileMenuOpen(false); setTimeout(() => setIsSettingsPopoverOpen(true), 100); }}
            >
              <Baseline className="h-7 w-7 text-primary" />
              <span className="text-xs text-center">{t('buttons.settings')}</span>
            </button>

            {/* TOC */}
            <button
              type="button"
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent/50 transition-colors"
              onClick={() => { setIsMobileMenuOpen(false); setTimeout(() => setIsTocSheetOpen(true), 100); }}
            >
              <List className="h-7 w-7 text-primary" />
              <span className="text-xs text-center">{t('buttons.toc')}</span>
            </button>

            {/* Knowledge Graph */}
            <button
              type="button"
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent/50 transition-colors"
              onClick={() => { setIsMobileMenuOpen(false); setTimeout(() => setIsKnowledgeGraphSheetOpen(true), 100); }}
            >
              <MapIcon className="h-7 w-7 text-primary" />
              <span className="text-xs text-center">{t('buttons.knowledgeGraph')}</span>
            </button>

            {/* Search */}
            <button
              type="button"
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent/50 transition-colors"
              onClick={() => { setIsMobileMenuOpen(false); setTimeout(() => setIsSearchPopoverOpen(true), 100); }}
            >
              <SearchIcon className="h-7 w-7 text-primary" />
              <span className="text-xs text-center">{t('buttons.search')}</span>
            </button>

            {/* Fullscreen */}
            <button
              type="button"
              className="flex flex-col items-center gap-2 p-3 rounded-lg hover:bg-accent/50 transition-colors"
              onClick={() => { toggleFullscreen(); setIsMobileMenuOpen(false); }}
            >
              {isFullscreenActive ? <Minimize className="h-7 w-7 text-primary" /> : <Maximize className="h-7 w-7 text-primary" />}
              <span className="text-xs text-center">{isFullscreenActive ? t('buttons.exitFullscreen') : t('buttons.fullscreen')}</span>
            </button>

            {/* Single Column */}
            <button
              type="button"
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg transition-colors",
                columnLayout === 'single' ? "bg-primary/20" : "hover:bg-accent/50"
              )}
              onClick={() => { setColumnLayout('single'); setIsMobileMenuOpen(false); }}
            >
              <AlignLeft className={cn("h-7 w-7", columnLayout === 'single' ? "text-primary" : "text-muted-foreground")} />
              <span className="text-xs text-center">{t('buttons.singleColumn')}</span>
            </button>
          </div>

          {/* Level Badge for mobile */}
          {userProfile && (
            <div className="border-t border-border pt-4 flex justify-center">
              <LevelBadge variant="compact" showTitle={true} className="cursor-pointer" />
            </div>
          )}

          <SheetFooter className="pt-4">
            <SheetClose asChild>
              <Button variant="outline" className="w-full" onClick={() => handleInteraction()}>{t('buttons.close')}</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog open={isNoteSheetOpen} onOpenChange={(open) => {
        setIsNoteSheetOpen(open);
        if (!open) {
          setSelectedTextInfo(null);
          setNoteSelectedText('');
          setIsViewingNote(false);
          setIsNotePublic(false);
        }
        handleInteraction();
      }}>
        <DialogContent
            className={cn(
              "max-w-3xl max-h-[80vh] p-0 flex flex-col bg-card"
            )}
            closeButtonPosition={isViewingNote ? 'left' : 'right'}
            data-no-selection="true"
            onClick={(e) => {e.stopPropagation(); handleInteraction();}}
        >
          {isViewingNote && (
            <DialogTitle className="sr-only">寫筆記</DialogTitle>
          )}
          {isViewingNote ? (
            // Viewing mode - minimal header with buttons only
            <div className="px-3 py-2 flex flex-row items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsViewingNote(false)}
                className="text-sm"
              >
                編輯
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteNote}
                className="text-sm bg-orange-500 hover:bg-orange-600 text-white"
              >
                刪除
              </Button>
            </div>
          ) : (
            // Editing mode - show title
            <DialogHeader className="p-4 pr-12 border-b border-border">
              <DialogTitle className="text-primary text-xl font-artistic">寫筆記</DialogTitle>
            </DialogHeader>
          )}

          {/* Use slightly smaller top padding in view mode to remove extra blank area */}
          <ScrollArea className={cn("flex-grow", isViewingNote ? "px-6 pb-6 pt-1" : "p-6") }>
            {isViewingNote ? (
              // Viewing mode - show note content directly without extra card
              <div className="space-y-4">
                <p className="text-foreground whitespace-pre-wrap text-xl leading-relaxed">{currentNote}</p>
              </div>
            ) : (
              // Editing mode - show textarea and selected text
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <blockquote className="p-2 bg-muted/30 rounded-sm max-h-20 overflow-y-auto">
                    {noteSelectedText || toolbarInfo?.text || selectedTextInfo?.text || t('readBook.noContentSelected')}
                  </blockquote>
                </div>
                <Textarea
                  id="noteTextarea"
                  value={currentNote}
                  onChange={(e) => setCurrentNote(e.target.value)}
                  placeholder="研究表明，哪怕每次只輸入一個符號，也能大幅提高學習效果"
                  className="min-h-[300px] bg-background/70 border-none focus:ring-0 text-base"
                  rows={12}
                />
              </div>
            )}
          </ScrollArea>

          {!isViewingNote && (
            <div className="p-4 border-t border-border bg-card">
              {/* Three-column layout keeps the counter perfectly centered */}
              <div className="grid grid-cols-3 items-center">
                {/* Left: Public toggle */}
                <div className="flex items-center gap-2 justify-self-start">
                  <Button
                    variant={isNotePublic ? "default" : "outline"}
                    size="sm"
                    onClick={() => setIsNotePublic(!isNotePublic)}
                    className={cn(
                      "text-sm gap-1",
                      isNotePublic ? "bg-orange-500 hover:bg-orange-600" : ""
                    )}
                  >
                    {isNotePublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    {isNotePublic ? '公開' : '私人'}
                  </Button>
                </div>

                {/* Center: Character count */}
                <span className="text-sm text-muted-foreground justify-self-center text-center">
                  {currentNote.length} / 5000
                </span>

                {/* Right: Publish/Cancel buttons */}
                <div className="flex gap-2 justify-self-end">
                  <DialogClose asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsNoteSheetOpen(false);
                        setSelectedTextInfo(null);
                        setNoteSelectedText('');
                        setIsViewingNote(false);
                        handleInteraction();
                      }}
                      className="text-sm"
                    >
                      取消
                    </Button>
                  </DialogClose>
                  <Button
                    onClick={handleSaveNote}
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 text-white text-sm"
                    disabled={!currentNote.trim() || currentNote.length > 5000}
                  >
                    發布
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      
      <Sheet open={isAiSheetOpen} onOpenChange={(open) => {setIsAiSheetOpen(open); if (!open) {setSelectedTextInfo(null); setTextExplanation(null); setAiAnalysisContent(null); setPerplexityResponse(null); setPerplexityStreamingChunks([]);} handleInteraction(); }}>
        <SheetContent
          side="bottom"
          className="h-screen w-screen bg-black text-white p-0 flex flex-col fixed inset-0 z-50"
          aria-label="AI 問答對話視窗"
          data-no-selection="true"
          onClick={(e) => {e.stopPropagation(); handleInteraction();}}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
            {/* Header - Task 4.2: Updated for fullscreen black background */}
            <SheetHeader className="p-4 border-b border-white/20 shrink-0">
                <SheetTitle className="text-red-400 text-xl font-artistic">
                  {aiMode === 'new-conversation' && '開啟新對話'}
                  {aiMode === 'book-sources' && '書籍引源 · 11'}
                  {aiMode === 'ai-analysis' && `AI 問書 《紅樓夢》`}
                  {aiMode === 'perplexity-qa' && `問 AI`}
                </SheetTitle>
                <SheetDescription className="text-gray-400">
                  {aiMode === 'new-conversation' && '請選擇您想了解的內容或直接提問'}
                  {aiMode === 'book-sources' && '相關書籍文獻資料與背景資訊'}
                  {aiMode === 'ai-analysis' && `第${currentChapterIndex + 1}回「${getChapterTitle(currentChapter.titleKey)}」`}
                  {aiMode === 'perplexity-qa' && `第${currentChapterIndex + 1}回「${getChapterTitle(currentChapter.titleKey)}」· 即時網路搜尋問答`}
                </SheetDescription>
            </SheetHeader>

            {/* Content Area */}
            <ScrollArea
              className="flex-grow p-4"
              viewportProps={{
                id: 'qa-viewport',
                onScroll: (e) => {
                  // Delegate to conversation scroll intent handler so auto-scroll disables when user scrolls
                  try {
                    handleScrollIntent(e as unknown as React.UIEvent<HTMLDivElement>);
                  } catch {}
                },
              }}
            >
              {/* New Conversation Mode - Task 4.2: Updated for black background */}
              {aiMode === 'new-conversation' && (
                <div className="space-y-4">
                  {/* Suggestion Questions */}
                  <div className="space-y-3">
                    {suggestionQuestions.map((question, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        className="w-full h-auto p-4 text-left whitespace-normal justify-start text-sm bg-white/10 hover:bg-red-900/50 border-white/20 transition-colors duration-200 text-white hover:text-white"
                        onClick={() => handleSuggestionClick(question)}
                      >
                        {question}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Book Sources Mode - Task 4.2: Updated for black background */}
              {aiMode === 'book-sources' && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="border border-white/20 rounded-lg overflow-hidden">
                      <Button variant="ghost" className="w-full p-4 text-left justify-between text-white hover:bg-white/10">
                        <span>① 賈寶玉《紅樓夢》走進名著</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                      <div className="px-4 pb-4 text-sm text-gray-400">
                        <p>三、內容解析 《了不起的蓋茨比》生動地展現了「一戰」結束（1918年）到經濟大蕭條（1929年）這一時期美國年輕人對幸福感謎的精神狀況，隨著戰爭平息，和平...</p>
                      </div>
                    </div>

                    <div className="border border-white/20 rounded-lg overflow-hidden">
                      <Button variant="ghost" className="w-full p-4 text-left justify-between text-white hover:bg-white/10">
                        <span>② 白又彰《貞節知識萬花筒》</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="border border-white/20 rounded-lg overflow-hidden">
                      <Button variant="ghost" className="w-full p-4 text-left justify-between text-white hover:bg-white/10">
                        <span>③ 柳筠九等《世界名著大師課合集》</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="border border-white/20 rounded-lg overflow-hidden">
                      <Button variant="ghost" className="w-full p-4 text-left justify-between text-white hover:bg-white/10">
                        <span>④ 貳周月刊《股市亮席若欲州 香港風月刊2025年第9期》</span>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Analysis Mode - Task 4.2: Updated for black background */}
              {aiMode === 'ai-analysis' && (
                <div className="space-y-4">
                  {isLoadingExplanation && (
                    <div className="p-8 flex flex-col items-center justify-center text-gray-400">
                      <Lightbulb className="h-8 w-8 mb-2 animate-pulse text-red-400" />
                      <p>AI 正在分析中...</p>
                    </div>
                  )}

                  {/* Display AI content - prioritize aiAnalysisContent over textExplanation to avoid duplication */}
                  {(aiAnalysisContent || textExplanation) && (
                    <div className="prose prose-sm prose-invert max-w-none bg-white/5 rounded-lg p-4 border border-white/10">
                      <ReactMarkdown
                        className="text-gray-200 leading-relaxed"
                        components={{
                          h1: ({node, ...props}) => <h1 className="text-xl font-bold text-red-400 mb-4" {...props} />,
                          h2: ({node, ...props}) => <h2 className="text-lg font-semibold text-red-400 mb-3" {...props} />,
                          h3: ({node, ...props}) => <h3 className="text-base font-medium text-red-400 mb-2" {...props} />,
                          p: ({node, ...props}) => <p className="text-gray-200 mb-3 leading-relaxed" {...props} />,
                          ul: ({node, ...props}) => <ul className="text-gray-200 mb-3 pl-6 space-y-1" {...props} />,
                          ol: ({node, ...props}) => <ol className="text-gray-200 mb-3 pl-6 space-y-1" {...props} />,
                          li: ({node, ...props}) => <li className="text-gray-200" {...props} />,
                          strong: ({node, ...props}) => <strong className="font-semibold text-red-400" {...props} />,
                          em: ({node, ...props}) => <em className="italic text-gray-400" {...props} />,
                        }}
                      >
                        {aiAnalysisContent || textExplanation}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}

              {/* Perplexity QA Mode - Task 4.2: Updated for black background */}
              {aiMode === 'perplexity-qa' && (
                <div className="space-y-4 qa-module">
                  {/* Task 4.2 Fix: Show loading state while sessions initialize (Vercel SSR fix) */}
                  {!isSessionInitialized ? (
                    <div className="flex flex-col items-center justify-center py-16 min-h-[200px]">
                      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-400 mb-4" />
                      <p className="text-white/80 font-medium">載入對話記錄中...</p>
                      <p className="text-white/60 text-sm mt-1">請稍候</p>
                    </div>
                  ) : (
                  <>
                  {/* Conversation Flow with Integrated Thinking Process */}
                  <ConversationFlow
                    messages={activeSessionMessages}
                    showNewConversationSeparator={activeSessionMessages.length > 0}
                    onNewConversation={() => {
                      // Start new session (do not delete history)
                      startNewSession();
                      setPerplexityResponse(null);
                      setPerplexityStreamingChunks([]);
                      setUserQuestionInput('');
                      setThinkingStatus('idle');
                      setThinkingContent('');
                      setStreamingProgress(0);

                      toast({ title: "新對話已開始", description: "已建立新的對話頁籤" });
                      streamingAIMessageIdRef.current = null;
                    }}
                    autoScroll={true}
                    autoScrollEnabled={autoScrollEnabled}
                    onScrollIntent={handleScrollIntent}
                    renderMessageContent={(message) => {
                      console.log('[QA Module] Rendering message:', message);
                      // Render AI responses with AIMessageBubble (Fix #6, #7, #8)
                      if (message.role === 'ai') {
                        console.log('[QA Module] Rendering AI message with content length:', message.content.length);
                        return (
                          <AIMessageBubble
                            answer={message.content}  // ✅ Use message data, not global state
                            citations={message.citations || []}  // ✅ Use message data
                            thinkingProcess={message.thinkingProcess}  // ✅ Use message data
                            thinkingDuration={message.thinkingDuration}  // ✅ Use message data (undefined shows "思考完成")
                            isThinkingComplete={!message.isStreaming}
                            isStreaming={message.isStreaming || false}
                            onCitationClick={(citationId) => {
                              const citation = message.citations?.find(
                                c => parseInt(c.number, 10) === citationId
                              );
                              if (citation?.url) {
                                window.open(citation.url, '_blank');
                              }
                            }}
                            showThinkingInline={true}
                            // Task 4.2 Fix - Bug #3: Pass preference to persist across messages
                            thinkingExpandedPreference={thinkingExpandedPreference}
                            onThinkingToggle={(isExpanded) => {
                              // Update preference based on user's manual toggle
                              setThinkingExpandedPreference(isExpanded ? 'expanded' : 'collapsed');
                            }}
                          />
                        );
                      }
                      // Use default rendering for user messages (Fix #6)
                      console.log('[QA Module] Using default rendering for user message');
                      return undefined;  // ✅ Not null - allows default blue bubble rendering
                    }}
                  />

                  {/* BUG FIX: Removed standalone ThinkingProcessIndicator
                      The AI placeholder message now handles thinking display within ConversationFlow
                      This fixes the position bug where thinking appeared BELOW the separator */}
                  </>
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Floating Scroll to Bottom Button (Task 4.2 Fix - Issue #3) - Updated for black background */}
            {/* Positioned above input area, right-aligned for less content overlap */}
            {!autoScrollEnabled && aiMode === 'perplexity-qa' && (
              <div className="absolute bottom-[180px] right-4 z-50 pointer-events-none">
                <Button
                  onClick={() => {
                    // Task 4.2 Logging: Track button click
                    console.log('[QA Module] Scroll to bottom button clicked');
                    setAutoScrollEnabled(true);
                    setUnreadMessageCount(0);
                    // Scroll to bottom
                    const viewport = document.getElementById('qa-viewport');
                    if (viewport) {
                      viewport.scrollTo({
                        top: viewport.scrollHeight,
                        behavior: 'smooth',
                      });
                    } else {
                      // Fallback: scroll the bottom anchor into view
                      const bottomAnchor = document.querySelector('.conversation-flow .h-px:last-child') as HTMLElement | null;
                      bottomAnchor?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    }
                  }}
                  className="shadow-lg rounded-full px-4 py-2 flex items-center gap-2 pointer-events-auto bg-white/20 hover:bg-white/30 text-white border border-white/30"
                  aria-label="Scroll to bottom"
                  title="回到底部"
                  variant="secondary"
                >
                  <ChevronDown className="h-4 w-4" />
                  <span>回到底部</span>
                  {unreadMessageCount > 0 && (
                    <Badge variant="destructive" className="ml-1">
                      {unreadMessageCount}
                    </Badge>
                  )}
                </Button>
              </div>
            )}

            {/* Bottom Section with Action Buttons and Input - Task 4.2: Updated for black background */}
            <div className="shrink-0 p-4 border-t border-white/20 bg-black/80">

              {/* Action Buttons */}
              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 text-sm bg-white/10 border-white/20",
                    "hover:bg-red-900/50",
                    "transition-colors duration-200",
                    "text-white hover:text-white"
                  )}
                  onClick={handleBookHighlights}
                  disabled={isLoadingExplanation}
                >
                  該章回亮點
                </Button>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 text-sm bg-white/10 border-white/20",
                    "hover:bg-red-900/50",
                    "transition-colors duration-200",
                    "text-white hover:text-white"
                  )}
                  onClick={handleBackgroundReading}
                  disabled={isLoadingExplanation}
                >
                  背景解讀
                </Button>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 text-sm bg-white/10 border-white/20",
                    "hover:bg-red-900/50",
                    "transition-colors duration-200",
                    "text-white hover:text-white"
                  )}
                  onClick={handleKeyConcepts}
                  disabled={isLoadingExplanation}
                >
                  關鍵概念
                </Button>
              </div>

              {/* Input Section */}
              <div className="flex gap-2">
                <Input
                  value={userQuestionInput}
                  onChange={(e) => setUserQuestionInput(e.target.value)}
                  placeholder="提出問題，獲得來自書籍的解答..."
                  className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                  disabled={isLoadingExplanation}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleUserSubmitQuestion();
                    }
                  }}
                />
                <Button
                  onClick={() => (isLoadingExplanation ? handleStopStreaming() : handleUserSubmitQuestion())}
                  disabled={!isLoadingExplanation && !userQuestionInput.trim()}
                  size="icon"
                  className={cn(
                    "shrink-0 rounded-full h-10 w-10 p-0 transition-all duration-200",
                    "hover:scale-105 active:scale-95",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "bg-red-600 hover:bg-red-700 text-white",
                    // Change color when showing stop button (Fix Issue #3)
                    isLoadingExplanation && "bg-destructive hover:bg-destructive/90"
                  )}
                  aria-label={isLoadingExplanation ? "停止回答" : "送出問題"}
                  title={isLoadingExplanation ? "停止回答" : "送出問題"}
                >
                  {isLoadingExplanation ? (
                    <Square className="h-5 w-5" strokeWidth={2.5} />
                  ) : (
                    <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
                  )}
                </Button>
              </div>
            </div>
        </SheetContent>
      </Sheet>

      <Button
        variant="default"
        className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg z-40 bg-primary text-primary-foreground hover:bg-primary/90 p-0 flex items-center justify-center"
        onClick={handleReadAloudClick}
        title={t('buttons.readAloud')}
        data-no-selection="true"
      >
        <i className="fa fa-play-circle-o text-[54px]" aria-hidden="true"></i>
      </Button>

      {/* Level Up Modal */}
      <LevelUpModal
        open={levelUpData.show}
        onOpenChange={(open) => setLevelUpData(prev => ({ ...prev, show: open }))}
        fromLevel={levelUpData.fromLevel}
        toLevel={levelUpData.toLevel}
      />
    </div>
  );
}
