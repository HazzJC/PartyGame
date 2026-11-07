# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-09-29

### Added
- **Paper Mario-Style World Map & Paper Diorama**: Hand-drawn SVG paper tokens, standee animal characters, themed board landmarks (*Paper Pier*, *Doodle Grove*, *Patchwork Plaza*, *Lantern Hill*), and animated camera tracking.
- **3D Dice & Local-First Mash**: Interactive 3D dice throws on both host and phone screens, local-first button-mash responsiveness, and slower, readable board walking.
- **Themed Mini-Game Places & Interactive Demos**: Custom SVG stages, visual skins, and animated "how-to-play" preview demos across all 33 mini-games (Free-for-all, Team, 1 vs Many, Co-op, and Duels), plus optional practice rounds and side indicators on the rules card.
- **Host Audio & Podium Fanfare**: 7 CC0 music loops (Lobby, Board, Mini-games, Duels, Podium fanfare and loop) paired with live WebAudio sound synthesis and persistent host volume controls.
- **Production Deployment & Sharded E2E CI**: Automated deployment to partygame.harryjameschapman.com on Cloudflare Workers & SQLite-backed Durable Objects, gated by a 4-shard parallel Playwright end-to-end test suite.

## [0.14.0] - 2026-09-28

### Added
- **Large Lobbies & Team Board (0.13–0.14)**: Support for up to 16 players with Team Board mode, movement cards, custom deck editing, and full-catalogue Playwright E2E verification.
- **Complete 33-Mini-Game Catalogue (0.8–0.12)**:
  - **Wave A**: Pick & Grid mini-games.
  - **Wave B**: Word & Social deduction/party mini-games.
  - **Wave C**: Real-time server-simulated physics and action mini-games.
  - **Wave D**: Asymmetric and symmetric Team mini-games.
  - **Wave E**: Co-op mini-games including *Defuse* and *The Mind* / *Herd Mentality*-inspired challenges.
- **Board Economy, Items & Duels (0.5–0.7)**: Procedurally generated boards with simultaneous turns, private branch choices, stars, item shops, hidden traps, duels with player wagers and spectator betting, endgame twists, and automated balance simulation.
- **Stream-Delay Calibration & Input Kit (0.1–0.4)**: Clock synchronisation and stream-delay calibration so phone controllers never spoil shared-screen reveals, plus an adaptive touch/mouse/keyboard/gamepad Input Lab and lobby toys.