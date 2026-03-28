import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./src/generated/prisma/client.js";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const rows = [
  ["9780743273565", "The Great Gatsby", "F. Scott Fitzgerald", "Scribner", 1925, "Fiction", "Classic", "English", 180, "A story of wealth and illusion in 1920s America.", "https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg", 5, 5, "Shelf A1", "Reprint", "Paperback"],
  ["9780141439600", "Pride and Prejudice", "Jane Austen", "Penguin Classics", 1813, "Fiction", "Romance", "English", 279, "A romantic novel about manners and marriage.", "https://covers.openlibrary.org/b/isbn/9780141439600-L.jpg", 4, 4, "Shelf A2", "Classic Edition", "Hardcover"],
  ["9780553380163", "A Game of Thrones", "George R. R. Martin", "Bantam", 1996, "Fiction", "Fantasy", "English", 694, "Epic fantasy of political intrigue and war.", "https://covers.openlibrary.org/b/isbn/9780553380163-L.jpg", 6, 6, "Shelf A3", "1st Edition", "Paperback"],
  ["9780439139601", "Harry Potter and the Goblet of Fire", "J.K. Rowling", "Scholastic", 2000, "Fiction", "Fantasy", "English", 636, "Harry faces new challenges in the Triwizard Tournament.", "https://covers.openlibrary.org/b/isbn/9780439139601-L.jpg", 5, 5, "Shelf A3", "Illustrated", "Hardcover"],
  ["9780307277671", "The Road", "Cormac McCarthy", "Vintage", 2006, "Fiction", "Post-Apocalyptic", "English", 287, "A father and son journey through a ruined world.", "https://covers.openlibrary.org/b/isbn/9780307277671-L.jpg", 3, 3, "Shelf A4", "Reprint", "Paperback"],

  ["9780441013593", "Dune", "Frank Herbert", "Ace", 1965, "Fiction", "Science Fiction", "English", 412, "A desert planet and political struggle for power.", "https://covers.openlibrary.org/b/isbn/9780441013593-L.jpg", 5, 5, "Shelf A5", "Deluxe", "Hardcover"],
  ["9780345391803", "The Hitchhiker's Guide to the Galaxy", "Douglas Adams", "Del Rey", 1979, "Fiction", "Sci-Fi Comedy", "English", 224, "A comedic journey through space.", "https://covers.openlibrary.org/b/isbn/9780345391803-L.jpg", 4, 4, "Shelf A5", "Reprint", "Paperback"],

  ["9781591169205", "Naruto Vol.1", "Masashi Kishimoto", "Viz Media", 2003, "Manga", "Action", "Japanese", 192, "A young ninja seeks recognition.", "https://covers.openlibrary.org/b/isbn/9781591169205-L.jpg", 6, 6, "Shelf M1", "Vol 1", "Paperback"],
  ["9781421592541", "My Hero Academia Vol.1", "Kohei Horikoshi", "Viz Media", 2015, "Manga", "Superhero", "Japanese", 192, "A boy dreams of becoming a hero.", "https://covers.openlibrary.org/b/isbn/9781421592541-L.jpg", 6, 6, "Shelf M1", "Vol 1", "Paperback"],
  ["9781646512490", "Attack on Titan Vol.1", "Hajime Isayama", "Kodansha", 2012, "Manga", "Dark Fantasy", "Japanese", 208, "Humans fight against giant Titans.", "https://covers.openlibrary.org/b/isbn/9781646512490-L.jpg", 5, 5, "Shelf M2", "Vol 1", "Paperback"],
  ["9781974720716", "Jujutsu Kaisen Vol.1", "Gege Akutami", "Viz Media", 2019, "Manga", "Supernatural", "Japanese", 192, "Curses and sorcery battles.", "https://covers.openlibrary.org/b/isbn/9781974720716-L.jpg", 5, 5, "Shelf M2", "Vol 1", "Paperback"],

  ["9780316556347", "Sword Art Online Vol.1", "Reki Kawahara", "Yen Press", 2009, "Light Novel", "Fantasy", "Japanese", 256, "Players trapped in a VR game.", "https://covers.openlibrary.org/b/isbn/9780316556347-L.jpg", 4, 4, "Shelf LN1", "Vol 1", "Paperback"],
  ["9781975359618", "Re:Zero Vol.1", "Tappei Nagatsuki", "Yen Press", 2016, "Light Novel", "Fantasy", "Japanese", 240, "A boy relives death repeatedly.", "https://covers.openlibrary.org/b/isbn/9781975359618-L.jpg", 4, 4, "Shelf LN1", "Vol 1", "Paperback"],
  ["9781975302515", "Overlord Vol.1", "Kugane Maruyama", "Yen Press", 2015, "Light Novel", "Fantasy", "Japanese", 320, "A gamer becomes his character in a new world.", "https://covers.openlibrary.org/b/isbn/9781975302515-L.jpg", 3, 3, "Shelf LN2", "Vol 1", "Paperback"],

  ["9781648279339", "Solo Leveling Vol.1", "Chugong", "Yen Press", 2021, "Web Novel", "Fantasy", "Korean", 288, "A weak hunter becomes powerful.", "https://covers.openlibrary.org/b/isbn/9781648279339-L.jpg", 5, 5, "Shelf W1", "Vol 1", "Paperback"],
  ["9781718347241", "The Rising of the Shield Hero Vol.1", "Aneko Yusagi", "One Peace Books", 2015, "Web Novel", "Fantasy", "Japanese", 400, "A hero betrayed must survive alone.", "https://covers.openlibrary.org/b/isbn/9781718347241-L.jpg", 3, 3, "Shelf W1", "Vol 1", "Paperback"],

  ["9781491950296", "Designing Data-Intensive Applications", "Martin Kleppmann", "O'Reilly", 2017, "Technology", "Data Systems", "English", 616, "Modern data system design principles.", "https://covers.openlibrary.org/b/isbn/9781491950296-L.jpg", 3, 3, "Shelf B2", "1st", "Hardcover"],
  ["9781492078005", "System Design Interview", "Alex Xu", "Independently Published", 2020, "Technology", "System Design", "English", 322, "Guide to system design interviews.", "https://covers.openlibrary.org/b/isbn/9781492078005-L.jpg", 4, 4, "Shelf B3", "1st", "Paperback"],

  ["9780307474278", "The Girl with the Dragon Tattoo", "Stieg Larsson", "Vintage", 2005, "Fiction", "Thriller", "English", 465, "A journalist investigates a disappearance.", "https://covers.openlibrary.org/b/isbn/9780307474278-L.jpg", 4, 4, "Shelf T1", "Reprint", "Paperback"],
  ["9780062073488", "Gone Girl", "Gillian Flynn", "Crown", 2012, "Fiction", "Thriller", "English", 422, "A twisted story of marriage and lies.", "https://covers.openlibrary.org/b/isbn/9780062073488-L.jpg", 5, 5, "Shelf T1", "1st", "Hardcover"],

  ["9780140449266", "Crime and Punishment", "Fyodor Dostoevsky", "Penguin", 1866, "Fiction", "Classic", "English", 671, "A psychological drama of guilt.", "https://covers.openlibrary.org/b/isbn/9780140449266-L.jpg", 4, 4, "Shelf A2", "Classic", "Paperback"],
  ["9780679783268", "Jane Eyre", "Charlotte Bronte", "Vintage", 1847, "Fiction", "Romance", "English", 507, "A governess falls in love with her employer.", "https://covers.openlibrary.org/b/isbn/9780679783268-L.jpg", 3, 3, "Shelf A2", "Reprint", "Paperback"],
  ["9781400032716", "The Kite Runner", "Khaled Hosseini", "Riverhead", 2003, "Fiction", "Drama", "English", 371, "A story of friendship and redemption.", "https://covers.openlibrary.org/b/isbn/9781400032716-L.jpg", 4, 4, "Shelf A3", "1st", "Paperback"],
  ["9780316769488", "The Catcher in the Rye", "J.D. Salinger", "Little, Brown", 1951, "Fiction", "Classic", "English", 277, "Teenage rebellion and identity.", "https://covers.openlibrary.org/b/isbn/9780316769488-L.jpg", 3, 3, "Shelf A2", "Reprint", "Paperback"],
  ["9780385472579", "Zen and the Art of Motorcycle Maintenance", "Robert M. Pirsig", "Harper", 1974, "Philosophy", "Philosophical", "English", 540, "A journey into philosophy and quality.", "https://covers.openlibrary.org/b/isbn/9780385472579-L.jpg", 3, 3, "Shelf P1", "Classic", "Paperback"],

  ["9781401245252", "Batman: The Killing Joke", "Alan Moore", "DC Comics", 1988, "Graphic Novel", "Superhero", "English", 64, "Joker's origin story.", "https://covers.openlibrary.org/b/isbn/9781401245252-L.jpg", 3, 3, "Shelf G1", "Deluxe", "Hardcover"],
  ["9780785192558", "Spider-Man: Blue", "Jeph Loeb", "Marvel", 2002, "Graphic Novel", "Superhero", "English", 144, "A nostalgic Spider-Man story.", "https://covers.openlibrary.org/b/isbn/9780785192558-L.jpg", 3, 3, "Shelf G1", "1st", "Paperback"],

  ["9780060850524", "Brave New World", "Aldous Huxley", "Harper", 1932, "Fiction", "Dystopian", "English", 311, "A futuristic controlled society.", "https://covers.openlibrary.org/b/isbn/9780060850524-L.jpg", 4, 4, "Shelf A1", "Reprint", "Paperback"],
  ["9780143127741", "The Martian", "Andy Weir", "Crown", 2011, "Fiction", "Sci-Fi", "English", 369, "An astronaut stranded on Mars.", "https://covers.openlibrary.org/b/isbn/9780143127741-L.jpg", 5, 5, "Shelf A5", "1st", "Paperback"],
  ["9780812981605", "Ready Player One", "Ernest Cline", "Broadway", 2011, "Fiction", "Sci-Fi", "English", 384, "A virtual reality treasure hunt.", "https://covers.openlibrary.org/b/isbn/9780812981605-L.jpg", 5, 5, "Shelf A5", "Reprint", "Paperback"],
  ["9780385537858", "The Book Thief", "Markus Zusak", "Knopf", 2005, "Fiction", "Historical", "English", 552, "A girl steals books in Nazi Germany.", "https://covers.openlibrary.org/b/isbn/9780385537858-L.jpg", 4, 4, "Shelf A4", "1st", "Hardcover"],
  ["9780307743657", "Life of Pi", "Yann Martel", "Mariner", 2001, "Fiction", "Adventure", "English", 319, "A boy survives at sea with a tiger.", "https://covers.openlibrary.org/b/isbn/9780307743657-L.jpg", 4, 4, "Shelf A4", "Reprint", "Paperback"],
  ["9780140449136", "The Odyssey", "Homer", "Penguin", 1996, "Fiction", "Epic", "English", 541, "Odysseus' journey home.", "https://covers.openlibrary.org/b/isbn/9780140449136-L.jpg", 3, 3, "Shelf A2", "Classic", "Paperback"],
  ["9780671027032", "Angels & Demons", "Dan Brown", "Pocket Books", 2000, "Fiction", "Thriller", "English", 616, "A symbologist uncovers secrets.", "https://covers.openlibrary.org/b/isbn/9780671027032-L.jpg", 5, 5, "Shelf T2", "Reprint", "Paperback"],
  ["9780307588371", "Inferno", "Dan Brown", "Doubleday", 2013, "Fiction", "Thriller", "English", 480, "A mystery inspired by Dante.", "https://covers.openlibrary.org/b/isbn/9780307588371-L.jpg", 4, 4, "Shelf T2", "1st", "Hardcover"],
  ["9780307887443", "Ready Player Two", "Ernest Cline", "Ballantine", 2020, "Fiction", "Sci-Fi", "English", 384, "Sequel to Ready Player One.", "https://covers.openlibrary.org/b/isbn/9780307887443-L.jpg", 3, 3, "Shelf A5", "1st", "Hardcover"],
  ["9780590353427", "Harry Potter and the Sorcerer's Stone", "J.K. Rowling", "Scholastic", 1997, "Fiction", "Fantasy", "English", 309, "The beginning of Harry Potter.", "https://covers.openlibrary.org/b/isbn/9780590353427-L.jpg", 6, 6, "Shelf A3", "1st", "Hardcover"],
  ["9781408855652", "Harry Potter and the Deathly Hallows", "J.K. Rowling", "Bloomsbury", 2007, "Fiction", "Fantasy", "English", 607, "Final battle against Voldemort.", "https://covers.openlibrary.org/b/isbn/9781408855652-L.jpg", 5, 5, "Shelf A3", "1st", "Hardcover"],
  ["9781400079988", "The Da Vinci Code", "Dan Brown", "Anchor", 2003, "Fiction", "Mystery", "English", 689, "A conspiracy involving religious secrets.", "https://covers.openlibrary.org/b/isbn/9781400079988-L.jpg", 5, 5, "Shelf T2", "Reprint", "Paperback"],
  ["9780061120084", "The Fault in Our Stars", "John Green", "Dutton", 2012, "Fiction", "Romance", "English", 313, "A love story of two teens with cancer.", "https://covers.openlibrary.org/b/isbn/9780061120084-L.jpg", 4, 4, "Shelf A3", "1st", "Hardcover"],
  ["9780141439518", "Wuthering Heights", "Emily Bronte", "Penguin", 1847, "Fiction", "Classic", "English", 416, "A dark romantic tragedy.", "https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg", 3, 3, "Shelf A2", "Classic", "Paperback"],
  ["9780486280615", "Dracula", "Bram Stoker", "Dover", 1897, "Fiction", "Horror", "English", 418, "The classic vampire tale.", "https://covers.openlibrary.org/b/isbn/9780486280615-L.jpg", 4, 4, "Shelf H1", "Classic", "Paperback"],
  ["9780451532242", "Frankenstein", "Mary Shelley", "Signet", 1818, "Fiction", "Horror", "English", 280, "A scientist creates life.", "https://covers.openlibrary.org/b/isbn/9780451532242-L.jpg", 4, 4, "Shelf H1", "Reprint", "Paperback"],
];

const books = rows.map(
  ([
    isbn,
    title,
    author,
    publisher,
    publication_year,
    category,
    genre,
    language,
    pages,
    description,
    cover_image_url,
    total_copies,
    available_copies,
    location,
    edition,
    format,
  ]) => ({
    isbn,
    title,
    author,
    publisher,
    publication_year,
    category,
    genre,
    language,
    pages,
    description,
    cover_image_url,
    total_copies,
    available_copies,
    location,
    edition,
    format,
    tags: [category, genre].filter(Boolean),
    is_reference_only: false,
    is_active: true,
  })
);

async function main() {
  try {
    const result = await prisma.books.createMany({
      data: books,
      skipDuplicates: true,
    });

    const total = await prisma.books.count();
    console.log(`Inserted ${result.count} books.`);
    console.log(`Total books in DB: ${total}`);
  } catch (error) {
    console.error("Seed failed:", error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch(() => {
  process.exit(1);
});
