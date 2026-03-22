import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './src/generated/prisma/client.js';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const BOOKS_DATA = [
  {
    title: "The Alchemist",
    author: "Paulo Coelho",
    isbn: "9780061122415",
    publisher: "HarperOne",
    publication_year: 1988,
    edition: "25th Anniversary Edition",
    category: "Fiction",
    genre: "Philosophical Fiction",
    pages: 208,
    language: "English",
    location: "Shelf A3 - Fiction Classics",
    total_copies: 5,
    available_copies: 5,
    cover_image_url: "https://covers.openlibrary.org/b/isbn/9780061122415-L.jpg",
    description: "A philosophical novel about a shepherd named Santiago who travels in search of a worldly treasure and discovers his personal legend.",
    format: "Hardcover",
    tags: ["Philosophy", "Adventure", "Classics"],
    is_reference_only: false,
    is_active: true
  },
  {
    title: "Clean Code",
    author: "Robert C. Martin",
    isbn: "9780132350884",
    publisher: "Prentice Hall",
    publication_year: 2008,
    edition: "1st Edition",
    category: "Technology",
    genre: "Programming",
    pages: 464,
    language: "English",
    location: "Shelf B1 - Software Engineering",
    total_copies: 3,
    available_copies: 3,
    cover_image_url: "https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg",
    description: "A handbook of agile software craftsmanship teaching principles and best practices for writing clean and maintainable code.",
    format: "Paperback",
    tags: ["Programming", "Software Engineering", "Best Practices"],
    is_reference_only: false,
    is_active: true
  },
  {
    title: "Introduction to Algorithms",
    author: "Thomas H. Cormen",
    isbn: "9780262033848",
    publisher: "MIT Press",
    publication_year: 2009,
    edition: "3rd Edition",
    category: "Technology",
    genre: "Algorithms",
    pages: 1312,
    language: "English",
    location: "Shelf B2 - Algorithms",
    total_copies: 4,
    available_copies: 4,
    cover_image_url: "https://covers.openlibrary.org/b/isbn/9780262033848-L.jpg",
    description: "Comprehensive textbook covering a broad range of algorithms in depth with rigorous analysis.",
    format: "Hardcover",
    tags: ["Algorithms", "Computer Science", "Textbook"],
    is_reference_only: false,
    is_active: true
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    isbn: "9780735211292",
    publisher: "Avery",
    publication_year: 2018,
    edition: "1st Edition",
    category: "Self-Help",
    genre: "Personal Development",
    pages: 320,
    language: "English",
    location: "Shelf C1 - Self Development",
    total_copies: 6,
    available_copies: 6,
    cover_image_url: "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg",
    description: "A guide on how small habits can lead to remarkable results through continuous improvement.",
    format: "Hardcover",
    tags: ["Self-Help", "Productivity", "Habits"],
    is_reference_only: false,
    is_active: true
  },
  {
    title: "The Pragmatic Programmer",
    author: "Andrew Hunt",
    isbn: "9780135957059",
    publisher: "Addison-Wesley",
    publication_year: 2019,
    edition: "20th Anniversary Edition",
    category: "Technology",
    genre: "Software Development",
    pages: 352,
    language: "English",
    location: "Shelf B1 - Software Engineering",
    total_copies: 2,
    available_copies: 2,
    cover_image_url: "https://covers.openlibrary.org/b/isbn/9780135957059-L.jpg",
    description: "Classic book offering practical advice for programmers to improve their development skills and mindset.",
    format: "Paperback",
    tags: ["Programming", "Software Development", "Career"],
    is_reference_only: false,
    is_active: true
  },
  {
    title: "Rich Dad Poor Dad",
    author: "Robert T. Kiyosaki",
    isbn: "9781612680194",
    publisher: "Plata Publishing",
    publication_year: 1997,
    edition: "Updated Edition",
    category: "Finance",
    genre: "Personal Finance",
    pages: 336,
    language: "English",
    location: "Shelf C2 - Finance",
    total_copies: 4,
    available_copies: 4,
    cover_image_url: "https://covers.openlibrary.org/b/isbn/9781612680194-L.jpg",
    description: "A book that challenges conventional beliefs about money and teaches financial literacy.",
    format: "Paperback",
    tags: ["Finance", "Investing", "Personal Finance"],
    is_reference_only: false,
    is_active: true
  },
  {
    title: "To Kill a Mockingbird",
    author: "Harper Lee",
    isbn: "9780060935467",
    publisher: "J.B. Lippincott & Co.",
    publication_year: 1960,
    edition: "50th Anniversary Edition",
    category: "Fiction",
    genre: "Classic",
    pages: 281,
    language: "English",
    location: "Shelf A2 - American Classics",
    total_copies: 3,
    available_copies: 3,
    cover_image_url: "https://covers.openlibrary.org/b/isbn/9780060935467-L.jpg",
    description: "A novel about racial injustice in the Deep South seen through the eyes of a young girl.",
    format: "Hardcover",
    tags: ["Classics", "American Literature", "Social Justice"],
    is_reference_only: false,
    is_active: true
  },
  {
    title: "1984",
    author: "George Orwell",
    isbn: "9780451524935",
    publisher: "Signet Classic",
    publication_year: 1949,
    edition: "Reprint Edition",
    category: "Fiction",
    genre: "Dystopian",
    pages: 328,
    language: "English",
    location: "Shelf A1 - Dystopian Fiction",
    total_copies: 5,
    available_copies: 5,
    cover_image_url: "https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg",
    description: "A dystopian novel exploring totalitarianism, surveillance, and loss of individuality.",
    format: "Paperback",
    tags: ["Dystopian", "Classics", "Political Fiction"],
    is_reference_only: false,
    is_active: true
  },
  {
    title: "Sapiens: A Brief History of Humankind",
    author: "Yuval Noah Harari",
    isbn: "9780062316097",
    publisher: "Harper",
    publication_year: 2011,
    edition: "1st Edition",
    category: "History",
    genre: "Anthropology",
    pages: 443,
    language: "English",
    location: "Shelf D1 - World History",
    total_copies: 4,
    available_copies: 4,
    cover_image_url: "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg",
    description: "Explores the history of humankind from the Stone Age to the modern era.",
    format: "Hardcover",
    tags: ["History", "Anthropology", "Science"],
    is_reference_only: false,
    is_active: true
  },
  {
    title: "Deep Learning",
    author: "Ian Goodfellow",
    isbn: "9780262035613",
    publisher: "MIT Press",
    publication_year: 2016,
    edition: "1st Edition",
    category: "Technology",
    genre: "Artificial Intelligence",
    pages: 775,
    language: "English",
    location: "Shelf B3 - AI & ML",
    total_copies: 2,
    available_copies: 2,
    cover_image_url: "https://covers.openlibrary.org/b/isbn/9780262035613-L.jpg",
    description: "An in-depth introduction to deep learning covering theory, algorithms, and applications.",
    format: "Hardcover",
    tags: ["AI", "Machine Learning", "Deep Learning"],
    is_reference_only: false,
    is_active: true
  }
];

async function seedBooks() {
    console.log('🌱 Starting book seeding...\n');

    try {
        for (const bookData of BOOKS_DATA) {
            // Check if book already exists
            const existing = await prisma.books.findUnique({
                where: { isbn: bookData.isbn }
            });

            if (existing) {
                console.log(`⏭️  Skipping "${bookData.title}" - already exists`);
                continue;
            }

            // Create the book
            const book = await prisma.books.create({
                data: bookData
            });

            console.log(`✅ Added: "${book.title}" by ${book.author} (ID: ${book.id})`);
        }

        console.log('\n✨ Book seeding completed successfully!');
        console.log(`📚 Total books in system: ${await prisma.books.count()}`);

    } catch (error) {
        console.error('\n❌ Error seeding books:', error.message);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the seeder
seedBooks()
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
