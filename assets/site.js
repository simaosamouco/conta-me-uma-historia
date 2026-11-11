// Cabeçalho, leitor de áudio e rodapé partilhados entre páginas,
// e navegação sem recarregar a página (para o áudio não parar ao mudar de separador).

const APPLE = `<svg viewBox="0 0 32 32" aria-hidden="true">
  <path d="M16 9c-2-2.2-6.5-2.6-9 .4C4.3 12.6 5 19 8 23.6c1.7 2.6 3.8 4.4 6 3.6.9-.3 1.4-.6 2-.6s1.1.3 2 .6c2.2.8 4.3-1 6-3.6 3-4.6 3.7-11 1-14.2C22.5 6.4 18 6.8 16 9Z" fill="#cf4428"/>
  <path d="M16 9c0-2.6.8-4.6 2.4-6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M17.4 6.2c1.8-1.9 4.6-2.2 6.6-1.4-1 2-3.6 3.4-6.6 1.4Z" fill="#2f5a45"/>
</svg>`;

const ICONS = {
  play: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>',
  pause: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="3" y="2.5" width="3.5" height="11" rx="1"/><rect x="9.5" y="2.5" width="3.5" height="11" rx="1"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4v3.5H8"/><text x="12" y="15.2" text-anchor="middle" font-size="7.5" font-family="system-ui, sans-serif" font-weight="700" fill="currentColor" stroke="none">10</text></svg>',
  forward: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4v3.5H16"/><text x="12" y="15.2" text-anchor="middle" font-size="7.5" font-family="system-ui, sans-serif" font-weight="700" fill="currentColor" stroke="none">10</text></svg>',
  close: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
};

const PAGES = [
  { href: "index.html", label: "Início" },
  { href: "ler.html", label: "Ler" },
  { href: "ouvir.html", label: "Ouvir" },
  { href: "index.html#enviar", label: "Enviar" },
  { href: "index.html#como-funciona", label: "Como funciona" },
];

// Cada página recebe um sinal que é abortado quando se sai dela,
// para os scripts da página poderem largar os seus listeners.
let pageController = new AbortController();
window.pageSignal = pageController.signal;

const formatTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// MARK: Barra de progresso arrastável

// Pinta a barra (a largura e a bola seguem a variável --p) e atualiza o que o leitor de ecrã anuncia.
function setProgress(el, fraction, duration) {
  const f = Math.min(1, Math.max(0, fraction || 0));
  el.style.setProperty("--p", f);
  el.setAttribute("aria-valuenow", Math.round(f * 100));
  if (duration) el.setAttribute("aria-valuetext", `${formatTime(f * duration)} de ${formatTime(duration)}`);
}

// Arrastar a bola com o rato ou o dedo (ou tocar na barra) e setas do teclado.
// onDrag(fração) durante o arrasto (null = cancelado), onSeek(fração) ao largar, onStep(±1) nas setas.
function makeScrubber(el, { onDrag, onSeek, onStep }) {
  let dragging = false;
  const fractionAt = (x) => {
    const r = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (x - r.left) / r.width));
  };
  const stop = () => {
    dragging = false;
    el.classList.remove("dragging");
  };

  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging = true;
    try { el.setPointerCapture(e.pointerId); } catch {}  // continua a seguir o dedo/rato fora da barra
    el.classList.add("dragging");
    onDrag(fractionAt(e.clientX));
  });
  el.addEventListener("pointermove", (e) => { if (dragging) onDrag(fractionAt(e.clientX)); });
  el.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    stop();
    onSeek(fractionAt(e.clientX));
  });
  el.addEventListener("pointercancel", () => {
    if (!dragging) return;
    stop();
    onDrag(null);
  });
  el.addEventListener("keydown", (e) => {
    const dir = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (dir) { e.preventDefault(); onStep(dir); }
    if (e.key === "Home") { e.preventDefault(); onSeek(0); }
  });
}

// MARK: Cabeçalho

function renderHeader() {
  const links = PAGES.map((p) => `<a href="${p.href}">${p.label}</a>`).join("");

  document.querySelector("[data-header]").outerHTML = `
    <header class="site-header">
      <div class="wrap">
        <a class="brand" href="index.html">${APPLE}<span>Conta-me Uma História</span></a>
        <button class="nav-toggle" aria-expanded="false" aria-controls="nav">Menu</button>
        <nav class="nav" id="nav">${links}</nav>
        <button class="theme-toggle" type="button"></button>
      </div>
    </header>`;
  markCurrentPage();

  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("nav");
  toggle.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });
  nav.addEventListener("click", (e) => {
    if (e.target.tagName === "A") nav.classList.remove("open");
  });

  setupThemeToggle();
}

// MARK: Tema claro / escuro

const THEME_ICONS = {
  dark: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/></svg>`,
  light: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`,
};

// O <head> de cada página já pôs data-theme; aqui só se muda e se guarda a escolha.
function setupThemeToggle() {
  const button = document.querySelector(".theme-toggle");
  const system = matchMedia("(prefers-color-scheme: dark)");
  const root = document.documentElement;

  const show = () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    button.innerHTML = THEME_ICONS[next];
    button.setAttribute("aria-label", next === "dark" ? "Mudar para modo escuro" : "Mudar para modo claro");
    button.title = button.getAttribute("aria-label");
  };
  const apply = (theme) => { root.dataset.theme = theme; show(); };

  button.addEventListener("click", () => {
    const theme = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("tema", theme); } catch {}
    apply(theme);
  });
  // Sem escolha guardada, acompanha o sistema quando este muda.
  system.addEventListener("change", (e) => {
    let saved = null;
    try { saved = localStorage.getItem("tema"); } catch {}
    if (!saved) apply(e.matches ? "dark" : "light");
  });
  if (!root.dataset.theme) root.dataset.theme = system.matches ? "dark" : "light";
  show();
}

function markCurrentPage() {
  const current = `${document.body.dataset.page}.html`;
  document.querySelectorAll("#nav a").forEach((a) => {
    if (a.getAttribute("href") === current) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
}

// MARK: Rodapé

function renderFooter() {
  document.querySelector("[data-footer]").outerHTML = `
    <footer class="site-footer">
      <div class="wrap">
        <p>As histórias aqui publicadas são textos originais do criador deste sítio.<br>
           As imagens que as ilustram foram criadas com IA.</p>
        <p>© 2013–2026 Conta-me Uma História<br>
           Criado por Fernando M. Barros · Aveiro, Portugal</p>
        <p>Sítio atualizado em outubro de 2026<br>
           <button class="terms-link" type="button">Termos de Utilização</button></p>
      </div>
      <dialog class="terms" aria-labelledby="terms-title">
        <h2 id="terms-title">Termos de Utilização</h2>
        <p>As histórias e ilustrações disponibilizadas neste sítio constituem obras protegidas pelo direito de autor.</p>
        <p>É permitida a sua utilização, podendo ser descarregadas ou imprimidas, desde que não sejam efetuadas quaisquer modificações aos documentos. As ilustrações também poderão ser utilizadas para fins apenas pessoais e nunca para fins comerciais.</p>
        <p>Quaisquer direitos que não estejam aqui referidos estão reservados.</p>
        <form method="dialog"><button class="btn btn-primary">Fechar</button></form>
      </dialog>
    </footer>`;

  // O rodapé não muda entre páginas, por isso o botão só precisa de um listener.
  const terms = document.querySelector(".site-footer dialog.terms");
  document.querySelector(".site-footer .terms-link").addEventListener("click", () => terms.showModal());
  // Fecha também ao clicar fora da caixa.
  terms.addEventListener("click", (e) => { if (e.target === terms) terms.close(); });
}

// MARK: Leitor de áudio

const Player = (() => {
  const STORE = "cmh-player";
  const audio = new Audio();
  audio.preload = "metadata";
  const listeners = new Set();
  let track = null;   // { title, src, duration }
  let bar;
  let lastSave = 0;

  const state = () => ({
    track,
    playing: !!track && !audio.paused,
    time: audio.currentTime || 0,
    duration: audio.duration || 0,
  });

  function save() {
    try {
      if (track) sessionStorage.setItem(STORE, JSON.stringify({ ...track, time: audio.currentTime }));
      else sessionStorage.removeItem(STORE);
    } catch {}
  }

  function emit() {
    const s = state();
    listeners.forEach((fn) => fn(s));
    render(s);
  }

  function load(t, time = 0) {
    track = t;
    audio.src = t.src;
    if (time) audio.addEventListener("loadedmetadata", () => { audio.currentTime = time; emit(); }, { once: true });
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: "Conta-me Uma História" });
    }
    document.documentElement.classList.add("has-player");
    bar.hidden = false;
  }

  const api = {
    get current() { return track; },
    get duration() { return audio.duration || 0; },
    play(t) {
      if (!track || track.src !== t.src) load(t);
      audio.play();
      emit();
    },
    toggle() {
      if (!track) return;
      audio.paused ? audio.play() : audio.pause();
    },
    skip(seconds) {
      if (!track) return;
      audio.currentTime = Math.max(0, Math.min((audio.duration || Infinity) - 0.5, audio.currentTime + seconds));
      emit();
    },
    seek(fraction) {
      if (!track || !audio.duration) return;
      audio.currentTime = fraction * audio.duration;
      emit();
    },
    close() {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      track = null;
      save();
      bar.hidden = true;
      document.documentElement.classList.remove("has-player");
      emit();
    },
    // fn recebe o estado sempre que algo muda; deixa de receber quando `signal` é abortado.
    subscribe(fn, signal) {
      listeners.add(fn);
      signal?.addEventListener("abort", () => listeners.delete(fn));
      fn(state());
    },
  };

  function render(s) {
    if (!bar || !s.track) return;
    bar.querySelector(".p-title").textContent = s.track.title;
    const main = bar.querySelector('[data-act="toggle"]');
    if (main.dataset.state !== String(s.playing)) {
      main.dataset.state = s.playing;
      main.innerHTML = s.playing ? ICONS.pause : ICONS.play;
      main.setAttribute("aria-label", s.playing ? "Pausa" : "Continuar");
    }
    bar.querySelector(".p-label").textContent = s.playing ? "A ouvir" : "Em pausa";
    // Enquanto se arrasta a bola, a barra e o tempo mostram o ponto escolhido, não o que está a tocar.
    const progress = bar.querySelector(".p-progress");
    if (progress.classList.contains("dragging")) return;
    showTime(s.time);
    setProgress(progress, s.duration ? s.time / s.duration : 0, s.duration);
  }

  function showTime(time) {
    const total = audio.duration ? formatTime(audio.duration) : track?.duration || "";
    bar.querySelector(".p-time").textContent = `${formatTime(time)} / ${total}`;
  }

  function mount() {
    document.querySelector(".site-header").insertAdjacentHTML("afterend", `
      <div class="player" role="region" aria-label="Leitor de áudio" hidden>
        <div class="wrap player-inner">
          <div class="p-info">
            <span class="p-label">A ouvir</span>
            <a class="p-title" href="ouvir.html#a-tocar"></a>
          </div>
          <div class="p-controls">
            <button class="p-btn" data-act="back" aria-label="Recuar 10 segundos">${ICONS.back}</button>
            <button class="p-btn p-main" data-act="toggle" aria-label="Pausa">${ICONS.pause}</button>
            <button class="p-btn" data-act="forward" aria-label="Avançar 10 segundos">${ICONS.forward}</button>
          </div>
          <span class="p-time"></span>
          <button class="p-btn p-close" data-act="close" aria-label="Fechar leitor">${ICONS.close}</button>
        </div>
        <div class="p-progress" role="slider" tabindex="0" aria-label="Posição na história" aria-valuemin="0" aria-valuemax="100"><span></span></div>
      </div>`);
    bar = document.querySelector(".player");

    bar.addEventListener("click", (e) => {
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "toggle") api.toggle();
      if (act === "back") api.skip(-10);
      if (act === "forward") api.skip(10);
      if (act === "close") api.close();
    });
    // O título leva a Ouvir e desliza até à história (ouvir.html trata do #a-tocar).
    // Já em Ouvir, só desliza.
    bar.querySelector(".p-title").addEventListener("click", (e) => {
      if (document.body.dataset.page !== "ouvir") return;
      e.preventDefault();
      scrollToPlaying();
    });
    const progress = bar.querySelector(".p-progress");
    makeScrubber(progress, {
      onDrag(f) {
        if (f === null) return render(state());
        setProgress(progress, f, audio.duration);
        showTime(f * (audio.duration || 0));
      },
      onSeek: (f) => api.seek(f),
      onStep: (dir) => api.skip(dir * 5),
    });

    ["play", "pause", "loadedmetadata", "seeked"].forEach((ev) => audio.addEventListener(ev, () => { emit(); save(); }));
    audio.addEventListener("ended", () => { audio.currentTime = 0; emit(); save(); });
    audio.addEventListener("timeupdate", () => {
      emit();
      if (Date.now() - lastSave > 2000) { lastSave = Date.now(); save(); }
    });

    // Controlos do sistema (ecrã de bloqueio, teclas multimédia).
    if ("mediaSession" in navigator) {
      const ms = navigator.mediaSession;
      ms.setActionHandler("play", () => audio.play());
      ms.setActionHandler("pause", () => audio.pause());
      ms.setActionHandler("seekbackward", () => api.skip(-10));
      ms.setActionHandler("seekforward", () => api.skip(10));
    }

    // Se a página foi recarregada a meio de uma história, o leitor volta em pausa no mesmo ponto
    // (os browsers não deixam retomar o som sozinho sem um toque).
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORE) || "null");
      if (saved?.src) {
        const { time, ...t } = saved;
        load(t, time);
        render(state());
      }
    } catch {}
  }

  api.mount = mount;
  return api;
})();

window.Player = Player;

// Desliza (com calma) até à história que está no leitor, na lista de Ouvir.
function scrollToPlaying() {
  const src = Player.current?.src;
  const li = src && [...document.querySelectorAll(".track")].find((el) => AUDIO[el.dataset.i]?.src === src);
  if (!li) return;
  const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  li.scrollIntoView({ behavior: smooth ? "smooth" : "instant", block: "center" });
}

// MARK: Navegação sem recarregar

const canSwap = location.protocol.startsWith("http") && "DOMParser" in window;
const normalPath = (p) => (p.endsWith("/") ? `${p}index.html` : p);

// Os estilos próprios de cada página (<style> no <head>) trocam com a página.
document.querySelectorAll("head style").forEach((s) => (s.dataset.pageStyle = ""));

function swappable(a, e) {
  if (!canSwap || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  if (!a || a.target || a.hasAttribute("download")) return false;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin) return false;
  const path = normalPath(url.pathname);
  if (!path.endsWith(".html") || path.endsWith("/livro.html")) return false;  // o livro é uma página inteira
  if (path === normalPath(location.pathname) && url.search === location.search && url.hash) return false;  // âncora na mesma página
  return true;
}

async function go(href, push = true) {
  const url = new URL(href, location.href);
  let doc;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    doc = new DOMParser().parseFromString(await res.text(), "text/html");
  } catch {
    location.href = url;
    return;
  }

  pageController.abort();
  pageController = new AbortController();
  window.pageSignal = pageController.signal;

  if (push) history.pushState({}, "", url);
  document.title = doc.title;
  document.body.dataset.page = doc.body.dataset.page || "";

  document.querySelectorAll("style[data-page-style]").forEach((s) => s.remove());
  doc.querySelectorAll("head style").forEach((s) => {
    const copy = document.createElement("style");
    copy.dataset.pageStyle = "";
    copy.textContent = s.textContent;
    document.head.appendChild(copy);
  });

  document.querySelector("main").replaceWith(document.importNode(doc.querySelector("main"), true));
  markCurrentPage();

  // Corre os scripts da página nova. Ficam dentro de um bloco para que os `const`
  // não choquem com os de uma visita anterior à mesma página.
  doc.querySelectorAll("body script:not([src])").forEach((old) => {
    const s = document.createElement("script");
    s.textContent = `{\n${old.textContent}\n}`;
    document.body.appendChild(s);
    s.remove();
  });

  const target = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
  // Página nova: salta logo para o sítio, sem a deslocação suave do CSS.
  if (target) target.scrollIntoView({ behavior: "instant" });
  else window.scrollTo({ top: 0, behavior: "instant" });
}

document.addEventListener("click", (e) => {
  const a = e.target.closest("a[href]");
  if (!swappable(a, e)) return;
  e.preventDefault();
  go(a.href);
});

addEventListener("popstate", () => go(location.href, false));

renderHeader();
Player.mount();
renderFooter();
