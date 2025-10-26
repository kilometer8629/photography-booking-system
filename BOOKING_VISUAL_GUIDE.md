# Santa Booking Workflow - Visual Guide

## 📱 Mobile View (< 600px)

```
┌─────────────────────────────────────┐
│  Santa by South Sydney Photography   │
│         Book Your Santa Experience    │
│                                       │
│    [Start Booking] ↓                  │
└─────────────────────────────────────┘

┌─ STEP 1: SELECT DATE ────────────────┐
│                                       │
│  Visit Santa at Tramsheds            │
│  📍 1 Dalgal Way, Forest Lodge       │
│                                       │
│  < November 2025 >                    │
│  Su Mo Tu We Th Fr Sa                 │
│           1  2  3  4 ✅             │
│   5  6  7  8  9  10 11 ⚠️           │
│  12 13 14 15 16 17 18 ⏹️            │
│  19 20 21 22 23 24 25                │
│                                       │
│  ✅ = 4+ slots available              │
│  ⚠️  = 1-3 slots left (Limited)      │
│  ⏹️  = Fully Booked                  │
│                                       │
└─────────────────────────────────────┘

[User clicks Nov 9 - opens time modal]

┌─ STEP 2: SELECT TIME ────────────────┐
│  Available times                      │
│  Sessions for Nov 9, 2025            │
│                                       │
│  ┌──────────────┐  ┌──────────────┐ │
│  │  10:00 am ✓  │  │  10:30 am    │ │
│  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐ │
│  │  11:00 am    │  │  11:30 am    │ │
│  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐ │
│  │  12:00 pm    │  │  12:30 pm    │ │
│  └──────────────┘  └──────────────┘ │
│                                       │
│  [5-minute slots shown]              │
│  [Smooth scrolling on mobile]        │
│                                       │
│            [Done selecting times]    │
└─────────────────────────────────────┘

[Modal closes, time slot shows selected]

┌─ STEP 3: SELECT PACKAGE ─────────────┐
│  Choose your package                 │
│                                       │
│  ┌───────────────────────────────┐  │
│  │ [Package Image]               │  │
│  │ Santa's Gift Pack             │  │
│  │ Deluxe prints, themed folder  │  │
│  │ $89.00                        │  │
│  └───────────────────────────────┘  │
│                                       │
│  ┌───────────────────────────────┐  │
│  │ [Package Image]               │  │
│  │ Rudolph  ✓ [SELECTED]        │  │
│  │ Premium prints & magnets      │  │
│  │ $79.00                        │  │
│  └───────────────────────────────┘  │
│                                       │
│  [Scrolls vertically]                │
│                                       │
└─────────────────────────────────────┘

[Selected package highlights]

┌─ STEP 4: BOOKING SUMMARY ────────────┐
│  Selected session                    │
│  Nov 9, 2025 at 10:00 am             │
│                                       │
│  ┌─────────────────────────────────┐ │
│  │ Date:     Nov 9, 2025           │ │
│  │ Time:     10:00 am              │ │
│  │ Package:  Rudolph               │ │
│  │ Price:    $79.00                │ │
│  └─────────────────────────────────┘ │
│                                       │
│  [Now shows customer details form]  │
│                                       │
└─────────────────────────────────────┘

┌─ STEP 5: CUSTOMER DETAILS ──────────┐
│  Secure Your Session                │
│                                       │
│  [Date, Time, Package, Price shown]  │
│                                       │
│  Full Name                           │
│  ┌─────────────────────────────────┐ │
│  │ Parent or guardian name         │ │
│  └─────────────────────────────────┘ │
│                                       │
│  Email                               │
│  ┌─────────────────────────────────┐ │
│  │ name@example.com                │ │
│  └─────────────────────────────────┘ │
│                                       │
│  Mobile                              │
│  ┌─────────────────────────────────┐ │
│  │ 04xx xxx xxx                    │ │
│  └─────────────────────────────────┘ │
│                                       │
│  [All fields required]               │
│                                       │
└─────────────────────────────────────┘

┌─ STEP 6: CHECKOUT ──────────────────┐
│                                       │
│    ┌─────────────────────────────┐  │
│    │   Confirm booking →         │  │
│    │   [Redirects to Stripe]     │  │
│    └─────────────────────────────┘  │
│                                       │
│    [Stripe payment page]             │
│    [Credit card entry]               │
│    [Confirmation email sent]         │
│                                       │
│    ┌─────────────────────────────┐  │
│    │  ✓ Thank you! Your booking  │  │
│    │    has been submitted.      │  │
│    │    We'll send confirmation  │  │
│    │    email shortly.           │  │
│    └─────────────────────────────┘  │
│                                       │
└─────────────────────────────────────┘
```

---

## 🖥️ Desktop View (> 900px)

```
┌────────────────────────────────────────────────────────────────┐
│  Santa by South Sydney Photography                              │
│         [Home] [Sensitive Santa] [Pet Photos] [Book Now] ✓    │
└────────────────────────────────────────────────────────────────┘

┌─ BOOKING SECTION ────────────────────────────────────────────────┐
│                                                                   │
│  Visit Santa at Tramsheds                                        │
│  📍 Tramsheds, 1 Dalgal Way, Forest Lodge NSW 2037              │
│                                                                   │
│  ┌─ STEP 1: CALENDAR ──────┐  ┌─ STEP 2: PACKAGES ──────────┐  │
│  │                         │  │                              │  │
│  │  < November 2025 >      │  │  Santa's Gift Pack           │  │
│  │  Su Mo Tu We Th Fr Sa   │  │  [Image]                    │  │
│  │           1  2  3  4 ✅ │  │  $89.00 - 3 slots left      │  │
│  │   5  6  7  8  9  10 11⚠️ │  │                              │  │
│  │  12 13 14 15 16 17 18 ⏹│  │  Rudolph ✓ [SELECTED]      │  │
│  │  19 20 21 22 23 24 25   │  │  [Image]                    │  │
│  │  ...                    │  │  $79.00 - 2 slots left      │  │
│  │                         │  │                              │  │
│  │  [Next month] [Prev]    │  │  Blitzen                     │  │
│  │                         │  │  [Image]                    │  │
│  └─────────────────────────┘  │  $99.00 - 4 slots left      │  │
│                                │                              │  │
│  [Time modal overlay on click] │  [5 packages total]         │  │
│  ┌────────────────────────┐   │                              │  │
│  │ Available times        │   │  ┌─ BOOKING SUMMARY ──────┐ │  │
│  │ Nov 9, 2025            │   │  │  Date: Nov 9, 2025    │ │  │
│  │                        │   │  │  Time: 10:00 am       │ │  │
│  │ 10:00am  10:30am       │   │  │  Package: Rudolph     │ │  │
│  │ 11:00am  11:30am ✓     │   │  │  Price: $79.00        │ │  │
│  │ 12:00pm  12:30pm       │   │  │                        │ │  │
│  │ 1:00pm   1:30pm        │   │  │  Full Name             │ │  │
│  │ 2:00pm   2:30pm        │   │  │  [Name field]          │ │  │
│  │ 3:00pm   3:30pm        │   │  │                        │ │  │
│  │ [Scroll down for more] │   │  │  Email                 │ │  │
│  │                        │   │  │  [Email field]         │ │  │
│  │ [Done selecting]       │   │  │                        │ │  │
│  └────────────────────────┘   │  │  Mobile                │ │  │
│                                │  │  [Phone field]         │ │  │
│  Selected session              │  │                        │ │  │
│  Nov 9, 2025 at 10:00 am       │  │ [Confirm booking] →   │ │  │
│                                │  └────────────────────────┘ │  │
│                                │                              │  │
│                                └──────────────────────────────┘  │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

---

## 📊 State Transitions

```
START
  ↓
[Calendar shows]
  ↓ User clicks available date
[Time modal opens]
  ↓ User selects time slot
[Modal closes, time confirmed]
  ↓
[Package grid shows]
  ↓ User clicks package
[Package selected, highlight shown]
  ↓
[Booking summary updates]
  ↓
[Customer detail fields enable]
  ↓ User fills in name/email/phone
[All fields populated]
  ↓
["Confirm booking" button enables]
  ↓ User clicks checkout
[Redirects to Stripe]
  ↓
[Payment page loads]
  ↓ User completes payment
[Booking created in DB]
  ↓
[Event syncs to Zoho Calendar]
  ↓
[Success message shows]
  ↓
[Confirmation email sent]
  ↓
END
```

---

## 🎨 Color & Status Legend

### Calendar Day Status
- 🟢 **Available** (4+ slots)
  - Background: Light green
  - Text: "Available • 4 slots open"
  - State: Clickable

- 🟡 **Limited** (1-3 slots)
  - Background: Light amber/yellow
  - Text: "Limited • 2 slots left"
  - State: Clickable

- 🔴 **Fully Booked** (0 slots)
  - Background: Light red
  - Text: "Fully booked • No sessions"
  - State: Disabled (not clickable)

- ⚫ **Past Dates**
  - Background: Light gray
  - Text: Faded
  - State: Disabled (not clickable)

### Button States

- **Default**: White background, red border, red text
- **Hover**: Elevated (box-shadow), border color darker
- **Focus**: Outline with focus ring (WCAG)
- **Selected/Active**: Red gradient background, white text
- **Disabled**: Reduced opacity (0.5), not clickable

### Form States

- **Disabled**: Form inputs grayed out until prerequisites met
- **Enabled**: Fully interactive after date/time/package selected
- **Required**: Red asterisk on labels
- **Error**: Red error message, red border on field

---

## ♿ Accessibility Features

### Keyboard Navigation
- `Tab` - Move between elements
- `Shift+Tab` - Move backward
- `Enter/Space` - Activate buttons
- `Escape` - Close modal
- `Arrow Keys` - Navigate in select lists (when implemented)

### Screen Readers
- ARIA labels on all buttons: `aria-label="Next month"`
- Role descriptions: `role="dialog"`, `role="list"`
- Status updates: `aria-hidden="true"` for decorative elements
- Selected state: `aria-pressed="true"` for active buttons

### Touch/Mobile
- 44px minimum button height (WCAG AA standard)
- Proper spacing between touch targets (gap: 0.6rem)
- Full-height modals (70vh) for better touch interaction
- Smooth scrolling with momentum on iOS

### Visual Design
- Color contrast: 4.5:1 for text (WCAG AA)
- Focus indicators: Clear outline on keyboard navigation
- Error messaging: Color + text (not color alone)
- Animation: Respectful of `prefers-reduced-motion`

---

## 🔄 Data Flow

```
┌─ CLIENT BROWSER ──────────────────────────┐
│                                            │
│  1. Click calendar date                   │
│     ↓                                      │
│  2. fetch(/api/availability?date=...)     │
│     ↓                                      │
└────────────────────↓────────────────────────┘
                     ↓
┌─ SERVER (Express) ────────────────────────┐
│                                            │
│  3. Query MongoDB for available slots     │
│     - Fetch all slots for date            │
│     - Filter by Booking collection        │
│       (status: confirmed/pending)         │
│     ↓                                      │
│  4. Return: { slots: ["10:00", ...] }    │
│     ↓                                      │
└────────────────────↓────────────────────────┘
                     ↓
┌─ CLIENT BROWSER ──────────────────────────┐
│                                            │
│  5. Display available times               │
│     - User selects time (e.g., "10:00")  │
│     - User selects package (e.g., "$79")  │
│     ↓                                      │
│  6. User fills customer details           │
│     - Name, Email, Phone                  │
│     ↓                                      │
│  7. Click "Confirm booking"               │
│     - POST /api/create-checkout-session   │
│       with: { date, time, package, ... }  │
│     ↓                                      │
└────────────────────↓────────────────────────┘
                     ↓
┌─ SERVER (Express) ────────────────────────┐
│                                            │
│  8. Create Booking in MongoDB             │
│     - eventDate: "2025-11-09"            │
│     - startTime: "10:00"                  │
│     - status: "pending"                   │
│     ↓                                      │
│  9. Create Zoho Calendar Event            │
│     - POST to Zoho API v1                 │
│     - Returns: zohoEventId                │
│     - Save to booking.zohoEventId         │
│     ↓                                      │
│ 10. Create Stripe checkout session        │
│     - Return: { url: "stripe.com/..." }  │
│     ↓                                      │
└────────────────────↓────────────────────────┘
                     ↓
┌─ CLIENT BROWSER ──────────────────────────┐
│                                            │
│ 11. Redirect to Stripe checkout URL       │
│     ↓                                      │
│ 12. User enters payment info              │
│     ↓                                      │
│ 13. Stripe processes payment              │
│     ↓                                      │
│ 14. Success page shows                    │
│     ↓                                      │
│ 15. Email confirmation sent               │
│     (via Zoho/email service)             │
│     ↓                                      │
│ 16. Booking appears in calendar as       │
│     "Fully Booked" / "Limited"           │
│                                            │
└────────────────────────────────────────────┘
```

---

## 📱 Responsive Breakpoints

### Desktop (> 900px)
```
┌─────────────────────────────────────────────┐
│  Calendar (300px)  Packages (400px)         │
│  [List all 12 days visible on calendar]     │
│  [4-column package grid]                    │
│  [Side-by-side booking summary]             │
└─────────────────────────────────────────────┘
```

### Tablet (600-900px)
```
┌──────────────────────┐
│  Calendar (100%)    │
│                     │
│  [Adjusted layout]  │
│  [3-column grid]    │
│  [Vertical stack]   │
└──────────────────────┘
```

### Mobile (< 600px)
```
┌──────────┐
│ Calendar │
│ (100%)   │
│          │
│ [Modal]  │
│ [Stack]  │
│ [Full]   │
└──────────┘
```

---

## ✅ Quick Checklist for Users

- [ ] Click a date with green/yellow badge (has availability)
- [ ] Select time from modal that appears
- [ ] Click package to select it
- [ ] Check booking summary updates correctly
- [ ] Fill in your name, email, phone
- [ ] "Confirm booking" button becomes active
- [ ] Click it to go to Stripe payment
- [ ] Complete payment
- [ ] See confirmation message
- [ ] Check email for booking confirmation
