/**
 * Curated list of canonical religious / philosophical texts that Google Books
 * struggles to surface when searched by their plain title (returns "books
 * ABOUT the Bible" instead of the Bible itself). We prepend these entries
 * whenever the user's query matches a known canonical title.
 */

export interface CanonicalBook {
  id: string
  title: string
  author: string
  year: string
  imageUrl?: string
  externalUrl?: string
  /** Lowercased keywords that trigger this entry (substring match). */
  aliases: string[]
}

const CANONICAL_BOOKS: CanonicalBook[] = [
  {
    id: 'bible',
    title: 'The Bible',
    author: 'Various (Sacred Text)',
    year: 'Multiple',
    externalUrl: 'https://www.biblegateway.com/',
    aliases: ['bible', 'holy bible', 'the bible'],
  },
  {
    id: 'quran',
    title: 'The Quran',
    author: 'Sacred Text of Islam',
    year: '7th century',
    externalUrl: 'https://quran.com/',
    aliases: ['quran', "qur'an", 'koran', 'the quran', 'holy quran', 'al-quran'],
  },
  {
    id: 'torah',
    title: 'The Torah',
    author: 'Sacred Text of Judaism',
    year: 'Ancient',
    aliases: ['torah', 'the torah', 'pentateuch'],
  },
  {
    id: 'tanakh',
    title: 'The Tanakh (Hebrew Bible)',
    author: 'Sacred Text of Judaism',
    year: 'Ancient',
    aliases: ['tanakh', 'hebrew bible', 'tanach'],
  },
  {
    id: 'bhagavad-gita',
    title: 'Bhagavad Gita',
    author: 'Vyasa (traditional)',
    year: 'Ancient',
    aliases: ['bhagavad gita', 'gita', 'bhagavadgita', 'bhagwad gita'],
  },
  {
    id: 'tao-te-ching',
    title: 'Tao Te Ching',
    author: 'Lao Tzu',
    year: '6th century BCE',
    aliases: ['tao te ching', 'dao de jing', 'daodejing', 'tao te jing'],
  },
  {
    id: 'analects',
    title: 'The Analects of Confucius',
    author: 'Confucius',
    year: '5th century BCE',
    aliases: ['analects', 'analects of confucius', 'the analects'],
  },
  {
    id: 'book-of-mormon',
    title: 'The Book of Mormon',
    author: 'Joseph Smith (translator)',
    year: '1830',
    aliases: ['book of mormon', 'the book of mormon', 'mormon'],
  },
  {
    id: 'dhammapada',
    title: 'The Dhammapada',
    author: 'The Buddha (traditional)',
    year: 'Ancient',
    aliases: ['dhammapada', 'the dhammapada'],
  },
  {
    id: 'vedas',
    title: 'The Vedas',
    author: 'Sacred Texts of Hinduism',
    year: 'Ancient',
    aliases: ['vedas', 'the vedas', 'rigveda', 'rig veda'],
  },
  {
    id: 'upanishads',
    title: 'The Upanishads',
    author: 'Sacred Texts of Hinduism',
    year: 'Ancient',
    aliases: ['upanishads', 'the upanishads', 'upanishad'],
  },
  {
    id: 'tripitaka',
    title: 'The Tripitaka (Pali Canon)',
    author: 'Sacred Texts of Buddhism',
    year: 'Ancient',
    aliases: ['tripitaka', 'pali canon', 'tipitaka'],
  },
  {
    id: 'guru-granth-sahib',
    title: 'Guru Granth Sahib',
    author: 'Sacred Text of Sikhism',
    year: '1604',
    aliases: ['guru granth sahib', 'granth sahib', 'adi granth'],
  },
  {
    id: 'avesta',
    title: 'The Avesta',
    author: 'Sacred Text of Zoroastrianism',
    year: 'Ancient',
    aliases: ['avesta', 'the avesta', 'zend avesta'],
  },
  {
    id: 'kojiki',
    title: 'The Kojiki',
    author: 'Ō no Yasumaro',
    year: '712 CE',
    aliases: ['kojiki', 'the kojiki'],
  },
]

/**
 * Returns canonical books whose aliases match the user's query.
 * Case-insensitive. Matches when query is contained in an alias OR alias in query.
 */
export function matchCanonicalBooks(query: string): CanonicalBook[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  return CANONICAL_BOOKS.filter(book =>
    book.aliases.some(alias => alias === q || alias.includes(q) || q.includes(alias))
  )
}
