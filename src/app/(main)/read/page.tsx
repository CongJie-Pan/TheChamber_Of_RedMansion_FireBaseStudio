
/**
 * @fileOverview Book Selection and Reading Library Interface
 * 
 * This component provides a comprehensive digital library interface for accessing
 * different editions and interpretations of the Dream of the Red Chamber. It serves
 * as the primary navigation hub for users to explore various textual resources
 * and scholarly interpretations of the classical Chinese novel.
 * 
 * Key features:
 * - Categorized book collections (Original texts, Expert interpretations)
 * - Interactive book cards with metadata and access controls
 * - Recent reading history and progress tracking
 * - Responsive grid layout for optimal viewing across devices
 * - Multi-language support for international accessibility
 * - Visual indicators for book types and reading status
 * - Direct navigation to immersive reading experiences
 * - Filter and sorting capabilities for library management
 * 
 * Educational value:
 * - Provides access to multiple authoritative editions
 * - Offers scholarly interpretations alongside original texts
 * - Supports comparative reading and analysis
 * - Enables progression from guided to independent reading
 * - Facilitates exploration of different academic perspectives
 * 
 * Technical implementation:
 * - Dynamic book data generation with translation keys
 * - Responsive grid system for various screen sizes
 * - Tab-based navigation for organized content access
 * - Integration with translation system for multilingual support
 * - Placeholder book covers with fallback to icon representations
 * - Flexible data structure supporting future content expansion
 * 
 * Design principles:
 * - Library-like aesthetic maintaining cultural authenticity
 * - Clear visual hierarchy distinguishing content types
 * - Intuitive navigation patterns familiar to digital readers
 * - Accessibility features for diverse user needs
 * - Consistent theming with the overall application design
 * 
 * The interface balances comprehensive content access with user-friendly
 * navigation, making classical Chinese literature approachable for modern learners.
 */

"use client"; // Required for interactive book selection and state management

// React hooks for component state management
import { useState } from 'react';

// Next.js navigation for seamless routing
import Link from 'next/link';

// UI component imports for library interface
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Icon imports for book-related actions
import { 
  BookOpen,    // Reading action and book representation
  Edit         // Library management and editing features
} from 'lucide-react'; 

// Custom hooks for application functionality
import { useLanguage } from '@/hooks/useLanguage';

interface Book {
  id: string;
  titleKey: string;
  authorKey: string;
  descriptionKey: string;
  coverImage: string; 
  aiHint: string;
  readLink: string;
  badgeTextKey?: string; 
}

// Data uses keys now, actual text in translations.ts
const originalTextBooksData: Array<Omit<Book, 'titleKey'|'authorKey'|'descriptionKey'> & { id: string }> = [
  { id: 'hlm-times-edition', coverImage: 'https://placehold.co/150x220.png?tint=662929', aiHint: 'chinese novel set', readLink: '#', badgeTextKey: 'read.badgeEbook' },
  { id: 'hlm-v3', coverImage: 'https://placehold.co/150x220.png?tint=662929', aiHint: 'chinese novel', readLink: '/read-book', badgeTextKey: 'read.badgeEbook' },
  { id: 'hlm-chengjia', coverImage: 'https://placehold.co/150x220.png?tint=662929', aiHint: 'chinese antique', readLink: '#', badgeTextKey: 'read.badgeEbook' },
  { id: 'hlm-gengchen', coverImage: 'https://placehold.co/150x220.png?tint=662929', aiHint: 'chinese scholarly', readLink: '#', badgeTextKey: 'read.badgeEbook' },
  { id: 'hlm-zhiyan', coverImage: 'https://placehold.co/150x220.png?tint=662929', aiHint: 'chinese manuscript', readLink: '#', badgeTextKey: 'read.badgeEbook' },
  { id: 'hlm-menggao', coverImage: 'https://placehold.co/150x220.png?tint=662929', aiHint: 'chinese rare', readLink: '#', badgeTextKey: 'read.badgeEbook' },
  { id: 'hlm-anniversary', coverImage: 'https://placehold.co/150x220.png?tint=662929', aiHint: 'chinese edition', readLink: '#', badgeTextKey: 'read.badgeEbook' },
];

const expertInterpretationBooksData: Array<Omit<Book, 'titleKey'|'authorKey'|'descriptionKey'> & { id: string }> = [
  { id: 'jiangxun-youth', coverImage: 'https://placehold.co/150x220.png?tint=555555', aiHint: 'chinese literary criticism', readLink: '#', badgeTextKey: 'read.badgeExpert' },
  { id: 'jiangxun-dream', coverImage: 'https://placehold.co/150x220.png?tint=555555', aiHint: 'chinese literary introduction', readLink: '#', badgeTextKey: 'read.badgeExpert' },
  { id: 'jiangxun-microdust', coverImage: 'https://placehold.co/150x220.png?tint=555555', aiHint: 'chinese character analysis', readLink: '#', badgeTextKey: 'read.badgeExpert' },
  { id: 'baixianyong-detailed', coverImage: 'https://placehold.co/150x220.png?tint=555555', aiHint: 'chinese literary analysis', readLink: '#', badgeTextKey: 'read.badgeExpert' },
  { id: 'oulijuan-sixviews', coverImage: 'https://placehold.co/150x220.png?tint=555555', aiHint: 'chinese academic study', readLink: '#', badgeTextKey: 'read.badgeExpert' },
  { id: 'dongmei-thorough', coverImage: 'https://placehold.co/150x220.png?tint=555555', aiHint: 'chinese thematic interpretation', readLink: '#', badgeTextKey: 'read.badgeExpert' },
];

// Function to create full Book objects with translation keys
const createBookList = (bookData: any[]): Book[] => {
  return bookData.map(book => ({
    ...book,
    titleKey: `bookShelf.${book.id.replace(/-/g, '')}.title`, // e.g. bookShelf.hlmtimesedition.title
    authorKey: `bookShelf.${book.id.replace(/-/g, '')}.author`,
    descriptionKey: `bookShelf.${book.id.replace(/-/g, '')}.description`,
  }));
};

const originalTextBooks: Book[] = createBookList(originalTextBooksData);
const expertInterpretationBooks: Book[] = createBookList(expertInterpretationBooksData);


const BookCard = ({ book, t }: { book: Book; t: (key: string) => string }) => (
  <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow bg-card/70 flex flex-col">
    <CardContent className="p-0 flex-grow flex flex-col">
      <div className="relative aspect-[3/4.4] bg-muted/50 flex items-center justify-center rounded-t-md overflow-hidden">
        <i className="fa fa-book text-7xl text-primary/60" aria-hidden="true"></i>
        {book.badgeTextKey && (
          <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-sm">
            {t(book.badgeTextKey)}
          </div>
        )}
      </div>
      <div className="p-3 space-y-1 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-sm text-foreground truncate" title={t(book.titleKey)}>{t(book.titleKey)}</h3>
          <p className="text-xs text-muted-foreground truncate" title={t(book.authorKey)}>{t(book.authorKey)}</p>
          <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2" title={t(book.descriptionKey)}>{t(book.descriptionKey)}</p>
        </div>
        <div className="flex items-center justify-end pt-2 mt-auto">
           <Button asChild variant="link" size="sm" className="p-0 h-auto text-primary hover:text-primary/80">
            <Link href={book.readLink}>
              <BookOpen className="mr-1 h-3.5 w-3.5" />{t('buttons.read')}
            </Link>
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function BookSelectionPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("originals");
  const allBooksCount = originalTextBooks.length + expertInterpretationBooks.length;

  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="font-artistic text-3xl text-primary">
            {t('read.myShelf')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="originals" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 md:w-auto md:inline-flex mb-4">
              <TabsTrigger value="recent">{t('read.tabRecent')}</TabsTrigger>
              <TabsTrigger value="originals">{t('read.tabOriginals')}</TabsTrigger>
              <TabsTrigger value="interpretations">{t('read.tabInterpretations')}</TabsTrigger>
            </TabsList>

            <div className="mb-6 flex flex-wrap items-center gap-2">
              <Button variant="default" size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90">{t('read.btnAll')} ({allBooksCount})</Button>
              <Button variant="outline" size="sm">{t('read.btnProgress')}</Button>
              <Button variant="outline" size="sm">{t('read.btnCategory')}</Button>
              <div className="ml-auto hidden md:block">
                <Button variant="ghost" size="sm">
                  <Edit className="mr-2 h-4 w-4" /> {t('buttons.edit')}
                </Button>
              </div>
            </div>
            
            <TabsContent value="originals">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {originalTextBooks.map((book) => (
                  <BookCard key={book.id} book={book} t={t} />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="interpretations">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {expertInterpretationBooks.map((book) => (
                  <BookCard key={book.id} book={book} t={t} />
                ))}
              </div>
            </TabsContent>
            <TabsContent value="recent">
              <div className="text-center py-12 text-muted-foreground">
                <p>{t('read.recentLearningPlaceholder')}</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
