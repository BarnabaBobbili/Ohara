# Anti-AI Design Prompt Generator

> **Purpose:** A master prompt template for generating unique, human-crafted design outputs using AI tools (Google Stitch, Midjourney, DALL-E, etc.). This template fights against algorithmic sameness and produces editorial, emotionally intelligent designs.

---

## How to Use This Template

1. **Fill in the Project Context** section with your specific project details
2. **Choose your aesthetic lane** from the Mood & Reference options
3. **Copy the final prompt** section and customize it for your AI design tool
4. Use the anti-patterns as a checklist to review generated outputs

---

## 🎯 Project Context
*Fill in these fields for your specific project:*

```
PROJECT_NAME: [Your Project Name]
TARGET_AUDIENCE: [Demographics, psychographics, emotional state when using]
PRIMARY_GOAL: [What action/emotion do you want to evoke?]
INDUSTRY: [Domain that influences visual language]
SECTION_TYPE: [Hero, Dashboard, Card, Landing Page, etc.]
```

---

## 🚫 Anti-Patterns to AVOID
*Tell the AI explicitly NOT to do these:*

### Visual Clichés (Reject These)
- Generic gradients (purple-to-blue, cyan-to-pink blobs)
- Perfectly centered, symmetrical layouts with no visual tension
- Overly rounded corners (8px+ on everything)
- Sans-serif-only typography with no character variety
- Floating 3D objects/abstract blobs with soft shadows
- Pastel color palettes with no contrast or visual weight
- Stock photo aesthetic (overly polished, sterile humans)
- Predictable grid systems with no asymmetry or breaking points
- Overly smooth animations (easeInOut applied everywhere)
- Blue as the primary "trust" color (overused)
- Cards with uniform padding and drop shadows
- Circular avatars with exact same sizing

### Emotional Pitfalls
- "Corporate safe" - feels designed by committee
- No cultural references or current zeitgeist awareness
- Lacks spatial rhythm and visual breathing room
- No typographic hierarchy beyond simple size changes
- Feels "template-y" or like a Canva preset

---

## ✅ Design Principles to Request

### 1. Typography as Voice
```
TYPOGRAPHY_DIRECTION:
- Use unexpected font pairings (serif + grotesque, condensed + wide)
- Implement variable font weights for dynamic hierarchy
- Add intentional spacing anomalies (tight leading in headers, generous body)
- Consider editorial treatments: drop caps, pull quotes, baseline shifts
- Font should reflect project era/mood:
  * Brutalist tech → geometric sans (Neue Haas, Monument)
  * Luxury/heritage → transitional serifs (Canela, Tiempos)
  * Modern editorial → variable width contrast (Instrument, Reckless)
```

### 2. Color with Intent
```
COLOR_DIRECTION:
- Build palettes from cultural references (film stills, art movements, nature)
- Use unexpected color relationships: analogous + one jarring accent
- Embrace duotones, gradient meshes (not linear gradients)
- Add imperfect colors: slightly desaturated, off-tones, murky midtones
- Avoid: rainbow spectrums, default blue, pure black/white only
```

### 3. Layout with Tension
```
LAYOUT_DIRECTION:
- Create asymmetric grids with intentional imbalance
- Use broken grid moments where elements escape boundaries
- Add white space as active negative space, not just padding
- Think magazine editorial: elements bleed, overlap, create visual paths
- Avoid: uniform card grids, everything-centered syndrome
```

### 4. Motion with Personality
```
MOTION_DIRECTION:
- Use custom easing (elastic, bounce, stepped, spring physics)
- Implement staggered animations with intentional rhythm
- Add micro-interactions with personality (wiggle, rotate, parallax)
- Create purposeful delays that build anticipation
- Motion should feel like it has weight and friction
```

### 5. Texture & Materiality
```
TEXTURE_DIRECTION:
- Add grain, noise, halftone patterns subtly
- Use real shadows with considered light source direction
- Implement layering with transparency and blend modes
- Include material references: paper texture, fabric, concrete, glass
- Make digital feel tactile - like you could touch it
```

---

## 🎨 Mood & Reference Options
*Choose 1-2 that create interesting tension:*

### Option A: Editorial Brutalism
```
AESTHETIC: editorial_brutalism
REFERENCES: NYT interactive features, Bloomberg design, Vogue typography
MOOD: Confident, journalistic, high-information density
TYPOGRAPHY: Serif headlines (Tiempos, Lyon) + Grotesque body (Suisse, Neue Haas)
COLOR: Black/white base + archive red (#c23b22) or newsprint yellow (#f2e8cf)
LAYOUT: Dense, overlapping type, hard edges, no rounded corners
```

### Option B: Neo-Retro Future
```
AESTHETIC: neo_retro_future
REFERENCES: 1980s tech manuals, Memphis Group, Blade Runner UI, Y2K graphics
MOOD: Nostalgic but forward-looking, playful, slightly chaotic
TYPOGRAPHY: Geometric sans (Eurostile, Bank Gothic) + bitmap/pixel fonts
COLOR: Neon cyan (#00fff5) + magenta (#ff00ff) + CRT green (#39ff14) + deep black
LAYOUT: Layered, glitchy, scan lines, CRT curve references
```

### Option C: Organic Modernism
```
AESTHETIC: organic_modernism
REFERENCES: Kinfolk magazine, Aesop branding, Japanese wabi-sabi
MOOD: Calm, sophisticated, human-centered, imperfect-beautiful
TYPOGRAPHY: Contemporary serif (Signifier, Canela) + humanist sans (Atkinson)
COLOR: Earthy neutrals - terracotta (#c67d5e), sage (#87a878), sand (#d4c5a9)
LAYOUT: Generous whitespace, organic shapes, natural photography
```

### Option D: Maximalist Data
```
AESTHETIC: maximalist_data
REFERENCES: Bloomberg Terminal, Cyberpunk 2077 UI, flight deck interfaces
MOOD: Dense, intelligent, information-rich, powerful
TYPOGRAPHY: Monospace (JetBrains Mono, Fira Code) + compressed sans
COLOR: Dark UI (#0a0a0a) + data viz spectrum (avoid rainbow, use sequential palettes)
LAYOUT: Dashboard grids, status indicators, real-time feel
```

### Option E: Art Deco Revival
```
AESTHETIC: art_deco_revival  
REFERENCES: 1920s posters, The Great Gatsby, Metropolis (1927)
MOOD: Luxurious, geometric, theatrical, confident
TYPOGRAPHY: Display serif (Bodoni, Didot) + geometric sans (Futura, Avant Garde)
COLOR: Deep navy (#1a1f3a), gold (#d4af37), cream (#f5f1e8), black
LAYOUT: Strong verticals, sunburst patterns, ornamental borders
```

### Option F: Swiss Punk
```
AESTHETIC: swiss_punk
REFERENCES: International Typographic Style + 1970s punk zines
MOOD: Precise yet rebellious, controlled chaos
TYPOGRAPHY: Helvetica/Akzidenz + hand-drawn/distressed type
COLOR: High contrast - red/black/white, or neon on neutral
LAYOUT: Strict grid with intentional violations, collage elements
```

---

## 📝 Final Prompt Template

Copy and customize this for your AI design tool:

```
Create a [SECTION_TYPE] design for [PROJECT_NAME] that serves [TARGET_AUDIENCE].

AESTHETIC DIRECTION: [Choose from options above, e.g., "Editorial Brutalism meets Organic Modernism"]

TYPOGRAPHY:
- Headline: [Font suggestion] with [specific treatment - tight leading, all caps, etc.]
- Body: [Font suggestion] with generous line height
- Accent: [Font for CTAs, labels]

COLOR PALETTE:
- Primary: [Hex code] - [usage]
- Secondary: [Hex code] - [usage]  
- Accent: [Hex code] - [usage]
- Background: [Hex code with texture description]

LAYOUT:
- [Describe asymmetry, grid breaks, visual flow]
- [Describe key focal points and hierarchy]
- [Describe spacing philosophy]

TEXTURE & DEPTH:
- [Describe grain, shadows, materiality]
- [Describe layering and overlap]

MOTION (if applicable):
- [Describe animation style and timing]
- [Describe micro-interactions]

MUST AVOID:
- Rounded corners over 4px
- Generic blue/purple gradients
- Perfectly centered layouts
- Stock photo aesthetic
- Sans-serif only typography
- Floating 3D blob shapes
- [Add any project-specific anti-patterns]

REFERENCES:
- [Link or describe 2-3 specific design references]
- [Describe the tension between references]

This should feel like it was designed by a human with specific opinions, not generated by an algorithm. The design should be MEMORABLE and have PERSONALITY.
```

---

## 📐 Quality Check Rubric

After generating, evaluate with these questions:

| Criteria | Pass | Fail |
|----------|------|------|
| **Typography** | 3+ weight/size variations with character | Uniform sizing, basic hierarchy |
| **Color** | Unexpected combinations, cultural reference | Generic, "safe", template-feeling |
| **Layout** | Asymmetric, visual tension, clear path | Centered, predictable, grid-locked |
| **Texture** | Tactile, material-feeling | Flat, sterile, digital-looking |
| **Overall** | "Who designed this?" (good way) | "AI generated this" (obvious) |

---

## 💡 Example Prompts

### Example 1: Library Management System Hero
```
Create a hero section for "Ohara Library" - a modern digital library platform for university students.

AESTHETIC: Editorial Brutalism meets Art Deco Revival

TYPOGRAPHY:
- Headline: Canela Text Bold, -0.05em letter-spacing, left-aligned
- Body: Suisse Int'l Regular, 1.6 line-height
- Accent: Suisse Int'l Mono for metadata/stats

COLOR PALETTE:
- Primary: Deep navy (#1a1f3a) - backgrounds, confidence
- Secondary: Gold (#d4af37) - accents, premium feel
- Cream: (#f5f1e8) - text, paper-like warmth
- Background: Navy with subtle book spine texture grain

LAYOUT:
- Asymmetric 2-column: headline breaks across columns at 60/40 split
- CTA button has hard geometric border, no rounded corners
- Search bar integrated as primary action, not floating
- Negative space on right creates visual pull toward content

TEXTURE:
- Subtle paper grain overlay at 3% opacity
- Hard drop shadows (offset, not blur) for depth
- Book spine texture pattern in background

MUST AVOID: Rounded corners, generic blue, centered layout, clipart book icons, gradient blobs

FEEL: Like a premium literary magazine mixed with a confident institutional identity
```

### Example 2: E-commerce Product Card
```
Create a product card component for a sustainable fashion brand targeting eco-conscious millennials.

AESTHETIC: Organic Modernism with Swiss Punk edge

TYPOGRAPHY:
- Product name: Signifier Medium, sentence case
- Price: Suisse Int'l Mono, slightly larger than usual
- Details: Atkinson Hyperlegible for accessibility

COLOR PALETTE:
- Sage (#87a878) - sustainable indicator
- Terracotta (#c67d5e) - warmth, organic
- Off-white (#faf8f5) - not pure white
- Charcoal (#2d2d2d) - text, not pure black

LAYOUT:
- Vertical image-heavy (4:5 ratio minimum)
- Product info left-aligned, not centered
- Price positioned unconventionally (top-right corner)
- Hover state: image shifts slightly, reveals texture

TEXTURE:
- Linen paper texture on card background
- Soft shadow with visible offset (3px down, 2px right)
- Subtle grain on hover state

MUST AVOID: White card on white background, centered text, hamburger-style info stacking

FEEL: Like holding a lookbook from a thoughtful brand, not browsing Amazon
```

---

## 🔄 Iteration Tips

When the first output isn't right:

1. **Too generic?** Add more specific reference images and describe what you like about them
2. **Too chaotic?** Add constraints: "Maintain clear visual hierarchy while..."
3. **Wrong mood?** Be more specific about emotional adjectives (confident vs. calm, playful vs. serious)
4. **Colors off?** Provide exact hex codes rather than color names
5. **Layout wrong?** Describe the visual flow: "Eye should move from top-left headline → center image → bottom-right CTA"

---

*Created for generating unique, human-feeling designs that break free from AI aesthetic sameness.*
