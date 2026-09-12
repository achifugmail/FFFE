# Fantasy Football Frontend (FFFE) - Technical Specification

## Overview

**Project Name**: FFFE (Fantasy Football Frontend)
**Type**: Web-based Single Page Application (SPA) for Fantasy Football League Management
**Tech Stack**: Vite + React 19 + Vanilla JavaScript
**Purpose**: Frontend interface for draft-based fantasy football league platform that connects to the FFBE (Fantasy Football Backend) API. Enables users to manage teams, execute drafts, view player statistics, make transfers, and track league standings.

---

## System Architecture

### Components

1. **Login/Authentication** ([index.html](index.html), [index.js](index.js))
   - JWT token-based authentication
   - LocalStorage for session management
   - User registration flow

2. **Main Navigation** ([nav.html](nav.html), [nav.js](nav.js))
   - Persistent bottom navigation bar
   - Active page highlighting
   - Responsive mobile-first design

3. **Core Application Pages**
   - **Team Management** ([Team.html](Team.html), [team.js](team.js)) - Gameweek lineup selection
   - **League View** ([League.html](League.html), [league.js](league.js)) - League overview and standings
   - **Scores** ([LeagueScore.html](LeagueScore.html), [LeagueScore.js](LeagueScore.js)) - Points and rankings
   - **Squad Management** ([Squad.html](Squad.html), [squad.js](squad.js)) - Player transfers and squad roster
   - **Draft Room** ([Draft.html](Draft.html), [draft.js](draft.js)) - Live player draft interface

4. **Administrative Pages**
   - **Settings** ([Settings.html](Settings.html)) - App configuration hub
   - **League Admin** ([LeagueAdmin.html](LeagueAdmin.html)) - Create/manage leagues
   - **Player Positions** ([PlayerPositions.html](PlayerPositions.html)) - Position management
   - **Fixtures** ([Fixtures.html](Fixtures.html)) - Match schedules
   - **Gameweek Stats** ([GameweekStats.html](GameweekStats.html)) - Performance statistics
   - **PL Data Refresh** ([PLDataRefresh.html](PLDataRefresh.html)) - Sync Premier League data

5. **Shared Utilities** ([common.js](common.js), [config.js](config.js))
   - API configuration and auth helpers
   - Shared UI components (player cards, dropdowns)
   - Environment-based backend URL selection

---

## Technology Stack

### Frontend Framework
- **Vite 6.2.0** - Build tool and dev server
- **React 19.0.0** - Component library (minimal usage - primarily vanilla JS)
- **React DOM 19.0.0** - React rendering

### Development Tools
- **ESLint 9.21.0** - Code linting
- **@vitejs/plugin-react 4.3.4** - React fast refresh support
- **TypeScript type definitions** - @types/react, @types/react-dom

### UI Libraries
- **Font Awesome 6.5.1** - Icon library (CDN)
- **Bootstrap 4.5.2** - Login page styling only (CDN)
- **Custom CSS** - App.css for all application styling

### Build Configuration
- **Development Server**: Port 55134 (Vite)
- **Build Output**: `build/` directory
- **Module Type**: ES Modules (type: "module")

### Browser APIs Used
- **LocalStorage** - Session persistence (token, userId, username, leagueId)
- **Fetch API** - All backend communication
- **Canvas API** - Dynamic pie chart icons for player performance
- **Intersection Observer** - Potential for lazy loading

---

## Core Features

### 1. Authentication & Authorization
- **Login Flow**
  - Username/password authentication
  - JWT token storage in localStorage
  - Auto-redirect to Team.html on success
  - 401 handling with redirect to login
- **Session Management**
  - Persistent login via localStorage
  - Token sent as Bearer Authorization header
  - Automatic logout on token expiration

### 2. Team Management (Team.html)
- **Gameweek Team Selection**
  - Build weekly lineup from squad roster
  - Visual pitch view with player positions
  - Grid view alternative layout
  - Captain selection (double points)
  - Toggle between pitch and grid layouts
- **Fixtures Integration**
  - View upcoming/completed fixtures
  - Fixture data synced with gameweek
  - Toggle fixtures panel
- **Pending Transfers Display**
  - View incoming trade offers
  - Accept/reject transfer requests
- **Visual Features**
  - Football pitch background with markings
  - Player photo integration from Premier League
  - Position-based layout (GK, DEF, WB, DM, AM, FW)
  - Responsive design for mobile/desktop

### 3. League Overview (League.html)
- **Squad Comparison**
  - All squads in league displayed as cards
  - Player roster visualization per squad
  - Transfer history panel
  - Squad statistics and points
- **Player Performance Visualization**
  - Pie chart icons showing minutes played vs max minutes
  - Color-coded performance (white → teal gradient)
  - Points per minute calculation
  - Position-specific max points comparison
- **Transfers Panel**
  - Toggle transfers view
  - Recent transfer history
  - Player swap tracking
- **Icon Legend**
  - Visual guide for performance indicators
  - Minutes played representation
  - Points efficiency metrics

### 4. Draft System (Draft.html)
- **Available Players View**
  - All undrafted players displayed by position
  - Real-time search/filter functionality
  - Position grouping (GK, DEF, WB, DM, AM, FW)
  - Sorted by total points (descending)
- **Squad Cards Display**
  - All league squads shown
  - Current draft order visualization
  - Active drafter highlighting
  - Player count per squad
- **Draft Actions**
  - Add player to squad
  - Draft advancement logic
  - Turn-based selection enforcement
  - Position constraints validation
- **Search Functionality**
  - Normalized text search (removes diacritics)
  - Search by: firstName, secondName, webName, position, team
  - Real-time filtering
- **Toggle Views**
  - Show/hide squad cards
  - Focus mode for player selection

### 5. Squad Management (Squad.html)
- **Squad Roster View**
  - All owned players displayed by position
  - Player statistics and scores
  - Position grouping
  - Transfer capability
- **Transfer System**
  - Standard transfers (swap player)
  - Transfer history tracking
  - Transfer limit enforcement (20 per season)
  - Position validation
- **View Toggle**
  - Switch between squad view and transfer view
  - Transfers panel slide-in/out

### 6. Scoring & Rankings (LeagueScore.html)
- **League Standings**
  - Total points ranking
  - Gameweek-by-gameweek breakdown
  - First/second/last place counts
  - Squad performance history
- **Score Visualization**
  - Points trends over time
  - Comparative performance
  - Position in standings

### 7. Player Card Interaction
- **Popup Player Details**
  - Click player photo or name
  - Detailed statistics overlay
  - Position-specific stats (GK saves, outfield goals/assists)
  - Performance indicators (goals, assists, clean sheets, minutes, cards)
  - Close on overlay click or X button
- **Statistics Displayed**
  - Goals scored
  - Assists
  - Clean sheets
  - Minutes played
  - Yellow/red cards
  - Own goals
  - Goalkeeper: Goals conceded, saves
  - Points/score

---

## UI/UX Design Patterns

### Navigation Structure
- **Bottom Navigation Bar** (Mobile-first)
  - Team (shirt icon)
  - Scores (chart icon)
  - Transfers (exchange icon)
  - League (trophy icon)
  - Settings (cog icon)
- **Active Page Highlighting**
  - Visual indication of current page
  - Icon and text labels

### Layout Patterns
1. **Team Container Layout**
   - Dropdown container (league/gameweek selection)
   - Main content grid
   - Toggle buttons (fixed position)
   - Side panels (slide-in/out)

2. **Position Grouping**
   - Sections by position (GK, DEF, WB, DM, AM, FW)
   - Color-coded position labels
   - Player grids within sections

3. **Card-Based Design**
   - Squad cards
   - Player cards
   - Stat cards
   - Consistent styling and spacing

### Responsive Design
- **Mobile First Approach**
  - Touch-optimized interactions
  - Bottom navigation for thumb reach
  - Collapsible panels
  - Swipe-friendly layouts
- **Viewport Meta Tag**
  - `viewport-fit=cover` for edge-to-edge display
  - Mobile-optimized font sizes
- **Adaptive Layouts**
  - Grid to column stacking
  - Toggle buttons for space efficiency
  - Overlay modals for detailed views

### Color Scheme
- **Environment-Based Colors**
  - **Localhost**: Orange primary, Indigo navigation
  - **Test/Staging**: Pink primary, DarkOliveGreen navigation
  - **Production**: Teal primary (#208579), Navy navigation (#13476e)
- **CSS Variables**
  - `--primary-color`
  - `--navigation-color`
  - Dynamic assignment based on hostname

### Interactive Elements
- **Toggle Buttons**
  - Transfers toggle (exchange icon → X icon)
  - Fixtures toggle (calendar icon)
  - View toggle (compress/expand icons)
  - Pitch/grid view toggle (football icon)
- **Dropdown Selectors**
  - League selection
  - Gameweek selection
  - Draft period selection
  - Consistent styling across pages
- **Search Boxes**
  - Real-time filtering
  - Placeholder text
  - Normalized text matching

---

## Data Flow

### Application Initialization
```
1. User lands on index.html (Login page)
   ↓
2. Enter credentials → POST /api2/User/login
   ↓
3. Receive JWT token + userId
   ↓
4. Store in localStorage: token, userId, username
   ↓
5. Redirect to Team.html (default landing page)
```

### Page Load Flow (Example: Team.html)
```
1. Load nav.html into #nav-placeholder
   ↓
2. Initialize navigation (highlight active page)
   ↓
3. Fetch user's leagues → GET /api2/Leagues/byUser
   ↓
4. Populate league dropdown (auto-select from localStorage or first)
   ↓
5. Fetch gameweeks for current draft period → GET /api2/Gameweeks
   ↓
6. Fetch user's team for selected gameweek → GET /api2/UserTeamPlayers/byUserSquadAndGameweek
   ↓
7. Render player grid or pitch view
   ↓
8. Fetch fixtures for gameweek → GET /api2/Fixtures/gameweek/{gameweekId}
   ↓
9. Setup player photo click interactions
   ↓
10. Poll for updates (optional - draft state changes, live scores)
```

### Draft Flow
```
1. User navigates to Draft.html
   ↓
2. Fetch available players → GET /api2/PlayerPositions/available-players-with-positions/{leagueId}/{draftPeriodId}
   ↓
3. Fetch all squads in league → GET /api2/UserSquads/ByLeague/{leagueId}
   ↓
4. Display players grouped by position
   ↓
5. Display squad cards with current draft order
   ↓
6. User searches/filters players
   ↓
7. User clicks "Add Player" (if their turn)
   ↓
8. POST /api2/UserSquads/AddPlayer
   ↓
9. Update squad display
   ↓
10. POST /api2/Leagues/{id}/advance-draft
   ↓
11. Refresh available players and squad cards
```

### Transfer Flow
```
1. User navigates to Squad.html
   ↓
2. Toggle transfers panel
   ↓
3. View transfer history → GET /api2/Transfers/completed
   ↓
4. View pending transfers → GET /api2/Transfers/pending/to-me/{leagueId}
   ↓
5. Initiate transfer:
   - Select player out (from squad)
   - Select player in (from available players)
   - Validate position match
   ↓
6. POST /api2/UserSquads/transfer
   {
     userSquadId, playerOutId, playerInId, fromUserSquadId (optional for trades)
   }
   ↓
7. Refresh squad and transfer lists
```

### Player Detail Interaction
```
1. User clicks player photo or name
   ↓
2. Parse player data from data-player attribute (JSON)
   ↓
3. Create overlay div (#player-card-overlay)
   ↓
4. Create player detail card with:
   - Photo
   - Name
   - Position
   - Score/Points
   - Statistics (goals, assists, etc.)
   ↓
5. Position card center screen (fixed position)
   ↓
6. Click overlay or X button to close
   ↓
7. Remove overlay and card from DOM
```

---

## API Integration

### Base Configuration (config.js)
- **Environment Detection**
  - `localhost` → https://localhost:44390/api2
  - `test.divizia.net` → https://ffbe1test-cmdch8dgcscmd0e6.eastus2-01.azurewebsites.net/api2
  - **Production** → https://ffbe1-hjdthacef0hjc9ht.eastus2-01.azurewebsites.net/api2

### Authentication Headers
```javascript
function addAuthHeader(options = {}) {
    const token = localStorage.getItem('token');
    const headers = options.headers || {};
    headers['Authorization'] = `Bearer ${token}`;
    return { ...options, headers };
}
```

### Common API Calls

#### User & Authentication
- `POST /api2/User/login` - Authenticate user
- `POST /api2/User/register` - Register new user
- `POST /api2/User/change-password` - Update password

#### League Management
- `GET /api2/Leagues/byUser` - User's leagues
- `GET /api2/Leagues/{id}` - League details
- `POST /api2/Leagues/create` - Create new league
- `POST /api2/Leagues/join` - Join via code

#### Draft System
- `GET /api2/PlayerPositions/available-players-with-positions/{leagueId}/{draftPeriodId}` - Undrafted players
- `POST /api2/UserSquads/AddPlayer` - Draft player
- `POST /api2/Leagues/{id}/advance-draft` - Move to next drafter
- `GET /api2/Leagues/{id}/draft-state` - Current draft status

#### Squad & Team
- `GET /api2/UserSquads/{id}` - Squad details with players
- `GET /api2/UserSquads/ByLeague/{leagueId}` - All squads in league
- `POST /api2/UserTeamPlayers/AddByGameweekAndSquad` - Set gameweek lineup
- `PUT /api2/UserTeamPlayers/updateCaptainByGameweekAndSquad` - Set captain
- `GET /api2/UserTeamPlayers/byUserSquadAndGameweek` - Gameweek team

#### Transfers
- `POST /api2/UserSquads/transfer` - Execute transfer
- `GET /api2/Transfers/pending/to-me/{leagueId}` - Incoming trades
- `GET /api2/Transfers/completed` - Transfer history
- `POST /api2/Transfers/{id}/accept` - Accept trade

#### Data Fetch
- `GET /api2/DraftPeriods` - Draft periods/seasons
- `GET /api2/Fixtures/gameweek/{gameweekId}` - Fixtures
- `GET /api2/PlayerPositions/positions` - Position definitions
- `GET /api2/Players` - All Premier League players
- `GET /api2/PlayerGameweekStats` - Player statistics

### Error Handling
- **401 Unauthorized**: Redirect to index.html (login)
- **404 Not Found**: Redirect to LeagueAdmin.html (create/join league)
- **Network Errors**: Console log + user-friendly error messages
- **Validation Errors**: Display inline error messages

---

## Project Structure

```
c:\Homework\FFFE\
├── FFFE.sln                          # Visual Studio solution file
├── fffe/                             # Main project directory
│   ├── package.json                  # NPM dependencies
│   ├── vite.config.js                # Vite configuration (port 55134, build dir)
│   ├── eslint.config.js              # ESLint rules
│   ├── index.html                    # Login page (entry point)
│   ├── index.js                      # Login logic
│   ├── CHANGELOG.md                  # Project history
│   ├── fffe.esproj                   # Visual Studio project file
│   │
│   ├── .vscode/
│   │   └── launch.json               # VS Code debug configuration
│   │
│   ├── public/                       # Static assets and main application
│   │   ├── config.js                 # API endpoints, auth helpers
│   │   ├── common.js                 # Shared utilities (fetchLeagues, fetchDraftPeriods, createPlayerCard)
│   │   ├── nav.html                  # Navigation bar component
│   │   ├── nav.js                    # Navigation logic
│   │   │
│   │   ├── main.html                 # Legacy main menu
│   │   ├── main.js                   # Legacy main logic
│   │   │
│   │   ├── Team.html                 # Gameweek team management
│   │   ├── team.js                   # Team selection logic
│   │   ├── League.html               # League overview
│   │   ├── league.js                 # League standings and squad comparison
│   │   ├── LeagueScore.html          # Scores and rankings
│   │   ├── LeagueScore.js            # Scoring visualization
│   │   ├── Squad.html                # Squad roster and transfers
│   │   ├── squad.js                  # Squad management
│   │   ├── Draft.html                # Draft room
│   │   ├── draft.js                  # Draft logic
│   │   ├── Draft2.html               # Alternative draft view (deprecated?)
│   │   ├── draft2.js                 # Alternative draft logic
│   │   │
│   │   ├── Settings.html             # Settings hub
│   │   ├── settings.js               # Settings logic
│   │   ├── User.html                 # Change password
│   │   ├── user.js                   # User settings logic
│   │   ├── LeagueAdmin.html          # League management
│   │   ├── leagueAdmin.js            # League admin logic
│   │   ├── PlayerPositions.html      # Position management
│   │   ├── playerPositions.js        # Position assignment
│   │   ├── Fixtures.html             # Match fixtures
│   │   ├── fixtures.js               # Fixtures display
│   │   ├── GameweekStats.html        # Statistics view
│   │   ├── GameweekStats.js          # Stats display logic
│   │   ├── PLDataRefresh.html        # Data sync admin
│   │   ├── plDataRefresh.js          # Premier League data refresh
│   │   ├── GameRules.html            # Scoring rules display
│   │   ├── gameRules.js              # Game rules logic
│   │   ├── newUser.html              # User registration
│   │   ├── registerUser.js           # Registration logic
│   │   ├── ResetPassword.html        # Admin password reset
│   │   ├── resetPassword.js          # Password reset logic
│   │   ├── UserAdmin.html            # User administration
│   │   │
│   │   └── src/
│   │       ├── App.css               # Main application styles (1000+ lines)
│   │       ├── app2.css              # Secondary styles
│   │       ├── index.css             # Base styles
│   │       ├── App.jsx               # React template (minimal usage)
│   │       ├── main.jsx              # React entry point
│   │       └── assets/
│   │           └── react.svg
│   │
│   └── node_modules/                 # NPM dependencies (auto-generated)
```

---

## Key Files Reference

| File | Purpose | Lines | Key Features |
|------|---------|-------|-------------|
| [index.html](index.html) | Login page | ~37 | Bootstrap form, credential input |
| [index.js](index.js) | Login handler | ~36 | JWT authentication, localStorage |
| [config.js](public/config.js) | Configuration | ~60 | Environment detection, auth headers, Premier League image URL |
| [common.js](public/common.js) | Shared utilities | ~326 | fetchLeagues, fetchDraftPeriods, fetchPositions, createPlayerCard, setupPlayerPhotoInteractions |
| [nav.html](public/nav.html) | Navigation component | ~42 | 5-item bottom nav, Font Awesome icons |
| [nav.js](public/nav.js) | Navigation logic | ~100+ | Active page highlighting, league menu |
| [Team.html](public/Team.html) | Team page | ~90 | Pitch view, grid view, fixtures panel |
| [team.js](public/team.js) | Team logic | ~1000+ | Lineup management, captain selection, pitch rendering |
| [League.html](public/League.html) | League page | ~73 | Squad cards, transfers panel |
| [league.js](public/league.js) | League logic | ~500+ | Pie chart icons, performance visualization |
| [Squad.html](public/Squad.html) | Squad page | ~56 | Player grid, transfers toggle |
| [squad.js](public/squad.js) | Squad logic | ~500+ | Roster display, transfer initiation |
| [Draft.html](public/Draft.html) | Draft page | ~52 | Player search, squad cards |
| [draft.js](public/draft.js) | Draft logic | ~800+ | Available players, draft advancement, search filter |
| [LeagueScore.html](public/LeagueScore.html) | Scores page | ~50+ | Standings table |
| [LeagueScore.js](public/LeagueScore.js) | Scoring logic | ~500+ | Points calculation, rankings |
| [src/App.css](public/src/App.css) | Main stylesheet | ~1000+ | Responsive layouts, player cards, pitch view |

---

## Styling Architecture (App.css)

### CSS Variables
```css
:root {
    --primary-color: #208579;      /* Teal (production) */
    --navigation-color: #13476e;   /* Navy blue */
}
```

### Key Style Classes

#### Layout
- `.team-container` - Main content wrapper
- `.dropdown-container` - League/gameweek selectors
- `.team-layout` - Grid layout for main content + side panels
- `.container` - Generic content container

#### Player Components
- `.player-grid` - Grid of players by position
- `.player-row` - Individual player row (list view)
- `.player-grid-item` - Individual player (grid view)
- `.player-photo` - Player image (40x40px from Premier League)
- `.player-name` - Player name label
- `.player-score` - Points display
- `.player-detail-card` - Popup player statistics card
- `.player-card-overlay` - Dark overlay background for popup

#### Position Sections
- `.section` - Position group container
- `.position-label` - Position name header
- `.position-group` - Players grouped by position

#### Interactive Elements
- `.transfers-toggle` - Toggle transfers panel button
- `.view-toggle-button` - Switch view mode button
- `.fixtures-toggle` - Toggle fixtures panel
- `.gameweek-btn` - Gameweek navigation button

#### States
- `.captain` - Captain player highlight (light blue background)
- `.selected` - Selected player highlight (light green)
- `.transfers-open` - Transfers panel visible state

#### Pitch View
- `.pitch-view` - Football pitch container
- `.pitch-markings` - Field lines and areas
- `.center-circle`, `.center-line` - Pitch graphics
- `.goal-area-left/right` - Goal boxes
- `.penalty-area-left/right` - Penalty boxes

#### Navigation
- `#main-nav` - Bottom navigation bar
- `.nav-link` - Navigation item
- `.nav-link.active` - Current page highlight
- `.left-align`, `.right-align` - Navigation positioning

---

## LocalStorage Usage

### Stored Keys
- **`token`** - JWT authentication token (string)
- **`userId`** - Current user ID (string)
- **`username`** - Current user's username (string)
- **`leagueId`** - Currently selected league ID (string)

### Usage Pattern
```javascript
// Set on login
localStorage.setItem('token', data.token);
localStorage.setItem('userId', data.userId);
localStorage.setItem('username', username);

// Retrieve throughout app
const token = localStorage.getItem('token');
const userId = localStorage.getItem('userId');
const leagueId = localStorage.getItem('leagueId');

// Clear on logout (implicit - redirect to login)
// No explicit logout implemented - relies on 401 handling
```

---

## Unique Features & Innovations

### 1. Dynamic Performance Visualization (league.js)
- **Pie Chart Icons**
  - Canvas-generated mini pie charts (18x18px)
  - Minutes played as percentage of max minutes
  - Color gradient based on points per minute
  - Real-time calculation per position
  - Drop shadow for depth
- **Color Scoring Algorithm**
  ```javascript
  startColor: { r: 255, g: 255, b: 255 } // White
  endColor: { r: 32, g: 128, b: 128 }    // Teal
  percentage = (pointsPerMinute / maxPointsPerMinute) * 100
  color = interpolate(startColor, endColor, percentage)
  pastelFactor = 0.2 // Soften colors
  ```

### 2. Normalized Search (draft.js)
- **Diacritical Mark Removal**
  ```javascript
  const normalizedSearchText = searchText.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  ```
  - Allows searching "Haaland" to find "Håland"
  - Handles international player names
  - Real-time filtering

### 3. Pitch View Layout (team.js)
- **Visual Football Pitch**
  - SVG/CSS-based pitch markings
  - Dynamic player positioning by position type
  - Center circle, penalty areas, goals
  - Responsive scaling
- **Position Mapping**
  - GK: Bottom center
  - DEF: Defensive line
  - WB: Wing positions
  - DM: Defensive midfield
  - AM: Attacking midfield
  - FW: Forward line

### 4. Environment-Based Theming (config.js)
- **Automatic Color Switching**
  ```javascript
  if (host === 'localhost') {
      root.style.setProperty('--primary-color', 'orange');
      root.style.setProperty('--navigation-color', 'indigo');
  } else if (host.includes('test')) {
      root.style.setProperty('--primary-color', 'pink');
      root.style.setProperty('--navigation-color', 'DarkOliveGreen');
  }
  ```
  - Instant visual identification of environment
  - Prevents production changes in test/dev

### 5. Player Card Interaction (common.js)
- **Event Delegation Pattern**
  - Handles dynamically added players
  - Clones nodes to prevent duplicate listeners
  - Click on photo or name triggers same handler
  - JSON data attribute storage
  - Fallback parsing if JSON fails

### 6. Modular HTML Injection (All pages)
- **Navigation Component Pattern**
  ```javascript
  fetch('nav.html')
      .then(response => response.text())
      .then(data => {
          document.getElementById('nav-placeholder').innerHTML = data;
          initializeNavigation();
      });
  ```
  - Consistent navigation across all pages
  - Single source of truth (nav.html)
  - No framework required

---

## Development Workflow

### Local Development
1. **Install Dependencies**
   ```bash
   cd fffe
   npm install
   ```

2. **Run Development Server**
   ```bash
   npm run dev
   ```
   - Runs on `http://localhost:55134`
   - Hot module replacement enabled
   - API points to `https://localhost:44390/api2`

3. **Backend Setup**
   - Ensure FFBE backend is running on port 44390
   - CORS configured for localhost:55134
   - JWT authentication enabled

### Build Process
```bash
npm run build
```
- Output: `fffe/build/` directory
- Minified and optimized
- Ready for deployment to Azure Static Web Apps

### Deployment
- **Test Environment**: https://test.divizia.net
  - Backend: https://ffbe1test-cmdch8dgcscmd0e6.eastus2-01.azurewebsites.net/api2
- **Production Environment**: https://divizia.net (assumed)
  - Backend: https://ffbe1-hjdthacef0hjc9ht.eastus2-01.azurewebsites.net/api2

### Visual Studio Integration
- **Project Type**: ESProj (JavaScript/Node.js project)
- **Debugger**: Configured in `.vscode/launch.json`
- **Created with**: `npm init vite@latest fffe -- --template=react`

---

## Security Considerations

### Authentication
- **JWT Tokens**
  - Stored in localStorage (vulnerable to XSS)
  - No HttpOnly cookie option (SPA limitation)
  - Token sent as Bearer header on all authenticated requests
- **Session Management**
  - No automatic token refresh implemented
  - Manual logout not implemented (relies on 401 redirect)
  - No session timeout on frontend

### Potential Vulnerabilities
1. **XSS Risk**: LocalStorage token storage
   - Mitigation: Content Security Policy (CSP) recommended
2. **No CSRF Protection**: Not applicable (token-based auth, no cookies)
3. **Sensitive Data in URL**: Player/squad IDs in query params (acceptable)
4. **No Input Sanitization**: Relies on backend validation

### Recommended Improvements
- Implement Content Security Policy headers
- Add token expiration check before API calls
- Implement explicit logout functionality
- Consider sessionStorage for shorter-lived tokens
- Add rate limiting on sensitive actions (transfers, draft picks)

---

## Performance Optimizations

### Current Optimizations
1. **Position Caching** (common.js)
   ```javascript
   const positionsCache = { positions: null };
   ```
   - Fetches positions once per session
   - Reduces API calls

2. **Canvas-Based Icons** (league.js)
   - Generated client-side vs image requests
   - Faster rendering than SVG for large quantities
   - Smaller payload than images

3. **CSS-Based Animations**
   - Hardware-accelerated transforms
   - No JavaScript animation libraries
   - Smooth transitions on toggle buttons

### Potential Improvements
- **Code Splitting**: Separate bundles per page (Draft, Team, Squad)
- **Lazy Loading**: Load player images on viewport intersection
- **Service Worker**: Cache static assets, offline support
- **Debounced Search**: Reduce filter calculations on keypress
- **Virtual Scrolling**: For large player lists (100+ players)
- **Image Optimization**: WebP format for player photos
- **API Response Caching**: LocalStorage/SessionStorage for static data (teams, positions)

---

## Browser Compatibility

### Supported Browsers
- **Chrome/Edge**: 90+ (Primary target)
- **Safari iOS**: 14+ (Mobile primary)
- **Firefox**: 88+
- **Safari macOS**: 14+

### Required Features
- ES6 Modules (import/export)
- Fetch API
- LocalStorage
- Canvas 2D Context
- CSS Grid & Flexbox
- CSS Custom Properties (variables)
- Template Literals
- Arrow Functions
- Async/Await

### Not Supported
- Internet Explorer (any version)
- Legacy Edge (pre-Chromium)
- Opera Mini

---

## Known Issues & Technical Debt

### Current Issues
1. **Draft2.html Duplication**
   - Two draft implementations exist (Draft.html, Draft2.html)
   - Unclear which is canonical
   - Suggests refactoring needed

2. **React Unused**
   - React 19 installed but barely used
   - App.jsx is default Vite template
   - Entire app is vanilla JS with manual DOM manipulation
   - Should either commit to React or remove dependency

3. **No Error Boundaries**
   - API failures show console errors but no user feedback
   - Network errors not gracefully handled
   - No retry logic

4. **Inconsistent State Management**
   - LocalStorage for some state (leagueId)
   - In-memory variables for others (selectedGameweek)
   - No centralized state management

5. **Duplicate Code**
   - Navigation injection repeated in every HTML file
   - League/draft period dropdowns duplicated
   - Player card creation logic repeated

### Technical Debt
- **No TypeScript**: All files are plain JS, no type safety
- **No Testing**: No unit tests, integration tests, or E2E tests
- **No Build Optimization**: Default Vite config, no custom chunks
- **No Progressive Web App**: No manifest.json, no service worker
- **Hard-coded Strings**: Many UI strings not internationalized
- **Magic Numbers**: Score colors, thresholds, sizes in code vs config
- **No Documentation**: No JSDoc comments in code

---

## Future Enhancements

### Short-term (Next Sprint)
1. **Consolidate Draft Pages**
   - Merge Draft.html and Draft2.html
   - Single source of truth for draft logic

2. **Add Error Handling**
   - User-friendly error messages
   - Network error detection
   - Retry logic for failed API calls

3. **Implement Logout**
   - Clear localStorage
   - Revoke token (backend)
   - Redirect to login

4. **Loading States**
   - Skeleton screens while fetching data
   - Spinner for long operations
   - Disable buttons during API calls

### Mid-term (Next Month)
1. **React Migration**
   - Convert pages to React components
   - Centralized state management (Context or Redux)
   - Remove vanilla DOM manipulation

2. **Real-time Updates**
   - WebSocket connection for live scores
   - Draft room real-time updates
   - Notification system for trades

3. **Progressive Web App**
   - Service worker for offline support
   - Manifest.json for installability
   - Push notifications for gameweek deadlines

4. **Performance Optimization**
   - Code splitting per route
   - Image lazy loading
   - Virtual scrolling for player lists

### Long-term (Next Quarter)
1. **Mobile Native App**
   - React Native conversion
   - Native iOS/Android apps
   - App store deployment

2. **Advanced Analytics**
   - Player performance trends
   - AI-powered transfer suggestions
   - Predictive scoring models

3. **Social Features**
   - League chat
   - Player comments
   - Achievement system
   - Leaderboard history

4. **Accessibility**
   - WCAG 2.1 AA compliance
   - Screen reader support
   - Keyboard navigation
   - High contrast mode

---

## Quick Reference: Page Flow

```
index.html (Login)
    ↓ (Successful authentication)
Team.html (Default landing page)
    ├── Select gameweek → View/Edit lineup → Set captain → Submit
    ├── Toggle pitch/grid view
    └── View fixtures

Navigation:
├── Team.html - Gameweek team selection
├── LeagueScore.html - Points and standings
├── Squad.html - Transfers and roster management
├── League.html - League overview and squad comparison
└── Settings.html - Configuration hub
    ├── User.html - Change password
    ├── LeagueAdmin.html - Create/join leagues
    ├── Draft.html - Draft room
    ├── PlayerPositions.html - Position management
    ├── Fixtures.html - Match schedules
    ├── GameweekStats.html - Statistics
    ├── PLDataRefresh.html - Data sync
    ├── GameRules.html - Scoring rules
    ├── newUser.html - Registration
    └── ResetPassword.html - Admin password reset
```

---

## Configuration Reference

### config.js - Backend URLs
```javascript
const config = {
    backendUrl: isDevelopment
        ? 'https://localhost:44390/api2'
        : isTest
            ? 'https://ffbe1test-cmdch8dgcscmd0e6.eastus2-01.azurewebsites.net/api2'
            : 'https://ffbe1-hjdthacef0hjc9ht.eastus2-01.azurewebsites.net/api2',
    premierLeagueImageUrl: 'https://resources.premierleague.com/premierleague25/photos/players/40x40/'
};
```

### vite.config.js - Build Settings
```javascript
export default defineConfig({
    plugins: [plugin()],
    server: {
        port: 55134,
    },
    build: {
        outDir: 'build'
    }
})
```

---

## Summary

This is a **production-grade fantasy football frontend** built with modern web technologies:

### Strengths
- **Mobile-first design** with responsive layouts
- **Rich interactivity** (pitch view, player cards, real-time search)
- **Environment-aware configuration** (dev/test/prod)
- **Modular architecture** (component-based HTML/JS)
- **Performance optimizations** (caching, canvas rendering)
- **Visual polish** (custom icons, color gradients, animations)

### Architecture
- **Vanilla JavaScript** with minimal React (contradiction - should be resolved)
- **ES6 Modules** for code organization
- **Vite build tool** for fast development
- **JWT authentication** with localStorage
- **RESTful API integration** via Fetch
- **CSS Grid/Flexbox** for responsive layouts

### Use Cases
- Draft-based fantasy football leagues
- Weekly team management
- Player transfers and trades
- League standings and scoring
- Real-time player statistics

The frontend integrates seamlessly with the FFBE backend, providing a complete fantasy football league management experience optimized for mobile devices and modern web browsers.

---

## Documentation Changelog

### Version 1.0 - Created 2026-09-11
- Initial comprehensive technical specification
- Documented all major pages and components
- Analyzed code structure and architecture
- Identified technical debt and improvement areas
- Created reference documentation for future development

---

**Last Updated**: 2026-09-11
**Document Version**: 1.0
**Author**: Technical Analysis based on codebase exploration
