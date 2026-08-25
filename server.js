const express = require("express");
const multer = require("multer");
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const PORT = process.env.PORT || 3000;

const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD || "change-this-password";

const ROSTER_PASSWORD =
  process.env.ROSTER_PASSWORD;

const SESSION_SECRET =
  process.env.SESSION_SECRET;

const SUPABASE_URL =
  process.env.SUPABASE_URL;

const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;


/* =========================================================
   REQUIRED ENVIRONMENT VARIABLES
========================================================= */

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}

if (!SESSION_SECRET) {
  console.error("SESSION_SECRET is not configured.");
  process.exit(1);
}

if (!ROSTER_PASSWORD) {
  console.error("ROSTER_PASSWORD is not configured.");
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Supabase API environment variables are not configured."
  );
  process.exit(1);
}


/* =========================================================
   DATABASE / SUPABASE
========================================================= */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);


/* =========================================================
   FILE UPLOADS
========================================================= */

const uploadDir =
  path.join(__dirname, "uploads");

fs.mkdirSync(
  uploadDir,
  {
    recursive: true
  }
);


const excelUpload = multer({
  dest: uploadDir,

  limits: {
    fileSize: 10 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    const ok =
      /\.(xlsx|xls)$/i.test(
        file.originalname
      );

    cb(
      ok
        ? null
        : new Error(
            "Only Excel files (.xlsx or .xls) are allowed."
          ),
      ok
    );
  }
});


const imageUpload = multer({
  dest: uploadDir,

  limits: {
    fileSize: 5 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {
    const ok =
      /\.(jpg|jpeg|png|webp)$/i.test(
        file.originalname
      );

    cb(
      ok
        ? null
        : new Error(
            "Only JPG, PNG or WebP images are allowed."
          ),
      ok
    );
  }
});


app.use(express.json());

app.use(
  express.urlencoded({
    extended: true
  })
);

const documentUpload = multer({
  dest: uploadDir,

  limits: {
    fileSize: 25 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {

    const allowedExtensions =
      /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/i;

    const ok =
      allowedExtensions.test(
        file.originalname
      );

    cb(
      ok
        ? null
        : new Error(
            "Only PDF, Word, Excel, PowerPoint and text files are allowed."
          ),
      ok
    );
  }
});
/* =========================================================
   COOKIE HELPERS
========================================================= */

const ADMIN_COOKIE =
  "scpa_admin";

const ROSTER_COOKIE =
  "scpa_roster_member";


function parseCookies(req) {
  const cookies = {};

  const header =
    req.headers.cookie;

  if (!header) {
    return cookies;
  }

  header
    .split(";")
    .forEach(cookie => {

      const parts =
        cookie.trim().split("=");

      const name =
        parts.shift();

      const value =
        parts.join("=");

      cookies[name] =
        decodeURIComponent(value);
    });

  return cookies;
}


/* =========================================================
   SIGNED TOKEN HELPERS
========================================================= */

function createSignedToken(
  purpose,
  lifetimeMilliseconds
) {

  const expires =
    Date.now() + lifetimeMilliseconds;

  const payload =
    `${purpose}:${expires}`;

  const signature =
    crypto
      .createHmac(
        "sha256",
        SESSION_SECRET
      )
      .update(payload)
      .digest("hex");

  return `${expires}.${signature}`;
}


function validSignedToken(
  token,
  purpose
) {

  if (!token) {
    return false;
  }

  const parts =
    token.split(".");

  if (parts.length !== 2) {
    return false;
  }

  const [
    expires,
    signature
  ] = parts;


  if (
    !expires ||
    !signature
  ) {
    return false;
  }


  if (
    Number(expires) < Date.now()
  ) {
    return false;
  }


  const payload =
    `${purpose}:${expires}`;


  const expected =
    crypto
      .createHmac(
        "sha256",
        SESSION_SECRET
      )
      .update(payload)
      .digest("hex");


  try {

    const actualBuffer =
      Buffer.from(
        signature,
        "utf8"
      );

    const expectedBuffer =
      Buffer.from(
        expected,
        "utf8"
      );


    if (
      actualBuffer.length !==
      expectedBuffer.length
    ) {
      return false;
    }


    return crypto.timingSafeEqual(
      actualBuffer,
      expectedBuffer
    );

  } catch {
    return false;
  }
}


/* =========================================================
   ADMIN AUTHENTICATION
========================================================= */

function createAdminToken() {

  return createSignedToken(
    "admin",
    7 * 24 * 60 * 60 * 1000
  );
}


function isAdmin(req) {

  const cookies =
    parseCookies(req);

  return validSignedToken(
    cookies[ADMIN_COOKIE],
    "admin"
  );
}


function admin(
  req,
  res,
  next
) {

  if (!isAdmin(req)) {

    return res
      .status(401)
      .json({
        error:
          "Admin login required."
      });
  }

  next();
}


/* =========================================================
   ADMIN LOGIN / LOGOUT
========================================================= */

app.post(
  "/api/admin/login",
  (req, res) => {

    const supplied =
      req.body.password;


    if (
      supplied !==
      ADMIN_PASSWORD
    ) {

      return res
        .status(401)
        .json({
          error:
            "Incorrect admin password."
        });
    }


    const token =
      createAdminToken();


    res.setHeader(
      "Set-Cookie",
      `${ADMIN_COOKIE}=${encodeURIComponent(token)}; ` +
      `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`
    );


    res.json({
      ok: true
    });
  }
);


app.post(
  "/api/admin/logout",
  (req, res) => {

    res.setHeader(
      "Set-Cookie",
      `${ADMIN_COOKIE}=; ` +
      `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
    );


    res.json({
      ok: true
    });
  }
);


app.get(
  "/api/admin/status",
  (req, res) => {

    res.json({
      authenticated:
        isAdmin(req)
    });
  }
);


/* =========================================================
   MEMBER ROSTER AUTHENTICATION
========================================================= */

function createRosterToken() {

  /*
    Member roster login remains valid
    for 30 days on that browser.
  */

  return createSignedToken(
    "roster",
    30 * 24 * 60 * 60 * 1000
  );
}


function isRosterMember(req) {

  const cookies =
    parseCookies(req);

  return validSignedToken(
    cookies[ROSTER_COOKIE],
    "roster"
  );
}


function rosterAccess(
  req,
  res,
  next
) {

  /*
    Admin users can also see the roster
    without entering the member password.
  */

  if (
    isAdmin(req) ||
    isRosterMember(req)
  ) {

    return next();
  }


  return res
    .status(401)
    .json({
      error:
        "Member roster login required."
    });
}


/* =========================================================
   MEMBER ROSTER LOGIN
========================================================= */

app.post(
  "/api/roster/login",
  (req, res) => {

    const supplied =
      req.body.password;


    if (
      supplied !==
      ROSTER_PASSWORD
    ) {

      return res
        .status(401)
        .json({
          error:
            "Incorrect member password."
        });
    }


    const token =
      createRosterToken();


    res.setHeader(
      "Set-Cookie",
      `${ROSTER_COOKIE}=${encodeURIComponent(token)}; ` +
      `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`
    );


    res.json({
      ok: true
    });
  }
);


/* =========================================================
   MEMBER ROSTER LOGOUT
========================================================= */

app.post(
  "/api/roster/logout",
  (req, res) => {

    res.setHeader(
      "Set-Cookie",
      `${ROSTER_COOKIE}=; ` +
      `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`
    );


    res.json({
      ok: true
    });
  }
);


/* =========================================================
   MEMBER ROSTER STATUS
========================================================= */

app.get(
  "/api/roster/status",
  (req, res) => {

    res.json({
      authenticated:
        isAdmin(req) ||
        isRosterMember(req)
    });
  }
);


/* =========================================================
   TRAININGS
========================================================= */

app.get(
  "/api/trainings",
  async (req, res) => {

    try {

      const result =
        await pool.query(`
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


      res.json(
        result.rows
      );

    } catch (err) {

      console.error(
        "Error loading trainings:",
        err
      );


      res
        .status(500)
        .json({
          error:
            "Could not load training sessions."
        });
    }
  }
);


app.post(
  "/api/trainings",
  admin,
  async (req, res) => {

    try {

      const {
        title,
        date,
        type,
        location,
        description
      } = req.body;


      if (
        !title ||
        !date ||
        !type
      ) {

        return res
          .status(400)
          .json({
            error:
              "Title, date and type are required."
          });
      }


      const result =
        await pool.query(
          `
          INSERT INTO trainings
            (
              title,
              date,
              type,
              location,
              description
            )
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
        id:
          result.rows[0].id
      });

    } catch (err) {

      console.error(
        "Error creating training:",
        err
      );


      res
        .status(500)
        .json({
          error:
            "Could not save the training session."
        });
    }
  }
);


app.put(
  "/api/trainings/:id",
  admin,
  async (req, res) => {

    try {

      const {
        title,
        date,
        type,
        location,
        description
      } = req.body;


      if (
        !title ||
        !date ||
        !type
      ) {

        return res
          .status(400)
          .json({
            error:
              "Title, date and type are required."
          });
      }


      const result =
        await pool.query(
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


      if (
        result.rows.length === 0
      ) {

        return res
          .status(404)
          .json({
            error:
              "Session not found."
          });
      }


      res.json({
        ok: true
      });

    } catch (err) {

      console.error(
        "Error updating training:",
        err
      );


      res
        .status(500)
        .json({
          error:
            "Could not update the training session."
        });
    }
  }
);


app.delete(
  "/api/trainings/:id",
  admin,
  async (req, res) => {

    try {

      await pool.query(
        "DELETE FROM trainings WHERE id = $1",
        [
          req.params.id
        ]
      );


      res.json({
        ok: true
      });

    } catch (err) {

      console.error(
        "Error deleting training:",
        err
      );


      res
        .status(500)
        .json({
          error:
            "Could not delete the training session."
        });
    }
  }
);


/* =========================================================
   CHAPTER MEETINGS
========================================================= */

app.get(
  "/api/meetings",
  async (req, res) => {

    try {

      const result =
        await pool.query(`
          SELECT
            id,
            title,
            meeting_date,
            meeting_time,
            location,
            description,
            meeting_link,
            created_at
          FROM meetings
          ORDER BY
            meeting_date ASC,
            meeting_time ASC NULLS LAST,
            id DESC
        `);


      res.json(
        result.rows
      );

    } catch (err) {

      console.error(
        "Error loading meetings:",
        err
      );


      res
        .status(500)
        .json({
          error:
            "Could not load chapter meetings."
        });
    }
  }
);


app.post(
  "/api/meetings",
  admin,
  async (req, res) => {

    try {

      const {
        title,
        meeting_date,
        meeting_time,
        location,
        description,
        meeting_link
      } = req.body;


      if (
        !title ||
        !meeting_date
      ) {

        return res
          .status(400)
          .json({
            error:
              "Meeting title and date are required."
          });
      }


      const result =
        await pool.query(
          `
          INSERT INTO meetings
            (
              title,
              meeting_date,
              meeting_time,
              location,
              description,
              meeting_link
            )
          VALUES
            ($1, $2, $3, $4, $5, $6)
          RETURNING id
          `,
          [
            title,
            meeting_date,
            meeting_time || null,
            location || "",
            description || "",
            meeting_link || ""
          ]
        );


      res.json({
        id:
          result.rows[0].id
      });

    } catch (err) {

      console.error(
        "Error creating meeting:",
        err
      );


      res
        .status(500)
        .json({
          error:
            "Could not save the meeting."
        });
    }
  }
);


app.put(
  "/api/meetings/:id",
  admin,
  async (req, res) => {

    try {

      const {
        title,
        meeting_date,
        meeting_time,
        location,
        description,
        meeting_link
      } = req.body;


      if (
        !title ||
        !meeting_date
      ) {

        return res
          .status(400)
          .json({
            error:
              "Meeting title and date are required."
          });
      }


      const result =
        await pool.query(
          `
          UPDATE meetings
          SET
            title = $1,
            meeting_date = $2,
            meeting_time = $3,
            location = $4,
            description = $5,
            meeting_link = $6
          WHERE id = $7
          RETURNING id
          `,
          [
            title,
            meeting_date,
            meeting_time || null,
            location || "",
            description || "",
            meeting_link || "",
            req.params.id
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res
          .status(404)
          .json({
            error:
              "Meeting not found."
          });
      }


      res.json({
        ok: true
      });

    } catch (err) {

      console.error(
        "Error updating meeting:",
        err
      );


      res
        .status(500)
        .json({
          error:
            "Could not update the meeting."
        });
    }
  }
);


app.delete(
  "/api/meetings/:id",
  admin,
  async (req, res) => {

    try {

      await pool.query(
        "DELETE FROM meetings WHERE id = $1",
        [
          req.params.id
        ]
      );


      res.json({
        ok: true
      });

    } catch (err) {

      console.error(
        "Error deleting meeting:",
        err
      );


      res
        .status(500)
        .json({
          error:
            "Could not delete the meeting."
        });
    }
  }
);


/* =========================================================
   BOARD MEMBERS
========================================================= */

app.get(
  "/api/board-members",
  async (req, res) => {

    try {

      const result =
        await pool.query(`
          SELECT
            id,
            name,
            position_title,
            description,
            photo_url,
            display_order,
            created_at
          FROM board_members
          ORDER BY
            display_order ASC,
            id ASC
        `);


      res.json(
        result.rows
      );

    } catch (err) {

      console.error(
        "Error loading board members:",
        err
      );


      res
        .status(500)
        .json({
          error:
            "Could not load board members."
        });
    }
  }
);


app.post(
  "/api/board-members",
  admin,
  imageUpload.single("photo"),
  async (req, res) => {

    try {

      const {
        name,
        position_title,
        description,
        display_order
      } = req.body;


      if (
        !name ||
        !position_title
      ) {

        return res
          .status(400)
          .json({
            error:
              "Name and position title are required."
          });
      }


      let photoUrl = "";


      if (req.file) {
        photoUrl =
          await uploadBoardPhoto(
            req.file
          );
      }


      const result =
        await pool.query(
          `
          INSERT INTO board_members
            (
              name,
              position_title,
              description,
              photo_url,
              display_order
            )
          VALUES
            ($1, $2, $3, $4, $5)
          RETURNING id
          `,
          [
            name,
            position_title,
            description || "",
            photoUrl,
            Number(display_order) || 0
          ]
        );


      res.json({
        id:
          result.rows[0].id
      });

    } catch (err) {

      console.error(
        "Error creating board member:",
        err
      );


      res
        .status(500)
        .json({
          error:
            "Could not save the board member."
        });

    } finally {

      cleanupUploadedFile(
        req.file
      );
    }
  }
);


app.put(
  "/api/board-members/:id",
  admin,
  imageUpload.single("photo"),
  async (req, res) => {

    try {

      const {
        name,
        position_title,
        description,
        display_order
      } = req.body;


      if (
        !name ||
        !position_title
      ) {

        return res
          .status(400)
          .json({
            error:
              "Name and position title are required."
          });
      }


      const existingResult =
        await pool.query(
          `
          SELECT photo_url
          FROM board_members
          WHERE id = $1
          `,
          [
            req.params.id
          ]
        );


      if (
        existingResult.rows.length === 0
      ) {

        return res
          .status(404)
          .json({
            error:
              "Board member not found."
          });
      }


      let photoUrl =
        existingResult.rows[0]
          .photo_url || "";


      if (req.file) {

        const newPhotoUrl =
          await uploadBoardPhoto(
            req.file
          );


        if (photoUrl) {
          await deleteBoardPhotoFromStorage(
            photoUrl
          );
        }


        photoUrl =
          newPhotoUrl;
      }


      await pool.query(
        `
        UPDATE board_members
        SET
          name = $1,
          position_title = $2,
          description = $3,
          photo_url = $4,
          display_order = $5
        WHERE id = $6
        `,
        [
          name,
          position_title,
          description || "",
          photoUrl,
          Number(display_order) || 0,
          req.params.id
        ]
      );


      res.json({
        ok: true
      });

    } catch (err) {

      console.error(
        "Error updating board member:",
        err
      );


      res
        .status(500)
        .json({
          error:
            "Could not update the board member."
        });

    } finally {

      cleanupUploadedFile(
        req.file
      );
    }
  }
);


app.delete(
  "/api/board-members/:id",
  admin,
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT photo_url
          FROM board_members
          WHERE id = $1
          `,
          [
            req.params.id
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res
          .status(404)
          .json({
            error:
              "Board member not found."
          });
      }


      const photoUrl =
        result.rows[0]
          .photo_url || "";


      await pool.query(
        "DELETE FROM board_members WHERE id = $1",
        [
          req.params.id
        ]
      );


      if (photoUrl) {
        await deleteBoardPhotoFromStorage(
          photoUrl
        );
      }


      res.json({
        ok: true
      });

    } catch (err) {

      console.error(
        "Error deleting board member:",
        err
      );


      res
        .status(500)
        .json({
          error:
            "Could not delete the board member."
        });
    }
  }
);


/* =========================================================
   BOARD PHOTO HELPERS
========================================================= */

async function uploadBoardPhoto(
  file
) {

  const extension =
    path
      .extname(
        file.originalname
      )
      .toLowerCase();


  const storageName =
    `${Date.now()}-${crypto.randomUUID()}${extension}`;


  const fileBuffer =
    fs.readFileSync(
      file.path
    );


  const {
    error
  } =
    await supabase
      .storage
      .from("board-photos")
      .upload(
        storageName,
        fileBuffer,
        {
          contentType:
            file.mimetype,

          upsert:
            false
        }
      );


  if (error) {
    throw error;
  }


  const {
    data
  } =
    supabase
      .storage
      .from("board-photos")
      .getPublicUrl(
        storageName
      );


  return data.publicUrl;
}


async function deleteBoardPhotoFromStorage(
  photoUrl
) {

  try {

    const marker =
      "/storage/v1/object/public/board-photos/";


    const markerIndex =
      photoUrl.indexOf(
        marker
      );


    if (
      markerIndex === -1
    ) {
      return;
    }


    const storagePath =
      decodeURIComponent(
        photoUrl.substring(
          markerIndex +
          marker.length
        )
      );


    await supabase
      .storage
      .from("board-photos")
      .remove([
        storagePath
      ]);

  } catch (err) {

    console.error(
      "Could not remove old board photo:",
      err
    );
  }
}


function cleanupUploadedFile(
  file
) {

  try {

    if (
      file &&
      file.path &&
      fs.existsSync(
        file.path
      )
    ) {

      fs.unlinkSync(
        file.path
      );
    }

  } catch {}
}

/* =========================================================
   MEMBER DOCUMENT HELPERS
========================================================= */

async function uploadMemberDocument(file) {

  const extension =
    path
      .extname(file.originalname)
      .toLowerCase();


  const storageName =
    `${Date.now()}-${crypto.randomUUID()}${extension}`;


  const fileBuffer =
    fs.readFileSync(file.path);


  const { error } =
    await supabase
      .storage
      .from("member-documents")
      .upload(
        storageName,
        fileBuffer,
        {
          contentType:
            file.mimetype,

          upsert:
            false
        }
      );


  if (error) {
    throw error;
  }


  return storageName;
}


async function deleteMemberDocumentFromStorage(
  storagePath
) {

  if (!storagePath) {
    return;
  }


  const { error } =
    await supabase
      .storage
      .from("member-documents")
      .remove([
        storagePath
      ]);


  if (error) {
    console.error(
      "Could not remove member document:",
      error
    );
  }
}


async function createDocumentDownloadUrl(
  storagePath
) {

  /*
    Signed URL remains valid for 5 minutes.
  */

  const { data, error } =
    await supabase
      .storage
      .from("member-documents")
      .createSignedUrl(
        storagePath,
        300
      );


  if (error) {
    throw error;
  }


  return data.signedUrl;
}
/* =========================================================
   PROTECTED MEMBER ROSTER
========================================================= */

app.get(
  "/api/roster",
  rosterAccess,
  async (req, res) => {

    try {

      const result =
        await pool.query(`
          SELECT
            filename,
            uploaded_at,
            rows_json
          FROM roster
          WHERE id = 1
        `);


      if (
        result.rows.length === 0
      ) {

        return res.json({
          filename: null,
          uploaded_at: null,
          rows: []
        });
      }


      const row =
        result.rows[0];


      res.json({
        filename:
          row.filename,

        uploaded_at:
          row.uploaded_at,

        rows:
          row.rows_json || []
      });

    } catch (err) {

      console.error(
        "Error loading roster:",
        err
      );


      res
        .status(500)
        .json({
          error:
            "Could not load the roster."
        });
    }
  }
);


/* =========================================================
   ADMIN ROSTER UPLOAD
========================================================= */

app.post(
  "/api/roster",
  admin,
  excelUpload.single("file"),
  async (req, res) => {

    if (!req.file) {

      return res
        .status(400)
        .json({
          error:
            "Please select an Excel file."
        });
    }


    try {

      const workbook =
        XLSX.readFile(
          req.file.path
        );


      const sheetName =
        workbook.SheetNames[0];


      const sheet =
        workbook.Sheets[
          sheetName
        ];


      /*
        Read worksheet as arrays instead
        of relying on Excel header names.

        Excel column indexes:
        B  = 1
        C  = 2
        F  = 5
        O  = 14
        AA = 26
      */

      const rawRows =
        XLSX.utils.sheet_to_json(
          sheet,
          {
            header: 1,
            defval: "",
            raw: false
          }
        );


      /*
        Skip the first row because it
        contains Excel headings.
      */

      const dataRows =
        rawRows.slice(1);


      const publicRows =
  dataRows
    .map(row => ({

      "Last Name":
        String(
          row[1] ?? ""
        ).trim(),

      "First Name":
        String(
          row[2] ?? ""
        ).trim(),

      "Referee Certification":
        String(
          row[5] ?? ""
        ).trim(),

      "LJ Certification":
        String(
          row[8] ?? ""
        ).trim(),

      "Scorer Certification":
        String(
          row[11] ?? ""
        ).trim(),

      "Membership Type":
        String(
          row[14] ?? ""
        ).trim(),

      "Email Address":
        String(
          row[26] ?? ""
        ).trim()

    }))
    .filter(row =>

      row["Last Name"] ||
      row["First Name"]

    );


      await pool.query(
        `
        INSERT INTO roster
          (
            id,
            filename,
            uploaded_at,
            rows_json
          )
        VALUES
          (
            1,
            $1,
            NOW(),
            $2::jsonb
          )

        ON CONFLICT (id)

        DO UPDATE SET
          filename =
            EXCLUDED.filename,

          uploaded_at =
            EXCLUDED.uploaded_at,

          rows_json =
            EXCLUDED.rows_json
        `,
        [
          req.file.originalname,
          JSON.stringify(
            publicRows
          )
        ]
      );


      cleanupUploadedFile(
        req.file
      );


      res.json({
        ok: true,
        count:
          publicRows.length
      });

    } catch (err) {

      console.error(
        "Error processing roster:",
        err
      );


      cleanupUploadedFile(
        req.file
      );


      res
        .status(400)
        .json({
          error:
            "Could not read that Excel file."
        });
    }
  }
);

/* =========================================================
   MEMBER DOCUMENTS
========================================================= */


/* ---------------------------------------------------------
   MEMBER: LIST DOCUMENTS
--------------------------------------------------------- */

app.get(
  "/api/documents",
  rosterAccess,
  async (req, res) => {

    try {

      const result =
        await pool.query(`
          SELECT
            id,
            title,
            category,
            description,
            filename,
            display_order,
            created_at
          FROM documents
          ORDER BY
            category ASC,
            display_order ASC,
            title ASC
        `);


      res.json(
        result.rows
      );

    } catch (err) {

      console.error(
        "Error loading documents:",
        err
      );


      res
        .status(500)
        .json({
          error:
            "Could not load member documents."
        });
    }
  }
);


/* ---------------------------------------------------------
   MEMBER: GET TEMPORARY DOWNLOAD LINK
--------------------------------------------------------- */

app.get(
  "/api/documents/:id/download",
  rosterAccess,
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            storage_path
          FROM documents
          WHERE id = $1
          `,
          [
            req.params.id
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res
          .status(404)
          .json({
            error:
              "Document not found."
          });
      }


      const signedUrl =
        await createDocumentDownloadUrl(
          result.rows[0].storage_path
        );


      res.json({
        url:
          signedUrl
      });

    } catch (err) {

      console.error(
        "Error creating document download:",
        err
      );


      res
        .status(500)
        .json({
          error:
            "Could not create the document download."
        });
    }
  }
);


/* ---------------------------------------------------------
   ADMIN: CREATE DOCUMENT
--------------------------------------------------------- */

app.post(
  "/api/documents",
  admin,
  documentUpload.single("file"),
  async (req, res) => {

    if (!req.file) {

      return res
        .status(400)
        .json({
          error:
            "Please select a document."
        });
    }


    let storagePath = "";


    try {

      const {
        title,
        category,
        description,
        display_order
      } = req.body;


      if (!title) {

        return res
          .status(400)
          .json({
            error:
              "Document title is required."
          });
      }


      storagePath =
        await uploadMemberDocument(
          req.file
        );


      const result =
        await pool.query(
          `
          INSERT INTO documents
            (
              title,
              category,
              description,
              filename,
              file_url,
              storage_path,
              display_order
            )
          VALUES
            (
              $1,
              $2,
              $3,
              $4,
              '',
              $5,
              $6
            )
          RETURNING id
          `,
          [
            title,
            category ||
              "Chapter Documents",

            description || "",

            req.file.originalname,

            storagePath,

            Number(
              display_order
            ) || 0
          ]
        );


      res.json({
        ok: true,
        id:
          result.rows[0].id
      });

    } catch (err) {

      console.error(
        "Error creating document:",
        err
      );


      /*
        If Storage succeeded but the database
        insert failed, remove the orphaned file.
      */

      if (storagePath) {
        await deleteMemberDocumentFromStorage(
          storagePath
        );
      }


      res
        .status(500)
        .json({
          error:
            "Could not save the document."
        });

    } finally {

      cleanupUploadedFile(
        req.file
      );
    }
  }
);


/* ---------------------------------------------------------
   ADMIN: UPDATE DOCUMENT DETAILS / OPTIONAL FILE
--------------------------------------------------------- */

app.put(
  "/api/documents/:id",
  admin,
  documentUpload.single("file"),
  async (req, res) => {

    try {

      const {
        title,
        category,
        description,
        display_order
      } = req.body;


      if (!title) {

        return res
          .status(400)
          .json({
            error:
              "Document title is required."
          });
      }


      const existing =
        await pool.query(
          `
          SELECT
            filename,
            storage_path
          FROM documents
          WHERE id = $1
          `,
          [
            req.params.id
          ]
        );


      if (
        existing.rows.length === 0
      ) {

        return res
          .status(404)
          .json({
            error:
              "Document not found."
          });
      }


      let filename =
        existing.rows[0].filename;

      let storagePath =
        existing.rows[0].storage_path;


      if (req.file) {

        const newStoragePath =
          await uploadMemberDocument(
            req.file
          );


        await deleteMemberDocumentFromStorage(
          storagePath
        );


        storagePath =
          newStoragePath;

        filename =
          req.file.originalname;
      }


      await pool.query(
        `
        UPDATE documents
        SET
          title = $1,
          category = $2,
          description = $3,
          filename = $4,
          storage_path = $5,
          display_order = $6
        WHERE id = $7
        `,
        [
          title,

          category ||
            "Chapter Documents",

          description || "",

          filename,

          storagePath,

          Number(
            display_order
          ) || 0,

          req.params.id
        ]
      );


      res.json({
        ok: true
      });

    } catch (err) {

      console.error(
        "Error updating document:",
        err
      );


      res
        .status(500)
        .json({
          error:
            "Could not update the document."
        });

    } finally {

      cleanupUploadedFile(
        req.file
      );
    }
  }
);


/* ---------------------------------------------------------
   ADMIN: DELETE DOCUMENT
--------------------------------------------------------- */

app.delete(
  "/api/documents/:id",
  admin,
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            storage_path
          FROM documents
          WHERE id = $1
          `,
          [
            req.params.id
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res
          .status(404)
          .json({
            error:
              "Document not found."
          });
      }


      const storagePath =
        result.rows[0]
          .storage_path;


      await pool.query(
        `
        DELETE FROM documents
        WHERE id = $1
        `,
        [
          req.params.id
        ]
      );


      await deleteMemberDocumentFromStorage(
        storagePath
      );


      res.json({
        ok: true
      });

    } catch (err) {

      console.error(
        "Error deleting document:",
        err
      );


      res
        .status(500)
        .json({
          error:
            "Could not delete the document."
        });
    }
  }
);
/* =========================================================
   ADMIN PAGE
========================================================= */

app.get(
  "/admin",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "admin.html"
      )
    );
  }
);


/* =========================================================
   PUBLIC FILES
========================================================= */

app.use(
  express.static(
    path.join(
      __dirname,
      "public"
    )
  )
);


/* =========================================================
   PUBLIC WEBSITE
========================================================= */

app.get(
  "*",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );
  }
);


/* =========================================================
   START SERVER
========================================================= */

app.listen(
  PORT,
  () => {

    console.log(
      `SCPA Volleyball Officials site running on port ${PORT}`
    );
  }
);
