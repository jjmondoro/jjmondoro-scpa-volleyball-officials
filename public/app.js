async function loadTrainings(){
  const box = document.getElementById("training-list");
  try{
    const data = await fetch("/api/trainings").then(r=>r.json());
    if(!data.length){
      box.innerHTML = '<div class="training-card"><div class="training-type">Coming Soon</div><h3>Training calendar</h3><p class="training-description">Chapter training sessions and rating opportunities will be posted here.</p></div>';
      return;
    }
    box.innerHTML = data.map(t => `
      <article class="training-card">
        <div class="training-type">${escapeHtml(t.type)}</div>
        <h3>${escapeHtml(t.title)}</h3>
        <div class="training-date">${formatDate(t.date)}</div>
        ${t.location ? `<div class="training-location">${escapeHtml(t.location)}</div>` : ""}
        ${t.description ? `<div class="training-description">${escapeHtml(t.description)}</div>` : ""}
      </article>
    `).join("");
  }catch(e){ box.innerHTML = '<div class="loading">Unable to load training sessions.</div>'; }
}

async function loadRoster(){
  const table = document.getElementById("roster-table");
  const meta = document.getElementById("roster-meta");
  try{
    const data = await fetch("/api/roster").then(r=>r.json());
    if(!data.rows.length){
      table.innerHTML = '<tbody><tr><td class="loading">The chapter roster has not been uploaded yet.</td></tr></tbody>';
      meta.textContent = "";
      return;
    }
    const headers = Object.keys(data.rows[0]);
    table.innerHTML = `<thead><tr>${headers.map(h=>`<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
      <tbody>${data.rows.map(row=>`<tr>${headers.map(h=>`<td>${escapeHtml(row[h])}</td>`).join("")}</tr>`).join("")}</tbody>`;
    meta.textContent = `${data.rows.length} officials • Updated ${new Date(data.uploaded_at).toLocaleDateString()}`;
  }catch(e){ table.innerHTML = '<tbody><tr><td class="loading">Unable to load the roster.</td></tr></tbody>'; }
}

document.getElementById("training-form").addEventListener("submit", async e=>{
  e.preventDefault();
  const form = e.currentTarget;
  const message = document.getElementById("training-message");
  const body = Object.fromEntries(new FormData(form).entries());
  const r = await fetch("/api/trainings", {
    method:"POST", headers:{"Content-Type":"application/json","x-admin-password":body.password},
    body:JSON.stringify(body)
  });
  const result = await r.json();
  message.textContent = r.ok ? "Session published." : (result.error || "Something went wrong.");
  if(r.ok){ form.reset(); loadTrainings(); }
});

document.getElementById("roster-form").addEventListener("submit", async e=>{
  e.preventDefault();
  const form = e.currentTarget;
  const message = document.getElementById("roster-message");
  const password = form.querySelector('[name="password"]').value;
  const fd = new FormData(form);
  const r = await fetch("/api/roster", {method:"POST", headers:{"x-admin-password":password}, body:fd});
  const result = await r.json();
  message.textContent = r.ok ? `Roster uploaded: ${result.count} rows.` : (result.error || "Something went wrong.");
  if(r.ok){ form.reset(); loadRoster(); }
});

function formatDate(s){
  const d = new Date(s+"T00:00:00");
  return d.toLocaleDateString(undefined,{weekday:"short",month:"long",day:"numeric",year:"numeric"});
}
function escapeHtml(value){
  return String(value ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
}
loadTrainings();
loadRoster();
