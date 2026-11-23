# GATE CSE Practice Web Application

An interactive question practice web application built by extracting structured questions, options, and answer keys from GATE Overflow's book compilation pipeline.

---

## 🚀 Quick Start

### Option 1: Open Directly in Your Browser
Simply double-click or open [index.html](file:///home/cyberknight/gate-practice-web/index.html) in any web browser (Chrome, Firefox, Edge, Brave, Safari).
*(No server required — `data/questions.js` loads the dataset locally without CORS issues!)*

### Option 2: Run a Local Web Server
If you prefer running a lightweight local server:
```bash
cd /home/cyberknight/gate-practice-web
python3 -m http.server 8080
```
Then visit: `http://localhost:8080`

---

## 🌟 Key Features

1. **Instant Answer Feedback**:
   - In practice mode, clicking an option gives instant visual feedback (green for correct, red for incorrect).
   - The correct choice is highlighted automatically.
2. **Direct Discussion & Solutions Link**:
   - Each question has a 1-click button: *"View Discussion & Solutions on GATE Overflow"* linking directly to the thread on `gateoverflow.in` with full community-vetted explanations.
3. **High-Speed KaTeX Math Rendering**:
   - Replaces the slow MathJax 2 rendering pipeline with client-side **KaTeX**, delivering near-instant rendering for mathematical formulas, asymptotic notation, and equations.
4. **Subject & Topic Filtering**:
   - Filter by core GATE CSE subjects: *Algorithms, Operating Systems, Computer Networks, Databases, Theory of Computation, Compiler Design, Digital Logic, COA, Programming & Data Structures, Discrete Mathematics, Aptitude*.
5. **Session Progress & Bookmarking**:
   - Tracks your attempted questions, correct score, and accuracy percentage in real-time.
   - Bookmark difficult questions with `B` or the star button to review them later using the *"Bookmarked (★)"* filter.
   - State is automatically saved in `localStorage`.
6. **Keyboard Shortcuts**:
   - `1` - `4` or `A` - `D`: Select option
   - `→` or `N`: Next question
   - `←` or `P`: Previous question
   - `B`: Bookmark/star question

---

## 🛠️ Extracting More Questions from Future Books

If you download or generate new book HTML files (e.g. `book_filter1_volume1.html`, `book_filter1_volume2.html`, or other exam books from `GO-PDFs`), you can parse them using the included extractor script:

```bash
python3 scripts/extract_questions.py <path_to_book.html> data/questions.json
```

This will automatically:
- Parse all question text, equations, and code snippets.
- Extract multiple choice options cleanly.
- Map the answer key table to match questions with their verified answers.
- Output both `data/questions.json` and `data/questions.js`.

---

## 📁 Project Structure

```text
gate-practice-web/
├── index.html                   # Main interactive practice UI
├── css/
│   └── style.css                # Modern responsive styling & dark theme
├── js/
│   └── app.js                   # Application logic, KaTeX math, answer validation
├── data/
│   ├── questions.json           # Extracted structured dataset (JSON)
│   └── questions.js             # Standalone dataset variable for local browser access
└── scripts/
    └── extract_questions.py     # HTML-to-JSON extractor script
```
