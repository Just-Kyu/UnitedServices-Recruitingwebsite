# Prompt — 3D Driver-Recruiting Website (US Logistics)

> Paste everything below into Claude Design or Claude Code.
> Attach the logo file (`united-services-logo.png`) along with this prompt.

---

Build a premium, animated, 3D marketing website for **United Services Recruiting**, a US logistics driver-recruiting company. We are a recruiting agency: we connect reliable truck drivers with carrier companies that are hiring. The site has **two audiences** — drivers and carrier companies — and a way for drivers to apply.

**Brand context:** "United Services Recruiting" is one division of a larger brand, **United Services**, which also includes United Services ELD, Accounting, and Fleet. The website is for the **Recruiting** division specifically, but the design must feel like part of this premium, unified brand family. Add a small footer line or menu noting the sister brands (ELD · Accounting · Fleet · Recruiting).

**Logo (attached):** a 3D folded "U" mark — a deep navy left curve paired with a chrome/silver right panel, reading as the letter "U" for United. Use this logo in the navbar and footer. The logo's 3D, metallic, folded-shield character should set the tone for the whole site.

## Aesthetic / art direction
Cinematic, premium, metallic — inspired by the layout/motion of terminal-industries.com but in United Services' own brand colors.
- **Dark, cinematic theme.** Near-black backgrounds (#0A0E16) as the base, with sections in deep brand navy (#16243B / #1A2A44).
- **Brand palette (from the logo):**
  - Deep navy `#16243B` (primary / dark sections)
  - Chrome / metallic silver — a gradient from `#FFFFFF` → `#C3CAD3` → `#8A95A3` (use for the 3D, the logo, highlights, and shiny edges)
  - Crisp white `#FFFFFF` (text, dividers)
  - Optional single accent for CTAs and active states: a luminous steel/ice blue `#4DA3FF`. Use it sparingly. (If you prefer fully monochrome, keep it navy + chrome + white only — no blue.)
- **Metallic treatment:** lean into the chrome look — brushed-metal textures, subtle reflective gradients, thin silver beveled edges on cards and the navbar. The site should feel like polished steel and midnight navy.
- **Huge, confident typography.** Big tight sans-serif headlines (Inter, Geist, or Satoshi). Lots of negative space.
- **Subtle blueprint grids and dot matrices** faintly in the background of dark sections.
- **Golden-hour photographic hero feel** for the truck imagery is optional; the core look should be navy + chrome 3D, not warm sunset.
- **Floating glassmorphic pill navbar** (frosted, rounded, semi-transparent navy) pinned at the top with: the United Services logo on the left; nav links (For Drivers, For Companies, Why Us, About); a white/chrome "Apply" button and a navy (or steel-blue) "Contact" button on the right.
- Numbered section labels (01, 02, 03) and a "SCROLL TO EXPLORE" cue under the hero.
- Overall vibe: high-end, metallic, tech-forward, trustworthy, fast.

## 3D + motion (the important part)
- **Loader / intro:** animate the 3D "U" logo mark — the navy and chrome halves fold/assemble into place, then transition into the hero. Keep it short (1–2s).
- **Hero 3D element:** a semi-truck (tractor + trailer) rendered with a **chrome / brushed-metal material** OR as a glowing **wireframe / particle model** in silver-blue lines on the dark navy background — it should slowly rotate and react subtly to mouse movement. (If a GLTF truck model is provided, use it; otherwise generate a stylized chrome/wireframe truck with Three.js / React Three Fiber.) The rotating 3D "U" mark can also float in the hero as a secondary element.
- **Scroll-driven animation** (GSAP ScrollTrigger): as the user scrolls, the camera moves around the truck, text fades/slides in, numbers count up, and sections reveal with smooth parallax.
- Magnetic/hover effects on buttons, smooth scroll, and a custom cursor are welcome but keep it tasteful.
- Must stay smooth at 60fps and degrade gracefully on mobile (lighter particle count, no heavy camera moves).

## Logistics materials to feature (use these as 3D/visual content)
Different trailer/equipment types as icons, 3D objects, or illustrated cards: **Dry Van, Flatbed, Reefer (refrigerated), Step Deck, Power Only, Tanker, Car Hauler.** Also reference route types: **OTR, Regional, Local, Dedicated.** Show subtle US map / route-line visuals where it fits.

## Site structure (3 sections/pages)

### 1) Home — built FOR DRIVERS (this is the main landing experience)
The whole point: a driver lands here and instantly sees *"there's a job for someone like me."*
- **Hero:** chrome 3D truck (and/or rotating "U" mark) + a bold headline like "We find the job. You drive." + subline about matching drivers to top US carriers + two buttons: a chrome/white "Find My Job" (scrolls to the matcher) and an outline "How it works."
- **Interactive "Do we have a job for you?" matcher** (signature feature): a row of selectable chips/cards for the driver's situation —
  - "I'm an SAP driver" → reveal: *"We have a job for you."*
  - "I have no experience" → reveal: *"We have a job for you."*
  - "I want flatbed loads" → reveal: *"We've got the offer."*
  - "I need OTR / Regional / Local" → reveal matching offers.
  - plus: Reefer, Dry Van, Owner-Operator, CDL-A.
  When a chip is selected, animate in a confident "Yes — we have offers for you" panel with a count of live openings and a "Apply now" button. Each chip should feel rewarding to click (motion + a chrome shine or steel-blue glow lighting up).
- **"Why choose us" section** (numbered 01–04): e.g. *Real offers, not dead-end listings* · *We work with SAP & no-experience drivers* · *Flatbed, reefer, dry van — all equipment* · *We handle the paperwork, you keep driving.*
- **Live offers / criteria grid:** cards showing example openings filtered by criteria (equipment type, route, pay range, experience level).
- **How it works:** 3 steps — Apply → We match you → Start driving.
- **CTA band + footer** with contact, phone, social.

### 2) For Companies — page that shows AVAILABLE DRIVERS ready to work
A separate page/section aimed at carriers who want to hire.
- Hero headline like "Hire pre-vetted, ready-to-drive talent."
- **Available drivers board:** anonymized driver cards (e.g. "Driver #1042 — CDL-A · 3 yrs OTR · Flatbed · SAP-cleared · Available now") with filters for equipment, experience, clearance, and location. Use placeholder/sample data.
- Value props for carriers: vetted drivers, fast placement, lower turnover.
- A "Request drivers" / "Partner with us" form or CTA.

### 3) Driver application form (page or modal)
Lets a driver submit their info. Fields:
- Full name, phone, email
- CDL class & years of experience (incl. "No experience" option)
- Equipment experience (multi-select: Dry Van, Flatbed, Reefer, Step Deck, Tanker, Power Only, Car Hauler)
- Preferred route type (OTR / Regional / Local / Dedicated)
- SAP status (Yes / No)
- Current location / preferred states
- Optional resume upload + notes
Clean multi-step or single-page form, validated, with a satisfying success state. (Use a placeholder submit handler / mock backend for now.)

## Tech notes
- Build with **React + Three.js / React Three Fiber + GSAP (ScrollTrigger)**, Tailwind for styling.
- Fully responsive (desktop, tablet, mobile). Mobile must keep the wow-factor but lighten the 3D.
- Accessible: keyboard-navigable, good contrast, reduced-motion fallback for users who prefer it.
- Use realistic placeholder copy and sample data throughout so it looks finished.

## Deliver
A polished, deployable multi-section site that feels like a $20k agency build. Prioritize: (1) the wireframe 3D hero, (2) the interactive driver "we have a job for you" matcher, (3) smooth scroll animation.
