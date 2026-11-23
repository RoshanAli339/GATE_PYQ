// GATE CSE Practice Web Application

let allQuestions = [];
let filteredQuestions = [];
let currentIndex = 0;
let userAnswers = {}; // qid -> { chosen: key, isCorrect: bool }
let bookmarkedIds = new Set();
let currentMode = 'practice'; // 'practice' or 'test'

// LocalStorage helpers
function loadSavedState() {
  try {
    const savedBookmarks = localStorage.getItem('gate_practice_bookmarks');
    if (savedBookmarks) {
      bookmarkedIds = new Set(JSON.parse(savedBookmarks));
    }
    const savedAnswers = localStorage.getItem('gate_practice_answers');
    if (savedAnswers) {
      userAnswers = JSON.parse(savedAnswers);
    }
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
}

function saveState() {
  try {
    localStorage.setItem('gate_practice_bookmarks', JSON.stringify(Array.from(bookmarkedIds)));
    localStorage.setItem('gate_practice_answers', JSON.stringify(userAnswers));
  } catch (e) {
    console.warn('LocalStorage error:', e);
  }
}

// Initialize Application
async function init() {
  loadSavedState();

  if (window.GATE_QUESTIONS && window.GATE_QUESTIONS.length > 0) {
    allQuestions = window.GATE_QUESTIONS;
    onDataLoaded();
  } else {
    try {
      const res = await fetch('data/questions.json');
      allQuestions = await res.json();
      onDataLoaded();
    } catch (err) {
      document.getElementById('questionArea').innerHTML = `
        <div class="card" style="text-align: center; color: #ef4444;">
          <h2>Failed to load questions</h2>
          <p>Make sure questions.json or questions.js is located in the data/ folder.</p>
        </div>`;
    }
  }
}

function onDataLoaded() {
  setupSubjectFilter();
  setupYearFilter();
  setupEventListeners();
  applyFilters();
  updateStats();
}

function setupSubjectFilter() {
  const select = document.getElementById('subjectFilter');
  const subjectCounts = {};

  allQuestions.forEach(q => {
    const subj = q.subject || 'Core Computer Science';
    subjectCounts[subj] = (subjectCounts[subj] || 0) + 1;
  });

  const subjects = Object.keys(subjectCounts).sort();

  select.innerHTML = `<option value="ALL">All Subjects (${allQuestions.length})</option>`;
  subjects.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = `${s} (${subjectCounts[s]})`;
    select.appendChild(opt);
  });
}

function setupYearFilter() {
  const select = document.getElementById('yearFilter');
  const yearCounts = {};

  allQuestions.forEach(q => {
    const yr = q.year || 'GATE CSE';
    yearCounts[yr] = (yearCounts[yr] || 0) + 1;
  });

  // Sort descending by year
  const years = Object.keys(yearCounts).sort((a, b) => b.localeCompare(a));

  select.innerHTML = `<option value="ALL">All Years (${allQuestions.length})</option>`;
  years.forEach(y => {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = `${y} (${yearCounts[y]})`;
    select.appendChild(opt);
  });
}

function applyFilters() {
  const subject = document.getElementById('subjectFilter').value;
  const year = document.getElementById('yearFilter').value;
  const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
  const filterType = document.getElementById('quickFilter').value;

  filteredQuestions = allQuestions.filter(q => {
    // Subject filter
    if (subject !== 'ALL' && q.subject !== subject) return false;

    // Year filter
    if (year !== 'ALL' && q.year !== year) return false;

    // Quick filter
    if (filterType === 'BOOKMARKED' && !bookmarkedIds.has(q.id)) return false;
    if (filterType === 'INCORRECT' && (!userAnswers[q.id] || userAnswers[q.id].isCorrect)) return false;
    if (filterType === 'UNATTEMPTED' && userAnswers[q.id]) return false;

    // Search filter
    if (searchTerm) {
      const matchText = (q.title + ' ' + (q.tags || []).join(' ') + ' ' + (q.question_html || '')).toLowerCase();
      if (!matchText.includes(searchTerm)) return false;
    }

    return true;
  });

  currentIndex = 0;
  renderCurrentQuestion();
  updateStats();
}

function renderCurrentQuestion() {
  const container = document.getElementById('questionCard');
  const emptyState = document.getElementById('emptyState');

  if (filteredQuestions.length === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  container.style.display = 'block';
  emptyState.style.display = 'none';

  const q = filteredQuestions[currentIndex];

  // Subject Badge & Year & Title
  document.getElementById('qSubject').textContent = q.subject || 'Core Computer Science';
  document.getElementById('qYear').textContent = q.year || 'GATE CSE';
  document.getElementById('qTitle').textContent = q.title || `Question ID: ${q.id}`;
  document.getElementById('qIndexDisplay').textContent = `${currentIndex + 1} of ${filteredQuestions.length}`;
  document.getElementById('jumpInput').value = currentIndex + 1;
  document.getElementById('jumpInput').max = filteredQuestions.length;

  // Bookmark Button
  const bookmarkBtn = document.getElementById('bookmarkBtn');
  if (bookmarkedIds.has(q.id)) {
    bookmarkBtn.classList.add('active');
    bookmarkBtn.innerHTML = `★ Bookmarked`;
  } else {
    bookmarkBtn.classList.remove('active');
    bookmarkBtn.innerHTML = `☆ Bookmark`;
  }

  // Question Content
  const contentEl = document.getElementById('questionContent');
  contentEl.innerHTML = q.question_html || '<p>No question description provided.</p>';

  // Tags
  const tagsContainer = document.getElementById('qTags');
  tagsContainer.innerHTML = '';
  if (q.tags && q.tags.length > 0) {
    q.tags.forEach(t => {
      const span = document.createElement('span');
      span.className = 'tag-badge';
      span.textContent = t;
      tagsContainer.appendChild(span);
    });
  }

  // Options
  renderOptions(q);

  // GATE Overflow Solution Link
  const discussBtn = document.getElementById('discussBtn');
  discussBtn.href = q.url || `https://gateoverflow.in/${q.id}`;

  // Reset feedback banner
  const banner = document.getElementById('feedbackBanner');
  banner.className = 'feedback-banner';
  banner.style.display = 'none';

  // If already answered, restore visual state
  if (userAnswers[q.id]) {
    revealAnswer(q, userAnswers[q.id].chosen);
  }

  // Render Math formulas using KaTeX
  renderMath();
}

function renderOptions(q) {
  const container = document.getElementById('optionsContainer');
  container.innerHTML = '';

  if (!q.options || q.options.length === 0) {
    container.innerHTML = `
      <div style="background: rgba(255,255,255,0.03); border: 1px dashed var(--border-color); padding: 1.25rem; border-radius: var(--radius-md); text-align: center;">
        <p style="color: #94a3b8; margin-bottom: 0.5rem;">Numerical Answer Type (NAT) or Fill-in-the-blank Question.</p>
        ${q.answer ? `<p style="color: #38bdf8; font-weight: 600;">Official Answer: ${q.answer}</p>` : ''}
      </div>`;
    return;
  }

  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.dataset.key = opt.key;
    btn.innerHTML = `
      <span class="option-key">${opt.key}</span>
      <span class="option-text">${opt.html || opt.text}</span>
    `;

    btn.onclick = () => onOptionSelected(q, opt.key);
    container.appendChild(btn);
  });
}

function onOptionSelected(q, chosenKey) {
  if (currentMode === 'practice') {
    const isCorrect = checkAnswerCorrectness(q.answer, chosenKey);
    userAnswers[q.id] = { chosen: chosenKey, isCorrect: isCorrect };
    saveState();
    revealAnswer(q, chosenKey);
    updateStats();
  }
}

function checkAnswerCorrectness(correctKey, chosenKey) {
  if (!correctKey) return false;
  const cleanAns = correctKey.trim().toUpperCase();
  return cleanAns.includes(chosenKey.toUpperCase());
}

function revealAnswer(q, chosenKey) {
  const buttons = document.querySelectorAll('.option-btn');
  const banner = document.getElementById('feedbackBanner');
  const bannerText = document.getElementById('bannerText');

  const isCorrect = checkAnswerCorrectness(q.answer, chosenKey);

  buttons.forEach(btn => {
    const key = btn.dataset.key;
    if (checkAnswerCorrectness(q.answer, key)) {
      btn.classList.add('correct');
    } else if (key === chosenKey) {
      btn.classList.add('wrong');
    }
  });

  banner.style.display = 'flex';
  if (isCorrect) {
    banner.className = 'feedback-banner correct show';
    bannerText.innerHTML = `<strong>Correct!</strong> Choice ${chosenKey} is correct.`;
  } else {
    banner.className = 'feedback-banner wrong show';
    const ansText = q.answer && q.answer !== 'N/A' && q.answer !== 'TBA' 
      ? `The official answer is <strong>${q.answer}</strong>.` 
      : `Check the detailed community solution on GATE Overflow.`;
    bannerText.innerHTML = `<strong>Incorrect.</strong> You chose ${chosenKey}. ${ansText}`;
  }
}

function renderMath() {
  if (window.renderMathInElement) {
    try {
      window.renderMathInElement(document.getElementById('questionCard'), {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false
      });
    } catch (e) {
      console.error('KaTeX rendering error:', e);
    }
  }
}

function updateStats() {
  const attempted = Object.keys(userAnswers).length;
  let correct = 0;
  for (let qid in userAnswers) {
    if (userAnswers[qid].isCorrect) correct++;
  }

  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

  document.getElementById('statTotal').textContent = filteredQuestions.length;
  document.getElementById('statAttempted').textContent = attempted;
  document.getElementById('statCorrect').textContent = correct;
  document.getElementById('statAccuracy').textContent = `${accuracy}%`;
}

function setupEventListeners() {
  document.getElementById('subjectFilter').onchange = applyFilters;
  document.getElementById('yearFilter').onchange = applyFilters;
  document.getElementById('quickFilter').onchange = applyFilters;
  document.getElementById('searchInput').oninput = debounce(applyFilters, 300);

  document.getElementById('prevBtn').onclick = () => {
    if (currentIndex > 0) {
      currentIndex--;
      renderCurrentQuestion();
    }
  };

  document.getElementById('nextBtn').onclick = () => {
    if (currentIndex < filteredQuestions.length - 1) {
      currentIndex++;
      renderCurrentQuestion();
    }
  };

  document.getElementById('randomBtn').onclick = () => {
    if (filteredQuestions.length > 0) {
      currentIndex = Math.floor(Math.random() * filteredQuestions.length);
      renderCurrentQuestion();
    }
  };

  document.getElementById('bookmarkBtn').onclick = () => {
    if (filteredQuestions.length === 0) return;
    const qid = filteredQuestions[currentIndex].id;
    if (bookmarkedIds.has(qid)) {
      bookmarkedIds.delete(qid);
    } else {
      bookmarkedIds.add(qid);
    }
    saveState();
    renderCurrentQuestion();
  };

  document.getElementById('jumpInput').onchange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= filteredQuestions.length) {
      currentIndex = val - 1;
      renderCurrentQuestion();
    }
  };

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.key === 'ArrowRight' || e.key === 'n') {
      document.getElementById('nextBtn').click();
    } else if (e.key === 'ArrowLeft' || e.key === 'p') {
      document.getElementById('prevBtn').click();
    } else if (e.key === 'b') {
      document.getElementById('bookmarkBtn').click();
    } else if (['1', '2', '3', '4', 'a', 'b', 'c', 'd'].includes(e.key.toLowerCase())) {
      const keyMap = { '1': 'A', '2': 'B', '3': 'C', '4': 'D', 'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D' };
      const optionKey = keyMap[e.key.toLowerCase()];
      const targetBtn = document.querySelector(`.option-btn[data-key="${optionKey}"]`);
      if (targetBtn) targetBtn.click();
    }
  });
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Start app
window.addEventListener('DOMContentLoaded', init);
