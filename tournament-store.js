/** Tournament state, persisted in localStorage until site data is cleared. */
(function () {
  const STORAGE_KEY = "valoquiz.tournament.v2";
  const DEFAULT_NAMES = ["c4me20", "ゆうこりん", "百足", "pan君", "かわなり", "tehon", "だこちて"];
  const DEFAULT_SPINS = 3;
  const SLOT_COUNT = 8;
  const ROUNDS = [
    { name: "1回戦", count: 4 },
    { name: "準決勝", count: 2 },
    { name: "決勝", count: 1 },
  ];

  let seq = 0;
  const newId = () => `p${Date.now().toString(36)}${(seq++).toString(36)}`;

  function defaultState() {
    const players = DEFAULT_NAMES.map((name) => ({ id: newId(), name, spins: DEFAULT_SPINS }));
    const slots = Array.from({ length: SLOT_COUNT }, (_, i) => players[i]?.id ?? null);
    return { players, slots, winners: {} };
  }

  function load() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (raw && Array.isArray(raw.players) && Array.isArray(raw.slots)) {
        raw.winners = raw.winners || {};
        return raw;
      }
    } catch (e) {
      /* fall through to a fresh state */
    }
    return defaultState();
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("valoquiz.tournament.v1");
    return defaultState();
  }

  const matchId = (round, index) => `r${round}m${index}`;

  function player(state, id) {
    return state.players.find((p) => p.id === id) || null;
  }

  function isEmptyBranch(state, round, index) {
    if (round === 0) return !state.slots[index * 2] && !state.slots[index * 2 + 1];
    return isEmptyBranch(state, round - 1, index * 2) && isEmptyBranch(state, round - 1, index * 2 + 1);
  }

  function isBye(state, round, index) {
    if (round === 0) return !state.slots[index * 2] || !state.slots[index * 2 + 1];
    return isEmptyBranch(state, round - 1, index * 2) || isEmptyBranch(state, round - 1, index * 2 + 1);
  }

  function entrants(state, round, index) {
    if (round === 0) return [state.slots[index * 2] ?? null, state.slots[index * 2 + 1] ?? null];
    return [winner(state, round - 1, index * 2), winner(state, round - 1, index * 2 + 1)];
  }

  function winner(state, round, index) {
    const [a, b] = entrants(state, round, index);
    if (isBye(state, round, index)) return a || b || null;
    const w = state.winners[matchId(round, index)];
    return w && (w === a || w === b) ? w : null;
  }

  function clearDownstream(state, round, index) {
    for (let r = round + 1; r < ROUNDS.length; r += 1) {
      delete state.winners[matchId(r, index >> (r - round))];
    }
  }

  function setWinner(state, round, index, playerId) {
    const id = matchId(round, index);
    if (state.winners[id] === playerId) return;
    if (playerId) state.winners[id] = playerId;
    else delete state.winners[id];
    clearDownstream(state, round, index);
  }

  function champion(state) {
    return winner(state, ROUNDS.length - 1, 0);
  }

  window.Tournament = {
    ROUNDS,
    DEFAULT_SPINS,
    newId,
    load,
    save,
    clear,
    player,
    entrants,
    isBye,
    winner,
    setWinner,
    champion,
  };
})();
