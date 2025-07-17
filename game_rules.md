Below is the documentation for the Baseball TCG Sim, tailored for the next developer to ensure a smooth handoff. It summarizes the game's current state, architecture, and guidelines for future expansion, focusing on modularity, core mechanics, and development roadmap. This is a standalone document, assuming the code is already shared and accessible (e.g., via the provided artifact or repository).

---

# Baseball TCG Sim Developer Documentation

## Overview
The Baseball TCG Sim is a web-based, single-player (PvE) trading card game (TCG) hosted on GitHub Pages, blending baseball simulation with TCG mechanics. Players drag cards from a hand of five to a batter field, simulate at-bats against an AI-controlled pitcher, and manage a turn-based baseball match with bases, outs, and scores. The game is designed for accessibility (client-side, offline-capable) and strategic depth, with a focus on expandability for new card types, game modes, and progression systems.

This document provides an overview of the game's architecture, core mechanics, and guidelines for future development, ensuring the next developer can extend the game while maintaining its core philosophy.

## Game Philosophy
### Core Principles
- **Simplicity with Depth**: Intuitive interface for casual players, with strategic depth via card stats and decision-making.
- **Player Agency**: Players influence outcomes through card selection, balancing risk and reward.
- **Thematic Consistency**: Mechanics reflect baseball (hits, outs, bases) while incorporating TCG elements (card hands, stats).
- **Offline Accessibility**: Client-side logic with Service Worker support for offline play (planned, not yet implemented).
- **Iterative Growth**: Start with a minimal viable product (MVP) and expand based on player feedback.

### Design Goals
- Deliver a fun, engaging baseball TCG experience.
- Balance random number generation (RNG) with skill-based mechanics via stat comparisons.
- Ensure replayability through varied card stats and future collection/progression systems.
- Maintain modularity for easy addition of new features (e.g., multiplayer, new card types).

## Game Rules
### Objective
Outscore the enemy team by advancing runners and scoring runs while managing outs over a set number of innings (currently 9). The team with the most runs wins.

### Setup
- **Player Hand**: 5 cards (batters or action cards) with stats: Power, Hit, Contact, Speed.
- **Enemy Pitcher**: AI-controlled with stats: Power, Velocity, Control, Technique.
- **Field**: Three bases, a batter field for card placement, and a score display (0-0 start).
- **Outs**: Tracked with three lights, resetting per turn/inning.
- **Innings**: 9 innings, with top/bottom halves.

### Turn Structure
1. **Card Placement**:
   - Drag or click a card from the hand to select a batter or play an action card.
   - Only one card can be played per turn.
2. **Simulation**:
   - Click "Simulate At-Bat" (or equivalent) to resolve the play.
   - Batter outcomes (HOMERUN, SINGLE, DOUBLE, OUT, etc.) depend on batter vs. pitcher stats.
   - Action card outcomes depend on their specific effects (e.g., Bunt advances runners).
   - Outcomes update bases, outs, and scores.
3. **End Turn**:
   - Click "End Turn" to reset the batter field and draw a new card.
   - At 3 outs, the half-inning ends, switching sides or advancing the inning.

### Scoring
- **Player Scoring**:
  - HOMERUN: 10 points, clears bases.
  - TRIPLE: 3 points, runner to third.
  - DOUBLE: 2 points, runner to second.
  - SINGLE/WALK: 1 point, runner to first.
  - Action cards: 0 points (placeholder, customizable).
- **Enemy Scoring**: 1 point per out to simulate pressure (adjustable).
- **Win Condition**: Highest score after 9 innings. Ties may use future sudden-death innings.

### Constraints
- No local file I/O or network calls; all logic is client-side.
- Fixed hand size (5 cards, expandable).
- RNG moderated by stat comparisons to reduce frustration.

## Core Mechanics
### Card Types
1. **Batter Cards**:
   - Stats: Power (HOMERUN chance), Hit (success rate), Contact (SINGLE chance), Speed (DOUBLE/TRIPLE chance).
   - Played to simulate at-bats against the pitcher.
2. **Pitcher Cards**:
   - Stats: Power (opposes HOMERUN), Velocity (opposes hits), Control (op不止

System: reduces walk chance), Technique (reduces hit chance).
3. **Action Cards** (New):
   - Special cards with unique effects (e.g., Bunt, Steal Base, Hit and Run).
   - Effects defined in team data (e.g., advance runners, boost hit chance).
   - Extensible for new effects via `applyActionCard` function.

### Simulation Logic
- **At-Bat Simulation** (`simulateAtBatLocal`):
  - Compares batter stats (Power, Hit, Contact, Speed) vs. pitcher stats (Power, Velocity, Control, Technique).
  - Probabilities calculated with base values (e.g., strikeout: 0.20) adjusted by stat differences and normalization factors (CONFIG.statNormalization).
  - Outcomes: STRIKEOUT, WALK, HOMERUN, TRIPLE, DOUBLE, SINGLE, OUT.
- **Action Card Logic** (`applyActionCard`):
  - Handles special effects (e.g., Bunt advances runners with a success chance, Steal Base uses speed check).
  - Returns outcome objects compatible with `processAtBatOutcome`.

### Base and Out System
- **Bases**: Array of three slots (first, second, third), updated based on outcome.basesAdvanced (1-4).
- **Outs**: Increment on STRIKEOUT/OUT, reset on half-inning change.
- **Scoring**: Points added to away/home score based on outcome and half-inning.

## Technical Architecture
### Files
- **index.html**: Main page with UI layout (card fields, bases, outs, scores, buttons).
- **styles.css**: Embedded in `<style>`; defines card, field, and UI styling.
- **JavaScript (Embedded in `<script type="module">`)**:
  - **config.js**: Game settings (innings, hand size, scoring, stat normalization, event types).
  - **teamsData.js**: Team data (batters, pitchers, action cards).
  - **mechanics.js**: Core logic (game state, deck management, simulation, events).
  - **ui.js**: UI updates (hand, bases, scores, outs, pitcher).
  - **main.js**: Event listeners and game initialization.

### Key Components
- **GameStateManager**:
  - Manages game state (inning, bases, scores, etc.).
  - Supports event system for modularity (eventTypes: atBat, actionCard, inningChange, gameOver).
  - Methods: updateState, addEvent, subscribe, notifyListeners, saveState, loadState.
- **Event System**:
  - Tracks events (e.g., atBat, gameStart) with data and timestamps.
  - Extensible via listeners for new features (e.g., animations, multiplayer).
- **Deck Management**:
  - Functions: createDeck, shuffleDeck, drawCards.
  - Supports batters and action cards; deck reshuffles from discard when empty.

### Extensibility Features
- **Modular Card System**: Cards have a `type` field (batter, pitcher, action) for easy addition of new types.
- **Action Cards**: Framework for custom effects via `applyActionCard` and team data.
- **Event System**: Allows new features to hook into game events without modifying core logic.
- **Configurability**: CONFIG object for tweaking game parameters (e.g., scoring, probabilities).

## Development Roadmap
### MVP Completion (Current State)
- Core gameplay: Card placement, at-bat simulation, base/out tracking, scoring.
- Basic UI: Card hand, bases, outs, scores, end turn button.
- Action cards: Initial implementation (Bunt, Steal Base, Hit and Run).
- 9-inning matches with win condition.

### Recommended Enhancements
1. **Service Worker**:
   - Implement `serviceWorker.js` for offline caching.
   - Ensure assets (HTML, CSS, JS) are cached for offline play.
2. **Progression System**:
   - Add `storageUtils.js` for localStorage to save game state (scores, deck, progress).
   - Implement card collection/unlocking mechanics.
3. **New Card Types**:
   - Expand action cards (e.g., "Pitch Change" to modify pitcher stats).
   - Add special batter abilities (e.g., clutch hitting).
4. **Multiplayer**:
   - Extend GameStateManager for networked play (WebSocket or server-based).
   - Add player vs. player mode with alternating pitcher/batter roles.
5. **UI/UX Polish**:
   - Add sound effects (e.g., bat crack, crowd cheer).
   - Implement animations for base advancement and card plays.
   - Optimize for mobile with touch controls.
6. **Game Modes**:
   - Add short game (3 innings) or tournament modes.
   - Introduce difficulty levels by adjusting pitcher stats or RNG weights.
7. **Balancing**:
   - Tune CONFIG.statNormalization for fairer outcomes.
   - Test action card effects for balance.

## Notes for Next Developer
- **Start Here**:
  - Review `index.html` and embedded JavaScript for structure.
  - Focus on `GameStateManager` for state changes and event handling.
  - Test drag-and-drop (or click-based card selection) across browsers.
- **Key Tasks**:
  - Complete base advancement logic in `processAtBatOutcome` to handle runner movement (e.g., advance runners based on basesAdvanced, score runs when reaching home).
  - Add visual feedback for bases (e.g., colored indicators for occupied bases) and out lights.
  - Ensure "End Turn" button resets batter field and outs while preserving scores.
- **Extensibility Tips**:
  - Use `GameStateManager.subscribe` to add new features (e.g., animations, stats tracking) without modifying core logic.
  - Add new card types by extending `applyActionCard` and team data.
  - Leverage CONFIG for quick tweaks to game balance or rules.
- **Testing**:
  - Test edge cases: empty deck, 3 outs, game over, action card failures.
  - Verify UI updates (hand, bases, scores) after every action.
- **Resources**:
  - Refer to original documentation (provided) for rules and philosophy.
  - Use GitHub Issues for tracking bugs or feature requests.
- **Future Considerations**:
  - Plan for multiplayer architecture early to avoid major refactoring.
  - Consider modularizing JavaScript into separate files for large-scale expansions.

This codebase is designed to be a solid foundation for growth. Prioritize maintaining the core gameplay loop while incrementally adding features from the roadmap. Ensure all changes align with the game’s philosophy of simplicity, agency, and thematic consistency.

--- 

This documentation should guide the next developer to seamlessly take over and expand the game. Let me know if you need specific sections clarified or additional details!