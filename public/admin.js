let adminSessions = [];

/* =========================================================
   LOGIN STATUS
========================================================= */

async function checkAdminStatus() {
  try {
    const response = await fetch("/api/admin/status");
    const data = await response.json();

    if (data.authenticated) {
      showAdminPortal();
    } else {
      showLogin();
    }
  } catch (error) {
    console.error(error);
    showLogin();
  }
}

function showLogin() {
  document.getElementById("admin-login-panel").style.display = "block";
  document.getElementById("admin-portal").style.display = "none";
}

function showAdminPortal() {
  document.getElementById("admin-login-panel").style.display = "none";
  document.getElementById("admin-portal").style.display = "block";

  loadAdminSessions();
}


/* =========================================================
   LOGIN
========================================================= */

document
  .getElementById("admin-login-form")
  .addEventListener("submit", async e => {
    e.preventDefault();

    const password =
      document.getElementById("admin-login-password").value;

    const message =
      document.getElementById("admin-login-message");

    message.textContent = "Logging in...";

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        message.textContent =
          result.error || "Login failed.";
        return;
      }

      document.getElementById("admin-login-password").value = "";
      message.textContent = "";

      showAdminPortal();

    } catch (error) {
      console.error(error);
      message.textContent =
        "Unable to communicate with the server.";
    }
  });


/* =========================================================
   LOGOUT
========================================================= */

document
  .getElementById("admin-logout")
  .addEventListener("click", async () => {
    try {
      await fetch("/api/admin/logout", {
        method: "POST"
      });
    } catch (error) {
      console.error(error);
    }

    resetTrainingForm();
    showLogin();
  });


/* =========================================================
   LOAD ADMIN SESSIONS
========================================================= */

async function loadAdminSessions() {
  const box =
    document.getElementById("admin-session-list");

  box.innerHTML =
    '<div class="loading">Loading sessions...</div>';

  try {
    const response =
      await fetch("/api/trainings");

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Unable to load sessions."
      );
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

            ${data.map(session => `
              <tr>

                <td>
                  ${formatDate(session.date)}
                </td>

                <td>
                  <strong>
                    ${escapeHtml(session.title)}
                  </strong>
                </td>

                <td>
                  ${escapeHtml(session.type)}
                </td>

                <td>
                  ${escapeHtml(session.location || "—")}
                </td>

                <td class="session-actions">

                  <button
                    type="button"
                    class="btn secondary edit-session"
                    data-id="${session.id}"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    class="btn danger delete-session"
                    data-id="${session.id}"
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

    document
      .querySelectorAll(".edit-session")
      .forEach(button => {
        button.addEventListener("click", () => {
          startEditingSession(button.dataset.id);
        });
      });

    document
      .querySelectorAll(".delete-session")
      .forEach(button => {
        button.addEventListener("click", () => {
          deleteSession(button.dataset.id);
        });
      });

  } catch (error) {
    console.error(error);

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

document
  .getElementById("training-form")
  .addEventListener("submit", async e => {
    e.preventDefault();

    const form = e.currentTarget;

    const message =
      document.getElementById("training-message");

    const id =
      document.getElementById("training-id").value;

    const body =
      Object.fromEntries(
        new FormData(form).entries()
      );

    const isEditing =
      Boolean(id);

    const url =
      isEditing
        ? `/api/trainings/${id}`
        : "/api/trainings";

    const method =
      isEditing
        ? "PUT"
        : "POST";

    message.textContent =
      isEditing
        ? "Updating session..."
        : "Publishing session...";

    try {
      const response =
        await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

      const result =
        await response.json();

      if (response.status === 401) {
        showLogin();
        return;
      }

      if (!response.ok) {
        message.textContent =
          result.error ||
          "Something went wrong.";
        return;
      }

      message.textContent =
        isEditing
          ? "Session updated."
          : "Session published.";

      resetTrainingForm(false);

      await loadAdminSessions();

    } catch (error) {
      console.error(error);

      message.textContent =
        "Unable to communicate with the server.";
    }
  });


/* =========================================================
   EDIT SESSION
========================================================= */

function startEditingSession(id) {
  const session =
    adminSessions.find(
      item =>
        String(item.id) === String(id)
    );

  if (!session) return;

  document
    .getElementById("training-id")
    .value = session.id;

  document
    .getElementById("training-title")
    .value = session.title || "";

  document
    .getElementById("training-date")
    .value =
      normalizeDateForInput(session.date);

  document
    .getElementById("training-type")
    .value =
      session.type || "Training";

  document
    .getElementById("training-location")
    .value =
      session.location || "";

  document
    .getElementById("training-description")
    .value =
      session.description || "";

  document
    .getElementById("training-form-title")
    .textContent =
      "Edit Training / Rating Session";

  document
    .getElementById("training-submit")
    .textContent =
      "Update Session";

  document
    .getElementById("training-cancel")
    .style.display =
      "inline-flex";

  document
    .getElementById("training-message")
    .textContent =
      "Editing existing session.";

  document
    .getElementById("training-form")
    .scrollIntoView({
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
    resetTrainingForm();
  });

function resetTrainingForm(clearMessage = true) {
  document
    .getElementById("training-form")
    .reset();

  document
    .getElementById("training-id")
    .value = "";

  document
    .getElementById("training-form-title")
    .textContent =
      "Add Training / Rating Session";

  document
    .getElementById("training-submit")
    .textContent =
      "Publish Session";

  document
    .getElementById("training-cancel")
    .style.display =
      "none";

  if (clearMessage) {
    document
      .getElementById("training-message")
      .textContent = "";
  }
}


/* =========================================================
   DELETE SESSION
========================================================= */

async function deleteSession(id) {
  const session =
    adminSessions.find(
      item =>
        String(item.id) === String(id)
    );

  if (!session) return;

  const confirmed =
    window.confirm(
      `Delete "${session.title}"?\n\nThis cannot be undone.`
    );

  if (!confirmed) return;

  try {
    const response =
      await fetch(
        `/api/trainings/${id}`,
        {
          method: "DELETE"
        }
      );

    const result =
      await response.json();

    if (response.status === 401) {
      showLogin();
      return;
    }

    if (!response.ok) {
      alert(
        result.error ||
        "Could not delete the session."
      );
      return;
    }

    const editingId =
      document
        .getElementById("training-id")
        .value;

    if (
      String(editingId) === String(id)
    ) {
      resetTrainingForm();
    }

    await loadAdminSessions();

  } catch (error) {
    console.error(error);

    alert(
      "Unable to communicate with the server."
    );
  }
}


/* =========================================================
   REFRESH
========================================================= */

document
  .getElementById("refresh-admin-sessions")
  .addEventListener("click", () => {
    loadAdminSessions();
  });


/* =========================================================
   ROSTER UPLOAD
========================================================= */

document
  .getElementById("roster-form")
  .addEventListener("submit", async e => {
    e.preventDefault();

    const form =
      e.currentTarget;

    const message =
      document.getElementById(
        "roster-message"
      );

    const fd =
      new FormData(form);

    message.textContent =
      "Uploading roster...";

    try {
      const response =
        await fetch(
          "/api/roster",
          {
            method: "POST",
            body: fd
          }
        );

      const result =
        await response.json();

      if (response.status === 401) {
        showLogin();
        return;
      }

      if (!response.ok) {
        message.textContent =
          result.error ||
          "Something went wrong.";
        return;
      }

      message.textContent =
        `Roster uploaded: ${result.count} rows.`;

      form.reset();

    } catch (error) {
      console.error(error);

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
    new Date(
      dateOnly + "T00:00:00"
    );

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
  return String(value ?? "")
    .replace(
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
   START
========================================================= */

checkAdminStatus();
