const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-this-password";

const dataDir = path.join(__dirname, "data");
const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(dataDir, { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

const db = new Database(path.join(dataDir, "scpa.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS trainings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    location TEXT DEFAULT '',
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS roster (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    filename TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    rows_json TEXT NOT NULL
  );
`);

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname);
    cb(ok ? null : new Error("Only Excel files (.xlsx or .xls) are allowed."), ok);
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

function admin(req, res, next) {
  const supplied = req.headers["x-admin-password"] || req.body.password;
  if (supplied !== ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });
  next();
}

app.get("/api/trainings", (req, res) => {
  const rows = db.prepare("SELECT * FROM trainings ORDER BY date ASC, id DESC").all();
  res.json(rows);
});

app.post("/api/trainings", admin, (req, res) => {
  const { title, date, type, location, description } = req.body;
  if (!title || !date || !type) return res.status(400).json({ error: "Title, date and type are required." });
  const info = db.prepare(`
    INSERT INTO trainings (title, date, type, location, description)
    VALUES (?, ?, ?, ?, ?)
  `).run(title, date, type, location || "", description || "");
  res.json({ id: info.lastInsertRowid });
});

app.delete("/api/trainings/:id", admin, (req, res) => {
  db.prepare("DELETE FROM trainings WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.get("/api/roster", (req, res) => {
  const row = db.prepare("SELECT * FROM roster WHERE id = 1").get();
  if (!row) return res.json({ filename: null, uploaded_at: null, rows: [] });
  res.json({ filename: row.filename, uploaded_at: row.uploaded_at, rows: JSON.parse(row.rows_json) });
});

app.post("/api/roster", admin, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Please select an Excel file." });

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    db.prepare(`
      INSERT INTO roster (id, filename, uploaded_at, rows_json)
      VALUES (1, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        filename=excluded.filename,
        uploaded_at=excluded.uploaded_at,
        rows_json=excluded.rows_json
    `).run(
      req.file.originalname,
      new Date().toISOString(),
      JSON.stringify(rows)
    );

    fs.unlinkSync(req.file.path);
    res.json({ ok: true, count: rows.length });
  } catch (err) {
    try { fs.unlinkSync(req.file.path); } catch {}
    res.status(400).json({ error: "Could not read that Excel file." });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`SCPA Volleyball Officials site running on http://localhost:${PORT}`);
});
