const { subs, mains, armors, agents } = window.CREDIT_DATA;
const MAX_CREDITS = 9000;
const MAX_OFFSET = 150;
const STEP = 50;

const creditsEl = document.getElementById("credits");
const agentImg = document.getElementById("agent-img");
const agentName = document.getElementById("agent-name");
const itemsEl = document.getElementById("items");
const nextBtn = document.getElementById("next-btn");
const answerBtn = document.getElementById("answer-btn");
const answerHint = document.getElementById("answer-hint");
const answerValue = document.getElementById("answer-value");
const verdictEl = document.getElementById("verdict");
const breakdownEl = document.getElementById("breakdown");
let current = null;

const pick = (list) => list[Math.floor(Math.random() * list.length)];
const randInt = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const yen = (n) => n.toLocaleString("ja-JP");

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestion() {
  const agent = pick(agents);
  const items = [];

  if (Math.random() < 0.5) items.push({ kind: "sub", label: "サブ武器", ...pick(subs) });
  items.push({ kind: "main", label: "メイン武器", ...pick(mains) });

  const armor = pick([null, ...armors]);
  if (armor) items.push({ kind: "armor", label: "アーマー", ...armor });

  const skillCount = randInt(1, agent.skills.length);
  for (const skill of shuffle(agent.skills).slice(0, skillCount)) {
    const extraCharge = skill.extra != null && Math.random() < 0.5;
    items.push({
      kind: "skill",
      label: "スキル",
      name: skill.name,
      icon: skill.icon,
      price: extraCharge ? skill.extra : skill.price,
      badge: extraCharge ? "追加チャージ" : skill.note,
    });
  }

  const total = items.reduce((sum, item) => sum + item.price, 0);
  const buyable = Math.random() < 0.5 || total === 0;
  const offset = buyable
    ? randInt(0, MAX_OFFSET / STEP) * STEP
    : -randInt(1, Math.min(MAX_OFFSET, total) / STEP) * STEP;
  const credits = Math.min(MAX_CREDITS, total + offset);

  return { agent, items, total, credits, buyable: credits >= total };
}

function renderItem(item, index) {
  const li = document.createElement("li");
  li.className = `item item--${item.kind}`;
  li.style.animationDelay = `${index * 60}ms`;

  const icon = document.createElement("span");
  icon.className = "item__icon";
  const img = document.createElement("img");
  img.src = item.icon;
  img.alt = "";
  icon.appendChild(img);

  const kind = document.createElement("span");
  kind.className = "item__kind";
  kind.textContent = item.label;

  const name = document.createElement("span");
  name.className = "item__name";
  name.textContent = item.name;
  if (item.badge) {
    const badge = document.createElement("span");
    badge.className = "item__badge";
    badge.textContent = item.badge;
    name.appendChild(badge);
  }

  const price = document.createElement("span");
  price.className = "item__price";
  price.textContent = item.price === 0 ? "無料" : yen(item.price);

  li.append(icon, kind, name, price);
  return li;
}

function hideAnswer() {
  answerBtn.classList.remove("is-open");
  answerBtn.setAttribute("aria-expanded", "false");
  itemsEl.classList.remove("is-revealed");
  answerHint.hidden = false;
  answerValue.hidden = true;
}

function showAnswer() {
  const { total, credits, buyable } = current;
  answerBtn.classList.add("is-open");
  answerBtn.setAttribute("aria-expanded", "true");
  itemsEl.classList.add("is-revealed");
  answerHint.hidden = true;
  answerValue.hidden = false;

  verdictEl.textContent = buyable ? "○ 買える" : "× 買えない";
  verdictEl.className = `credit-answer__verdict ${buyable ? "is-ok" : "is-ng"}`;
  const diff = credits - total;
  breakdownEl.innerHTML = `合計 <strong>${yen(total)}</strong> ／ 所持 <strong>${yen(
    credits
  )}</strong>（${diff >= 0 ? `残り ${yen(diff)}` : `${yen(-diff)} 不足`}）`;
}

function next() {
  current = buildQuestion();
  hideAnswer();

  agentImg.src = current.agent.image;
  agentImg.alt = current.agent.name;
  agentName.textContent = current.agent.name;

  creditsEl.textContent = yen(current.credits);
  creditsEl.classList.remove("is-pop");
  void creditsEl.offsetWidth;
  creditsEl.classList.add("is-pop");

  itemsEl.replaceChildren(...current.items.map(renderItem));
}

nextBtn.addEventListener("click", next);answerBtn.addEventListener("click", () => {
  if (answerBtn.classList.contains("is-open")) hideAnswer();
  else showAnswer();
});

next();
