const T = window.Tournament;
let state = T.load();

const playersEl = document.getElementById("players");
const slotsEl = document.getElementById("slots");
const bracketEl = document.getElementById("bracket");
const championEl = document.getElementById("champion");
const addForm = document.getElementById("add-player");
const newPlayerInput = document.getElementById("new-player");

const MAX_SPINS = 20;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const nameOf = (id) => (id ? T.player(state, id)?.name ?? "?" : "");
const hasResults = () => Object.keys(state.winners).length > 0;

function commit() {
  T.save(state);
  render();
}

function confirmClearResults() {
  if (!hasResults()) return true;
  if (!confirm("組み合わせを変えると、勝敗がすべてリセットされます。よろしいですか？")) return false;
  state.winners = {};
  return true;
}

function renderPlayers() {
  playersEl.innerHTML = state.players
    .map(
      (p) => `
      <li class="player" data-id="${p.id}">
        <input class="player__name" value="${escapeHtml(p.name)}" maxlength="16" aria-label="名前" />
        <div class="stepper" role="group" aria-label="回す回数">
          <button type="button" data-act="dec" aria-label="減らす">−</button>
          <span class="stepper__value">${p.spins}<small>回</small></span>
          <button type="button" data-act="inc" aria-label="増やす">＋</button>
        </div>
        <button type="button" class="player__del" data-act="del" aria-label="削除">×</button>
      </li>`
    )
    .join("");
}

function renderSlots() {
  const options = (selected) =>
    [`<option value="">— 空き（不戦勝） —</option>`]
      .concat(
        state.players.map(
          (p) => `<option value="${p.id}"${p.id === selected ? " selected" : ""}>${escapeHtml(p.name)}</option>`
        )
      )
      .join("");

  slotsEl.innerHTML = Array.from({ length: 4 }, (_, i) => `
      <div class="slot-pair">
        <span class="slot-pair__label">#${i + 1}</span>
        <select data-slot="${i * 2}">${options(state.slots[i * 2])}</select>
        <span class="slot-pair__vs">VS</span>
        <select data-slot="${i * 2 + 1}">${options(state.slots[i * 2 + 1])}</select>
      </div>`).join("");

  const counts = {};
  state.slots.forEach((id) => id && (counts[id] = (counts[id] || 0) + 1));
  slotsEl.querySelectorAll("select").forEach((sel) => {
    sel.classList.toggle("is-dup", !!sel.value && counts[sel.value] > 1);
  });
}

function matchCard(round, index) {
  const [a, b] = T.entrants(state, round, index);
  const bye = T.isBye(state, round, index);
  const win = T.winner(state, round, index);
  const ready = a && b && !bye;

  const row = (pid) => {
    if (!pid) return `<div class="mc__row is-empty">${bye ? "—" : "勝者待ち"}</div>`;
    const cls = win === pid ? " is-win" : win ? " is-lose" : "";
    const spins = `<span class="mc__spins">${T.player(state, pid)?.spins ?? "?"}回</span>`;
    const mark = `<span class="mc__mark">${win === pid ? "WIN" : ""}</span>`;
    if (!ready) {
      return `<div class="mc__row${cls}"><span class="mc__name">${escapeHtml(nameOf(pid))}</span>${spins}${mark}</div>`;
    }
    return `
      <button type="button" class="mc__row mc__pick${cls}" data-round="${round}" data-index="${index}" data-player="${pid}">
        <span class="mc__name">${escapeHtml(nameOf(pid))}</span>${spins}${mark}
      </button>`;
  };

  let status = "";
  if (bye && win) status = "不戦勝";
  else if (ready && !win) status = "勝った人をタップ";
  else if (ready && win) status = "もう一度タップで取り消し";

  return `
    <article class="mc${win ? " is-done" : ""}${bye && !win ? " is-void" : ""}">
      <header class="mc__head">${T.ROUNDS[round].name} #${index + 1}</header>
      ${row(a)}
      ${row(b)}
      ${status ? `<p class="mc__status">${status}</p>` : ""}
    </article>`;
}

function renderBracket() {
  bracketEl.innerHTML = T.ROUNDS.map(
    (r, round) => `
      <div class="bracket__round">
        <h3>${r.name}</h3>
        <div class="bracket__cards">
          ${Array.from({ length: r.count }, (_, i) => matchCard(round, i)).join("")}
        </div>
      </div>`
  ).join("");

  const champ = T.champion(state);
  championEl.hidden = !champ;
  if (champ) championEl.innerHTML = `<span>CHAMPION</span><strong>${escapeHtml(nameOf(champ))}</strong>`;
}

function render() {
  renderPlayers();
  renderSlots();
  renderBracket();
}

playersEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const id = btn.closest(".player").dataset.id;
  const p = T.player(state, id);
  if (btn.dataset.act === "inc") p.spins = Math.min(MAX_SPINS, p.spins + 1);
  if (btn.dataset.act === "dec") p.spins = Math.max(1, p.spins - 1);
  if (btn.dataset.act === "del") {
    const inBracket = state.slots.includes(id);
    if (!confirm(`${p.name} を削除しますか？${inBracket && hasResults() ? "\n勝敗もすべてリセットされます。" : ""}`)) return;
    if (inBracket) state.winners = {};
    state.players = state.players.filter((x) => x.id !== id);
    state.slots = state.slots.map((s) => (s === id ? null : s));
  }
  commit();
});

playersEl.addEventListener("change", (e) => {
  if (!e.target.classList.contains("player__name")) return;
  const p = T.player(state, e.target.closest(".player").dataset.id);
  p.name = e.target.value.trim() || p.name;
  commit();
});

addForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = newPlayerInput.value.trim();
  if (!name) return;
  const p = { id: T.newId(), name, spins: T.DEFAULT_SPINS };
  state.players.push(p);
  const empty = state.slots.indexOf(null);
  if (empty !== -1 && !hasResults()) state.slots[empty] = p.id;
  newPlayerInput.value = "";
  commit();
});

slotsEl.addEventListener("change", (e) => {
  const sel = e.target.closest("select[data-slot]");
  if (!sel) return;
  if (!confirmClearResults()) {
    render();
    return;
  }
  state.slots[Number(sel.dataset.slot)] = sel.value || null;
  commit();
});

document.getElementById("shuffle-btn").addEventListener("click", () => {
  if (!confirmClearResults()) return;
  const ids = state.players.map((p) => p.id).slice(0, 8);
  const pool = [...ids, ...Array(8 - ids.length).fill(null)];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  state.slots = pool;
  commit();
});

document.getElementById("reset-btn").addEventListener("click", () => {
  if (!confirm("保存データをすべて消して初期状態に戻しますか？\n（プレイヤー・回数・組み合わせ・勝敗）")) return;
  state = T.clear();
  render();
});

document.getElementById("reset-bracket-btn").addEventListener("click", () => {
  if (!hasResults() || !confirm("トーナメント表の勝敗をリセットしますか？\n（プレイヤー・回数・組み合わせは残ります）")) return;
  state.winners = {};
  commit();
});

bracketEl.addEventListener("click", (e) => {
  const pick = e.target.closest(".mc__pick");
  if (!pick) return;
  const round = Number(pick.dataset.round);
  const index = Number(pick.dataset.index);
  const current = T.winner(state, round, index);
  const next = current === pick.dataset.player ? null : pick.dataset.player;
  const downstream = T.ROUNDS.slice(round + 1).some((_, k) => state.winners[`r${round + 1 + k}m${index >> (k + 1)}`]);
  if (current && downstream && !confirm("この先の試合の勝敗もリセットされます。よろしいですか？")) return;
  T.setWinner(state, round, index, next);
  commit();
});

window.addEventListener("storage", () => {
  state = T.load();
  render();
});

render();
