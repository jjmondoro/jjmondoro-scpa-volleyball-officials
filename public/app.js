let adminSessions = [];

/* =========================================================
   PUBLIC TRAINING / RATING LIST
========================================================= */

async function loadTrainings() {
  const box = document.getElementById("training-list");

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
          <h3>Training calendar</h3>
          <p class="training-description">
            Chapter training sessions and rating opportunities will be posted here.
          </p>
        </div>
      `;
      return;
    }

    box.innerHTML = data.map(t => `
      <article class="training-card">
        <div class="training-type">${escapeHtml(t.type)}</div>
        <h3>${escapeHtml(t.title)}</h3>
        <div class="training-date">${formatDate(t.date)}</div>
        ${
          t.location
            ? `<div class="training-location">${escapeHtml(t.location)}</div>`
            : ""
        }
        ${
          t.description
            ? `<div class="training-description">${escapeHtml(t.description)}</div>`
            : ""
        }
      </article>
    `).join("");

  } catch (e) {
    console.error(e);

    box.innerHTML = `
      <div class="loading">
        Unable to load training sessions.
      </div>
    `;
  }
}


/* =========================================================
   PUBLIC ROSTER
========================================================= */

async function loadRoster() {
  const table = document.getElementById("roster-table");
  const meta = document.getElementById("roster-meta");

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

      meta.textContent = "";
      return;
    }

    const headers = Object.keys(data.rows[0]);

    table.innerHTML = `
      <thead>
        <tr>
          ${headers.map(h => `
            <th>${escapeHtml(h)}</th>
          `).join("")}
        </tr>
      </thead>

      <tbody>
        ${data.rows.map(row => `
          <tr>
            ${headers.map(h => `
              <td>${escapeHtml(row[h])}</td>
            `).join("")}
          </tr>
        `).join("")}
      </tbody>
    `;

    meta.textContent =
      `${data.rows.length} officials • Updated ${
        new Date(data.uploaded_at).toLocaleDateString()
      }`;

  } catch (e) {
    console.error(e);

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
   ADMIN SESSION LIST
========================================================= */

async function loadAdminSessions() {
  const box = document.getElementById("admin-session-list");

  if (!box) return;

  box.innerHTML = `
    <div class="loading">
      Loading sessions...
    </div>
  `;

  try {
    const response = await fetch("/api/trainings");
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Unable to load sessions.");
    }

    adminSessions = data;

    if (!data.length) {
      box.innerHTML = `
        <p class="muted">
          No training or rating sessions have been added yet.
        </p>
      `;
      return;
    }

    box.innerHTML = `
      <div class="admin-session-table-wrap">
        <table class="admin-session-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Title</th>
              <th>Type</th>
              <th>Location</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            ${data.map(t => `
              <tr>
                <td>${formatDate(t.date)}</td>

                <td>
                  <strong>${escapeHtml(t.title)}</strong>
                </td>

                <td>
                  ${escapeHtml(t.type)}
                </td>

                <td>
                  ${escapeHtml(t.location || "—")}
                </td>

                <td class="session-actions">
                  <button
                    type="button"
                    class="btn secondary edit-session"
                    data-id="${t.id}"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    class="btn danger delete-session"
                    data-id="${t.id}"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;

    document.querySelectorAll(".edit-session").forEach(button => {
      button.addEventListener("click", () => {
        startEditingSession(button.dataset.id);
      });
    });

    document.querySelectorAll(".delete-session").forEach(button => {
      button.addEventListener("click", () => {
        deleteSession(button.dataset.id);
      });
    });

  } catch (e) {
    console.error(e);

    box.innerHTML = `
      <div class="loading">
        Unable to load sessions.
      </div>
    `;
  }
}


/* =========================================================
   ADD / UPDATE SESSION
========================================================= */

const trainingForm = document.getElementById("training-form");

trainingForm.addEventListener("submit", async e => {
  e.preventDefault();

  const form = e.currentTarget;
  const message = document.getElementById("training-message");

  const id = document.getElementById("training-id").value;

  const body = Object.fromEntries(
    new FormData(form).entries()
  );

  const isEditing = Boolean(id);

  const url = isEditing
    ? `/api/trainings/${id}`
    : "/api/trainings";

  const method = isEditing
    ? "PUT"
    : "POST";

  message.textContent = isEditing
    ? "Updating session..."
    : "Publishing session...";

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": body.password
      },
      body: JSON.stringify(body)
    });

    const result = await response.json();

    if (!response.ok) {
      message.textContent =
        result.error || "Something went wrong.";

      return;
    }

    message.textContent = isEditing
      ? "Session updated."
      : "Session published.";

    resetTrainingForm(false);

    await loadTrainings();
    await loadAdminSessions();

  } catch (e) {
    console.error(e);

    message.textContent =
      "Unable to communicate with the server.";
  }
});


/* =========================================================
   START EDITING
========================================================= */

function startEditingSession(id) {
  const session = adminSessions.find(
    item => String(item.id) === String(id)
  );

  if (!session) return;

  document.getElementById("training-id").value = session.id;

  document.getElementById("training-title").value =
    session.title || "";

  document.getElementById("training-date").value =
    normalizeDateForInput(session.date);

  document.getElementById("training-type").value =
    session.type || "Training";

  document.getElementById("training-location").value =
    session.location || "";

  document.getElementById("training-description").value =
    session.description || "";

  document.getElementById("training-form-title").textContent =
    "Edit Training / Rating Session";

  document.getElementById("training-submit").textContent =
    "Update Session";

  document.getElementById("training-cancel").style.display =
    "inline-flex";

  document.getElementById("training-message").textContent =
    "Editing existing session.";

  document.getElementById("training-form").scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}


/* =========================================================
   CANCEL EDIT
========================================================= */

document
  .getElementById("training-cancel")
  .addEventListener("click", () => {
    resetTrainingForm(true);
  });


function resetTrainingForm(clearMessage = true) {
  const form = document.getElementById("training-form");

  /*
    Save password so the administrator does not have to
    re-enter it after every add/edit operation.
  */
  const password =
    document.getElementById("training-password").value;

  form.reset();

  document.getElementById("training-password").value =
    password;

  document.getElementById("training-id").value = "";

  document.getElementById("training-form-title").textContent =
    "Add Training / Rating Session";

  document.getElementById("training-submit").textContent =
    "Publish Session";

  document.getElementById("training-cancel").style.display =
    "none";

  if (clearMessage) {
    document.getElementById("training-message").textContent =
      "";
  }
}


/* =========================================================
   DELETE SESSION
========================================================= */

async function deleteSession(id) {
  const session = adminSessions.find(
    item => String(item.id) === String(id)
  );

  if (!session) return;

  const confirmed = window.confirm(
    `Delete "${session.title}"?\n\nThis cannot be undone.`
  );

  if (!confirmed) return;

  const password =
    document.getElementById("training-password").value;

  if (!password) {
    alert(
      "Enter your Admin Password in the session form before deleting a session."
    );

    document
      .getElementById("training-password")
      .focus();

    return;
  }

  try {
    const response = await fetch(
      `/api/trainings/${id}`,
      {
        method: "DELETE",
        headers: {
          "x-admin-password": password
        }
      }
    );

    const result = await response.json();

    if (!response.ok) {
      alert(
        result.error || "Could not delete the session."
      );

      return;
    }

    const editingId =
      document.getElementById("training-id").value;

    if (String(editingId) === String(id)) {
      resetTrainingForm(true);
    }

    await loadTrainings();
    await loadAdminSessions();

  } catch (e) {
    console.error(e);

    alert(
      "Unable to communicate with the server."
    );
  }
}


/* =========================================================
   REFRESH ADMIN SESSION LIST
========================================================= */

const refreshButton =
  document.getElementById("refresh-admin-sessions");

if (refreshButton) {
  refreshButton.addEventListener("click", () => {
    loadAdminSessions();
  });
}


/* =========================================================
   ROSTER UPLOAD
========================================================= */

document
  .getElementById("roster-form")
  .addEventListener("submit", async e => {
    e.preventDefault();

    const form = e.currentTarget;

    const message =
      document.getElementById("roster-message");

    const password =
      form.querySelector('[name="password"]').value;

    const fd = new FormData(form);

    message.textContent = "Uploading roster...";

    try {
      const response = await fetch("/api/roster", {
        method: "POST",
        headers: {
          "x-admin-password": password
        },
        body: fd
      });

      const result = await response.json();

      message.textContent = response.ok
        ? `Roster uploaded: ${result.count} rows.`
        : (
          result.error ||
          "Something went wrong."
        );

      if (response.ok) {
        form.reset();
        await loadRoster();
      }

    } catch (e) {
      console.error(e);

      message.textContent =
        "Unable to communicate with the server.";
    }
  });


/* =========================================================
   HELPERS
========================================================= */

function normalizeDateForInput(value) {
  if (!value) return "";

  return String(value).substring(0, 10);
}


function formatDate(value) {
  if (!value) return "";

  const dateOnly =
    String(value).substring(0, 10);

  const d =
    new Date(dateOnly + "T00:00:00");

  return d.toLocaleDateString(
    undefined,
    {
      weekday: "short",
      month: "long",
      day: "numeric",
      year: "numeric"
    }
  );
}


function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m])
  );
}


/* =========================================================
   INITIAL PAGE LOAD
========================================================= */

loadTrainings();
loadRoster();
loadAdminSessions();
