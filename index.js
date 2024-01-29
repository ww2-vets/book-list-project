import express from "express";
import bodyParser from "body-parser";
import multer from "multer";
import pg from "pg";

const app = express();
const port = 3000;

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://www.freecodecamp.org/news/simplify-your-file-upload-process-in-express-js/

// const storage = multer.diskStorage({
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + "-" + file.originalname)
//   },
//   destination: (req, file, cb) => {
//     cb(null, path.join(__dirname + '/public/images/'))
//   },
// })

// working
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname + "/public/images/"));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "book_notes",
  password: "5563pg",
  port: 5432,
});

db.connect();

let notes = [];
let file_name = "";

app.get("/", async (req, res) => {
  const data = await db.query(
    "select id, note_title, read_date, recom_rate, brief_note, file_name, bk_code from notes"
  );
  notes = data.rows;
  res.render("index.ejs", { notes });
});

app.get("/sort", async (req, res) => {
  const sortBy = req.query.sort;
  console.log("sortby query: " + sortBy);

  const sortedData = await db.query(
    `SELECT id, note_title, read_date, recom_rate, brief_note, file_name, bk_code FROM notes ORDER BY recom_rate DESC`
  );

  notes = sortedData.rows;
  res.render("index.ejs", { notes });
});

app.get("/note", async (req, res) => {
  const id = parseInt(req.query.id);
  console.log("id of note: " + id);
  const data = db.query("select * from notes where id=$1", [id]);
  const note = (await data).rows[0];

  console.log("note of this id:" + JSON.stringify(note));

  res.render("book-note.ejs", {
    pic: note.file_name,
    title: note.note_title,
    isbn: note.bk_code,
    date: note.read_date,
    rate: note.recom_rate,
    brief: note.brief_note,
    full: note.full_note,
  });
});

app.get("/new-note", (req, res) => {
  res.render("note-form.ejs");
});

// To handle multiple files, use upload.array.
// For a single file, use upload.single.
// "file" in upload.single("file") is the name of the input element

app.post("/submit", upload.single("file"), async (req, res) => {
  const data = req.body;
  const file = req.file;

  const note_title = data.note_title;
  const read_date = data.read_date;
  const recom_rate = data.recom_rate;
  const brief_note = data.brief_note;
  const bk_code = data.bk_code;
  const full_note = data.full_note;

  const file_name = file.originalname;

  // console.log("body: " + JSON.stringify(req.body));
  // console.log("file: " + JSON.stringify(req.file));

  try {
    const queryStm = {
      text: "INSERT INTO notes VALUES(DEFAULT, $1,$2,$3,$4,$5,$6,$7) RETURNING *",
      values: [
        note_title,
        read_date,
        recom_rate,
        file_name,
        bk_code,
        brief_note,
        full_note,
      ],
    };

    const result = await db.query(queryStm);
    // console.log(`result of insertion: ${JSON.stringify(result)}`);

    const newNote = result.rows[0];
    // console.log(`newNote: ${JSON.stringify(newNote)}`);

    const newId = parseInt(newNote.id);

    // res.json({ message: `Data insertion successful. New Id: ${newId}` });
    console.log(`Data insertion successful. New Id: ${newId}`);

    // now render the new note
    try {
        const data = await db.query("select * from notes where id=$1", [newId]);
        const note = data.rows[0];

        console.log("note of this id:" + JSON.stringify(note));

        res.render("book-note.ejs", {
          pic: note.file_name,
          title: note.note_title,
          isbn: note.bk_code,
          date: note.read_date,
          rate: note.recom_rate,
          brief: note.brief_note,
          full: note.full_note,
        });
      
    } catch (err) {
      console.log(err);
      res.render("note-form", {
        error: `Could not render new note. \nError: ${err}`,
      });
    }

  } catch (error) {
    console.log(error);
    // simple response without page rendering:
    // res.json({ message: "Data insertion failed" });

    res.render("note-form", {
      error: `Data insertion failed.`,
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
