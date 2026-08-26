let adminSessions = [];
let adminMeetings = [];
let adminBoardMembers = [];
let adminDocuments = [];


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
  loadAdminDocuments();
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
    resetDocumentForm();

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
    updateDashboardSummaries();

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
        data.error ||
        "Unable to load meetings."
      );
    }

    adminMeetings = data;

    updateDashboardSummaries();

    if (!data.length) {
      box.innerHTML = `
        <p class="muted">
          No chapter meetings have been added yet.
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
              <th>Time</th>
              <th>Title</th>
              <th>Location</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            ${data.map(meeting => `
              <tr>

                <td>
                  ${formatDate(meeting.meeting_date)}
                </td>

                <td>
                  ${
                    meeting.meeting_time
                      ? formatTime(meeting.meeting_time)
                      : "—"
                  }
                </td>

                <td>
                  <strong>
                    ${escapeHtml(meeting.title)}
                  </strong>
                </td>

                <td>
                  ${escapeHtml(meeting.location || "—")}
                </td>

                <td class="session-actions">

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

                </td>

              </tr>
            `).join("")}

          </tbody>

        </table>

      </div>
    `;


    document
      .querySelectorAll(".edit-meeting")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {
            startEditingMeeting(
              button.dataset.id
            );
          }
        );

      });


    document
      .querySelectorAll(".delete-meeting")
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {
            deleteMeeting(
              button.dataset.id
            );
          }
        );

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


/* =========================================================
   ADD / UPDATE MEETING
========================================================= */

document
  .getElementById("meeting-form")
  .addEventListener(
    "submit",
    async e => {

      e.preventDefault();

      const form =
        e.currentTarget;

      const message =
        document.getElementById(
          "meeting-message"
        );

      const id =
        document.getElementById(
          "meeting-id"
        ).value;

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
          await fetch(
            url,
            {
              method,

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(body)
            }
          );

        const result =
          await response.json();

        if (
          response.status === 401
        ) {
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
            ? "Meeting updated."
            : "Meeting published.";

        resetMeetingForm(false);

        await loadAdminMeetings();

      } catch (error) {
        console.error(error);

        message.textContent =
          "Unable to communicate with the server.";
      }
    }
  );


/* =========================================================
   EDIT MEETING
========================================================= */

function startEditingMeeting(id) {
  const meeting =
    adminMeetings.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!meeting) {
    return;
  }

  document.getElementById(
    "meeting-id"
  ).value =
    meeting.id;

  document.getElementById(
    "meeting-title"
  ).value =
    meeting.title || "";

  document.getElementById(
    "meeting-date"
  ).value =
    normalizeDateForInput(
      meeting.meeting_date
    );

  document.getElementById(
    "meeting-time"
  ).value =
    normalizeTimeForInput(
      meeting.meeting_time
    );

  document.getElementById(
    "meeting-location"
  ).value =
    meeting.location || "";

  document.getElementById(
    "meeting-description"
  ).value =
    meeting.description || "";

  document.getElementById(
    "meeting-link"
  ).value =
    meeting.meeting_link || "";

  document.getElementById(
    "meeting-form-title"
  ).textContent =
    "Edit Chapter Meeting";

  document.getElementById(
    "meeting-submit"
  ).textContent =
    "Update Meeting";

  document.getElementById(
    "meeting-cancel"
  ).style.display =
    "inline-flex";

  document.getElementById(
    "meeting-message"
  ).textContent =
    "Editing existing meeting.";

  document
    .getElementById(
      "meeting-form"
    )
    .scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
}


/* =========================================================
   CANCEL MEETING EDIT
========================================================= */

document
  .getElementById("meeting-cancel")
  .addEventListener(
    "click",
    () => {
      resetMeetingForm();
    }
  );


/* =========================================================
   RESET MEETING FORM
========================================================= */

function resetMeetingForm(
  clearMessage = true
) {
  document
    .getElementById(
      "meeting-form"
    )
    .reset();

  document.getElementById(
    "meeting-id"
  ).value = "";

  document.getElementById(
    "meeting-form-title"
  ).textContent =
    "Add Chapter Meeting";

  document.getElementById(
    "meeting-submit"
  ).textContent =
    "Publish Meeting";

  document.getElementById(
    "meeting-cancel"
  ).style.display =
    "none";

  if (clearMessage) {
    document.getElementById(
      "meeting-message"
    ).textContent = "";
  }
}


/* =========================================================
   DELETE MEETING
========================================================= */

async function deleteMeeting(id) {
  const meeting =
    adminMeetings.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!meeting) {
    return;
  }

  const confirmed =
    window.confirm(
      `Delete "${meeting.title}"?\n\nThis cannot be undone.`
    );

  if (!confirmed) {
    return;
  }

  try {
    const response =
      await fetch(
        `/api/meetings/${id}`,
        {
          method: "DELETE"
        }
      );

    const result =
      await response.json();

    if (
      response.status === 401
    ) {
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


/* =========================================================
   REFRESH MEETINGS
========================================================= */

document
  .getElementById(
    "refresh-meetings"
  )
  .addEventListener(
    "click",
    () => {
      loadAdminMeetings();
    }
  );
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

    updateDashboardSummaries();

    if (!data.length) {
      box.innerHTML = `
        <p class="muted">
          No board members have been added yet.
        </p>
      `;

      return;
    }

    box.innerHTML = `
      <div class="admin-board-grid">

        ${data.map(member => `
          <article class="admin-board-member-card">

            <div class="admin-board-photo-wrap">

              ${
                member.photo_url
                  ? `
                    <img
                      class="admin-board-photo"
                      src="${escapeAttribute(
                        member.photo_url
                      )}"
                      alt="${escapeAttribute(
                        member.name
                      )}"
                    >
                  `
                  : `
                    <div
                      class="
                        admin-board-photo
                        admin-board-photo-placeholder
                      "
                    >
                      ${getInitials(member.name)}
                    </div>
                  `
              }

            </div>

            <div class="admin-board-member-info">

              <h4>
                ${escapeHtml(member.name)}
              </h4>

              <div class="admin-board-position">
                ${escapeHtml(
                  member.position_title
                )}
              </div>

              ${
                member.description
                  ? `
                    <p>
                      ${escapeHtml(
                        member.description
                      )}
                    </p>
                  `
                  : ""
              }

              <div class="admin-board-order">
                Display order:
                ${escapeHtml(
                  member.display_order ?? 0
                )}
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

          </article>
        `).join("")}

      </div>
    `;


    document
      .querySelectorAll(
        ".edit-board-member"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {
            startEditingBoardMember(
              button.dataset.id
            );
          }
        );

      });


    document
      .querySelectorAll(
        ".delete-board-member"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {
            deleteBoardMember(
              button.dataset.id
            );
          }
        );

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


/* =========================================================
   ADD / UPDATE BOARD MEMBER
========================================================= */

document
  .getElementById("board-form")
  .addEventListener(
    "submit",
    async e => {

      e.preventDefault();

      const form =
        e.currentTarget;

      const message =
        document.getElementById(
          "board-message"
        );

      const id =
        document.getElementById(
          "board-id"
        ).value;

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
          await fetch(
            url,
            {
              method,
              body: formData
            }
          );

        const result =
          await response.json();

        if (
          response.status === 401
        ) {
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
            ? "Board member updated."
            : "Board member added.";

        resetBoardForm(false);

        await loadAdminBoardMembers();

      } catch (error) {
        console.error(error);

        message.textContent =
          "Unable to communicate with the server.";
      }
    }
  );


/* =========================================================
   EDIT BOARD MEMBER
========================================================= */

function startEditingBoardMember(id) {
  const member =
    adminBoardMembers.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!member) {
    return;
  }

  document.getElementById(
    "board-id"
  ).value =
    member.id;

  document.getElementById(
    "board-name"
  ).value =
    member.name || "";

  document.getElementById(
    "board-position"
  ).value =
    member.position_title || "";

  document.getElementById(
    "board-description"
  ).value =
    member.description || "";

  document.getElementById(
    "board-order"
  ).value =
    member.display_order ?? 0;

  /*
    Browsers do not allow JavaScript
    to pre-populate a file input.

    If the admin does not select a new
    image, the existing image remains.
  */

  document.getElementById(
    "board-photo"
  ).value = "";

  document.getElementById(
    "board-form-title"
  ).textContent =
    "Edit Board Member";

  document.getElementById(
    "board-submit"
  ).textContent =
    "Update Board Member";

  document.getElementById(
    "board-cancel"
  ).style.display =
    "inline-flex";

  document.getElementById(
    "board-message"
  ).textContent =
    "Editing existing board member. Leave the photo blank to keep the current photo.";

  document
    .getElementById(
      "board-form"
    )
    .scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
}


/* =========================================================
   CANCEL BOARD EDIT
========================================================= */

document
  .getElementById("board-cancel")
  .addEventListener(
    "click",
    () => {
      resetBoardForm();
    }
  );


/* =========================================================
   RESET BOARD FORM
========================================================= */

function resetBoardForm(
  clearMessage = true
) {
  document
    .getElementById(
      "board-form"
    )
    .reset();

  document.getElementById(
    "board-id"
  ).value = "";

  document.getElementById(
    "board-form-title"
  ).textContent =
    "Add Board Member";

  document.getElementById(
    "board-submit"
  ).textContent =
    "Add Board Member";

  document.getElementById(
    "board-cancel"
  ).style.display =
    "none";

  if (clearMessage) {
    document.getElementById(
      "board-message"
    ).textContent = "";
  }
}


/* =========================================================
   DELETE BOARD MEMBER
========================================================= */

async function deleteBoardMember(id) {
  const member =
    adminBoardMembers.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!member) {
    return;
  }

  const confirmed =
    window.confirm(
      `Delete "${member.name}"?\n\nThis will also remove the board member's stored photo.`
    );

  if (!confirmed) {
    return;
  }

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

    if (
      response.status === 401
    ) {
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


/* =========================================================
   REFRESH BOARD MEMBERS
========================================================= */

document
  .getElementById(
    "refresh-board"
  )
  .addEventListener(
    "click",
    () => {
      loadAdminBoardMembers();
    }
  );


/* =========================================================
   ROSTER UPLOAD
========================================================= */

document
  .getElementById("roster-form")
  .addEventListener(
    "submit",
    async e => {

      e.preventDefault();

      const form =
        e.currentTarget;

      const message =
        document.getElementById(
          "roster-message"
        );

      const fileInput =
        form.querySelector(
          'input[name="file"]'
        );

      if (
        !fileInput ||
        !fileInput.files.length
      ) {
        message.textContent =
          "Please select an Excel file.";

        return;
      }

      const file =
        fileInput.files[0];

      const extension =
        file.name
          .split(".")
          .pop()
          .toLowerCase();

      if (
        extension !== "xlsx" &&
        extension !== "xls"
      ) {
        message.textContent =
          "Please select an Excel .xlsx or .xls file.";

        return;
      }

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

        if (
          response.status === 401
        ) {
          showLogin();
          return;
        }

        if (!response.ok) {
          message.textContent =
            result.error ||
            "Roster upload failed.";

          return;
        }

        message.textContent =
          `Roster uploaded successfully. ${result.count || 0} rows were imported.`;

        form.reset();

        updateRosterDashboardStatus(
          file.name,
          result.count
        );

      } catch (error) {
        console.error(error);

        message.textContent =
          "Unable to communicate with the server.";
      }
    }
  );


/* =========================================================
   ROSTER DASHBOARD STATUS
========================================================= */

function updateRosterDashboardStatus(
  filename,
  count
) {
  const filenameElement =
    document.getElementById(
      "dashboard-roster-file"
    );

  const countElement =
    document.getElementById(
      "dashboard-roster-count"
    );

  if (filenameElement) {
    filenameElement.textContent =
      filename || "Uploaded";
  }

  if (countElement) {
    countElement.textContent =
      Number.isFinite(Number(count))
        ? `${count} officials`
        : "Roster available";
  }
}
/* =========================================================
   MEMBER DOCUMENTS
========================================================= */

async function loadAdminDocuments() {
  const box =
    document.getElementById(
      "admin-document-list"
    );

  if (!box) return;

  box.innerHTML =
    '<div class="loading">Loading documents...</div>';

  try {
    const response =
      await fetch("/api/documents");

    const data =
      await response.json();

    if (
      response.status === 401
    ) {
      showLogin();
      return;
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Unable to load documents."
      );
    }

    adminDocuments = data;

    updateDashboardSummaries();

    if (!data.length) {
      box.innerHTML = `
        <p class="muted">
          No member documents have been uploaded yet.
        </p>
      `;

      return;
    }

    box.innerHTML =
      data.map(documentItem => `

        <div class="admin-list-item">

          <div class="admin-list-main">

            <strong>
              ${escapeHtml(documentItem.title)}
            </strong>

            <div class="small">
              ${escapeHtml(documentItem.category)}
            </div>

            <div class="small">
              ${escapeHtml(documentItem.filename)}
            </div>

            ${
              documentItem.description
                ? `
                    <div class="small">
                      ${escapeHtml(
                        documentItem.description
                      )}
                    </div>
                  `
                : ""
            }

            <div class="small">
              Display order:
              ${escapeHtml(
                documentItem.display_order
              )}
            </div>

          </div>

          <div class="session-actions">

            <button
              type="button"
              class="btn secondary edit-document"
              data-id="${documentItem.id}"
            >
              Edit
            </button>

            <button
              type="button"
              class="btn danger delete-document"
              data-id="${documentItem.id}"
            >
              Delete
            </button>

          </div>

        </div>

      `).join("");

    document
      .querySelectorAll(
        ".edit-document"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {
            startEditingDocument(
              button.dataset.id
            );
          }
        );

      });

    document
      .querySelectorAll(
        ".delete-document"
      )
      .forEach(button => {

        button.addEventListener(
          "click",
          () => {
            deleteDocument(
              button.dataset.id
            );
          }
        );

      });

  } catch (error) {
    console.error(error);

    box.innerHTML = `
      <div class="loading">
        Unable to load documents.
      </div>
    `;
  }
}


/* =========================================================
   DOCUMENT FORM SUBMIT
========================================================= */

document
  .getElementById(
    "document-form"
  )
  .addEventListener(
    "submit",
    async e => {

      e.preventDefault();

      const form =
        e.currentTarget;

      const message =
        document.getElementById(
          "document-message"
        );

      const id =
        document.getElementById(
          "document-id"
        ).value;

      const fileInput =
        document.getElementById(
          "document-file"
        );

      const isEditing =
        Boolean(id);

      /*
        A file is required for a new
        document.

        When editing, leaving the file
        blank keeps the current file.
      */

      if (
        !isEditing &&
        !fileInput.files.length
      ) {
        message.textContent =
          "Please select a document to upload.";

        return;
      }

      const formData =
        new FormData(form);

      const url =
        isEditing
          ? `/api/documents/${id}`
          : "/api/documents";

      const method =
        isEditing
          ? "PUT"
          : "POST";

      message.textContent =
        isEditing
          ? "Updating document..."
          : "Uploading document...";

      try {
        const response =
          await fetch(
            url,
            {
              method,
              body: formData
            }
          );

        const result =
          await response.json();

        if (
          response.status === 401
        ) {
          showLogin();
          return;
        }

        if (!response.ok) {
          message.textContent =
            result.error ||
            "Could not save the document.";

          return;
        }

        message.textContent =
          isEditing
            ? "Document updated."
            : "Document uploaded.";

        resetDocumentForm(false);

        await loadAdminDocuments();

      } catch (error) {
        console.error(error);

        message.textContent =
          "Unable to communicate with the server.";
      }
    }
  );


/* =========================================================
   EDIT DOCUMENT
========================================================= */

function startEditingDocument(id) {
  const documentItem =
    adminDocuments.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!documentItem) {
    return;
  }

  document.getElementById(
    "document-id"
  ).value =
    documentItem.id;

  document.getElementById(
    "document-title"
  ).value =
    documentItem.title || "";

  document.getElementById(
    "document-category"
  ).value =
    documentItem.category ||
    "Chapter Documents";

  document.getElementById(
    "document-description"
  ).value =
    documentItem.description || "";

  document.getElementById(
    "document-order"
  ).value =
    documentItem.display_order ?? 0;

  document.getElementById(
    "document-file"
  ).value = "";

  document.getElementById(
    "document-form-title"
  ).textContent =
    "Edit Member Document";

  document.getElementById(
    "document-submit"
  ).textContent =
    "Update Document";

  document.getElementById(
    "document-cancel"
  ).style.display =
    "inline-flex";

  document.getElementById(
    "document-message"
  ).textContent =
    "Editing existing document.";

  document.getElementById(
    "document-current-file"
  ).innerHTML = `

    <p class="small">

      Current file:

      <strong>
        ${escapeHtml(
          documentItem.filename
        )}
      </strong>

    </p>

    <p class="small">
      Leave the File field empty to keep
      the existing file, or choose a new
      file to replace it.
    </p>

  `;

  document
    .getElementById(
      "document-form"
    )
    .scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
}


/* =========================================================
   CANCEL DOCUMENT EDIT
========================================================= */

document
  .getElementById(
    "document-cancel"
  )
  .addEventListener(
    "click",
    () => {
      resetDocumentForm();
    }
  );


/* =========================================================
   RESET DOCUMENT FORM
========================================================= */

function resetDocumentForm(
  clearMessage = true
) {
  document
    .getElementById(
      "document-form"
    )
    .reset();

  document.getElementById(
    "document-id"
  ).value = "";

  document.getElementById(
    "document-order"
  ).value = "0";

  document.getElementById(
    "document-current-file"
  ).innerHTML = "";

  document.getElementById(
    "document-form-title"
  ).textContent =
    "Add Member Document";

  document.getElementById(
    "document-submit"
  ).textContent =
    "Upload Document";

  document.getElementById(
    "document-cancel"
  ).style.display =
    "none";

  if (clearMessage) {
    document.getElementById(
      "document-message"
    ).textContent = "";
  }
}


/* =========================================================
   DELETE DOCUMENT
========================================================= */

async function deleteDocument(id) {
  const documentItem =
    adminDocuments.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!documentItem) {
    return;
  }

  const confirmed =
    window.confirm(
      `Delete "${documentItem.title}"?\n\n` +
      `This will permanently remove the uploaded file.\n\n` +
      `This cannot be undone.`
    );

  if (!confirmed) {
    return;
  }

  try {
    const response =
      await fetch(
        `/api/documents/${id}`,
        {
          method: "DELETE"
        }
      );

    const result =
      await response.json();

    if (
      response.status === 401
    ) {
      showLogin();
      return;
    }

    if (!response.ok) {
      alert(
        result.error ||
        "Could not delete the document."
      );

      return;
    }

    resetDocumentForm();

    await loadAdminDocuments();

  } catch (error) {
    console.error(error);

    alert(
      "Unable to communicate with the server."
    );
  }
}


/* =========================================================
   REFRESH DOCUMENTS
========================================================= */

document
  .getElementById(
    "refresh-documents"
  )
  .addEventListener(
    "click",
    () => {
      loadAdminDocuments();
    }
  );


/* =========================================================
   ADMIN DASHBOARD
========================================================= */

function updateDashboardSummaries() {
  const values = {

    "dashboard-training-count":
      Array.isArray(adminSessions)
        ? adminSessions.length
        : 0,

    "dashboard-meeting-count":
      Array.isArray(adminMeetings)
        ? adminMeetings.length
        : 0,

    "dashboard-board-count":
      Array.isArray(adminBoardMembers)
        ? adminBoardMembers.length
        : 0,

    "dashboard-document-count":
      Array.isArray(adminDocuments)
        ? adminDocuments.length
        : 0

  };

  Object.entries(
    values
  ).forEach(
    ([id, value]) => {

      const element =
        document.getElementById(id);

      if (element) {
        element.textContent =
          value;
      }

    }
  );
}


/* =========================================================
   ADMIN TAB NAVIGATION
========================================================= */

function openAdminTab(
  tabName
) {
  document
    .querySelectorAll(
      ".admin-tab"
    )
    .forEach(button => {

      const active =
        button.dataset.adminTab ===
        tabName;

      button.classList.toggle(
        "active",
        active
      );

      button.setAttribute(
        "aria-selected",
        String(active)
      );

    });


  document
    .querySelectorAll(
      ".admin-tab-panel"
    )
    .forEach(panel => {

      const active =
        panel.dataset.adminPanel ===
        tabName;

      panel.classList.toggle(
        "active",
        active
      );

    });


  try {
    sessionStorage.setItem(
      "scpaAdminTab",
      tabName
    );
  } catch {}


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   MAIN ADMIN TAB BUTTONS
========================================================= */

document
  .querySelectorAll(
    ".admin-tab"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        openAdminTab(
          button.dataset.adminTab
        );

      }
    );

  });


/* =========================================================
   DASHBOARD QUICK LINKS
========================================================= */

document
  .querySelectorAll(
    "[data-go-tab]"
  )
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        openAdminTab(
          button.dataset.goTab
        );

      }
    );

  });


/* =========================================================
   RESTORE LAST ADMIN TAB
========================================================= */

try {
  const savedAdminTab =
    sessionStorage.getItem(
      "scpaAdminTab"
    );

  if (
    savedAdminTab &&
    document.querySelector(
      `[data-admin-panel="${savedAdminTab}"]`
    )
  ) {
    openAdminTab(
      savedAdminTab
    );
  }

} catch {}


/* =========================================================
   HELPERS
========================================================= */

function normalizeDateForInput(
  value
) {
  if (!value) {
    return "";
  }

  return String(value)
    .substring(
      0,
      10
    );
}


function normalizeTimeForInput(
  value
) {
  if (!value) {
    return "";
  }

  return String(value)
    .substring(
      0,
      5
    );
}


function formatDate(
  value
) {
  if (!value) {
    return "";
  }

  const dateOnly =
    String(value)
      .substring(
        0,
        10
      );

  const date =
    new Date(
      dateOnly +
      "T00:00:00"
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


function formatTime(
  value
) {
  if (!value) {
    return "";
  }

  const parts =
    String(value)
      .split(":");

  let hour =
    Number(
      parts[0]
    );

  const minutes =
    parts[1] ||
    "00";

  const suffix =
    hour >= 12
      ? "PM"
      : "AM";

  hour =
    hour % 12 ||
    12;

  return `${hour}:${minutes} ${suffix}`;
}


function getInitials(
  name
) {
  return String(
    name || ""
  )
    .trim()
    .split(/\s+/)
    .slice(
      0,
      2
    )
    .map(
      part =>
        part
          .charAt(0)
          .toUpperCase()
    )
    .join("");
}


function escapeHtml(
  value
) {
  return String(
    value ?? ""
  )
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


function escapeAttribute(
  value
) {
  return escapeHtml(
    value
  );
}


/* =========================================================
   START ADMIN PORTAL
========================================================= */

checkAdminStatus();
