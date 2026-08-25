/* =========================================================
   TRAINING & RATING SESSIONS
========================================================= */

async function loadTrainings() {
  const box = document.getElementById("training-list");
  if (!box) return;

  try {
    const response = await fetch("/api/trainings");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load sessions.");
    }

    if (!data.length) {
      box.innerHTML = `
        <div class="training-card">
          <div class="training-type">Coming Soon</div>
          <h3>Training Calendar</h3>
          <p class="training-description">
            Chapter training sessions and rating opportunities will be posted here.
          </p>
        </div>
      `;
      return;
    }

    box.innerHTML = data.map(session => `
      <article class="training-card">
        <div class="training-type">
          ${escapeHtml(session.type)}
        </div>

        <h3>${escapeHtml(session.title)}</h3>

        <div class="training-date">
          ${formatDate(session.date)}
        </div>

        ${
          session.location
            ? `<div class="training-location">${escapeHtml(session.location)}</div>`
            : ""
        }

        ${
          session.description
            ? `<div class="training-description">${escapeHtml(session.description)}</div>`
            : ""
        }
      </article>
    `).join("");

  } catch (error) {
    console.error("Training error:", error);

    box.innerHTML = `
      <div class="loading">
        Unable to load training sessions.
      </div>
    `;
  }
}


/* =========================================================
   CHAPTER MEETINGS
========================================================= */

async function loadMeetings() {
  const box = document.getElementById("meeting-list");
  if (!box) return;

  try {
    const response = await fetch("/api/meetings");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load meetings.");
    }

    if (!data.length) {
      box.innerHTML = `
        <div class="training-card">
          <div class="training-type">No Meetings Scheduled</div>
          <h3>Chapter Meetings</h3>
          <p class="training-description">
            Upcoming chapter meetings will be posted here.
          </p>
        </div>
      `;
      return;
    }

    box.innerHTML = data.map(meeting => `
      <article class="training-card meeting-card">

        <div class="training-type">
          Chapter Meeting
        </div>

        <h3>
          ${escapeHtml(meeting.title)}
        </h3>

        <div class="training-date">
          ${formatDate(meeting.meeting_date)}
        </div>

        ${
          meeting.meeting_time
            ? `<div class="meeting-time">${formatTime(meeting.meeting_time)}</div>`
            : ""
        }

        ${
          meeting.location
            ? `<div class="training-location">${escapeHtml(meeting.location)}</div>`
            : ""
        }

        ${
          meeting.description
            ? `<div class="training-description">${escapeHtml(meeting.description)}</div>`
            : ""
        }

        ${
          meeting.meeting_link
            ? `
              <div class="meeting-link-wrap">
                <a
                  class="btn primary meeting-link"
                  href="${escapeAttribute(meeting.meeting_link)}"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Join / View Meeting
                </a>
              </div>
            `
            : ""
        }

      </article>
    `).join("");

  } catch (error) {
    console.error("Meeting error:", error);

    box.innerHTML = `
      <div class="loading">
        Unable to load chapter meetings.
      </div>
    `;
  }
}


/* =========================================================
   BOARD MEMBERS
========================================================= */

async function loadBoardMembers() {
  const box = document.getElementById("board-list");
  if (!box) return;

  try {
    const response = await fetch("/api/board-members");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load board members.");
    }

    if (!data.length) {
      box.innerHTML = `
        <div class="board-empty">
          Board member information will be added soon.
        </div>
      `;
      return;
    }

    box.innerHTML = data.map(member => `
      <article class="board-card">

        <div class="board-photo-wrap">

          ${
            member.photo_url
              ? `
                <img
                  class="board-photo"
                  src="${escapeAttribute(member.photo_url)}"
                  alt="${escapeAttribute(member.name)}"
                >
              `
              : `
                <div class="board-photo board-photo-placeholder">
                  ${getInitials(member.name)}
                </div>
              `
          }

        </div>

        <div class="board-card-content">

          <h3>
            ${escapeHtml(member.name)}
          </h3>

          <div class="board-position">
            ${escapeHtml(member.position_title)}
          </div>

          ${
            member.description
              ? `<p>${escapeHtml(member.description)}</p>`
              : ""
          }

        </div>

      </article>
    `).join("");

  } catch (error) {
    console.error("Board member error:", error);

    box.innerHTML = `
      <div class="loading">
        Unable to load board members.
      </div>
    `;
  }
}


/* =========================================================
   ROSTER
========================================================= */

async function loadRoster() {
  const table = document.getElementById("roster-table");
  const meta = document.getElementById("roster-meta");

  if (!table) return;

  try {
    const response = await fetch("/api/roster");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load roster.");
    }

    if (!data.rows || !data.rows.length) {
      table.innerHTML = `
        <tbody>
          <tr>
            <td class="loading">
              The chapter roster has not been uploaded yet.
            </td>
          </tr>
        </tbody>
      `;

      if (meta) {
        meta.textContent = "";
      }

      return;
    }

    const headers = Object.keys(data.rows[0]);

    table.innerHTML = `
      <thead>
        <tr>
          ${headers.map(header => `
            <th>${escapeHtml(header)}</th>
          `).join("")}
        </tr>
      </thead>

      <tbody>
        ${data.rows.map(row => `
          <tr>
            ${headers.map(header => `
              <td>${escapeHtml(row[header])}</td>
            `).join("")}
          </tr>
        `).join("")}
      </tbody>
    `;

    if (meta) {
      meta.textContent =
        `${data.rows.length} officials • Updated ${
          new Date(data.uploaded_at).toLocaleDateString()
        }`;
    }

  } catch (error) {
    console.error("Roster error:", error);

    table.innerHTML = `
      <tbody>
        <tr>
          <td class="loading">
            Unable to load the roster.
          </td>
        </tr>
      </tbody>
    `;
  }
}


/* =========================================================
   HELPERS
========================================================= */

function formatDate(value) {
  if (!value) return "";

  const dateOnly = String(value).substring(0, 10);
  const date = new Date(dateOnly + "T00:00:00");

  return date.toLocaleDateString(
    undefined,
    {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric"
    }
  );
}


function formatTime(value) {
  if (!value) return "";

  const parts = String(value).split(":");

  let hour = Number(parts[0]);
  const minutes = parts[1] || "00";

  const suffix =
    hour >= 12 ? "PM" : "AM";

  hour =
    hour % 12 || 12;

  return `${hour}:${minutes} ${suffix}`;
}


function getInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join("");
}


function escapeHtml(value) {
  return String(value ?? "")
    .replace(
      /[&<>"']/g,
      character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[character])
    );
}


function escapeAttribute(value) {
  return escapeHtml(value);
}


/* =========================================================
   START PUBLIC WEBSITE
========================================================= */

loadTrainings();
loadMeetings();
loadBoardMembers();
loadRoster();
