async function getData(file) {
  try {
    const currentLang = localStorage.getItem('language') || 'de';
    
    let targetFile = file;
    if (file === 'categories.json') {
      targetFile = `categories.${currentLang}.json`;
    } else if (file === 'recipes.json') {
      targetFile = `recipes.${currentLang}.json`;
    }

    const res = await fetch(`./data/${targetFile}`);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    if (Array.isArray(data)) {
      return data.map(item => {
        if (item && typeof item.image === 'string' && item.image.endsWith('.png')) {
          return { ...item, image: item.image.replace(/\.png$/i, '.webp') };
        }
        return item;
      });
    }
    return data;
  } catch (error) {
    console.error(`Could not load ${file}:`, error);
    return null;
  }
}

async function initHome() {
  const categories = await getData('categories.json');
  const recipes = await getData('recipes.json');

  const catGrid = document.getElementById('categories-grid');
  if (catGrid && categories) {
    catGrid.innerHTML = categories.map(cat => `
      <a href="category.html?id=${cat.id}" class="category-card">
        <div class="category-image-wrapper">
          <img src="${cat.image}" alt="${cat.title}">
        </div>
        <span class="category-title">${cat.title}</span>
      </a>
    `).join('');
  }

  if (recipes && recipes.length > 0) {
    const latest = recipes[recipes.length - 1];
    const heroTitle = document.getElementById('hero-title');
    const heroImage = document.getElementById('hero-image');
    const heroLink = document.getElementById('hero-link');

    if (heroTitle) {
      const titleText = latest.title;
      const breakPoint = titleText.indexOf('(');
      const displayTitle = breakPoint > 0
        ? `${titleText.slice(0, breakPoint)}<br><span class="hero-title-inline">${titleText.slice(breakPoint)}</span>`
        : titleText;
      heroTitle.innerHTML = displayTitle;
    }
    if (heroImage) {
      heroImage.src = latest.image;
      heroImage.alt = latest.title;
    }
    if (heroLink) heroLink.href = `recipe.html?id=${latest.id}`;
  }
}

async function initCategory() {
  const params = new URLSearchParams(window.location.search);
  const catId = params.get('id');

  const categories = await getData('categories.json');
  const recipes = await getData('recipes.json');

  if (categories) {
    const currentCat = categories.find(c => c.id === catId);
    if (currentCat) {
      document.getElementById('category-title').textContent = currentCat.title;
    }
  }

  if (!recipes) return;

  const categoryRecipes = recipes.filter(r => r.category === catId);

  let activeContinent = 'all';
  let activeCountry = 'all';
  let activeSort = 'default';

  const continentContainer = document.getElementById('continent-chips');
  const countryContainer = document.getElementById('country-chips');
  const sortContainer = document.getElementById('sort-chips');
  const grid = document.getElementById('recipes-grid');

  if (!continentContainer || !countryContainer || !sortContainer || !grid) return;

  const continents = ['all', ...new Set(categoryRecipes.map(r => r.continent).filter(Boolean))];
  const countries = ['all', ...new Set(categoryRecipes.map(r => r.country).filter(Boolean))];
  const filterContainer = document.querySelector('.expressive-filters-container');
  const toggleBtn = document.getElementById('filter-toggle');

  if (toggleBtn && filterContainer && !toggleBtn.dataset.listenerAttached) {
    toggleBtn.addEventListener('click', () => {
      filterContainer.classList.toggle('is-open');
    });
    toggleBtn.dataset.listenerAttached = 'true';
  }

  continentContainer.innerHTML = continents.map(cont => `
    <button class="chip ${cont === 'all' ? 'active' : ''}" data-value="${cont}">
      ${cont === 'all' ? 'All Continents' : cont}
    </button>
  `).join('');

  countryContainer.innerHTML = countries.map(country => `
    <button class="chip ${country === 'all' ? 'active' : ''}" data-value="${country}">
      ${country === 'all' ? 'All Countries' : country}
    </button>
  `).join('');

  function setupChipListeners(container, callback) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.chip');
      if (!btn) return;

      container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      callback(btn.dataset.value);
      renderList();
    });
  }

  setupChipListeners(continentContainer, val => activeContinent = val);
  setupChipListeners(countryContainer, val => activeCountry = val);
  setupChipListeners(sortContainer, val => activeSort = val);

  function renderList() {
    let result = [...categoryRecipes];

    if (activeContinent !== 'all') {
      result = result.filter(r => r.continent === activeContinent);
    }

    if (activeCountry !== 'all') {
      result = result.filter(r => r.country === activeCountry);
    }

    if (activeSort === 'title-asc') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (activeSort === 'title-desc') {
      result.sort((a, b) => b.title.localeCompare(a.title));
    }

    if (result.length === 0) {
      grid.innerHTML = '<p style="grid-column: 1/-1; padding: 2rem 0; font-size: 1.1rem; color: #777;">No recipes found matching selected filters.</p>';
      return;
    }

    grid.innerHTML = result.map(r => `
      <a href="recipe.html?id=${r.id}" class="recipe-card">
        <img src="${r.image}" alt="${r.title}" class="recipe-card-img">
        <div class="recipe-card-title">${r.title}</div>
      </a>
    `).join('');
  }

  renderList();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildPrintDocument(recipe) {
  const ingredientsMarkup = recipe.ingredients.map((ingredient) => `<li>${escapeHtml(ingredient)}</li>`).join('');
  const instructionsMarkup = recipe.instructions.map((step) => `<li>${escapeHtml(step)}</li>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(recipe.title)} - BY ALÉ</title>
  <style>
    @page { size: A4; margin: 10mm; }
    :root {
      --bg-color: #ffffff;
      --text-color: #222222;
      --accent-color: #ab0000;
      --card-bg: #faf7f1;
      --border-color: #f7f3ec;
    }
    * { box-sizing: border-box; }
    body {
      font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      color: var(--text-color);
      margin: 0;
      padding: 0;
      background: var(--bg-color);
      font-size: 10.5pt;
      line-height: 1.35;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    h1, h2 {
      font-family: 'Playfair Display', Georgia, serif;
      margin: 0;
      color: var(--text-color);
    }
    .print-page {
      background: var(--bg-color);
      padding: 0;
      max-height: 100%;
      overflow: hidden;
    }
    .print-header {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 0.8rem 1rem;
      margin-bottom: 0.7rem;
    }
    .print-header h1 {
      font-size: 18pt;
      line-height: 1.15;
      margin-bottom: 0.2rem;
    }
    .print-meta {
      font-size: 9.5pt;
      color: #5b554e;
    }
    .print-grid {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 0.8rem;
      align-items: start;
      margin-bottom: 0.7rem;
    }
    .print-image {
      width: 140px;
      aspect-ratio: 1 / 1;
      object-fit: cover;
      border-radius: 10px;
      border: 1px solid var(--border-color);
      display: block;
      background: var(--card-bg);
    }
    .print-ingredients {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 0.7rem 0.8rem;
      min-height: 140px;
    }
    .print-ingredients h2,
    .print-instructions h2 {
      font-size: 12pt;
      margin: 0 0 0.4rem;
      color: var(--accent-color);
    }
    .print-ingredients-list {
      list-style: none;
      padding: 0;
      margin: 0;
      column-count: 2;
      column-gap: 0.7rem;
      font-size: 9.2pt;
    }
    .print-ingredients-list li {
      break-inside: avoid;
      padding: 0.18rem 0;
    }
    .print-instructions {
      background: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 0.7rem 0.8rem;
    }
    .print-instructions ol {
      padding-left: 1rem;
      margin: 0;
      font-size: 9.2pt;
    }
    .print-instructions li {
      margin-bottom: 0.3rem;
      line-height: 1.3;
    }
  </style>
</head>
<body>
  <div class="print-page">
    <div class="print-header">
      <h1>${escapeHtml(recipe.title)}</h1>
      <div class="print-meta">Time: ${escapeHtml(recipe.time)} • Yield: ${escapeHtml(recipe.yield)}</div>
    </div>
    <div class="print-grid">
      <img class="print-image" src="${escapeHtml(recipe.image)}" alt="${escapeHtml(recipe.title)}">
      <div class="print-ingredients">
        <h2>Ingredients</h2>
        <ul class="print-ingredients-list">${ingredientsMarkup}</ul>
      </div>
    </div>
    <div class="print-instructions">
      <h2>Instructions</h2>
      <ol>${instructionsMarkup}</ol>
    </div>
  </div>
</body>
</html>`;
}

async function initRecipe() {
  const params = new URLSearchParams(window.location.search);
  const recipeId = params.get('id');

  const recipes = await getData('recipes.json');
  if (!recipes) return;

  const recipe = recipes.find(r => r.id === recipeId);

  if (!recipe) return;

  document.getElementById('recipe-title').textContent = recipe.title;
  document.getElementById('recipe-image').src = recipe.image;
  document.getElementById('recipe-time').textContent = recipe.time;
  document.getElementById('recipe-yield').textContent = recipe.yield;

  const ingList = document.getElementById('ingredients-list');
  if (ingList) {
    ingList.innerHTML = recipe.ingredients.map(ing => `
      <li class="ingredient-item">
        <input type="checkbox">
        <span>${ing}</span>
      </li>
    `).join('');
  }

  const insList = document.getElementById('instructions-list');
  if (insList) {
    insList.innerHTML = recipe.instructions.map(step => `
      <li class="instruction-step">${step}</li>
    `).join('');
  }

  const printButton = document.getElementById('print-recipe-btn');
  if (printButton && !printButton.dataset.listenerAttached) {
    printButton.addEventListener('click', () => {
      const printWindow = window.open('', '_blank', 'width=900,height=1000');
      if (!printWindow) return;

      printWindow.document.write(buildPrintDocument(recipe));
      printWindow.document.close();
      printWindow.document.title = `${recipe.title} - BY ALÉ`;
      printWindow.focus();

      printWindow.onbeforeprint = () => {
        printWindow.document.title = `${recipe.title} - BY ALÉ`;
      };

      setTimeout(() => {
        printWindow.print();
      }, 250);
    });
    printButton.dataset.listenerAttached = 'true';
  }
}

function loadPageData() {
  const path = window.location.pathname;
  if (path.endsWith('category.html')) {
    initCategory();
  } else if (path.endsWith('recipe.html')) {
    initRecipe();
  } else {
    initHome();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadPageData();
});

async function initSearch() {
  const searchToggle = document.getElementById('search-toggle');
  const searchPanel = document.getElementById('search-panel');
  const searchInput = document.getElementById('search-input');
  const navCenter = document.getElementById('nav-center');
  const resultsSection = document.getElementById('search-results-section');
  const resultsSummary = document.getElementById('search-results-summary');
  const resultsGrid = document.getElementById('search-results-grid');
  const heroLink = document.getElementById('hero-link');

  if (!searchToggle || !searchPanel || !searchInput || !resultsSection || !resultsGrid) {
    return;
  }

  const clearResults = () => {
    resultsSection.hidden = true;
    resultsSummary.textContent = '';
    resultsGrid.innerHTML = '';
  };

  const renderResults = async (query) => {
    const recipes = await getData('recipes.json');
    if (!recipes) return;

    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      clearResults();
      return;
    }

    const terms = normalizedQuery.split(/\s+/).filter(Boolean);
    const matches = recipes.filter((recipe) => {
      const searchableText = [
        recipe.title,
        recipe.category,
        recipe.country,
        recipe.continent,
        ...(recipe.ingredients || []),
        ...(recipe.instructions || [])
      ].join(' ').toLowerCase();

      return terms.every(term => searchableText.includes(term));
    });

    if (matches.length === 0) {
      resultsSummary.textContent = 'No recipes matched your search.';
      resultsGrid.innerHTML = '<p class="search-results-empty">Try another ingredient, cuisine, or recipe name.</p>';
      resultsSection.hidden = false;
      return;
    }

    resultsSummary.textContent = `Showing ${matches.length} recipe${matches.length === 1 ? '' : 's'} matching “${query.trim()}”.`;
    resultsGrid.innerHTML = matches.map((recipe) => `
      <a href="recipe.html?id=${recipe.id}" class="recipe-card">
        <img src="${recipe.image}" alt="${recipe.title}" class="recipe-card-img">
        <div class="recipe-card-title">${recipe.title}</div>
      </a>
    `).join('');
    resultsSection.hidden = false;
  };

  if (!searchToggle.dataset.listenerAttached) {
    searchToggle.addEventListener('click', () => {
      const isOpen = searchPanel.classList.toggle('is-open');
      navCenter?.classList.toggle('is-search-active', isOpen);
      searchPanel.setAttribute('aria-hidden', String(!isOpen));
      document.body.classList.toggle('search-active', isOpen);

      if (heroLink) {
        heroLink.hidden = isOpen;
      }

      if (isOpen) {
        searchInput.focus();
        if (searchInput.value.trim()) {
          renderResults(searchInput.value);
        }
      } else {
        searchInput.blur();
        clearResults();
      }
    });

    searchInput.addEventListener('input', (event) => {
      renderResults(event.target.value);
    });

    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        searchPanel.classList.remove('is-open');
        searchPanel.setAttribute('aria-hidden', 'true');
        searchInput.blur();
        clearResults();
      }
    });

    document.addEventListener('click', (event) => {
      if (!searchPanel.contains(event.target) && !searchToggle.contains(event.target) && searchPanel.classList.contains('is-open')) {
        searchPanel.classList.remove('is-open');
        navCenter?.classList.remove('is-search-active');
        searchPanel.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('search-active');
        if (heroLink) heroLink.hidden = false;
        searchInput.blur();
        clearResults();
      }
    });

    searchToggle.dataset.listenerAttached = 'true';
  }

  clearResults();
}

async function loadTranslations(language) {
  try {
    const response = await fetch(`./data/lang/${language}.json`);
    if (!response.ok) {
      throw new Error(`Could not load ${language} translations`);
    }
    return await response.json();
  } catch (error) {
    console.error(error);
    return null;
  }
}

function applyTranslations(translations) {
  if (!translations) return;

  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const keys = element.getAttribute('data-i18n').split('.');
    let value = translations;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }

    if (typeof value === 'string') {
      element.textContent = value;
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    const keys = element.getAttribute('data-i18n-placeholder').split('.');
    let value = translations;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }

    if (typeof value === 'string') {
      element.setAttribute('placeholder', value);
    }
  });

  document.querySelectorAll('[data-i18n-aria-label]').forEach((element) => {
    const keys = element.getAttribute('data-i18n-aria-label').split('.');
    let value = translations;
    for (const key of keys) {
      value = value?.[key];
      if (value === undefined) break;
    }

    if (typeof value === 'string') {
      element.setAttribute('aria-label', value);
    }
  });
}

async function initSettings() {
  const toggleBtn = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const popover = document.getElementById('settings-popover');
  const contrastToggle = document.getElementById('contrast-toggle');
  const optionButtons = Array.from(document.querySelectorAll('.settings-option-btn'));
  const switchButtons = Array.from(document.querySelectorAll('.settings-switch'));

  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    if (themeIcon) {
      themeIcon.textContent = theme === 'dark' ? 'settings' : 'settings';
    }
    optionButtons.filter((btn) => btn.dataset.setting === 'theme').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.value === theme);
    });
  };

  const applyLanguage = async (language) => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    optionButtons.filter((btn) => btn.dataset.setting === 'language').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.value === language);
    });

    const translations = await loadTranslations(language);
    applyTranslations(translations);

    loadPageData();
  };

  const applyContrast = (enabled) => {
    localStorage.setItem('contrast', enabled ? 'high' : 'normal');
    document.body.setAttribute('data-contrast', enabled ? 'high' : 'normal');
    if (contrastToggle) {
      contrastToggle.setAttribute('aria-pressed', String(enabled));
    }
  };

  const savedTheme = localStorage.getItem('theme');
  
  const savedLanguage = localStorage.getItem('language') || 'de';
  
  const savedContrast = localStorage.getItem('contrast') === 'high';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  applyTheme(savedTheme === 'dark' || (!savedTheme && prefersDark) ? 'dark' : 'light');
  applyContrast(savedContrast);
  await applyLanguage(savedLanguage);

  if (!toggleBtn || !popover) return;

  const closePopover = () => {
    popover.classList.remove('is-open');
    toggleBtn.setAttribute('aria-expanded', 'false');
  };

  toggleBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    const isOpen = popover.classList.toggle('is-open');
    toggleBtn.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', (event) => {
    if (!popover.contains(event.target) && !toggleBtn.contains(event.target)) {
      closePopover();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closePopover();
    }
  });

  optionButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const { setting, value } = button.dataset;
      if (setting === 'theme') {
        applyTheme(value);
      } else if (setting === 'language') {
        applyLanguage(value);
      }
      closePopover();
    });
  });

  switchButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const nextState = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(nextState));
      applyContrast(nextState);
      closePopover();
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initSettings();
  initSearch();
});