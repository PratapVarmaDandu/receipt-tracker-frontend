# Frontend — Angular 17

## Module structure
- NgModule-based (no standalone components — don't migrate)
- **Lazy-loaded feature modules** under `src/app/features/`; `AppModule` is a thin shell
- `src/app/shared/shared.module.ts` re-exports `CommonModule`, `FormsModule`, `ReactiveFormsModule`, `RouterModule` — every feature module imports `SharedModule`
- `GroupsSharedModule` (`features/groups/groups-shared.module.ts`) exports `GroupListComponent` so it can be used both as the `/groups` route and as a widget in `DashboardModule`
- `APP_INITIALIZER` calls `AuthService.checkAuth()` before bootstrap

### Shell (AppModule — eagerly loaded)
`AppComponent`, `LoginComponent`, `WelcomeBannerComponent`, `FeatureLockedComponent`, `StorageSettingsComponent`, `UploadComponent`, `ShareResponseComponent`, `PlansComponent`

### Lazy feature modules
| Module | Path prefix | Key components |
|--------|------------|----------------|
| `DashboardModule` | `dashboard` | DashboardComponent |
| `ReceiptsModule` | `receipts` | ReceiptList, ReceiptDetail, ShareDialog, ShareManager |
| `GroupsModule` | `groups` + `group` | GroupDetail, JoinGroup (GroupList via GroupsSharedModule) |
| `DocumentsModule` | `documents` | Documents, DocumentDetail, DocumentShareDialog, DocumentAccess |
| `GarageModule` | `garage` | Garage, VehicleDetail, VehicleJoin |
| `JobsModule` | `jobs` | JobTracker, JobDetail |
| `ShopModule` | `shop` | Shop, CartSidebar, Checkout, OrderConfirmation |
| `AdminModule` | `admin` | Admin, AdminDashboard, AdminMembers, AdminSquare, AdminClover, AdminOrders, AdminJoin |
| `PlatformModule` | `platform` | Platform, PlatformSquareConfig |
| `ImmigrationModule` | `immigration` | CaseList, CaseDetail, CaseForm, CanonicalProfile, CaseJoin, DataRequest, PackageQuestionnaire, FormVersions |

### Public routes (no AuthGuard)
`/share/:token` (ShareResponse in AppModule), `/group/join/:token` (JoinGroup in GroupsModule), `/documents/shared/:token` (DocumentAccess in DocumentsModule), `/garage/join/:token` (VehicleJoin in GarageModule), `/admin/join/:token` (AdminJoin in AdminModule), `/immigration/cases/join/:token` (CaseJoin in ImmigrationModule), `/immigration/data-request/:token` (DataRequest in ImmigrationModule — GET public, submit requires auth), `/immigration/packages/questionnaire/:token` (PackageQuestionnaire in ImmigrationModule — GET public, submit requires auth)

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

## Immigration / Visa Tracker components
- All components live under `src/app/features/immigration/`
- Module: `ImmigrationModule` (declared in `immigration.module.ts`); routes under `/immigration/**`

### Service layer
- `ImmigrationService` (`services/immigration.service.ts`) — all case/profile CRUD; key interfaces:
  - `PassportEntry` — `{ id?, number?, country?, issueDate?, expiryDate?, notes?, documentIds?: number[] }`
  - `TravelEntry` — `{ id?, portOfEntry?, i94Number?, entryDate?, admittedUntil?, visaClass?, notes?, documentIds?: number[] }`
  - `Education`, `Employment`, `Dependent`, `PriorVisa` — each has `documentIds?: number[]` for vault attachments
  - `CanonicalProfile` — replaced single passport/entry fields with `passports?: PassportEntry[]` and `travelEntries?: TravelEntry[]`; kept `currentVisaType`/`currentVisaExpiry` as standalone fields
- `DocumentService` injected into `CanonicalProfileComponent` for vault doc loading (`list()`) and share creation (`createShare()`)

### `canonical-profile/` — route `/immigration/profile`
Multi-section form; 5 tabs: Personal Info, Passport, US Entry & Status, Education & Work, Dependents & Visas.

**Passport tab** — `*ngFor` over `form.passports`; each card shows number/country/dates/notes fields + doc-attach template; current passport = item with highest `issueDate` (string ISO compare in `isCurrentPassport()`); "CURRENT" badge rendered by `isCurrentPassport(p)` method; "Add Passport" appends blank entry.

**US Entry tab** — `*ngFor` over `form.travelEntries`; standalone "Current Visa Status" section below the list (visa type + expiry); each entry has port/I-94/admitted-until/visa-class fields + doc-attach template.

**Doc attachment** — shared `#docAttachTpl` ng-template used in all 6 section types:
- `expandedPicker: string|null` — key of the open picker (`pickerKey(section, index)` = `"passport-0"` etc.)
- `selectedDocId: Record<string, number|null>` — stable reference, safe for CD
- `availableDocs(section, index)` — method (not getter); filters out already-attached docs; called only when picker opens
- `attachDoc(section, index)` — appends `docId` to `item.documentIds`, clears picker
- `removeDoc(section, index, docId)` — removes from `item.documentIds`
- `docTitle(id)` — looks up title from `vaultDocs` array, fallback `"Doc #id"`

**Share panel** — shared `#shareTpl` ng-template; one panel open at a time (`sharePanel` object or `null`):
- `openShare(section)` — sets `sharePanel = { section, email:'', expiry:30, sharing:false, shareUrl:null }`
- `getSectionDocIds(section)` — collects all `documentIds` from every item in the section (deduped with `Set`)
- `submitShare()` — validates ≥1 doc attached; calls `DocumentService.createShare({ documentIds, recipientEmail, purpose, expiryDays })`; `shareUrl = window.location.origin + '/documents/shared/' + share.shareToken`
- `copyShareUrl()` — `navigator.clipboard.writeText(sharePanel.shareUrl)`
- Share blocked with inline error if no docs attached yet

**Key CSS classes** (`canonical-profile.component.scss`):
- `.entry-header` — light-grey rounded-top header per passport/travel card
- `.doc-chip` — indigo pill chip for attached doc (title + ×-remove button)
- `.chip-remove` — borderless button; hover turns dark-red
- `.doc-picker` — dropdown list of available vault docs
- `.btn-xs` — tiny action button (attach/cancel in picker)
- `.share-panel` — green-tinted card shown when share panel is open
- `.btn-back` — indigo text link `← Cases` in page header (no underline)

**Private helpers:**
- `sectionItems(section)` — maps section string → correct `form.*` array
- `shareSectionLabel(section)` — human-readable label for share purpose string
- `newId()` — `crypto.randomUUID()` with fallback; used as temporary client-side id for new passport/travel entries before save

### `services/immigration.service.ts` — key constants
- `CASE_TYPE_LABELS` — maps all 14 `CaseType` values to display strings: H1B family, H-4 dependents, PERM/I-140, I-485, GC EAD, GC Renewal, Naturalization, Consular
- `CASE_TYPE_GROUPS` — exported `{ label: string; types: string[] }[]` array for `<optgroup>` dropdown; groups: "H-1B Specialty Occupation", "H-4 Dependents", "Green Card Pathway", "Green Card & Citizenship", "Other"
- `ImmigrationCase` interface — `assignedAttorneyMemberId`, `assignedAttorneyName`, `assignedAttorneyEmail` (all nullable); `beneficiaryInvitePending`; beneficiary name/email nullable
- `CreateCaseRequest` — `beneficiaryEmail: string` (required), `parentCaseId?`, `assignedAttorneyMemberId?`
- `getCaseBeneficiaryProfile(caseId)` — calls `GET /api/immigration/cases/{id}/beneficiary/profile`; used by case-detail Profile tab
- `getCaseByInviteToken(token)` / `acceptCaseInvite(token)` — public and auth invite endpoints
- `listRfes(caseId)` / `createRfe(caseId, req)` / `updateRfe(caseId, rfeId, req)` / `respondRfe(caseId, rfeId)` — RFE CRUD + respond endpoints
- `getUscisHistory(caseId)` / `checkUscisNow(caseId)` — USCIS poll history and on-demand check
- Interfaces: `CaseRfe` (id, caseId, status, issuedDate, responseDeadline, uscisCategory, uscisNote, respondedAt, daysUntilDeadline), `CreateRfeRequest`, `UscisStatusResult` (id, caseId, polledAt, rawStatusText, detectedStatus, statusChanged)

**`ImmOrg` model** — `myMemberId: number | null` added; populated only from `listMine()` (tells the frontend which `ImmOrgMember.id` the current user holds in each org); used by case-form to auto-assign attorney = self.

### `case-list/` — route `/immigration`
- **Header buttons**: Employer users see "Employer" + "New Case"; Attorney users see "Attorney" + "New Case"; Beneficiaries see "My Profile" only (no New Case)
- **Role picker** — shown when `!isOrgMember && cases.length === 0`; two cards to `/immigration/employer` and `/immigration/attorney`
- **Role context bar** — employer/law-firm chips for org members; beneficiary chip for non-members

### `case-form/` — route `/immigration/cases/new`
- `forkJoin` on init loads `listMine()` + `listCases()` + `listPartnerships()`
- `isAttorney` getter — `lawFirmOrgs.length > 0 && employerOrgs.length === 0`
- `isEmployer` getter — `employerOrgs.length > 0 && lawFirmOrgs.length === 0`
- **Attorney flow**: law firm auto-set to own firm (read-only chip); `assignedAttorneyMemberId` = `lawFirmOrgs[0].myMemberId` (self); employer dropdown from `partnerEmployerOrgs` (required)
- **Employer flow**: employer auto-set to own org (read-only chip); law firm dropdown from `partnerLawFirms` (required, built from ACTIVE partnerships); attorney dropdown optional from law firm members
- `partnerLawFirms` / `partnerEmployerOrgs` — `{ id, name }[]` derived from partnerships at init; no extra API call needed (OrgPartnership DTO includes org names)
- CSS: card with `.form-section` blocks (padded + divider), `.org-tag` chips, `.form-actions` footer on grey background

### `case-detail/` — route `/immigration/cases/:id`
- Tabs: Overview, Timeline, Forms (attorney only), Documents, Messaging, **Employee Profile** (org members only)
- Role getters: `isBeneficiary`, `isAttorney`, `isEmployer`, `isOrgMember` — all derived from `case.callerRelationship`
- **Header**: Employer/Attorney nav buttons always visible when `isEmployer`/`isAttorney` (item 4 fix)
- **Overview "My Profile" button**: only shown when `isBeneficiary`; navigates to `/immigration/profile?caseId=X`; org members see "View Employee Profile" button that switches to profile tab
- **Profile tab**: calls `getCaseBeneficiaryProfile(caseId)` on first open; shows read-only bio fields (name, DOB, citizenship, visa, passports); `profileLoaded` gate prevents repeat fetches
- **RFE alert banner** (Overview top): red banner shown when `openRfe !== null` (first RFE with status `OPEN`); shows issued date, deadline, days-left countdown; attorney-only "Log RFE Response" button calls `doRespondRfe(rfeId)`; attorney-only "Log RFE" button + inline form (issuedDate, responseDeadline, uscisCategory, uscisNote) shown when no open RFE
- **USCIS status panel** (Overview, between Key Dates and Activity Feed): only rendered when `case.receiptNumber` exists; shows `detectedStatus`, `polledAt`, `statusChanged` badge, collapsible history list; attorney-only "Check Now" button calls `checkUscisNow()`; `uscisLastCheck` getter returns first item of `uscisHistory`
- `loadCase()` also calls `loadRfes()` and (if `case.receiptNumber`) `loadUscisHistory()` on init

### `canonical-profile/` — route `/immigration/profile`
- `ActivatedRoute` injected; reads `?caseId=` query param on init; loads case via `getCase(caseId)` and stores as `caseContext`
- `openShare(section, recipient: 'attorney' | 'employer')` — pre-fills `email` from `caseContext.assignedAttorneyEmail` (attorney) or leaves blank (employer, email not in DTO); sets `emailReadonly = true` when auto-populated
- Share panel email field: shows as `readonly` input when `sharePanel.emailReadonly`; editable otherwise

### `case-join/`
- Public route (`/immigration/cases/join/:token`), no `AuthGuard`; loads case info via public token endpoint; unauthenticated users see "Sign in with Google" button; on accept, validates email match and redirects to case; `accepted` boolean flips to show success state before redirect

### `data-request/` — route `/immigration/data-request/:token` (FEAT-M7)
- **No `AuthGuard`** — GET prefill is public; auth is only required on submit
- Wizard component; `activeSections` getter filters `SECTION_ORDER` by `publicInfo.sections`; `steps` getter appends `'review'`
- 7 content sections: `personalInfo`, `passportI94`, `currentStatus`, `employment`, `familyDependents`, `eadInfo`, `notificationPreferences` + `review` step
- Section labels live in `SECTION_LABELS` constant; order defined by `SECTION_ORDER`
- States: loading → error / expired / already-submitted → wizard → post-submit success
- Auth gate: shown on review step when `!currentUser`; stores `postLoginRedirect` in localStorage and navigates to `/login`
- Scan button on passport section: `<label>` wrapping `<input type="file" hidden>`; calls `onPassportFilePick(i, event)` which uploads to `/api/documents/upload` (IMMIGRATION category) via `HttpClient` directly (not through a service); attaches returned `doc.id` to `form.passportI94.passports[i].documentIds[]`
- `prefillForm()` copies `publicInfo.prefillData` (CanonicalProfile) into the local form object before wizard opens
- `doSubmit()` builds a sections payload from only the active sections, calls `immigrationService.submitDataRequest(token, payload)`
- `AppComponent.isLoginPage` returns `true` for `/immigration/data-request/` prefix (hides sidebar/header)
- Declared in `ImmigrationModule`; no `AuthGuard` on the route
- `environment.backendUrl` used for absolute URL in document upload (avoids proxy issues on the public route)

### `case-detail/` — FEAT-M7 additions
- "Request Profile Data" button (attorney only) in the action buttons row (Overview tab) — toggles `showRequestDataPanel` + calls `loadDataRequests()` on first open
- Data requests panel card (attorney + `showRequestDataPanel`): send form (target relationship select, expiry days select, section checkboxes), past requests list with status badges and copy/open link buttons
- New state: `dataRequests`, `dataRequestsLoaded`, `showRequestDataPanel`, `sendingRequest`, `requestSent`, `requestError`, `newRequestForm`, `ALL_SECTIONS`
- New methods: `loadDataRequests()`, `sendDataRequest()`, `isSectionSelected(id)`, `toggleSection(id)`, `dataRequestLink(token)`, `copyRequestLink(token)`, `dataRequestStatusCss(status)`
- `ProfileDataRequest` and `CreateDataRequestRequest` interfaces imported from `immigration.service.ts`

### `case-detail/` — FEAT-M8 checklist additions
- "Checklist" tab in nav — loads on tab activation via `loadChecklist()` (lazy, `checklistLoaded` gate); badge shows count of pending required items; green ✓ when `allClearForPdf`
- `allClearForPdf` getter: all required items have status ≠ PENDING
- `groupChecklist()` builds `checklistByCategory: Record<string, ChecklistItem[]>` (object keyed by category string); `checklistCategories` getter returns `Object.keys()`
- Traffic-light per category: `categoryCss(items)` / `categoryIcon(items)` — red when any required PENDING; amber when some UPLOADED; green otherwise
- Generate panel (attorney only): `FORM_TYPE_OPTIONS` constant (I129/I485/I140_EB2/I140_EB3/PERM); `toggleFormType(id)` / `isFormTypeSelected(id)` for checkbox state; `runGenerateChecklist()` calls backend
- Items list: `expandedChecklistItem: number|null` tracks open item; `toggleChecklistItem(id)` toggles; inline form shows different actions per status:
  - PENDING: doc picker `<select>` from `checklistVaultDocs` + "Mark Uploaded" → `markUploaded(item)`; waiver reason input + "Waive" → `markWaived(item)` (attorney only)
  - UPLOADED: "Verify" → `markVerified(item)` (attorney only) + "Revert"
  - VERIFIED: date shown, attorney can revert
  - WAIVED: reason shown, attorney can revert
- `revertToPending(item)` — sets status PENDING, clears documentId + waiverReason
- `checklistVaultDocs` loaded via `HttpClient.get('/api/documents?size=200')` (non-fatal — empty list = no picker options); `HttpClient` injected in constructor alongside existing services
- `waiverDraft: Record<number, string>` — per-item waiver reason before submit
- `docPickerSelection: Record<number, number|null>` — per-item doc picker state
- New interfaces in `immigration.service.ts`: `ChecklistItem`, `GenerateChecklistRequest`, `UpdateChecklistItemRequest`; methods: `generateChecklist`, `getChecklist`, `updateChecklistItem`

### Security guardrails (enforced in this module)
- No label, placeholder, or validation message recommends a specific form or gives legal advice
- No real PII in any test fixture or seed — use `John Doe`, `Acme Corp`, `Dewey Cheatham & Howe LLP`
- `documentIds` arrays in JSON are loose cross-feature references — no FK constraints (per app-wide cross-phase FK rule)

### `package-questionnaire/` — route `/immigration/packages/questionnaire/:token` (Filing Package System)
- **No `AuthGuard`** — GET spec is public; auth is required only on submit
- Reads `QuestionnairePublicSpec` from `GET /api/immigration/packages/questionnaires/{token}`
- States: loading → error | expired | alreadySubmitted → wizard (sections) → submitted success | login prompt
- `prefillAnswers()` copies non-sensitive prefill values into `answers` map; sets `verified[key] = false` for each — user must check verify box before submit is accepted
- Dynamic renderer: `*ngFor` over `spec.sections` → section tabs; `*ngFor` over `section.questions`; per-type rendering via `*ngIf` on `q.type`: TEXT→`<input>`, DATE→date input, NUMBER→number input, TEXT_SENSITIVE→password input with show/hide toggle, BOOLEAN→yes/no radios, SELECT→`<select>` from `q.options[]`, TEXTAREA→`<textarea>`, LIST→row-card editor (add/remove rows)
- LIST questions (repeat groups): rows live in `listRows: Record<string, Array<Record<string,string>>>` (not `answers`); columns from `q.itemFields` (`QuestionnaireItemField`), Add button hidden at `q.maxRows`; prefill JSON parsed in `parseListPrefill()`; `doSubmit()` serializes filled rows via `JSON.stringify` into the payload so the submit shape stays `Record<string,string>`; blank rows ignored; `incompleteListQuestions` blocks submit when a filled row misses a required column
- Pre-fill chip: shown when `isPrefilled(q)` (non-null `prefillValue` and not TEXT_SENSITIVE); includes Verify checkbox — unchecked prefills block submit with error
- Progress bar per section: `sectionProgress(section)` = answered / total * 100; `hasAnswer(q)` counts LIST questions by filled rows
- `doSubmit()`: checks `currentUser` (shows login prompt if null, stores `postLoginRedirect`); validates required fields; validates unverified prefills; calls `immigrationService.submitPublicQuestionnaire(token, payload)`
- "Scan Passport" not implemented in this component — see data-request component for pattern
- `AppComponent.isLoginPage` returns `true` for `/immigration/packages/questionnaire/` prefix (hides sidebar/header)
- Declared in `ImmigrationModule`; no `AuthGuard` on route

### `case-detail/` — Filing Package System additions
- "Filing Packages" tab: visible only to `isOrgMember` (attorney + employer); lazy-loaded via `setTab('packages')` → `loadPackages()` (gate `packagesLoaded`)
- State: `packages: FilingPackage[]`, `packagesLoaded`, `packagesLoading`, `packagesError`, `showCreatePackagePanel`, `newPackageName`, `newPackageFormTypes`, `creatingPackage`, `createPackageError`, `sendingQuestionnaires`, `approvingPackage`, `expandedPackage`, `packets: Record<number, GeneratedPdfPacket[]>`, `generatingPdf`, `generatePdfError`, `pendingReviewConflict`, `approvingPacket`
- Attorney-only actions: create package, send questionnaires, approve answers, **generate PDF** (APPROVED/GENERATED status), **download ZIP**, **approve packet**
- Package list: status badge, form type chips, per-owner completeness progress bars, questionnaire list; when status=APPROVED → "Generate PDF Packet" button; 409 PENDING_REVIEW_EXISTS → override confirmation prompt; status=GENERATED → packet table (generated-at, form count, DRAFT/ATTORNEY_APPROVED/FILED badge, Download + Approve buttons)
- `loadPackets(pkg)` auto-called after `loadPackages()` for packages with status GENERATED or ATTORNEY_APPROVED; called manually from "Refresh Packets" button
- Methods: `togglePackageFormType()`, `isPackageFormTypeSelected()`, `loadPackages()`, `loadPackets()`, `doCreatePackage()`, `doSendQuestionnaires()`, `doApprovePackage()`, `doGeneratePdf(pkg, override?)`, `downloadPacket()`, `doApprovePacket()`, `packageStatusCss()`, `questionnaireLink()`, `packageCompletenessEntries()`
- `FilingPackage`, `FilingPackageQuestionnaire`, `CreatePackageRequest`, `GeneratedPdfPacket`, `FormVersionUsed`, `GenerationAuditEntry`, `QuestionnairePublicSpec`, `QuestionnaireSection`, `QuestionnaireQuestion`, `ReviewSummary`, `ReviewOwnerGroup`, `ReviewAnswerSummary` interfaces in `immigration.service.ts`
- Service methods: `createPackage()`, `listPackages()`, `getPackage()`, `sendQuestionnaires()`, `getReviewSummary()`, `approvePackageAnswers()`, `overridePackageAnswer()`, `generatePdfPacket(caseId, packageId, overridePendingReview?)`, `listPdfPackets(caseId, packageId)`, `downloadPdfPacket(caseId, packageId, packetId)` (opens new tab), `approvePdfPacket(caseId, packageId, packetId)`, `getPublicQuestionnaire()`, `submitPublicQuestionnaire()`
- `ScanResult` and `FieldExtraction` interfaces in `immigration.service.ts`; service methods: `scanProfileDocument(file)`, `scanCaseDocument(caseId, file)` — both return `Observable<ScanResult>`

**Document Scan (Phase 6)** — `CanonicalProfileComponent` (passport + entry tabs) and `PackageQuestionnaireComponent`:
- "Scan Passport" / "Scan I-94" label-buttons (`<label><input type=file class=d-none>`) trigger `onScanFileSelected()` → `immigrationService.scanProfileDocument(file)` → `ScanResult`
- Review modal (`modal-backdrop-custom`): per-field checkboxes, confidence bar (green/amber), `needsReview` badge, masked `passportNumber` field, passport/travel-entry target selector for multi-entry profiles
- `applyScanToProfile()` maps `ScanResult.extractedFields` → `form` fields using canonical field names (`p.number`, `p.country`, `t.visaClass`, etc.); `dismissScan()` clears modal without applying
- Questionnaire: `isPassportSection(section)` returns true when section contains passport/name question keys → shows "Scan Passport" button; `applyScanToQuestionnaire()` maps to `answers` map via hard-coded key mapping
- 503 from backend if Vision AI disabled → user sees error alert; data **never saved** — user must click "Apply" then "Save"
- Confidence threshold: 0.85 — fields below this get `needsReview=true` (amber bar + Review badge); pre-selected for unchecking

### `form-versions/` (`/immigration/admin/form-versions`)
- `FormVersionsComponent` — admin page for ATTORNEY+OWNER members; groups form versions by formType; shows PENDING_REVIEW badge count and current approved edition per group
- Expand group → list of versions per edition with PENDING_REVIEW | APPROVED | DEPRECATED badges
- Expand version → split panel: left (canonical question context hint), right (AcroForm field names extracted from PDF); file upload input for new `{FormType}.json` mapping → calls `uploadFormVersionMapping()` → sets fieldMappingVerified; "Approve Edition" button enabled only after mapping verified → calls `approveFormVersion()`; audit trail below
- `FormVersion`, `FormVersionAuditEvent`, `FORM_VERSION_STATUS_CSS` interfaces in `immigration.service.ts`
- Service methods: `getFormVersions()`, `getFormVersion(id)`, `approveFormVersion(id)`, `uploadFormVersionMapping(id, file)`
- Nav link "Form Versions" added to attorney-dashboard header (links to this page)
- Route: `admin/form-versions` with AuthGuard; NOT a public route — listed in module but not in `app.component.ts` isLoginPage check

## Don't
- Don't convert components to standalone — everything is NgModule-based
- Don't add NgRx — use BehaviorSubject in services
- Don't call `console.log/warn/error` directly — use `LoggerService`
- Don't remove `withCredentials: true` from `CredentialsInterceptor` — breaks session auth
- Don't declare new components in `AppModule` — declare them in their feature module under `src/app/features/`; only shell components (used directly by AppComponent) belong in AppModule
- Don't create Angular enums for `StoreType`/`ReceiptDocType` — they're string unions by design (match backend strings directly)
- Don't add `AuthGuard` to `/share/:token`, `/group/join/:token`, `/immigration/data-request/:token`, or `/immigration/packages/questionnaire/:token` — users visit before logging in
- Don't use the `replace` pipe in templates — it doesn't exist in Angular; use a component method instead
- Don't swallow errors in `submitInviteeAction` — re-throw so the real backend message (e.g. "This invite is not for your account") surfaces in the UI
- Don't use arrow functions in Angular template interpolations (e.g. `{{ list.filter(i => ...) }}`) — NG5002 parser error; extract to a component method or getter instead
- Don't return prefillValue for TEXT_SENSITIVE questions on the public questionnaire GET — users must re-enter sensitive data; never send ciphertext over an unauthenticated endpoint
