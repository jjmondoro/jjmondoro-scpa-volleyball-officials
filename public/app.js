let rosterRows = [];
let rosterFilteredRows = [];

let rosterSortKey = "Last Name";
let rosterSortDirection = "asc";

let memberDocuments = [];
let memberDocumentsLoaded = false;


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
      throw new Error(
        data.error || "Unable to load sessions."
      );
    }

    if (!data.length) {
      box.innerHTML = `
        <div class="training-card">
          <div class="training-type">Coming Soon</div>

          <h3>Training Calendar</h3>

          <p class="training-description">
            Chapter training sessions and rating
            opportunities will be posted here.
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
            ? `
              <div class="training-location">
                ${escapeHtml(session.location)}
              </div>
            `
            : ""
        }

        ${
          session.description
            ? `
              <div class="training-description">
                ${escapeHtml(session.description)}
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
      throw new Error(
        data.error || "Unable to load meetings."
      );
    }

    if (!data.length) {
      box.innerHTML = `
        <div class="training-card">

          <div class="training-type">
            No Meetings Scheduled
          </div>

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
            ? `
              <div class="meeting-time">
                ${formatTime(meeting.meeting_time)}
              </div>
            `
            : ""
        }

        ${
          meeting.location
            ? `
              <div class="training-location">
                ${escapeHtml(meeting.location)}
              </div>
            `
            : ""
        }

        ${
          meeting.description
            ? `
              <div class="training-description">
                ${escapeHtml(meeting.description)}
              </div>
            `
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
      throw new Error(
        data.error || "Unable to load board members."
      );
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
              ? `
                <p>
                  ${escapeHtml(member.description)}
                </p>
              `
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
   MEMBER AUTHENTICATION STATUS
========================================================= */

async function checkRosterStatus() {
  try {
    const response =
      await fetch("/api/roster/status");

    const data =
      await response.json();

    if (data.authenticated) {
      showRoster();

      await loadRoster();
      await loadMemberDocuments();

    } else {
      showRosterLogin();
    }

  } catch (error) {
    console.error(error);
    showRosterLogin();
  }
}


function showRosterLogin() {
  const login =
    document.getElementById("roster-login-panel");

  const content =
    document.getElementById("roster-content");

  if (login) {
    login.style.display = "block";
  }

  if (content) {
    content.style.display = "none";
  }
}


function showRoster() {
  const login =
    document.getElementById("roster-login-panel");

  const content =
    document.getElementById("roster-content");

  if (login) {
    login.style.display = "none";
  }

  if (content) {
    content.style.display = "block";
  }
}


/* =========================================================
   MEMBER LOGIN
========================================================= */

const rosterLoginForm =
  document.getElementById("roster-login-form");


if (rosterLoginForm) {
  rosterLoginForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      const password =
        document.getElementById(
          "roster-password"
        ).value;

      const message =
        document.getElementById(
          "roster-login-message"
        );

      message.textContent =
        "Checking password...";

      try {
        const response =
          await fetch(
            "/api/roster/login",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                password
              })
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          message.textContent =
            result.error ||
            "Unable to log in.";

          return;
        }

        document.getElementById(
          "roster-password"
        ).value = "";

        message.textContent = "";

        showRoster();

        await loadRoster();
        await loadMemberDocuments();

      } catch (error) {
        console.error(error);

        message.textContent =
          "Unable to communicate with the server.";
      }
    }
  );
}


/* =========================================================
   MEMBER LOGOUT
========================================================= */

const rosterLogout =
  document.getElementById("roster-logout");


if (rosterLogout) {
  rosterLogout.addEventListener(
    "click",
    async () => {

      try {
        await fetch(
          "/api/roster/logout",
          {
            method: "POST"
          }
        );

      } catch (error) {
        console.error(error);
      }

      rosterRows = [];
      rosterFilteredRows = [];

      memberDocuments = [];
      memberDocumentsLoaded = false;

      setRosterOpen(false);
      setDocumentsOpen(false);
      setTrainingResourcesOpen(false);

      const rosterMeta =
        document.getElementById(
          "roster-meta"
        );

      const documentsMeta =
        document.getElementById(
          "documents-meta"
        );

      const trainingMeta =
        document.getElementById(
          "training-resources-meta"
        );

      if (rosterMeta) {
        rosterMeta.textContent = "";
      }

      if (documentsMeta) {
        documentsMeta.textContent = "";
      }

      if (trainingMeta) {
        trainingMeta.textContent = "";
      }

      showRosterLogin();
    }
  );
}


/* =========================================================
   LOAD ROSTER
========================================================= */

async function loadRoster() {
  const table =
    document.getElementById("roster-table");

  const meta =
    document.getElementById("roster-meta");

  if (!table) return;

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

      if (meta) {
        meta.textContent = "";
      }

      return;
    }

    if (meta) {
      meta.textContent =
        `${rosterRows.length} officials • Updated ${
          new Date(
            data.uploaded_at
          ).toLocaleDateString()
        }`;
    }

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
   ROSTER FILTERS
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
    document.getElementById(
      elementId
    );

  if (!select) return;

  const currentValue =
    select.value;

  const values =
    [
      ...new Set(
        rosterRows
          .map(row =>
            String(
              row[propertyName] || ""
            ).trim()
          )
          .filter(Boolean)
      )
    ]
    .sort(
      (a, b) =>
        a.localeCompare(b)
    );

  select.innerHTML =
    `<option value="">All</option>` +

    values.map(value => `
      <option
        value="${escapeAttribute(value)}"
      >
        ${escapeHtml(value)}
      </option>
    `).join("");

  if (
    values.includes(currentValue)
  ) {
    select.value = currentValue;
  }
}


function applyRosterFilters() {
  const searchBox =
    document.getElementById(
      "roster-search"
    );

  const refereeBox =
    document.getElementById(
      "filter-referee"
    );

  const ljBox =
    document.getElementById(
      "filter-lj"
    );

  const scorerBox =
    document.getElementById(
      "filter-scorer"
    );

  const membershipBox =
    document.getElementById(
      "filter-membership"
    );

  if (
    !searchBox ||
    !refereeBox ||
    !ljBox ||
    !scorerBox ||
    !membershipBox
  ) {
    return;
  }

  const search =
    searchBox.value
      .trim()
      .toLowerCase();

  const referee =
    refereeBox.value;

  const lj =
    ljBox.value;

  const scorer =
    scorerBox.value;

  const membership =
    membershipBox.value;

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
        row["Referee Certification"] !==
          referee
      ) {
        return false;
      }

      if (
        lj &&
        row["LJ Certification"] !==
          lj
      ) {
        return false;
      }

      if (
        scorer &&
        row["Scorer Certification"] !==
          scorer
      ) {
        return false;
      }

      if (
        membership &&
        row["Membership Type"] !==
          membership
      ) {
        return false;
      }

      return true;
    });

  sortRosterRows();
  renderRoster();
}


/* =========================================================
   ROSTER OPEN / CLOSE
========================================================= */

const memberRosterSection =
  document.getElementById(
    "member-roster"
  );

const openRosterCard =
  document.getElementById(
    "open-roster-card"
  );

const closeRosterSection =
  document.getElementById(
    "close-roster-section"
  );


function setRosterOpen(isOpen) {
  if (!memberRosterSection) {
    return;
  }

  memberRosterSection.style.display =
    isOpen ? "block" : "none";
}


if (
  openRosterCard &&
  memberRosterSection
) {
  openRosterCard.addEventListener(
    "click",
    event => {

      event.preventDefault();

      setRosterOpen(true);

      setTimeout(() => {
        memberRosterSection.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 100);
    }
  );
}


if (closeRosterSection) {
  closeRosterSection.addEventListener(
    "click",
    () => {
      setRosterOpen(false);
    }
  );
}


/* =========================================================
   CHAPTER DOCUMENTS OPEN / CLOSE
========================================================= */

const memberDocumentsSection =
  document.getElementById(
    "member-documents"
  );

const openDocumentsCard =
  document.getElementById(
    "open-documents-card"
  );

const closeDocumentsSection =
  document.getElementById(
    "close-documents-section"
  );


function setDocumentsOpen(isOpen) {
  if (!memberDocumentsSection) {
    return;
  }

  memberDocumentsSection.style.display =
    isOpen ? "block" : "none";

  if (
    isOpen &&
    !memberDocumentsLoaded
  ) {
    loadMemberDocuments();
  }
}


if (
  openDocumentsCard &&
  memberDocumentsSection
) {
  openDocumentsCard.addEventListener(
    "click",
    event => {

      event.preventDefault();

      setDocumentsOpen(true);

      setTimeout(() => {
        memberDocumentsSection.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 100);
    }
  );
}


if (closeDocumentsSection) {
  closeDocumentsSection.addEventListener(
    "click",
    () => {
      setDocumentsOpen(false);
    }
  );
}


/* =========================================================
   LOAD MEMBER DOCUMENTS
========================================================= */

async function loadMemberDocuments() {
  const list =
    document.getElementById(
      "documents-list"
    );

  const meta =
    document.getElementById(
      "documents-meta"
    );

  if (!list) return;

  list.innerHTML = `
    <div class="loading">
      Loading chapter documents...
    </div>
  `;

  try {
    const response =
      await fetch("/api/documents");

    const data =
      await response.json();

    if (response.status === 401) {
      memberDocuments = [];
      memberDocumentsLoaded = false;

      showRosterLogin();

      return;
    }

    if (!response.ok) {
      throw new Error(
        data.error ||
        "Unable to load member documents."
      );
    }

    memberDocuments =
      Array.isArray(data)
        ? data
        : (
            Array.isArray(data.documents)
              ? data.documents
              : []
          );

    memberDocumentsLoaded = true;

    if (meta) {
      meta.textContent =
        `${memberDocuments.length} document${
          memberDocuments.length === 1
            ? ""
            : "s"
        }`;
    }

    populateDocumentCategories();
    renderMemberDocuments();

    /*
      Training Resources uses the same
      document data.
    */

    renderTrainingResources();

  } catch (error) {
    console.error(error);

    memberDocumentsLoaded = false;

    list.innerHTML = `
      <div class="loading">
        Unable to load chapter documents.
      </div>
    `;
  }
}


/* =========================================================
   DOCUMENT CATEGORY FILTER
========================================================= */

function populateDocumentCategories() {
  const select =
    document.getElementById(
      "documents-category"
    );

  if (!select) return;

  const currentValue =
    select.value;

  const categories =
    [
      ...new Set(
        memberDocuments
          .map(documentItem =>
            String(
              documentItem.category || ""
            ).trim()
          )
          .filter(Boolean)
      )
    ]
    .sort(
      (a, b) =>
        a.localeCompare(b)
    );

  select.innerHTML =
    `<option value="">All Categories</option>` +

    categories.map(category => `
      <option
        value="${escapeAttribute(category)}"
      >
        ${escapeHtml(category)}
      </option>
    `).join("");

  if (
    categories.includes(
      currentValue
    )
  ) {
    select.value = currentValue;
  }
}


/* =========================================================
   FILTER CHAPTER DOCUMENTS
========================================================= */

function filteredMemberDocuments() {
  const searchBox =
    document.getElementById(
      "documents-search"
    );

  const categoryBox =
    document.getElementById(
      "documents-category"
    );

  const search =
    searchBox
      ? searchBox.value
          .trim()
          .toLowerCase()
      : "";

  const category =
    categoryBox
      ? categoryBox.value
      : "";

  return memberDocuments.filter(
    documentItem => {

      const searchable =
        [
          documentItem.title,
          documentItem.category,
          documentItem.description,
          documentItem.filename
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
        category &&
        String(
          documentItem.category || ""
        ) !== category
      ) {
        return false;
      }

      return true;
    }
  );
}


/* =========================================================
   DOCUMENT FILE TYPE
========================================================= */

function documentFileType(filename) {
  const match =
    String(filename || "")
      .toLowerCase()
      .match(
        /\.([a-z0-9]+)$/
      );

  if (!match) {
    return "FILE";
  }

  return match[1].toUpperCase();
}


/* =========================================================
   DOCUMENT CARD HTML
========================================================= */

function buildDocumentCard(
  documentItem,
  fallbackTitle = "Chapter Document"
) {
  return `
    <article class="document-card">

      <div class="document-card-top">

        <div class="document-file-type">
          ${
            escapeHtml(
              documentFileType(
                documentItem.filename
              )
            )
          }
        </div>

        <div class="document-category">
          ${
            escapeHtml(
              documentItem.category ||
              fallbackTitle
            )
          }
        </div>

      </div>

      <h4>
        ${
          escapeHtml(
            documentItem.title ||
            documentItem.filename ||
            fallbackTitle
          )
        }
      </h4>

      ${
        documentItem.description
          ? `
            <p>
              ${
                escapeHtml(
                  documentItem.description
                )
              }
            </p>
          `
          : ""
      }

      ${
        documentItem.filename
          ? `
            <div class="document-filename">
              ${
                escapeHtml(
                  documentItem.filename
                )
              }
            </div>
          `
          : ""
      }

      <button
        type="button"
        class="btn primary document-download"
        data-document-id="${
          escapeAttribute(
            documentItem.id
          )
        }"
      >
        View / Download
      </button>

    </article>
  `;
}


/* =========================================================
   RENDER CHAPTER DOCUMENTS
========================================================= */

function renderMemberDocuments() {
  const list =
    document.getElementById(
      "documents-list"
    );

  if (!list) return;

  const documents =
    filteredMemberDocuments();

  if (!documents.length) {
    list.innerHTML = `
      <div class="documents-empty">
        ${
          memberDocuments.length
            ? "No documents match the current search or category."
            : "No member documents have been posted yet."
        }
      </div>
    `;

    return;
  }

  list.innerHTML =
    documents
      .map(documentItem =>
        buildDocumentCard(
          documentItem,
          "Chapter Document"
        )
      )
      .join("");

  attachDocumentDownloadListeners();
}


/* =========================================================
   SECURE DOCUMENT DOWNLOAD
========================================================= */

function attachDocumentDownloadListeners() {
  document
    .querySelectorAll(
      ".document-download"
    )
    .forEach(button => {

      /*
        Prevent attaching a duplicate
        listener when lists are re-rendered.
      */

      if (
        button.dataset.listenerAttached ===
        "true"
      ) {
        return;
      }

      button.dataset.listenerAttached =
        "true";

      button.addEventListener(
        "click",
        async () => {

          const documentId =
            button.dataset.documentId;

          const originalText =
            button.textContent;

          button.disabled = true;
          button.textContent = "Opening...";

          try {
            const response =
              await fetch(
                `/api/documents/${
                  encodeURIComponent(
                    documentId
                  )
                }/download`
              );

            const result =
              await response.json();

            if (
              response.status === 401
            ) {
              showRosterLogin();
              return;
            }

            if (!response.ok) {
              throw new Error(
                result.error ||
                "Unable to open document."
              );
            }

            if (!result.url) {
              throw new Error(
                "Document URL was not returned."
              );
            }

            window.open(
              result.url,
              "_blank",
              "noopener,noreferrer"
            );

          } catch (error) {
            console.error(error);

            alert(
              error.message ||
              "Unable to open this document."
            );

          } finally {
            button.disabled = false;
            button.textContent =
              originalText;
          }
        }
      );
    });
}


/* =========================================================
   DOCUMENT SEARCH
========================================================= */

const documentsSearch =
  document.getElementById(
    "documents-search"
  );


if (documentsSearch) {
  documentsSearch.addEventListener(
    "input",
    renderMemberDocuments
  );
}


const documentsCategory =
  document.getElementById(
    "documents-category"
  );


if (documentsCategory) {
  documentsCategory.addEventListener(
    "change",
    renderMemberDocuments
  );
}


/* =========================================================
   TRAINING RESOURCES
========================================================= */

const trainingResourcesSection =
  document.getElementById(
    "member-training-resources"
  );

const openTrainingResourcesCard =
  document.getElementById(
    "open-training-resources-card"
  );

const closeTrainingResourcesSection =
  document.getElementById(
    "close-training-resources-section"
  );


function trainingResourceDocuments() {
  const allowedCategories = [
    "Training Resources",
    "Rules & Mechanics"
  ];

  const searchBox =
    document.getElementById(
      "training-resources-search"
    );

  const categoryBox =
    document.getElementById(
      "training-resources-category"
    );

  const search =
    searchBox
      ? searchBox.value
          .trim()
          .toLowerCase()
      : "";

  const category =
    categoryBox
      ? categoryBox.value
      : "";

  return memberDocuments.filter(
    documentItem => {

      const itemCategory =
        String(
          documentItem.category || ""
        ).trim();

      if (
        !allowedCategories.includes(
          itemCategory
        )
      ) {
        return false;
      }

      if (
        category &&
        itemCategory !== category
      ) {
        return false;
      }

      const searchable =
        [
          documentItem.title,
          documentItem.category,
          documentItem.description,
          documentItem.filename
        ]
        .join(" ")
        .toLowerCase();

      if (
        search &&
        !searchable.includes(search)
      ) {
        return false;
      }

      return true;
    }
  );
}


/* =========================================================
   RENDER TRAINING RESOURCES
========================================================= */

function renderTrainingResources() {
  const list =
    document.getElementById(
      "training-resources-list"
    );

  const meta =
    document.getElementById(
      "training-resources-meta"
    );

  if (!list) return;

  const allowedCategories = [
    "Training Resources",
    "Rules & Mechanics"
  ];

  const allTrainingDocuments =
    memberDocuments.filter(
      documentItem =>
        allowedCategories.includes(
          String(
            documentItem.category || ""
          ).trim()
        )
    );

  const documents =
    trainingResourceDocuments();

  if (meta) {
    meta.textContent =
      `${allTrainingDocuments.length} resource${
        allTrainingDocuments.length === 1
          ? ""
          : "s"
      }`;
  }

  if (!documents.length) {
    list.innerHTML = `
      <div class="documents-empty">
        ${
          allTrainingDocuments.length
            ? "No training resources match the current search or resource type."
            : "No training resources have been posted yet."
        }
      </div>
    `;

    return;
  }

  list.innerHTML =
    documents
      .map(documentItem =>
        buildDocumentCard(
          documentItem,
          "Training Resource"
        )
      )
      .join("");

  attachDocumentDownloadListeners();
}


/* =========================================================
   OPEN / CLOSE TRAINING RESOURCES
========================================================= */

function setTrainingResourcesOpen(
  isOpen
) {
  if (!trainingResourcesSection) {
    return;
  }

  trainingResourcesSection.style.display =
    isOpen ? "block" : "none";

  if (isOpen) {
    if (!memberDocumentsLoaded) {
      loadMemberDocuments()
        .then(
          renderTrainingResources
        );

    } else {
      renderTrainingResources();
    }
  }
}


if (
  openTrainingResourcesCard &&
  trainingResourcesSection
) {
  openTrainingResourcesCard.addEventListener(
    "click",
    event => {

      event.preventDefault();

      setTrainingResourcesOpen(true);

      setTimeout(() => {
        trainingResourcesSection
          .scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
      }, 100);
    }
  );
}


if (closeTrainingResourcesSection) {
  closeTrainingResourcesSection.addEventListener(
    "click",
    () => {
      setTrainingResourcesOpen(false);
    }
  );
}


/* =========================================================
   TRAINING RESOURCE SEARCH / FILTER
========================================================= */

const trainingResourcesSearch =
  document.getElementById(
    "training-resources-search"
  );


if (trainingResourcesSearch) {
  trainingResourcesSearch.addEventListener(
    "input",
    renderTrainingResources
  );
}


const trainingResourcesCategory =
  document.getElementById(
    "training-resources-category"
  );


if (trainingResourcesCategory) {
  trainingResourcesCategory.addEventListener(
    "change",
    renderTrainingResources
  );
}


/* =========================================================
   ROSTER SORTING
========================================================= */

function sortRosterRows() {
  rosterFilteredRows.sort(
    (a, b) => {

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

      return (
        rosterSortDirection ===
        "asc"
      )
        ? result
        : -result;
    }
  );
}


function changeRosterSort(key) {
  if (
    rosterSortKey === key
  ) {
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
    document.getElementById(
      "roster-table"
    );

  const count =
    document.getElementById(
      "roster-results-count"
    );

  if (
    !table ||
    !count
  ) {
    return;
  }

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

  if (
    !rosterFilteredRows.length
  ) {
    table.innerHTML = `
      <thead>
        ${
          buildRosterHeader(
            columns
          )
        }
      </thead>

      <tbody>
        <tr>
          <td
            colspan="${columns.length}"
            class="loading"
          >
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
      ${
        buildRosterHeader(
          columns
        )
      }
    </thead>

    <tbody>

      ${
        rosterFilteredRows
          .map(row => `
            <tr>

              ${
                columns.map(column => {

                  if (
                    column ===
                      "Email Address" &&
                    row[column]
                  ) {
                    return `
                      <td>

                        <a
                          class="roster-email"
                          href="mailto:${
                            escapeAttribute(
                              row[column]
                            )
                          }"
                        >
                          ${
                            escapeHtml(
                              row[column]
                            )
                          }
                        </a>

                      </td>
                    `;
                  }

                  return `
                    <td>
                      ${
                        escapeHtml(
                          row[column] || ""
                        )
                      }
                    </td>
                  `;

                }).join("")
              }

            </tr>
          `)
          .join("")
      }

    </tbody>
  `;

  attachRosterSortListeners();
}


function buildRosterHeader(columns) {
  return `
    <tr>

      ${
        columns.map(column => {

          let arrow = "";

          if (
            rosterSortKey === column
          ) {
            arrow =
              rosterSortDirection ===
              "asc"
                ? " ▲"
                : " ▼";
          }

          return `
            <th>

              <button
                type="button"
                class="roster-sort"
                data-sort="${
                  escapeAttribute(
                    column
                  )
                }"
              >
                ${
                  escapeHtml(
                    column
                  )
                }${arrow}
              </button>

            </th>
          `;

        }).join("")
      }

    </tr>
  `;
}


function attachRosterSortListeners() {
  document
    .querySelectorAll(
      ".roster-sort"
    )
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
   ROSTER FILTER LISTENERS
========================================================= */

const rosterSearch =
  document.getElementById(
    "roster-search"
  );


if (rosterSearch) {
  rosterSearch.addEventListener(
    "input",
    applyRosterFilters
  );
}


[
  "filter-referee",
  "filter-lj",
  "filter-scorer",
  "filter-membership"
]
.forEach(id => {

  const element =
    document.getElementById(id);

  if (element) {
    element.addEventListener(
      "change",
      applyRosterFilters
    );
  }

});


/* =========================================================
   HELPERS
========================================================= */

function formatDate(value) {
  if (!value) {
    return "";
  }

  const dateOnly =
    String(value)
      .substring(0, 10);

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


function formatTime(value) {
  if (!value) {
    return "";
  }

  const parts =
    String(value)
      .split(":");

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
        part
          .charAt(0)
          .toUpperCase()
    )
    .join("");
}


function escapeHtml(value) {
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


function escapeAttribute(value) {
  return escapeHtml(value);
}


/* =========================================================
   MOBILE NAVIGATION
========================================================= */

const mobileMenuButton =
  document.getElementById(
    "mobile-menu-button"
  );

const mobileMenu =
  document.getElementById(
    "mobile-menu"
  );


if (
  mobileMenuButton &&
  mobileMenu
) {
  mobileMenuButton.addEventListener(
    "click",
    () => {

      const isOpen =
        mobileMenu
          .classList
          .toggle("open");

      mobileMenuButton
        .classList
        .toggle(
          "open",
          isOpen
        );

      mobileMenuButton.setAttribute(
        "aria-expanded",
        String(isOpen)
      );
    }
  );

  mobileMenu
    .querySelectorAll("a")
    .forEach(link => {

      link.addEventListener(
        "click",
        () => {

          mobileMenu
            .classList
            .remove("open");

          mobileMenuButton
            .classList
            .remove("open");

          mobileMenuButton.setAttribute(
            "aria-expanded",
            "false"
          );
        }
      );

    });

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key === "Escape" &&
        mobileMenu
          .classList
          .contains("open")
      ) {
        mobileMenu
          .classList
          .remove("open");

        mobileMenuButton
          .classList
          .remove("open");

        mobileMenuButton.setAttribute(
          "aria-expanded",
          "false"
        );
      }
    }
  );
}


/* =========================================================
   START WEBSITE
========================================================= */

loadTrainings();

loadMeetings();

loadBoardMembers();

checkRosterStatus();
