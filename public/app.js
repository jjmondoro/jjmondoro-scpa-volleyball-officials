let rosterRows = [];
let rosterFilteredRows = [];

let rosterSortKey = "Last Name";
let rosterSortDirection = "asc";


/* =========================================================
   TRAINING
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

        <h3>
          ${escapeHtml(session.title)}
        </h3>

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
    console.error(error);

    box.innerHTML = `
      <div class="loading">
        Unable to load training sessions.
      </div>
    `;
  }
}


/* =========================================================
   MEETINGS
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
    console.error(error);

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
    console.error(error);

    box.innerHTML = `
      <div class="loading">
        Unable to load board members.
      </div>
    `;
  }
}


/* =========================================================
   ROSTER AUTH STATUS
========================================================= */

async function checkRosterStatus() {
  try {
    const response = await fetch("/api/roster/status");
    const data = await response.json();

    if (data.authenticated) {
      showRoster();
      await loadRoster();
    } else {
      showRosterLogin();
    }

  } catch (error) {
    console.error(error);
    showRosterLogin();
  }
}


function showRosterLogin() {
  document.getElementById("roster-login-panel").style.display = "block";
  document.getElementById("roster-content").style.display = "none";
}


function showRoster() {
  document.getElementById("roster-login-panel").style.display = "none";
  document.getElementById("roster-content").style.display = "block";
}


/* =========================================================
   ROSTER LOGIN
========================================================= */

document
  .getElementById("roster-login-form")
  .addEventListener("submit", async e => {

    e.preventDefault();

    const password =
      document.getElementById("roster-password").value;

    const message =
      document.getElementById("roster-login-message");

    message.textContent =
      "Checking password...";

    try {
      const response =
        await fetch("/api/roster/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            password
          })
        });

      const result =
        await response.json();

      if (!response.ok) {
        message.textContent =
          result.error || "Unable to log in.";

        return;
      }

      document.getElementById("roster-password").value = "";
      message.textContent = "";

      showRoster();
      await loadRoster();

    } catch (error) {
      console.error(error);

      message.textContent =
        "Unable to communicate with the server.";
    }
  });


/* =========================================================
   ROSTER LOGOUT
========================================================= */

document
  .getElementById("roster-logout")
  .addEventListener("click", async () => {

    try {
      await fetch("/api/roster/logout", {
        method: "POST"
      });
    } catch (error) {
      console.error(error);
    }

    rosterRows = [];
    rosterFilteredRows = [];

    showRosterLogin();

    document.getElementById("roster-meta").textContent = "";
  });


/* =========================================================
   LOAD ROSTER
========================================================= */

async function loadRoster() {
  const table =
    document.getElementById("roster-table");

  const meta =
    document.getElementById("roster-meta");

  try {
    const response =
      await fetch("/api/roster");

    const data =
      await response.json();

    if (response.status === 401) {
      showRosterLogin();
      return;
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Unable to load roster."
      );
    }

    rosterRows =
      Array.isArray(data.rows)
        ? data.rows
        : [];

    if (!rosterRows.length) {
      table.innerHTML = `
        <tbody>
          <tr>
            <td class="loading">
              The chapter roster has not been uploaded yet.
            </td>
          </tr>
        </tbody>
      `;

      meta.textContent = "";

      return;
    }

    meta.textContent =
      `${rosterRows.length} officials • Updated ${
        new Date(data.uploaded_at).toLocaleDateString()
      }`;

    populateRosterFilters();

    applyRosterFilters();

  } catch (error) {
    console.error(error);

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
   FILTERS
========================================================= */

function populateRosterFilters() {
  populateSelect(
    "filter-referee",
    "Referee Certification"
  );

  populateSelect(
    "filter-lj",
    "LJ Certification"
  );

  populateSelect(
    "filter-scorer",
    "Scorer Certification"
  );

  populateSelect(
    "filter-membership",
    "Membership Type"
  );
}


function populateSelect(
  elementId,
  propertyName
) {
  const select =
    document.getElementById(elementId);

  const currentValue =
    select.value;

  const values =
    [...new Set(
      rosterRows
        .map(row =>
          String(
            row[propertyName] || ""
          ).trim()
        )
        .filter(Boolean)
    )]
    .sort((a, b) =>
      a.localeCompare(b)
    );

  select.innerHTML =
    `<option value="">All</option>` +
    values.map(value => `
      <option value="${escapeAttribute(value)}">
        ${escapeHtml(value)}
      </option>
    `).join("");

  if (values.includes(currentValue)) {
    select.value = currentValue;
  }
}


function applyRosterFilters() {
  const search =
    document
      .getElementById("roster-search")
      .value
      .trim()
      .toLowerCase();

  const referee =
    document.getElementById("filter-referee").value;

  const lj =
    document.getElementById("filter-lj").value;

  const scorer =
    document.getElementById("filter-scorer").value;

  const membership =
    document.getElementById("filter-membership").value;


  rosterFilteredRows =
    rosterRows.filter(row => {

      const searchable =
        [
          row["Last Name"],
          row["First Name"],
          row["Referee Certification"],
          row["LJ Certification"],
          row["Scorer Certification"],
          row["Membership Type"],
          row["Email Address"]
        ]
        .join(" ")
        .toLowerCase();


      if (
        search &&
        !searchable.includes(search)
      ) {
        return false;
      }


      if (
        referee &&
        row["Referee Certification"] !== referee
      ) {
        return false;
      }


      if (
        lj &&
        row["LJ Certification"] !== lj
      ) {
        return false;
      }


      if (
        scorer &&
        row["Scorer Certification"] !== scorer
      ) {
        return false;
      }


      if (
        membership &&
        row["Membership Type"] !== membership
      ) {
        return false;
      }


      return true;
    });


  sortRosterRows();

  renderRoster();
}
/* =========================================================
   MEMBER ROSTER COLLAPSE
========================================================= */

const memberRosterToggle =
  document.getElementById("member-roster-toggle");

const memberRosterSection =
  document.getElementById("member-roster");


if (
  memberRosterToggle &&
  memberRosterSection
) {

  memberRosterToggle.addEventListener(
    "click",
    () => {

      const isOpen =
        memberRosterSection.style.display !== "none";

      memberRosterSection.style.display =
        isOpen
          ? "none"
          : "block";

      memberRosterToggle.setAttribute(
        "aria-expanded",
        String(!isOpen)
      );

      const label =
        memberRosterToggle.querySelector("span:first-child");

      const arrow =
        memberRosterToggle.querySelector(
          ".member-roster-toggle-arrow"
        );

      if (label) {
        label.textContent =
          isOpen
            ? "Show Officials Roster"
            : "Hide Officials Roster";
      }

      if (arrow) {
        arrow.textContent =
          isOpen
            ? "▼"
            : "▲";
      }

    }
  );

}

/* =========================================================
   SORTING
========================================================= */

function sortRosterRows() {
  rosterFilteredRows.sort((a, b) => {

    const aValue =
      String(
        a[rosterSortKey] || ""
      );

    const bValue =
      String(
        b[rosterSortKey] || ""
      );


    const result =
      aValue.localeCompare(
        bValue,
        undefined,
        {
          numeric: true,
          sensitivity: "base"
        }
      );


    return rosterSortDirection === "asc"
      ? result
      : -result;
  });
}


function changeRosterSort(key) {
  if (rosterSortKey === key) {

    rosterSortDirection =
      rosterSortDirection === "asc"
        ? "desc"
        : "asc";

  } else {

    rosterSortKey = key;
    rosterSortDirection = "asc";
  }

  sortRosterRows();
  renderRoster();
}


/* =========================================================
   RENDER ROSTER
========================================================= */

function renderRoster() {
  const table =
    document.getElementById("roster-table");

  const count =
    document.getElementById("roster-results-count");


  count.textContent =
    `${rosterFilteredRows.length} of ${rosterRows.length} officials`;


  const columns = [
    "Last Name",
    "First Name",
    "Referee Certification",
    "LJ Certification",
    "Scorer Certification",
    "Membership Type",
    "Email Address"
  ];


  if (!rosterFilteredRows.length) {
    table.innerHTML = `
      <thead>
        ${buildRosterHeader(columns)}
      </thead>

      <tbody>
        <tr>
          <td colspan="${columns.length}" class="loading">
            No officials match the current search or filters.
          </td>
        </tr>
      </tbody>
    `;

    attachRosterSortListeners();

    return;
  }


  table.innerHTML = `
    <thead>
      ${buildRosterHeader(columns)}
    </thead>

    <tbody>

      ${rosterFilteredRows.map(row => `
        <tr>

          ${columns.map(column => {

            if (
              column === "Email Address" &&
              row[column]
            ) {

              return `
                <td>
                  <a
                    class="roster-email"
                    href="mailto:${escapeAttribute(row[column])}"
                  >
                    ${escapeHtml(row[column])}
                  </a>
                </td>
              `;
            }

            return `
              <td>
                ${escapeHtml(row[column] || "")}
              </td>
            `;

          }).join("")}

        </tr>
      `).join("")}

    </tbody>
  `;


  attachRosterSortListeners();
}


function buildRosterHeader(columns) {
  return `
    <tr>

      ${columns.map(column => {

        let arrow = "";

        if (rosterSortKey === column) {
          arrow =
            rosterSortDirection === "asc"
              ? " ▲"
              : " ▼";
        }

        return `
          <th>
            <button
              type="button"
              class="roster-sort"
              data-sort="${escapeAttribute(column)}"
            >
              ${escapeHtml(column)}${arrow}
            </button>
          </th>
        `;

      }).join("")}

    </tr>
  `;
}


function attachRosterSortListeners() {
  document
    .querySelectorAll(".roster-sort")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {
          changeRosterSort(
            button.dataset.sort
          );
        }
      );

    });
}


/* =========================================================
   FILTER LISTENERS
========================================================= */

document
  .getElementById("roster-search")
  .addEventListener(
    "input",
    applyRosterFilters
  );


[
  "filter-referee",
  "filter-lj",
  "filter-scorer",
  "filter-membership"
]
.forEach(id => {

  document
    .getElementById(id)
    .addEventListener(
      "change",
      applyRosterFilters
    );

});


/* =========================================================
   HELPERS
========================================================= */

function formatDate(value) {
  if (!value) return "";

  const dateOnly =
    String(value).substring(0, 10);

  const date =
    new Date(
      dateOnly + "T00:00:00"
    );

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

  const parts =
    String(value).split(":");

  let hour =
    Number(parts[0]);

  const minutes =
    parts[1] || "00";

  const suffix =
    hour >= 12
      ? "PM"
      : "AM";

  hour =
    hour % 12 || 12;

  return `${hour}:${minutes} ${suffix}`;
}


function getInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      part =>
        part.charAt(0).toUpperCase()
    )
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
   MOBILE NAVIGATION
========================================================= */

const mobileMenuButton =
  document.getElementById("mobile-menu-button");

const mobileMenu =
  document.getElementById("mobile-menu");


if (mobileMenuButton && mobileMenu) {

  mobileMenuButton.addEventListener(
    "click",
    () => {

      const isOpen =
        mobileMenu.classList.toggle("open");

      mobileMenuButton.classList.toggle(
        "open",
        isOpen
      );

      mobileMenuButton.setAttribute(
        "aria-expanded",
        String(isOpen)
      );

    }
  );


  /* Close menu after selecting a page section */

  mobileMenu
    .querySelectorAll("a")
    .forEach(link => {

      link.addEventListener(
        "click",
        () => {

          mobileMenu.classList.remove("open");

          mobileMenuButton.classList.remove("open");

          mobileMenuButton.setAttribute(
            "aria-expanded",
            "false"
          );

        }
      );

    });


  /* Close menu with Escape key */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape" &&
        mobileMenu.classList.contains("open")
      ) {

        mobileMenu.classList.remove("open");

        mobileMenuButton.classList.remove("open");

        mobileMenuButton.setAttribute(
          "aria-expanded",
          "false"
        );

      }

    }
  );

}

/* =========================================================
   START
========================================================= */

loadTrainings();
loadMeetings();
loadBoardMembers();
checkRosterStatus();
