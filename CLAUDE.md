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
- `share-dialog/` — modal launched from receipt-detail; three modes toggled at the top:
  - **By Amount**: step 1 = emails + split type (EQUAL/CUSTOM) + live preview, step 2 = custom amounts, step 3 = copy links
  - **By Items** (ITEM_BASED): step 1 = add invitees (with "From group" pre-fill button), step 2 = item assignment matrix (checkbox per invitee per item, live tax/total breakdown), step 3 = copy links
  - **Paid For Me** (PAID_FOR_ME): step 1 = payer email + amount you owe, step 2 = success + copy link; payer sees "Debt Confirmation" page on `/share/{token}`
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
- Right-column "Vehicle" card: visible whenever the user has vehicles; shows vehicle name badge + category badge when linked
- Vehicle dropdown + **Expense type dropdown** (FUEL / MAINTENANCE / REPAIR / INSURANCE / REGISTRATION / PARKING / WASH / OTHER); category dropdown only shown when a vehicle is selected
- Auto-defaults category to `FUEL` when vehicle is selected and `receipt.storeType === 'GAS_STATION'`; also auto-sets on initial load if `receipt.vehicleCategory` is already stored
- Calls `ReceiptService.linkToVehicle(receiptId, vehicleId | null, vehicleCategory | null)` → `PUT /api/receipts/{id}/vehicle` with `{ vehicleId, vehicleCategory }`
- `Receipt` interface includes `vehicleId?`, `vehicleName?`, `vehicleCategory?`
- `vehicleCategories` constant array lives in `receipt-detail.component.ts` (value, label, icon)

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
  - **Receipts**: list of receipts linked to this vehicle via `PUT /api/receipts/{id}/vehicle`; clickable to receipt detail; badge count on tab; calls `GET /api/vehicles/{id}/receipts`; each row shows a category icon (fuel-pump/wrench/tools/shield/etc.) and a category badge; "Uncategorised" shown when no category is set
    - **Add Existing** button: inline panel with receipt dropdown (excludes already-linked receipts; auto-selects GAS_STATION→FUEL) + expense type dropdown + Link button; same pattern as group-detail
    - **Scan New** button: navigates to `/receipts` where user can upload/scan and then assign the vehicle from receipt-detail
    - `vehicleCategories` constant defined in `vehicle-detail.component.ts` (mirrors receipt-detail; 8 options)
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

## Job Tracker components
- `job-tracker/` — main list at `/jobs`; hybrid view with **Board** (kanban) and **Table** toggle; view persisted in `localStorage` key `jobTrackerView`
  - **Kanban**: horizontally scrollable columns (8 statuses); each card shows company, title, applied date, location, salary, resume version badge, next interview countdown badge, follow-up-due badge; delete button appears on hover
  - **Table**: filter bar (search + status chips) + sortable table (click headers to sort asc/desc); status filter chips dynamically hidden when count is 0; sort state lives in component
  - **Add panel**: inline slide-down form (company, title, status, dates, location, salary, URL, resume doc picker, HR contact); summary strip above shows active/thisMonth/interviews/followUpsDue/offers counts
- `job-detail/` — route `/jobs/:id`; view + edit mode (no separate route); left column has info card (dates), contact card, resume-version card, status pipeline; right column has interview rounds panel + job description / prep notes / notes (large text areas in edit mode)
  - Interview rounds: add/edit via modal form; delete with confirm modal; outcome badge colour-coded (PENDING=amber, PASSED=green, FAILED=red, CANCELLED=gray)
  - Status pipeline: shows all 8 statuses as vertical dots; `passed` (green check) for statuses before current; `active` (coloured dot) for current
  - `isPassed(step, current)` helper uses `KANBAN_COLUMNS` index comparison — never hard-coded ordinal
- `JobApplicationService` (`services/job-application.service.ts`) — `CreateJobApplicationRequest` + `CreateInterviewRoundRequest` interfaces exported from the service file
- `job-application.model.ts` — `KANBAN_COLUMNS` array drives both kanban column order and pipeline order; `STATUS_COLORS` / `STATUS_LIGHT_COLORS` / `STATUS_ICONS` used in both components

## Groups components
- `group-list/` — card widget on dashboard; shows joined/owned groups; button to create new group
- `group-detail/` — route `/groups/:id`; shows members, QR code, shareable invite link; WhatsApp/email share buttons; **Delete button** (OWNER only) in header; **Receipts card** lists all receipts assigned to the group (clickable links to receipt detail); header has **Scan New** (→ `/receipts`) + **Add Existing** buttons; Add Existing opens an inline card panel with receipt dropdown + Add to Group button (same pattern as vehicle-detail Receipts tab)
- `join-group/` — route `/group/join/:token`; public, no AuthGuard; shows group info + login/join prompt
- QR code: uses `qrcode` npm package (`npm install qrcode @types/qrcode`); generate data URL via `QRCode.toDataURL(joinUrl)`
- `JoinGroupComponent` is full-screen (added to `AppComponent.isLoginPage()`)

## Shop components (Square + Clover)
- `shop/` — route `/shop`; two states: store picker and catalog browser; all locations come from per-org Square/Clover credentials only (no global env-var fallback); orgs with both Square + Clover appear as a single store entry with `providers: ['square','clover']`; `StoreLocation.provider` (single POS) or `StoreLocation.providers` (both) controls catalog loading and checkout routing; `CartItem.source` tracks which POS each item belongs to
- `cart-sidebar/` — slide-in drawer; qty controls; "Proceed to Checkout" → `/shop/checkout`
- `checkout/` — route `/shop/checkout`; detects cart composition via `isCloverOnlyCart` / `hasMixedCart` / Square; **Square**: SDK loaded dynamically in `loadSquareSdk(env)` (no `index.html` script tag) → `Square.payments(appId, locationId)` → `card.attach()`; card tokenized on submit → `createOrgPayment(orgSlug, …)`; **Clover**: shows "Pay at Store" panel (no card form) → `createOrgCloverOrder(orgSlug, …)` → `PENDING_PAYMENT` order; **Mixed**: blocked with message to remove one POS type
- `order-confirmation/` — reads `{ order, payAtStore }` from router navigation state; shows "Pay at Store" callout when `payAtStore=true`; buttons: View Receipt, Shop Again, Dashboard
- `CartService`: `BehaviorSubject<CartItem[]>` + `BehaviorSubject<StoreLocation|null>` both backed by localStorage; `selectLocation()` clears cart when switching stores
- `StoreLocation` model (`square.model.ts`): `id, name, …, orgSlug?, provider?, providers?`; `orgSlug` always set for all shop locations; `providers[]` set when org has both Square + Clover
- `CartItem` model: includes `source?: 'square' | 'clover'` stamped when item is added to cart

## Admin Portal components
- `admin/` — route `/admin`; lists user's orgs; auto-redirects to dashboard if only 1 org; "Register Business" button
- `admin-register/` — route `/admin/register`; business name + auto-generated slug (user can override); calls `POST /api/organizations`
- `admin-dashboard/` — route `/admin/org/:slug`; org overview card with stats row (member count, Square status chip, order count); quick-action cards (Invite Team, Members, Square Config, Order History); inline edit form (name + slug, OWNER only); **Danger Zone** card (OWNER only) with "Delete this organization" button — confirms, calls `deleteOrg()`, navigates to `/admin` on success; cards/stats driven by `Organization.squareConfigured`, `squareEnvironment`, `recentOrderCount`
- `admin-members/` — route `/admin/org/:slug/members`; invite form (email + role dropdown); member list with role/status badges; Revoke button (ADMIN+ only, hidden for OWNER rows)
- `admin-square/` — route `/admin/org/:slug/square`; password input for Square access token (never shown back); applicationId, locationId, environment dropdown; status banner (Connected/Not configured); Test Connection button (shows location count); Clear Config button (owner-only with confirm); save clears token field on success
- `admin-orders/` — route `/admin/org/:slug/orders`; table: date, store, amount, placed-by (name+email), status badge, Square order ID (truncated), receipt link button; Refresh button; empty state
- `admin-join/` — route `/admin/join/:token`; **no AuthGuard**; shows invite details; if not logged in shows Google login button (stores `postLoginRedirect`); if logged in shows Accept button; idempotent
- `platform/` — route `/platform`; super-admin only (`currentUser?.platformAdmin`); stats row (total/active/suspended/free/pro/members/square-configured); org table with clickable rows; plan toggle button (FREE↔PRO); suspend/activate button; navigation to org dashboard
- `AdminJoinComponent` is full-screen: `/admin/join/` prefix added to `AppComponent.isLoginPage()`
- `OrganizationService`: `create()`, `listMine()`, `getBySlug()`, `update()`, `deleteOrg()`, `listMembers()`, `invite()`, `revoke()`, `getInviteByToken()`, `acceptInvite()`, `getSquareConfig()`, `saveSquareConfig()`, `clearSquareConfig()`, `testSquareConnection()`, `getOrgCatalog()`, `getOrgLocations()`, `createOrgPayment()`, `getOrgOrders()`
- `PlatformService` (`services/platform.service.ts`): `listAllOrgs()`, `getStats()`, `setOrgStatus()`, `setOrgPlan()`
- Roles displayed with colour-coded badges: OWNER=amber, ADMIN=purple, STAFF=green, VIEWER=grey
- `User.platformAdmin: boolean` — drives Platform nav link in sidebar and route access

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
