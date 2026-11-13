"use strict";
/* V55.14: OAuth 2.0 PKCE, sin client secret ni tokens en el código. */
(() => {
  const CLIENT_KEY = "dr_spotify_client_id";
  const TOKEN_KEY = "dr_spotify_token_v1";
  const PENDING_KEY = "dr_spotify_pending_v1";
  const PLAYLISTS = {dinner: "2aYurgkcO1UGqYYoRZ5ul1", dance: "0rMZPX9dYVs5jpnWma8LHs"};
  const redirectUri = `${location.origin}${location.pathname}`;
  const el = id => document.getElementById(id);
  const status = msg => { if (el("spotifySyncStatus")) el("spotifySyncStatus").textContent = msg; };
  const clientId = () => localStorage.getItem(CLIENT_KEY) || "";
  const getToken = () => { try { return JSON.parse(sessionStorage.getItem(TOKEN_KEY) || "null"); } catch { return null; } };
  const setToken = data => sessionStorage.setItem(TOKEN_KEY, JSON.stringify(data));
  const base64url = buffer => btoa(String.fromCharCode(...new Uint8Array(buffer))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");
  const rand = () => base64url(crypto.getRandomValues(new Uint8Array(32)));
  async function authorize(moment) {
    if (!clientId()) throw new Error("Primero guarda el Client ID de tu aplicación de Spotify.");
    const verifier = rand();
    const challenge = base64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
    const state = rand();
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({verifier,state,moment,created:Date.now()}));
    const params = new URLSearchParams({response_type:"code",client_id:clientId(),scope:"playlist-modify-public playlist-modify-private playlist-read-private",redirect_uri:redirectUri,code_challenge_method:"S256",code_challenge:challenge,state});
    location.assign(`https://accounts.spotify.com/authorize?${params}`);
  }
  async function tokenRequest(body) {
    const res = await fetch("https://accounts.spotify.com/api/token", {method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams(body)});
    const data = await res.json();
    if (!res.ok) throw new Error(data.error_description || data.error || `Autorización Spotify: ${res.status}`);
    return data;
  }
  async function handleCallback() {
    const url = new URL(location.href);
    if (!url.searchParams.has("code") && !url.searchParams.has("error")) return;
    const pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || "null");
    history.replaceState(null,"",redirectUri + location.hash);
    if (!pending || Date.now()-pending.created>600000) { status("La autorización caducó. Vuelve a pulsar Sincronizar."); return; }
    if (url.searchParams.get("error")) { status("Spotify no autorizó el acceso: " + url.searchParams.get("error")); return; }
    if (url.searchParams.get("state")!==pending.state) { status("La comprobación de seguridad de Spotify no coincide."); return; }
    try {
      const data=await tokenRequest({client_id:clientId(),grant_type:"authorization_code",code:url.searchParams.get("code"),redirect_uri:redirectUri,code_verifier:pending.verifier});
      setToken({access_token:data.access_token,refresh_token:data.refresh_token,expires_at:Date.now()+data.expires_in*1000});
      sessionStorage.removeItem(PENDING_KEY);
      status("Spotify conectado. Cargando canciones para sincronizar…");
      await runSync(pending.moment);
    } catch(err) { status("No se pudo conectar Spotify: "+err.message); }
  }
  async function accessToken() {
    const token=getToken();
    if (!token) return null;
    if (token.expires_at>Date.now()+60000) return token.access_token;
    if (!token.refresh_token) return null;
    const data=await tokenRequest({client_id:clientId(),grant_type:"refresh_token",refresh_token:token.refresh_token});
    setToken({access_token:data.access_token,refresh_token:data.refresh_token||token.refresh_token,expires_at:Date.now()+data.expires_in*1000});
    return data.access_token;
  }
  async function spotify(path, options={}) {
    const token=await accessToken();
    if (!token) throw new Error("Debes conectar Spotify de nuevo.");
    const response=await fetch(`https://api.spotify.com/v1${path}`,{...options,headers:{Authorization:`Bearer ${token}`,...(options.body?{"Content-Type":"application/json"}:{}),...(options.headers||{})}});
    if (response.status===429) throw new Error("Spotify ha limitado temporalmente las peticiones. Prueba más tarde.");
    if (!response.ok) {let detail="";try{const j=await response.json();detail=j.error?.message||"";}catch{}throw new Error(`Spotify ${response.status}: ${detail||"No se pudo completar la petición"}`);}
    return response.status===204?null:response.json();
  }
  const norm = value => String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  function collect(moment) {
    if (!Array.isArray(musicSuggestions)) return null;
    const seen=new Set();
    const entries=[];
    for(const item of musicSuggestions){
      for(const entry of songsFor(item,moment)) {
        const key=norm(entry.song)+"|"+norm(entry.artist);
        if(!norm(entry.song)||seen.has(key))continue;
        seen.add(key);entries.push(entry);
      }
    }
    return entries;
  }
  async function existingTracks(id) {
    const uris=new Set();let next=`/playlists/${id}/items?limit=100&fields=items(item(uri)),next`;
    while(next){const data=await spotify(next.startsWith("https://")?next.replace("https://api.spotify.com/v1",""):next);for(const row of data.items||[])if(row.item?.uri)uris.add(row.item.uri);next=data.next;}
    return uris;
  }
  async function runSync(moment) {
    const btn=el(moment==="dinner"?"syncDinnerSpotifyButton":"syncDanceSpotifyButton");
    if(btn)btn.disabled=true;
    try{
      if(typeof loadMusicSuggestions==="function") await loadMusicSuggestions();
      const entries=collect(moment);
      if(!entries)throw new Error("No se ha podido leer la lista de canciones de la web.");
      if(!entries.length){status("No hay canciones sugeridas para esta lista.");return;}
      const id=PLAYLISTS[moment];
      status(`Buscando ${entries.length} canciones en Spotify…`);
      const existing=await existingTracks(id);
      const additions=[];const unmatched=[];let already=0;
      for(let i=0;i<entries.length;i++){
        const {song,artist}=entries[i];
        status(`Buscando canciones (${i+1}/${entries.length})…`);
        const query=[song,artist].filter(Boolean).join(" ");
        const data=await spotify(`/search?${new URLSearchParams({q:query,type:"track",limit:"10"})}`);
        const tracks=data.tracks?.items||[];
        const match=tracks.find(t=>norm(t.name)===norm(song)&&(!artist||t.artists?.some(a=>norm(a.name)===norm(artist)))) || tracks.find(t=>norm(t.name)===norm(song)&&!artist);
        if(!match){unmatched.push(`${song}${artist?" — "+artist:""}`);continue;}
        if(existing.has(match.uri)){already++;continue;}
        existing.add(match.uri);additions.push(match.uri);
      }
      for(let i=0;i<additions.length;i+=100){
        status(`Añadiendo canciones (${Math.min(i+100,additions.length)}/${additions.length})…`);
        await spotify(`/playlists/${id}/items`,{method:"POST",body:JSON.stringify({uris:additions.slice(i,i+100)})});
      }
      status(`${moment==="dinner"?"Comida":"Baile"}: ${additions.length} añadidas, ${already} ya estaban, ${unmatched.length} sin identificar.${unmatched.length?"\nRevisa estas canciones manualmente:\n"+unmatched.join("\n"):""}`);
    }catch(err){status("Error al sincronizar: "+err.message+". No se han eliminado canciones de Spotify.");}
    finally{if(btn)btn.disabled=false;}
  }
  async function clickSync(moment) {
    try{
      if(!clientId())throw new Error("Primero configura el Client ID de Spotify.");
      if(!(await accessToken())){await authorize(moment);return;}
      await runSync(moment);
    }catch(err){status(err.message);}
  }
  el("spotifyClientId").value=clientId();
  el("spotifySaveClientId")?.addEventListener("click",()=>{
    const id=el("spotifyClientId").value.trim();
    if(!/^[a-zA-Z0-9]{20,64}$/.test(id)){status("El Client ID no parece válido. Cópialo desde Spotify for Developers.");return;}
    localStorage.setItem(CLIENT_KEY,id);sessionStorage.removeItem(TOKEN_KEY);
    status(`Client ID guardado. En Spotify Developer registra esta Redirect URI exacta: ${redirectUri}`);
  });
  el("spotifyDisconnect")?.addEventListener("click",()=>{sessionStorage.removeItem(TOKEN_KEY);status("Spotify desconectado de este navegador.");});
  el("syncDinnerSpotifyButton")?.addEventListener("click",()=>clickSync("dinner"));
  el("syncDanceSpotifyButton")?.addEventListener("click",()=>clickSync("dance"));
  handleCallback();
})();
