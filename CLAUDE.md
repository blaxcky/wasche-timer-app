# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a German laundry timer Progressive Web App (PWA) that helps users track drying time for laundry on a clothes rack. The app tracks progress towards a 3-day drying goal and allows users to manage multiple laundry loads simultaneously.

## Architecture

- **Single-file application**: Everything is contained in `index.html`
- **Framework**: React 18 loaded via CDN (production build)
- **Styling**: TailwindCSS via CDN
- **Transpilation**: Babel standalone for JSX
- **Storage**: localStorage for timer persistence
- **PWA**: Service worker registration for offline functionality

## Key Features

- Timer tracking with 3-day target goal
- Two view modes: detailed list view and compact grid view
- Progress bars and visual indicators
- Timer completion and deletion
- Start time editing functionality
- Mobile-responsive design with touch targets
- German localization

## Development Notes

- All code is inline within the HTML file
- React components use hooks (useState, useEffect)
- SVG icons are implemented as React components
- Responsive design uses TailwindCSS classes with mobile-first approach
- Timer calculations use JavaScript Date objects and localStorage persistence

## Code Structure

- `LaundryTimerApp`: Main React component containing all application logic
- Icon components: `Clock`, `Plus`, `Trash2`, `Edit`, `CheckCircle`, `List`, `Grid`
- View rendering functions: `renderCompactTimer()`, `renderDetailedTimer()`
- Utility functions: `formatTime()`, timer management functions

## Local Development

Since this is a static HTML file with CDN dependencies, it can be served with any local web server:
- Python: `python -m http.server 8000`
- Node.js: `npx serve .`
- Simply open `index.html` in a browser

## PWA Manifest

The app includes a `manifest.json` for PWA functionality with app name, icons, and display settings for standalone mobile app experience.