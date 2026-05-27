# Frontend — Angular 17

## Module structure
- NgModule-based (no standalone components — don't migrate)
- Single `AppModule`; all components eagerly declared there
- No lazy loading
- All routes gated by `AuthGuard` except `/login`
- `APP_INITIALIZER` calls `AuthService.checkAuth()` before bootstrap

## State management
- No NgRx, no signals — `BehaviorSubject` in services only
- `AuthService.user$: BehaviorSubject<User|null>` is the single auth source of truth
- `getSnapshot()` for synchronous reads; subscribe to `currentUser()` for reactive reads

## HTTP
- `CredentialsInterceptor` applies `withCredentials: true` to every request — required for session cookies
- API base: `environment.apiUrl` → `http://localhost:8080/api` (dev) / `/api` (prod via nginx)
- Error handling pattern in services: `catchError(error => { this.logger…; return of(null); })`
- Upload requests use `timeout(280000)` RxJS operator (280 s) so Angular errors cleanly before nginx's 300 s deadline

## Logging — always use LoggerService, never console.log
```typescript
constructor(private logger: LoggerService) {}
private readonly source = 'MyComponentOrService';

this.logger.trace(this.source, '>>> methodName()');
this.logger.info(this.source, 'operation succeeded');
this.logger.error(this.source, 'operation failed', error);
this.logger.apiCall(this.source, 'GET', '/receipts', startTime);
```
- TRACE: function entry/exit
- DEBUG: intermediate data
- INFO: major ops, API completions
- ERROR: caught exceptions

## Models (`src/app/models/`)
- TypeScript interfaces, not classes
- `StoreType` and `ReceiptDocType` are string union types, not enums
- When rendering a store type, use the lookup maps from `receipt.model.ts`:
  - `STORE_TYPE_ICONS[storeType]` → Bootstrap Icon class
  - `STORE_TYPE_LABELS[storeType]` → display string
  - `STORE_TYPE_CSS[storeType]` → CSS class name

## Chart.js (dashboard)
- Register all once globally: `Chart.register(...registerables)` at module top
- Track instances in `private charts: Chart[]`; call `.destroy()` on each before re-drawing
- Draw after data arrives: `setTimeout(() => this.drawCharts(), 50)` — DOM needs one render cycle

## Styling
- Global: `src/styles.scss`
- Per-component SCSS files (no CSS modules)
- Icons: Bootstrap Icons (`bi-*` classes), loaded via CDN in `index.html`
- No Tailwind, no Angular Material

## Commands
```
npm start          # ng serve — dev server on :4200
npm run build      # production build → dist/
npm run watch      # dev build with --watch
```
No `test` script is wired up (Karma devDeps are present but unused).

## Expense sharing components
- `share-dialog/` — modal launched from receipt-detail; step 1: emails + split type, step 2: custom amounts, step 3: copy links
- `share-manager/` — embedded panel in receipt-detail; shows per-receipt share rows with status badges and owner approve/reject
- `share-response/` — public route `/share/:token` (no `AuthGuard`); handles login redirect via `localStorage.setItem('postLoginRedirect', …)`
- `ShareResponseComponent` is treated as a full-screen page (same as `/login`) so `AppComponent.isLoginPage()` returns true for `/share/` paths

## Don't
- Don't convert components to standalone — everything is NgModule-based
- Don't add NgRx — use BehaviorSubject in services
- Don't call `console.log/warn/error` directly — use `LoggerService`
- Don't remove `withCredentials: true` from `CredentialsInterceptor` — breaks session auth
- Don't declare new components without adding them to `AppModule.declarations`
- Don't create Angular enums for `StoreType`/`ReceiptDocType` — they're string unions by design (match backend strings directly)
- Don't add `AuthGuard` to `/share/:token` — invitees visit this before logging in
- Don't use the `replace` pipe in templates — it doesn't exist in Angular; use a component method instead
