const CONFIG={
  url:"https://impauxkdtcwngvlknysa.supabase.co",
  key:"sb_publishable_TN0nnQZ_g6l1RNTuE4f9qg_iaI_USWV",
  email:"davidn6783@gmail.com",
  sessionKey:"dr_admin_session_v20"
};

const el=id=>document.getElementById(id);
const loginView=el("loginView"),dashboard=el("dashboard"),loginForm=el("loginForm");
const codeInput=el("adminCode"),loginButton=el("loginButton"),loginMessage=el("loginMessage");
const dashboardMessage=el("dashboardMessage"),tableBody=el("guestTableBody"),cards=el("guestCards");
const searchInput=el("searchInput"),attendanceFilter=el("attendanceFilter");
let session=null,guests=[];

function norm(v){return String(v??"").trim().toLowerCase()}
function category(v){const s=norm(v);if(["sí","si","yes"].includes(s)||s.includes("allí estaré"))return"yes";if(s==="no"||s.includes("no podré"))return"no";return"other"}
function fmtDate(v){if(!v)return"—";try{return new Intl.DateTimeFormat("es-ES",{dateStyle:"short",timeStyle:"short"}).format(new Date(v))}catch{return v}}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

async function api(path,options={}){
  const headers={"apikey":CONFIG.key,"Content-Type":"application/json",...(options.headers||{})};
  if(session?.access_token)headers.Authorization=`Bearer ${session.access_token}`;
  const response=await fetch(`${CONFIG.url}${path}`,{...options,headers});
  let data=null;try{data=await response.json()}catch{}
  if(!response.ok)throw new Error(data?.error_description||data?.msg||data?.message||`Error ${response.status}`);
  return data;
}

async function signIn(password){
  session=await api("/auth/v1/token?grant_type=password",{method:"POST",body:JSON.stringify({email:CONFIG.email,password})});
  sessionStorage.setItem(CONFIG.sessionKey,JSON.stringify(session));
}

async function refreshSession(){
  if(!session?.refresh_token)return false;
  try{
    session=await api("/auth/v1/token?grant_type=refresh_token",{method:"POST",body:JSON.stringify({refresh_token:session.refresh_token})});
    sessionStorage.setItem(CONFIG.sessionKey,JSON.stringify(session));return true;
  }catch{return false}
}

function filtered(){
  const q=norm(searchInput.value),f=attendanceFilter.value;
  return guests.filter(g=>{
    const hay=norm([g.nombre,g.telefono,g.asistencia,g.acompanante,g.alergias,g.comentarios].join(" "));
    return(!q||hay.includes(q))&&(!f||category(g.asistencia)===f);
  });
}

function updateStats(){
  const yes=guests.filter(g=>category(g.asistencia)==="yes");
  el("statTotal").textContent=guests.length;
  el("statYes").textContent=yes.length;
  el("statNo").textContent=guests.filter(g=>category(g.asistencia)==="no").length;
  el("statPeople").textContent=yes.reduce((n,g)=>n+1+(norm(g.acompanante)?1:0),0);
  el("statAllergies").textContent=guests.filter(g=>norm(g.alergias)).length;
}

function pill(v){const c=category(v);return`<span class="status ${c}">${escapeHtml(v||"Sin indicar")}</span>`}

function render(){
  const rows=filtered();
  tableBody.innerHTML=rows.map(g=>`<tr><td>${fmtDate(g.created_at)}</td><td>${escapeHtml(g.nombre||"—")}</td><td>${escapeHtml(g.telefono||"—")}</td><td>${pill(g.asistencia)}</td><td>${escapeHtml(g.acompanante||"—")}</td><td>${escapeHtml(g.alergias||"—")}</td><td>${escapeHtml(g.comentarios||"—")}</td></tr>`).join("");
  cards.innerHTML=rows.map(g=>`<article class="guest-card"><h2>${escapeHtml(g.nombre||"Sin nombre")}</h2>${pill(g.asistencia)}<dl><dt>Fecha</dt><dd>${fmtDate(g.created_at)}</dd><dt>Teléfono</dt><dd>${escapeHtml(g.telefono||"—")}</dd><dt>Acompañante</dt><dd>${escapeHtml(g.acompanante||"—")}</dd><dt>Alergias</dt><dd>${escapeHtml(g.alergias||"—")}</dd><dt>Comentarios</dt><dd>${escapeHtml(g.comentarios||"—")}</dd></dl></article>`).join("");
  dashboardMessage.textContent=rows.length?`${rows.length} respuesta${rows.length===1?"":"s"} mostrada${rows.length===1?"":"s"}.`:"No hay resultados.";
}

async function loadGuests(retry=true){
  dashboardMessage.textContent="Cargando respuestas…";
  try{
    guests=await api("/rest/v1/invitados?select=*&order=created_at.desc");
    updateStats();render();el("lastUpdate").textContent=`Actualizado: ${new Date().toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit"})}`;
  }catch(error){
    if(retry&&/jwt|token|401/i.test(error.message)&&await refreshSession())return loadGuests(false);
    dashboardMessage.textContent=`No se pudieron cargar las respuestas: ${error.message}`;
  }
}

function showDashboard(){loginView.hidden=true;dashboard.hidden=false;loadGuests()}
function showLogin(){dashboard.hidden=true;loginView.hidden=false}

loginForm.addEventListener("submit",async e=>{
  e.preventDefault();const password=codeInput.value;
  if(!password){loginMessage.textContent="Introduce vuestro código.";return}
  loginButton.disabled=true;loginButton.textContent="Comprobando…";loginMessage.textContent="";
  try{await signIn(password);codeInput.value="";showDashboard()}
  catch(error){loginMessage.textContent=error.message.toLowerCase().includes("confirm")?"El usuario todavía no está confirmado en Supabase.":`No se pudo entrar: ${error.message}`}
  finally{loginButton.disabled=false;loginButton.textContent="Entrar al panel"}
});

el("togglePassword").addEventListener("click",()=>{codeInput.type=codeInput.type==="password"?"text":"password";el("togglePassword").textContent=codeInput.type==="password"?"Ver":"Ocultar"});
el("logoutButton").addEventListener("click",()=>{sessionStorage.removeItem(CONFIG.sessionKey);session=null;showLogin()});
el("refreshButton").addEventListener("click",()=>loadGuests());
searchInput.addEventListener("input",render);attendanceFilter.addEventListener("change",render);

el("exportButton").addEventListener("click",()=>{
  const head=["Fecha","Nombre","Teléfono","Asistencia","Acompañante","Alergias","Comentarios"];
  const data=filtered().map(g=>[fmtDate(g.created_at),g.nombre||"",g.telefono||"",g.asistencia||"",g.acompanante||"",g.alergias||"",g.comentarios||""]);
  const csv=[head,...data].map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(";")).join("\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="confirmaciones-david-raquel.csv";a.click();URL.revokeObjectURL(url);
});

try{session=JSON.parse(sessionStorage.getItem(CONFIG.sessionKey)||"null")}catch{session=null}
session?.access_token?showDashboard():showLogin();
