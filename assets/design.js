// Botão para alternar entre o design antigo e o novo ("kids", em kids.css).
// O <head> de cada página já pôs data-design; aqui só se muda e se guarda a escolha.

(() => {
  const root = document.documentElement;
  const ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 1.6-2.2-.5-1.5.4-2.8 2-2.8H18a3 3 0 0 0 3-3c0-5.5-4-10-9-10Z"/><circle cx="7.5" cy="11.5" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15.5" cy="8" r="1"/></svg>`;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "design-toggle";

  const show = () => {
    const label = root.dataset.design === "kids" ? "Ver design antigo" : "Ver design novo";
    button.innerHTML = `${ICON}<span>${label}</span>`;
    button.title = label;
    button.setAttribute("aria-label", label);
  };

  button.addEventListener("click", () => {
    root.dataset.design = root.dataset.design === "kids" ? "classico" : "kids";
    try { localStorage.setItem("design", root.dataset.design); } catch {}
    show();
    // O livro reparte o texto pelas páginas conforme a letra: tem de voltar a medir.
    if (document.body.dataset.page === "livro") location.reload();
  });

  if (!root.dataset.design) root.dataset.design = "kids";
  show();

  // No livro não há canto livre (os botões de virar página ocupam o fundo): vai para a barra de cima.
  const readerBar = document.querySelector(".reader-bar .side-r");
  if (readerBar) {
    button.classList.add("inline");
    readerBar.prepend(button);
  } else {
    document.body.appendChild(button);
  }
})();
