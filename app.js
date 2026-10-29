const { AGENTS, KEYS } = window.VALOQUIZ;
const REPEAT = 18;

const agentStrip = document.getElementById("agent-strip");
const keyStrip = document.getElementById("key-strip");
const agentNameEl = document.getElementById("agent-name");
const keyNameEl = document.getElementById("key-name");
const spinBtn = document.getElementById("spin-btn");
const answerBtn = document.getElementById("answer-btn");
const answerHint = document.getElementById("answer-hint");
const answerValue = document.getElementById("answer-value");
const agentReel = document.getElementById("agent-reel");
const keyReel = document.getElementById("key-reel");

let currentAgent = null;
let currentKey = null;
let spinning = false;
let answerOpen = false;

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildAgentStrip() {
  agentStrip.innerHTML = "";
  const sequence = [];
  for (let i = 0; i < REPEAT; i += 1) {
    sequence.push(...shuffle(AGENTS));
  }
  for (const agent of sequence) {
    const card = document.createElement("div");
    card.className = "agent-card";
    card.dataset.slug = agent.slug;
    const img = document.createElement("img");
    img.src = agent.image;
    img.alt = agent.name;
    img.draggable = false;
    card.appendChild(img);
    agentStrip.appendChild(card);
  }
  return sequence;
}

function buildKeyStrip() {
  keyStrip.innerHTML = "";
  const sequence = [];
  for (let i = 0; i < REPEAT; i += 1) {
    sequence.push(...shuffle(KEYS));
  }
  for (const key of sequence) {
    const card = document.createElement("div");
    card.className = `key-card${key === "X" ? " is-ult" : ""}`;
    card.dataset.key = key;
    const glyph = document.createElement("span");
    glyph.className = "key-glyph";
    glyph.textContent = key;
    card.appendChild(glyph);
    keyStrip.appendChild(card);
  }
  return sequence;
}

let agentSequence = buildAgentStrip();
let keySequence = buildKeyStrip();

function itemHeight(kind) {
  return kind === "agent"
    ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--agent-h"))
    : parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--key-h"));
}

function resetAnswer() {
  answerOpen = false;
  answerBtn.classList.remove("is-open");
  answerBtn.setAttribute("aria-expanded", "false");
  answerHint.hidden = false;
  answerHint.textContent = "答えはクリックで開く";
  answerValue.hidden = true;
  answerValue.textContent = "";
  answerBtn.disabled = true;
}

function setResult(agent, key) {
  currentAgent = agent;
  currentKey = key;
  agentNameEl.textContent = agent.name;
  keyNameEl.textContent = key;
  answerBtn.disabled = false;
  answerHint.textContent = "答えはクリックで開く";
}

function revealAnswer() {
  if (!currentAgent || !currentKey || answerBtn.disabled) return;
  answerOpen = true;
  answerBtn.classList.add("is-open");
  answerBtn.setAttribute("aria-expanded", "true");
  answerHint.hidden = true;
  answerValue.hidden = false;
  answerValue.textContent = currentAgent.skills[currentKey];
}

function hideAnswer() {
  if (!currentAgent || !currentKey) return;
  answerOpen = false;
  answerBtn.classList.remove("is-open");
  answerBtn.setAttribute("aria-expanded", "false");
  answerHint.hidden = false;
  answerValue.hidden = true;
}

function animateStrip(strip, sequence, targetIndex, kind, duration) {
  const h = itemHeight(kind);
  const reel = kind === "agent" ? agentReel : keyReel;
  const finalY = -(targetIndex * h);

  strip.style.transition = "none";
  strip.style.transform = "translateY(0)";
  // force reflow
  void strip.offsetHeight;

  reel.classList.add("is-spinning");
  reel.classList.remove("is-landed");

  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      strip.style.transition = `transform ${duration}ms cubic-bezier(0.12, 0.85, 0.08, 1)`;
      strip.style.transform = `translateY(${finalY}px)`;

      const onEnd = () => {
        strip.removeEventListener("transitionend", onEnd);
        reel.classList.remove("is-spinning");
        reel.classList.add("is-landed");
        resolve(sequence[targetIndex]);
      };
      strip.addEventListener("transitionend", onEnd);
    });
  });
}

async function spin() {
  if (spinning) return;
  spinning = true;
  spinBtn.disabled = true;
  resetAnswer();
  agentNameEl.textContent = "…";
  keyNameEl.textContent = "…";

  agentSequence = buildAgentStrip();
  keySequence = buildKeyStrip();

  // Land in the middle-to-late bands so the reel has room to decelerate
  const agentTarget =
    AGENTS.length * 8 + Math.floor(Math.random() * AGENTS.length * 4);
  const keyTarget = KEYS.length * 8 + Math.floor(Math.random() * KEYS.length * 4);

  const agentDuration = 3200 + Math.random() * 600;
  const keyDuration = 2400 + Math.random() * 500;

  const [agentResult, keyResult] = await Promise.all([
    animateStrip(agentStrip, agentSequence, agentTarget, "agent", agentDuration),
    animateStrip(keyStrip, keySequence, keyTarget, "key", keyDuration),
  ]);

  setResult(agentResult, keyResult);
  spinning = false;
  spinBtn.disabled = false;
}

spinBtn.addEventListener("click", spin);

answerBtn.addEventListener("click", () => {
  if (answerBtn.disabled) return;
  if (answerOpen) hideAnswer();
  else revealAnswer();
});

window.addEventListener("resize", () => {
  // Keep landed position visually centered after CSS var changes
  if (spinning || currentAgent == null) return;
  // Rebuild would reset spin position — skip unless needed
});

// Idle preview: center first items without spinning
agentStrip.style.transform = "translateY(0)";
keyStrip.style.transform = "translateY(0)";
agentNameEl.textContent = "SPIN で決定";
keyNameEl.textContent = "—";
