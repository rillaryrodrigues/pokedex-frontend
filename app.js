// PokeDex — HTML + CSS + JavaScript puro
// Requisitos atendidos: fetch, DOM dynamic createElement/appendChild, cards dinâmicos.
// API: https://pokeapi.co/ — sem token, limite de rate público (~100 req/min).

const API_BASE = "https://pokeapi.co/api/v2";
const LIMIT = 24;

const state = {
  next: `${API_BASE}/pokemon?offset=0&limit=${LIMIT}`,
  cache: new Map(), // name -> pokemon details (para busca local rápida)
  typeMap: new Map(), // type -> Set(names)
};

const $cards = document.getElementById("cards");
const $loadMore = document.getElementById("loadMore");
const $search = document.getElementById("search");
const $typeFilter = document.getElementById("typeFilter");
const $clearBtn = document.getElementById("clearBtn");
const $toast = document.getElementById("toast");

function toast(msg, ms = 2200){
  $toast.textContent = msg;
  $toast.hidden = false;
  setTimeout(()=>{$toast.hidden = true}, ms);
}

// Utilitário de criação
function el(tag, attrs = {}, ...children){
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v]) => {
    if (k === "class") node.className = v;
    else if (k === "dataset") Object.assign(node.dataset, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.substring(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  });
  for (const child of children){
    if (child == null) continue;
    node.append(child.nodeType ? child : document.createTextNode(child));
  }
  return node;
}

// Monta um card usando template + createElement
function buildCard(p){
  const tpl = document.getElementById("card-template");
  const card = tpl.content.firstElementChild.cloneNode(true);
  const img = card.querySelector(".thumb");
  const name = card.querySelector(".name");
  const id = card.querySelector(".id");
  const badges = card.querySelector(".badges");

  const pad = (n) => String(n).padStart(3,"0");

  // imagem oficial (dream_world/svg cai bem)
  const official = p.sprites.other?.["official-artwork"]?.front_default || p.sprites.front_default;
  img.src = official;
  img.alt = `Sprite de ${p.name}`;

  name.textContent = capitalize(p.name);
  id.textContent = `#${pad(p.id)}`;

  // tipos
  p.types.forEach(t => badges.append(el("span", {class:"badge"}, t.type.name)));

  // estatísticas (hp, atk, def resumidos)
  const coreStats = p.stats.filter(s => ["hp","attack","defense"].includes(s.stat.name));
  coreStats.forEach(s => badges.append(el("span", {class:"badge stat"}, `${abbr(s.stat.name)} ${s.base_stat}`)));

  return card;
}

function abbr(stat){
  switch(stat){
    case "hp": return "HP";
    case "attack": return "ATK";
    case "defense": return "DEF";
    default: return stat.toUpperCase();
  }
}

function capitalize(s){return s.charAt(0).toUpperCase() + s.slice(1)}

// Renderiza uma coleção
function renderCards(pokemons){
  const frag = document.createDocumentFragment();
  pokemons.forEach(p => frag.append(buildCard(p)));
  $cards.append(frag);
}

// Fallback de loading com skeletons
function showSkeletons(n=6){
  const frag = document.createDocumentFragment();
  for (let i=0;i<n;i++){
    const sk = el("div",{class:"card"});
    sk.append(el("div",{class:"thumb-wrap skel"}));
    const m = el("div",{class:"meta"});
    m.append(el("div",{class:"skel", style:"height:18px;width:60%"}));
    m.append(el("div",{class:"skel", style:"height:14px;width:40%;margin-top:8px"}));
    m.append(el("div",{class:"skel", style:"height:26px;width:100%;margin-top:12px"}));
    sk.append(m);
    frag.append(sk);
  }
  $cards.append(frag);
}

// Carrega a próxima página da listagem e busca detalhes
async function loadNextPage(){
  if (!state.next) return;
  $loadMore.disabled = true;
  showSkeletons(6);

  try{
    const listResp = await fetch(state.next);
    if (!listResp.ok) throw new Error("Falha ao carregar lista");
    const listData = await listResp.json();
    state.next = listData.next;

    // Pega detalhes de cada pokemon (para imagem/tipos/stats)
    const detailPromises = listData.results.map(async (it) => {
      if (state.cache.has(it.name)) return state.cache.get(it.name);
      const res = await fetch(it.url);
      const p = await res.json();
      state.cache.set(it.name, p);
      // popular mapa de tipos para filtro
      p.types.forEach(t => {
        const set = state.typeMap.get(t.type.name) || new Set();
        set.add(p.name);
        state.typeMap.set(t.type.name, set);
      });
      return p;
    });

    const pokemons = await Promise.all(detailPromises);

    // remove skeletons antes de renderizar
    Array.from($cards.querySelectorAll(".card")).slice(-6).forEach(el => {
      if (el.querySelector(".thumb-wrap")?.classList.contains("skel")) el.remove();
    });

    renderCards(pokemons);
    ensureTypeOptions();
  }catch(err){
    console.error(err);
    toast("Erro ao carregar. Tente novamente.");
  }finally{
    $loadMore.disabled = false;
  }
}

// Popular <select> de tipos após termos dados
function ensureTypeOptions(){
  if ($typeFilter.options.length > 1) return; // já populado
  const types = Array.from(state.typeMap.keys()).sort();
  const frag = document.createDocumentFragment();
  types.forEach(t => frag.append(el("option",{value:t}, t)));
  $typeFilter.append(frag);
}

// Busca local por nome
function localSearch(query){
  const q = query.trim().toLowerCase();
  if (!q){ repaint(); return; }

  const all = Array.from(state.cache.values());
  const filtered = all.filter(p => p.name.includes(q));
  repaint(filtered);
}

// Filtro por tipo (combinar com busca se houver)
function filterByType(type){
  if (!type){ repaint(); return; }
  const names = state.typeMap.get(type);
  if (!names){ repaint([]); return; }
  const all = Array.from(state.cache.values());
  const filtered = all.filter(p => names.has(p.name));
  repaint(filtered);
}

// Re-renderiza cards com um novo conjunto (ou com todos se vazio)
function repaint(collection){
  $cards.innerHTML = "";
  const items = collection ?? Array.from(state.cache.values());
  if (items.length === 0){
    $cards.append(el("p",{style:"grid-column:1/-1;color:#94a3b8"}, "Nenhum resultado."));
  } else {
    renderCards(items);
  }
}

// Debounce utilitário
function debounce(fn, wait=300){
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(()=>fn(...args), wait);
  };
}

// Listeners
$loadMore.addEventListener("click", loadNextPage);
$clearBtn.addEventListener("click", () => {
  $search.value = "";
  $typeFilter.value = "";
  repaint();
});

$search.addEventListener("input", debounce(e => {
  localSearch(e.target.value);
}));

$typeFilter.addEventListener("change", e => {
  const type = e.target.value;
  if (!type){
    repaint();
    return;
  }
  filterByType(type);
});

// Primeira carga
loadNextPage();
