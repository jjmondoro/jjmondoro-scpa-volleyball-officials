let adminSessions = [];
let adminMeetings = [];
let adminBoardMembers = [];


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
  loadAdminMeetings();
  loadAdminBoardMembers();
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
    resetMeetingForm();
    resetBoardForm();

    showLogin();
  });


/* =========================================================
   TRAINING / RATING SESSIONS
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

    const isEditing = Boolean(id);

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


function startEditingSession(id) {
  const session =
    adminSessions.find(
      item =>
        String(item.id) === String(id)
    );

  if (!session) return;

  document.getElementById("training-id").value =
    session.id;

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

  document.getElementById("training-form")
    .scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
}


document
  .getElementById("training-cancel")
  .addEventListener("click", () => {
    resetTrainingForm();
  });


function resetTrainingForm(clearMessage = true) {
  document
    .getElementById("training-form")
    .reset();

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
      await fetch(`/api/trainings/${id}`, {
        method: "DELETE"
      });

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

    resetTrainingForm();
    await loadAdminSessions();

  } catch (error) {
    console.error(error);

    alert(
      "Unable to communicate with the server."
    );
  }
}


document
  .getElementById("refresh-admin-sessions")
  .addEventListener("click", () => {
    loadAdminSessions();
  });


/* =========================================================
   CHAPTER MEETINGS
========================================================= */

async function loadAdminMeetings() {
  const box =
    document.getElementById("admin-meeting-list");

  box.innerHTML =
    '<div class="loading">Loading meetings...</div>';

  try {
    const response =
      await fetch("/api/meetings");

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Unable to load meetings."
      );
    }

    adminMeetings = data;

    if (!data.length) {
      box.innerHTML = `
        <p class="muted">
          No chapter meetings have been added yet.
        </p>
      `;
      return;
    }

    box.innerHTML = data.map(meeting => `
      <div class="admin-list-item">

        <div class="admin-list-main">

          <strong>
            ${escapeHtml(meeting.title)}
          </strong>

          <div class="small">
            ${formatDate(meeting.meeting_date)}
            ${
              meeting.meeting_time
                ? ` • ${formatTime(meeting.meeting_time)}`
                : ""
            }
          </div>

          ${
            meeting.location
              ? `
                <div class="small">
                  ${escapeHtml(meeting.location)}
                </div>
              `
              : ""
          }

        </div>

        <div class="session-actions">

          <button
            type="button"
            class="btn secondary edit-meeting"
            data-id="${meeting.id}"
          >
            Edit
          </button>

          <button
            type="button"
            class="btn danger delete-meeting"
            data-id="${meeting.id}"
          >
            Delete
          </button>

        </div>

      </div>
    `).join("");

    document
      .querySelectorAll(".edit-meeting")
      .forEach(button => {
        button.addEventListener("click", () => {
          startEditingMeeting(button.dataset.id);
        });
      });

    document
      .querySelectorAll(".delete-meeting")
      .forEach(button => {
        button.addEventListener("click", () => {
          deleteMeeting(button.dataset.id);
        });
      });

  } catch (error) {
    console.error(error);

    box.innerHTML = `
      <div class="loading">
        Unable to load meetings.
      </div>
    `;
  }
}


document
  .getElementById("meeting-form")
  .addEventListener("submit", async e => {
    e.preventDefault();

    const form =
      e.currentTarget;

    const message =
      document.getElementById("meeting-message");

    const id =
      document.getElementById("meeting-id").value;

    const body =
      Object.fromEntries(
        new FormData(form).entries()
      );

    const isEditing =
      Boolean(id);

    const url =
      isEditing
        ? `/api/meetings/${id}`
        : "/api/meetings";

    const method =
      isEditing
        ? "PUT"
        : "POST";

    message.textContent =
      isEditing
        ? "Updating meeting..."
        : "Publishing meeting...";

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
          "Could not save the meeting.";

        return;
      }

      message.textContent =
        isEditing
          ? "Meeting updated."
          : "Meeting published.";

      resetMeetingForm(false);

      await loadAdminMeetings();

    } catch (error) {
      console.error(error);

      message.textContent =
        "Unable to communicate with the server.";
    }
  });


function startEditingMeeting(id) {
  const meeting =
    adminMeetings.find(
      item =>
        String(item.id) === String(id)
    );

  if (!meeting) return;

  document.getElementById("meeting-id").value =
    meeting.id;

  document.getElementById("meeting-title").value =
    meeting.title || "";

  document.getElementById("meeting-date").value =
    normalizeDateForInput(meeting.meeting_date);

  document.getElementById("meeting-time").value =
    meeting.meeting_time
      ? String(meeting.meeting_time).substring(0, 5)
      : "";

  document.getElementById("meeting-location").value =
    meeting.location || "";

  document.getElementById("meeting-link").value =
    meeting.meeting_link || "";

  document.getElementById("meeting-description").value =
    meeting.description || "";

  document.getElementById("meeting-form-title").textContent =
    "Edit Chapter Meeting";

  document.getElementById("meeting-submit").textContent =
    "Update Meeting";

  document.getElementById("meeting-cancel").style.display =
    "inline-flex";

  document.getElementById("meeting-message").textContent =
    "Editing existing meeting.";

  document.getElementById("meeting-form")
    .scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
}


document
  .getElementById("meeting-cancel")
  .addEventListener("click", () => {
    resetMeetingForm();
  });


function resetMeetingForm(clearMessage = true) {
  document
    .getElementById("meeting-form")
    .reset();

  document.getElementById("meeting-id").value =
    "";

  document.getElementById("meeting-form-title").textContent =
    "Add Chapter Meeting";

  document.getElementById("meeting-submit").textContent =
    "Publish Meeting";

  document.getElementById("meeting-cancel").style.display =
    "none";

  if (clearMessage) {
    document.getElementById("meeting-message").textContent =
      "";
  }
}


async function deleteMeeting(id) {
  const meeting =
    adminMeetings.find(
      item =>
        String(item.id) === String(id)
    );

  if (!meeting) return;

  const confirmed =
    window.confirm(
      `Delete "${meeting.title}"?\n\nThis cannot be undone.`
    );

  if (!confirmed) return;

  try {
    const response =
      await fetch(`/api/meetings/${id}`, {
        method: "DELETE"
      });

    const result =
      await response.json();

    if (response.status === 401) {
      showLogin();
      return;
    }

    if (!response.ok) {
      alert(
        result.error ||
        "Could not delete the meeting."
      );
      return;
    }

    resetMeetingForm();
    await loadAdminMeetings();

  } catch (error) {
    console.error(error);

    alert(
      "Unable to communicate with the server."
    );
  }
}


document
  .getElementById("refresh-meetings")
  .addEventListener("click", () => {
    loadAdminMeetings();
  });


/* =========================================================
   BOARD MEMBERS
========================================================= */

async function loadAdminBoardMembers() {
  const box =
    document.getElementById("admin-board-list");

  box.innerHTML =
    '<div class="loading">Loading board members...</div>';

  try {
    const response =
      await fetch("/api/board-members");

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Unable to load board members."
      );
    }

    adminBoardMembers = data;

    if (!data.length) {
      box.innerHTML = `
        <p class="muted">
          No board members have been added yet.
        </p>
      `;
      return;
    }

    box.innerHTML = data.map(member => `
      <div class="admin-board-item">

        ${
          member.photo_url
            ? `
              <img
                class="admin-board-photo"
                src="${escapeAttribute(member.photo_url)}"
                alt="${escapeAttribute(member.name)}"
              >
            `
            : `
              <div class="admin-board-photo placeholder-photo">
                ${getInitials(member.name)}
              </div>
            `
        }

        <div class="admin-board-info">

          <strong>
            ${escapeHtml(member.name)}
          </strong>

          <div class="small">
            ${escapeHtml(member.position_title)}
          </div>

          <div class="small">
            Display order:
            ${escapeHtml(member.display_order)}
          </div>

        </div>

        <div class="session-actions">

          <button
            type="button"
            class="btn secondary edit-board-member"
            data-id="${member.id}"
          >
            Edit
          </button>

          <button
            type="button"
            class="btn danger delete-board-member"
            data-id="${member.id}"
          >
            Delete
          </button>

        </div>

      </div>
    `).join("");

    document
      .querySelectorAll(".edit-board-member")
      .forEach(button => {
        button.addEventListener("click", () => {
          startEditingBoardMember(button.dataset.id);
        });
      });

    document
      .querySelectorAll(".delete-board-member")
      .forEach(button => {
        button.addEventListener("click", () => {
          deleteBoardMember(button.dataset.id);
        });
      });

  } catch (error) {
    console.error(error);

    box.innerHTML = `
      <div class="loading">
        Unable to load board members.
      </div>
    `;
  }
}


document
  .getElementById("board-form")
  .addEventListener("submit", async e => {
    e.preventDefault();

    const form =
      e.currentTarget;

    const message =
      document.getElementById("board-message");

    const id =
      document.getElementById("board-id").value;

    const formData =
      new FormData(form);

    const isEditing =
      Boolean(id);

    const url =
      isEditing
        ? `/api/board-members/${id}`
        : "/api/board-members";

    const method =
      isEditing
        ? "PUT"
        : "POST";

    message.textContent =
      isEditing
        ? "Updating board member..."
        : "Adding board member...";

    try {
      const response =
        await fetch(url, {
          method,
          body: formData
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
          "Could not save the board member.";

        return;
      }

      message.textContent =
        isEditing
          ? "Board member updated."
          : "Board member added.";

      resetBoardForm(false);

      await loadAdminBoardMembers();

    } catch (error) {
      console.error(error);

      message.textContent =
        "Unable to communicate with the server.";
    }
  });


function startEditingBoardMember(id) {
  const member =
    adminBoardMembers.find(
      item =>
        String(item.id) === String(id)
    );

  if (!member) return;

  document.getElementById("board-id").value =
    member.id;

  document.getElementById("board-name").value =
    member.name || "";

  document.getElementById("board-position").value =
    member.position_title || "";

  document.getElementById("board-description").value =
    member.description || "";

  document.getElementById("board-order").value =
    member.display_order ?? 0;

  document.getElementById("board-photo").value =
    "";

  document.getElementById("board-form-title").textContent =
    "Edit Board Member";

  document.getElementById("board-submit").textContent =
    "Update Board Member";

  document.getElementById("board-cancel").style.display =
    "inline-flex";

  document.getElementById("board-message").textContent =
    "Editing existing board member.";

  const photoBox =
    document.getElementById("board-current-photo");

  if (member.photo_url) {
    photoBox.innerHTML = `
      <p class="small">Current photo:</p>

      <img
        class="board-edit-preview"
        src="${escapeAttribute(member.photo_url)}"
        alt="${escapeAttribute(member.name)}"
      >

      <p class="small">
        Choose a new photo above only if you want to replace it.
      </p>
    `;
  } else {
    photoBox.innerHTML = `
      <p class="small">
        This board member does not currently have a photo.
      </p>
    `;
  }

  document.getElementById("board-form")
    .scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
}


document
  .getElementById("board-cancel")
  .addEventListener("click", () => {
    resetBoardForm();
  });


function resetBoardForm(clearMessage = true) {
  document
    .getElementById("board-form")
    .reset();

  document.getElementById("board-id").value =
    "";

  document.getElementById("board-order").value =
    "0";

  document.getElementById("board-current-photo").innerHTML =
    "";

  document.getElementById("board-form-title").textContent =
    "Add Board Member";

  document.getElementById("board-submit").textContent =
    "Add Board Member";

  document.getElementById("board-cancel").style.display =
    "none";

  if (clearMessage) {
    document.getElementById("board-message").textContent =
      "";
  }
}


async function deleteBoardMember(id) {
  const member =
    adminBoardMembers.find(
      item =>
        String(item.id) === String(id)
    );

  if (!member) return;

  const confirmed =
    window.confirm(
      `Delete ${member.name} from the board?\n\nThis will also remove their stored photo.`
    );

  if (!confirmed) return;

  try {
    const response =
      await fetch(
        `/api/board-members/${id}`,
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
        "Could not delete the board member."
      );

      return;
    }

    resetBoardForm();

    await loadAdminBoardMembers();

  } catch (error) {
    console.error(error);

    alert(
      "Unable to communicate with the server."
    );
  }
}


document
  .getElementById("refresh-board")
  .addEventListener("click", () => {
    loadAdminBoardMembers();
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

    const formData =
      new FormData(form);

    message.textContent =
      "Uploading roster...";

    try {
      const response =
        await fetch(
          "/api/roster",
          {
            method: "POST",
            body: formData
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
    .map(part => part.charAt(0).toUpperCase())
    .join("");
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


function escapeAttribute(value) {
  return escapeHtml(value);
}


/* =========================================================
   START
========================================================= */

checkAdminStatus();
