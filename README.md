# StudyBoard — Sticky-note board & tracker for JEE/NEET aspirants

A handwritten sticky-note kanban board (inspired by [Stickyboard](https://stickyboard.dev)) built specifically for JEE/NEET
preparation, with a question log, syllabus tracker, and Pomodoro timer layered on top.

## Features

- **Board** — cork-board background, three columns (To Do / Doing / Done), draggable handwritten sticky notes in 5 colors.
- **Pomodoro Timer** — configurable focus/short-break/long-break durations, round tracking, optional subject/chapter tagging
  per session, sound + browser notification on completion, and a daily focus-session log.
- **Question Log** — log every question you solve: subject, chapter, result (correct/incorrect/skipped), difficulty,
  source, time taken, date, notes. Filterable history table.
- **Syllabus Tracker** — full JEE syllabus (Physics/Chemistry/Maths) and NEET syllabus (Physics/Chemistry/Biology) with
  Studied/Revised checkboxes and per-subject progress bars.
- **Dashboard** — questions logged, accuracy %, syllabus completion %, day streak, accuracy-by-subject breakdown.
- JEE/NEET toggle in the top bar switches syllabus data and keeps logs separate per exam.

No backend required — everything persists in the browser via `localStorage`.

## Running locally

This is a static site (plain HTML/CSS/JS, no build step). Serve it with any static file server, e.g.:

```bash
npx serve .
```

Then open the printed URL in your browser.

## Tech

Vanilla HTML/CSS/JS. Fonts: Caveat, Nunito, Patrick Hand, Permanent Marker (Google Fonts).
