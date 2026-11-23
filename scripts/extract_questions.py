#!/usr/bin/env python3
"""
GATE Overflow Book HTML to Practice JSON Extractor

This script parses standalone HTML book files produced by the GATE Overflow
`q2a-book` plugin (and utilized by the `GO-PDFs` wkhtmltopdf pipeline) into
structured JSON for the practice web application.

Usage:
    python3 extract_questions.py <input_book.html> <output.json>
"""

import sys
import os
import re
import json
from bs4 import BeautifulSoup

def clean_subject(raw_title):
    # E.g. "1 Algorithms (100)" -> "Algorithms"
    title = re.sub(r'^\d+\s*', '', raw_title)
    title = re.sub(r'\s*\(\d+\)\s*$', '', title)
    return title.strip()

def extract(html_path, output_json_path):
    if not os.path.exists(html_path):
        print(f"Error: {html_path} does not exist.")
        sys.exit(1)

    print(f"Reading HTML file: {html_path} ...")
    with open(html_path, 'r', encoding='utf-8', errors='ignore') as f:
        soup = BeautifulSoup(f.read(), 'html.parser')

    # Step 1: Map Answer Keys
    print("Extracting answer keys from answer-key table...")
    answer_keys = {}
    for akt_td in soup.find_all('td', class_='akt-id'):
        qid = akt_td.get('id', '').replace('akt-', '').strip()
        key_td = akt_td.find_next_sibling('td', class_='akt-key')
        if key_td:
            key_text = key_td.get_text(strip=True)
            answer_keys[qid] = key_text

    print(f"Extracted {len(answer_keys)} answer keys.")

    # Step 2: Extract Question elements grouped by categories
    questions = []
    category_divs = soup.find_all('div', class_='category')
    print(f"Found {len(category_divs)} category sections.")

    for cat_div in category_divs:
        h = cat_div.find(['h1', 'h2', 'h3'])
        raw_cat = h.get_text(strip=True) if h else 'General'
        subject = clean_subject(raw_cat)

        is_gate_subject = not subject.startswith('Non GATE CSE') and not subject.startswith('Others')

        for q_div in cat_div.find_all('div', class_='question'):
            title_el = q_div.find('div', class_='question-title')
            title_a = title_el.find('a') if title_el else None
            q_url = title_a.get('href') if title_a else ''

            qid = ""
            if title_a and title_a.get('id'):
                qid = title_a.get('id').replace('question', '').strip()
            if not qid and q_url:
                match = re.search(r'gateoverflow\.in/(\d+)', q_url)
                if match:
                    qid = match.group(1)

            title_text = ""
            if title_a:
                raw_text = title_a.get_text(strip=True)
                title_text = re.sub(r'^\d+(\.\d+)*\s*', '', raw_text)

            content_div = q_div.find('div', class_='question-content')
            text_el = content_div.find('div', class_='question-text') if content_div else None

            options = []
            if text_el:
                ol = text_el.find('ol')
                if ol:
                    option_labels = ['A', 'B', 'C', 'D', 'E', 'F']
                    for idx, li in enumerate(ol.find_all('li')):
                        opt_label = option_labels[idx] if idx < len(option_labels) else str(idx + 1)
                        options.append({
                            'key': opt_label,
                            'html': li.decode_contents().strip(),
                            'text': li.get_text(strip=True)
                        })
                    ol.decompose()
                q_html = text_el.decode_contents().strip()
            else:
                q_html = ""

            tags = []
            tags_div = q_div.find('div', class_='qa-q-item-tags')
            if tags_div:
                tags = [a.get_text(strip=True) for a in tags_div.find_all('a')]

            ans_key = answer_keys.get(qid, '')

            questions.append({
                'id': qid,
                'title': title_text,
                'subject': subject,
                'is_gate_core': is_gate_subject,
                'url': q_url if q_url.startswith('http') else f"https://gateoverflow.in/{qid}",
                'question_html': q_html,
                'options': options,
                'answer': ans_key,
                'tags': tags
            })

    # Save to JSON
    with open(output_json_path, 'w', encoding='utf-8') as out:
        json.dump(questions, out, indent=2, ensure_ascii=False)

    # Also save as JS file for direct local browser usage without CORS
    js_output_path = output_json_path.replace('.json', '.js')
    with open(js_output_path, 'w', encoding='utf-8') as out_js:
        out_js.write('window.GATE_QUESTIONS = ' + json.dumps(questions) + ';')

    print(f"Successfully extracted {len(questions)} questions.")
    print(f"Saved JSON to: {output_json_path}")
    print(f"Saved JS to:   {js_output_path}")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python3 extract_questions.py <input_book.html> <output.json>")
        sys.exit(1)
    extract(sys.argv[1], sys.argv[2])
