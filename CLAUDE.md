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

## Dashboard layout (order of sections)
1. **Quick Actions** strip — Scan Receipt / My Garage / Documents / All Receipts shortcut buttons
2. Pending share-invites banner (conditional)
3. **Garage summary** + **Document Vault summary** side-by-side (each conditional on data); garage widget loaded via `VehicleService.list()`, shows vehicle count + tag/insurance issue counts + per-vehicle alert links
4. Groups panel (`app-group-list`)
5. KPI cards row (total spend, cashback earned, best possible, left on table)
6. Charts row: Spending by Category (doughnut) + Monthly Spending (bar)
7. **Month-over-Month by Category** grouped bar chart — uses `analytics.spendingByCategoryPerMonth`; last 6 months × top 5 categories; hidden when fewer than 2 months of data
8. Cashback by card (horizontal bar) + Category breakdown table
9. Cashback optimization suggestions

## Chart.js (dashboard)
- Register all once globally: `Chart.register(...registerables)` at module top
- Track instances in `private charts: Chart[]`; call `.destroy()` on each before re-drawing
- Draw after data arrives: `setTimeout(() => this.drawCharts(), 50)` — DOM needs one render cycle
- MoM chart canvas: `#momChart`; data from `spendingByCategoryPerMonth`; top 5 categories sorted by total spend across the window

## Styling
- Global: `src/styles.scss` — full design token system via CSS custom properties
- Per-component SCSS files (no CSS modules)
- Icons: Bootstrap Icons (`bi-*` classes), loaded via CDN in `index.html`
- No Tailwind, no Angular Material
- Design tokens live in `:root` in `styles.scss` — always use variables (`--primary`, `--radius`, `--shadow-sm`, etc.) not hard-coded values
- `index.html` includes `viewport-fit=cover` + `apple-mobile-web-app-*` meta for iPhone notch/Dynamic Island support

## Mobile / iPhone safe-area rules
- Mobile header: `position: fixed`, absorbs Dynamic Island via `padding-top: max(0.6rem, var(--safe-top))` where `--safe-top: env(safe-area-inset-top, 0px)`
- Content area on mobile gets `padding-top: calc(var(--mobile-header-height) + 1rem)` to clear the fixed header
- Sidebar on mobile starts at `top: var(--mobile-header-height)` (below the fixed header)
- Bottom padding uses `var(--safe-bottom)` to stay above the iOS home indicator
- Never use `position: sticky` for the mobile header — iOS Safari does not reliably re-paint it; use `position: fixed` with explicit `left:0; right:0; width:100%`
- Hamburger button is always last child in `.mobile-header` (HTML order) and gets `margin-left: auto` via flex to pin it to the right

## Commands
```
npm start          # ng serve — dev server on :4200
npm run build      # production build → dist/
npm run watch      # dev build with --watch
```
No `test` script is wired up (Karma devDeps are present but unused).

## Expense sharing components
- `share-dialog/` — modal launched from receipt-detail; two modes toggled at the top:
  - **By Amount**: step 1 = emails + split type (EQUAL/CUSTOM) + live preview, step 2 = custom amounts, step 3 = copy links
  - **By Items** (ITEM_BASED): step 1 = add invitees (with "From group" pre-fill button), step 2 = item assignment matrix (checkbox per invitee per item, live tax/total breakdown), step 3 = copy links
  - `[groupMembers]` input: array of emails passed from `receipt-detail`; shown as "From group" quick-fill in both modes
  - Tax preview uses `effectiveTaxRate = receipt.tax / receipt.subtotal`; displayed per-invitee in the item matrix
- `share-manager/` — embedded panel in receipt-detail; shows per-receipt share rows with status badges and owner approve/reject
- `share-response/` — public route `/share/:token` (no `AuthGuard`); handles login redirect via `localStorage.setItem('postLoginRedirect', …)`
  - For ITEM_BASED shares: `ShareViewData` includes `assignedItems`, `itemSubtotal`, `itemTax` from backend
- `ShareResponseComponent` is treated as a full-screen page so `AppComponent.isLoginPage()` returns true for `/share/` and `/group/join/` paths
- Error surfacing: `submitInviteeAction` re-throws errors (does NOT swallow to `of(null)`) so the component error handler shows the real backend message

## Document Vault components
- `documents/` — main list at `/documents`; category tabs (All / Resume / Tax / Income / Immigration / Other) with doc count badges; summary strip (total, expiring, expired, action items); upload panel slides in on file pick/drop; filters by text + status; immigration tab shows visa-type grouped subcategory options
- `document-detail/` — single document at `/documents/:id`; metadata view/edit; download button (streams via backend); share button opens `document-share-dialog`; next-steps panel with urgency colour coding (OVERDUE/DUE_SOON/UPCOMING/DONE); IRS 7-year retention callout for TAX docs
- `document-share-dialog/` — modal; selects documents, enters recipient + purpose + message + expiry days (1–30); purpose presets for common legal/tax use cases; success state shows share link for copy
- `document-access/` — public route `/documents/shared/:token`; no `AuthGuard`; calls `GET /api/documents/shared/{token}`; download button per document; expiry warning
- `DocumentAccessComponent` is full-screen: added to `AppComponent.isLoginPage()` for `/documents/shared/` prefix
- **Template rules**: never use regex literals `/pattern/` in Angular expressions — use `.split('_').join(' ')` or a component helper method instead; never use `typeof this.X` in return type annotations — reference the interface/type directly

## Document model conventions
- `DocFile` is the frontend interface (avoids collision with the built-in `File` DOM type)
- `SubcategoryOption` includes `visaType` field for IMMIGRATION grouping; `subcategoryGroups` getter returns options grouped by visa type for `<optgroup>` rendering
- Status badge colours: ACTIVE = green, EXPIRING_SOON = amber, EXPIRED = red
- `DocumentService.downloadUrl(id)` returns a URL string (no Observable) — used directly in `[href]` for native browser download
- `DocumentService.downloadViaShareUrl(token, docId)` — same pattern for public share downloads

## Group assignment (receipt-detail)
- Right-column "Group" card: dropdown of user's groups + Save button
- Calls `ReceiptService.addToGroup(receiptId, groupId | null)` → `PUT /api/receipts/{id}/group`
- Selecting "— No group —" (null) unassigns; backend validates membership
- `receipt-detail` computes `groupMembers: string[]` from the matched group's members list and passes it to `share-dialog` as `[groupMembers]`
- `GroupService.getMyGroups()` is called on init to populate the dropdown; the response includes `members: null` (not loaded with detail) — full member list comes from `GroupService.getGroup(id)` if needed

## Vehicle linking (receipt-detail)
- Right-column "Vehicle" card: visible whenever the user has vehicles; shows a badge with linked vehicle name if set; dropdown of user's vehicles + Save button
- Calls `ReceiptService.linkToVehicle(receiptId, vehicleId | null)` → `PUT /api/receipts/{id}/vehicle`
- GAS_STATION receipts show a "Gas Station" badge on the card header to highlight relevance
- `VehicleService.list()` called on init to populate the dropdown; `Receipt` interface includes `vehicleId?` and `vehicleName?`

## Garage / Vehicle components
- `garage/` — main list at `/garage`; vehicle cards with year/make/model, license plate, mileage, maintenance count, avg MPG, next service alert; add vehicle panel with NHTSA make/model/year dropdowns + VIN decoder button; cards show expiry badges (tag / insurance); shared vehicles show "Shared by [name]" badge (`isShared=true`, `ownerName` from backend)
- `vehicle-join/` — public route `/garage/join/:token`; no `AuthGuard`; shows vehicle name + owner + what access includes; Accept button (requires Google login, stored via `postLoginRedirect`); email-match validation; added to `AppComponent.isLoginPage()` for `/garage/join/` prefix
- `vehicle-detail/` — route `/garage/:id`; tabbed view:
  - **Overview**: "Edit Details" button opens inline edit form; fields: VIN, trim, color, license plate, state, tag expiry, insurance provider/policy/expiry, purchase date/price/dealer, current mileage, notes; make/model/year are read-only (NHTSA-sourced); calls `PUT /api/vehicles/{id}`
  - **Maintenance**: list of service records (date, type, mileage, cost, provider, notes); oldest → newest; delete button per record
  - **Fuel**: fuel log (date, odometer, gallons, price/gal, total, station name); computed MPG per fill (from consecutive full-tank entries); most recent first
  - **Schedule**: maintenance schedule generated by backend (oil change, tire rotation, etc.) with status badges (OVERDUE / DUE_SOON / UPCOMING); critical services highlighted in red
  - **Recalls**: NHTSA safety recalls for the make/model/year; campaign #, component, summary; "No open recalls" if empty
  - **Sharing** (owner only, hidden when `vehicle.isShared`): invite form (email input); access list with PENDING/ACCEPTED/REVOKED badges and Revoke buttons; shared-by banner shown at top for `isShared` vehicles
- Add vehicle form: NHTSA API calls for make list (via `NhtsaService`), then models per make+year, with VIN decoder (auto-fills make/model/trim if present)
- Sidebar link: "My Garage" with `bi-speedometer2` icon
- Vehicle card stats: maintenance count, avg MPG, next service due (computed on backend, displayed as alert banner)
- Download button: `GET /api/vehicles/{id}/report` → PDF download ("vehicle-report.pdf")
- VehicleService endpoints:
  - `POST /api/vehicles` — create
  - `GET /api/vehicles` — list user's vehicles
  - `GET /api/vehicles/{id}` — detail (includes computed stats)
  - `PUT /api/vehicles/{id}` — update
  - `DELETE /api/vehicles/{id}` — delete + remove files
  - `POST /api/vehicles/{id}/photos` — upload photo (multipart)
  - `DELETE /api/vehicles/{id}/photos/{filename}` — remove photo
  - `GET /api/vehicles/{id}/photos/{filename}` — stream photo (inline display)
  - `GET /api/vehicles/{id}/schedule` — maintenance schedule (list of ScheduleItem)
  - `GET /api/vehicles/{id}/recalls` — safety recalls (list of Recall objects)
  - `GET /api/vehicles/{id}/report` — PDF download
  - `POST /api/vehicles/{vehicleId}/maintenance` — add record (multipart: record JSON + optional receipt file)
  - `GET /api/vehicles/{vehicleId}/maintenance` — list
  - `DELETE /api/vehicles/{vehicleId}/maintenance/{recordId}` — delete
  - `GET /api/vehicles/{vehicleId}/maintenance/{recordId}/receipt/{filename}` — stream receipt image
  - `POST /api/vehicles/{vehicleId}/fuel` — add fuel record
  - `PUT /api/vehicles/{vehicleId}/fuel/{recordId}` — edit (within 30 days)
  - `GET /api/vehicles/{vehicleId}/fuel` — list
  - `DELETE /api/vehicles/{vehicleId}/fuel/{recordId}` — delete
  - `PUT /api/vehicles/{vehicleId}/maintenance/{recordId}` — edit maintenance (within 30 days)
- **30-day edit window**: `canEdit(createdAt)` in `VehicleDetailComponent` checks `Date.now() - new Date(createdAt) ≤ 30d`; Edit button hidden outside window; backend enforces same rule server-side
- `Vehicle.modelYear` (not `year`) — matches backend field name; `year` was H2 reserved keyword
- **Document vault dragover**: `onDragover(event)` handler runs `ngZone.run()` only on first entry (when `dragover` is false) to avoid flooding Angular change detection with mousemove-while-dragging events
- **Document subcategory display**: use `subcategoryLabel(sub)` component method (`sub.split('_').join(' ')`) — never call `.replace()` directly in templates
- NhtsaService (free NHTSA API calls):
  - `getMakes()` — cached list of car makes
  - `getModels(make, year)` — models for make+year
  - `decodeVin(vin, year?)` — returns `{ make, model, trim, bodyClass, fuelType, … }`
- Models: `MaintenanceType` union, `FuelType` union, `VehicleAccessStatus` union (`PENDING|ACCEPTED|REVOKED`), `VehicleAccess` interface (`id, inviteeEmail, inviteeName?, status, grantedAt, vehicleId?, vehicleName?, ownerName?`); `Vehicle` interface includes `isShared?`, `ownerName?`, `sharedWith?: VehicleAccess[]`
- `VehicleService` sharing methods: `inviteAccess(vehicleId, email)`, `getAccess(vehicleId)`, `revokeAccess(vehicleId, accessId)`, `getInviteByToken(token)`, `acceptInvite(token)`
- Schedule item: `{ type, displayName, dueMileage, dueByDate, overdue, dueSoon, lastPerformed, critical, note }`
- Computed: MPG calculated from consecutive full-tank fill-ups (partial fills skipped); average MPG rounded to 1 decimal
- Icon set: `bi-speedometer2` (vehicles), `bi-wrench` (maintenance), `bi-fuel-pump` (fuel), etc.

## Groups components
- `group-list/` — card widget on dashboard; shows joined/owned groups; button to create new group
- `group-detail/` — route `/groups/:id`; shows members, QR code, shareable invite link; WhatsApp/email share buttons
- `join-group/` — route `/group/join/:token`; public, no AuthGuard; shows group info + login/join prompt
- QR code: uses `qrcode` npm package (`npm install qrcode @types/qrcode`); generate data URL via `QRCode.toDataURL(joinUrl)`
- `JoinGroupComponent` is full-screen (added to `AppComponent.isLoginPage()`)

## Don't
- Don't convert components to standalone — everything is NgModule-based
- Don't add NgRx — use BehaviorSubject in services
- Don't call `console.log/warn/error` directly — use `LoggerService`
- Don't remove `withCredentials: true` from `CredentialsInterceptor` — breaks session auth
- Don't declare new components without adding them to `AppModule.declarations`
- Don't create Angular enums for `StoreType`/`ReceiptDocType` — they're string unions by design (match backend strings directly)
- Don't add `AuthGuard` to `/share/:token` or `/group/join/:token` — users visit before logging in
- Don't use the `replace` pipe in templates — it doesn't exist in Angular; use a component method instead
- Don't swallow errors in `submitInviteeAction` — re-throw so the real backend message (e.g. "This invite is not for your account") surfaces in the UI
