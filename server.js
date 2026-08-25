const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const app = express();

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "change-this-password";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const uploadDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  dest: uploadDir,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls)$/i.test(file.originalname);

    cb(
      ok ? null : new Error("Only Excel files (.xlsx or .xls) are allowed."),
      ok
    );
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

function admin(req, res, next) {
  const supplied =
    req.headers["x-admin-password"] || req.body.password;

  if (supplied !== ADMIN_PASSWORD) {
    return res.status(401).json({
      error: "Unauthorized"
    });
  }

  next();
}

app.get("/api/trainings", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        title,
        date,
        type,
        location,
        description,
        created_at
      FROM trainings
      ORDER BY date ASC, id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error("Error loading trainings:", err);

    res.status(500).json({
      error: "Could not load training sessions."
    });
  }
});

app.post("/api/trainings", admin, async (req, res) => {
  try {
    const {
      title,
      date,
      type,
      location,
      description
    } = req.body;

    if (!title || !date || !type) {
      return res.status(400).json({
        error: "Title, date and type are required."
      });
    }

    const result = await pool.query(
      `
      INSERT INTO trainings
        (title, date, type, location, description)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [
        title,
        date,
        type,
        location || "",
        description || ""
      ]
    );

    res.json({
      id: result.rows[0].id
    });
  } catch (err) {
    console.error("Error creating training:", err);

    res.status(500).json({
      error: "Could not save the training session."
    });
  }
});

app.put("/api/trainings/:id", admin, async (req, res) => {
  try {
    const {
      title,
      date,
      type,
      location,
      description
    } = req.body;

    if (!title || !date || !type) {
      return res.status(400).json({
        error: "Title, date and type are required."
      });
    }

    const result = await pool.query(
      `
      UPDATE trainings
      SET
        title = $1,
        date = $2,
        type = $3,
        location = $4,
        description = $5
      WHERE id = $6
      RETURNING id
      `,
      [
        title,
        date,
        type,
        location || "",
        description || "",
        req.params.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Session not found."
      });
    }

    res.json({
      ok: true,
      id: result.rows[0].id
    });
  } catch (err) {
    console.error("Error updating training:", err);

    res.status(500).json({
      error: "Could not update the training session."
    });
  }
});

app.delete("/api/trainings/:id", admin, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM trainings WHERE id = $1",
      [req.params.id]
    );

    res.json({
      ok: true
    });
  } catch (err) {
    console.error("Error deleting training:", err);

    res.status(500).json({
      error: "Could not delete the training session."
    });
  }
});

app.get("/api/roster", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        filename,
        uploaded_at,
        rows_json
      FROM roster
      WHERE id = 1
    `);

    if (result.rows.length === 0) {
      return res.json({
        filename: null,
        uploaded_at: null,
        rows: []
      });
    }

    const row = result.rows[0];

    res.json({
      filename: row.filename,
      uploaded_at: row.uploaded_at,
      rows: row.rows_json || []
    });
  } catch (err) {
    console.error("Error loading roster:", err);

    res.status(500).json({
      error: "Could not load the roster."
    });
  }
});

app.post(
  "/api/roster",
  admin,
  upload.single("file"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: "Please select an Excel file."
      });
    }

    try {
      const workbook = XLSX.readFile(req.file.path);

      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: ""
      });

      await pool.query(
        `
        INSERT INTO roster
          (id, filename, uploaded_at, rows_json)
        VALUES
          (1, $1, NOW(), $2::jsonb)

        ON CONFLICT (id)
        DO UPDATE SET
          filename = EXCLUDED.filename,
          uploaded_at = EXCLUDED.uploaded_at,
          rows_json = EXCLUDED.rows_json
        `,
        [
          req.file.originalname,
          JSON.stringify(rows)
        ]
      );

      fs.unlinkSync(req.file.path);

      res.json({
        ok: true,
        count: rows.length
      });
    } catch (err) {
      console.error("Error processing roster:", err);

      try {
        if (
          req.file &&
          req.file.path &&
          fs.existsSync(req.file.path)
        ) {
          fs.unlinkSync(req.file.path);
        }
      } catch {}

      res.status(400).json({
        error: "Could not read that Excel file."
      });
    }
  }
);

app.get("*", (req, res) => {
  res.sendFile(
    path.join(__dirname, "public", "index.html")
  );
});

app.listen(PORT, () => {
  console.log(
    `SCPA Volleyball Officials site running on port ${PORT}`
  );
});
