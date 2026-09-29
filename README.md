# NeptuneAtelier

[![Github Actions Status](https://github.com/yourtan/NeptuneAtelier/workflows/Build/badge.svg)](https://github.com/yourtan/NeptuneAtelier/actions/workflows/build.yml)

A no-code theme customization engine for JupyterLab. Restyle colors, backgrounds (including animated particles and WebGL shaders), shape, fonts, layout, and editor behavior from a panel, with no JSON or code editing required.

## Requirements

- JupyterLab >= 4.0.0

## Install

To install the extension, execute:

```bash
pip install neptuneatelier
```

## Uninstall

To remove the extension, execute:

```bash
pip uninstall neptuneatelier
```

## Usage

### Opening the Theme Studio

Open the command palette (`Ctrl+Shift+C` / `Cmd+Shift+C`) and run **Open Theme Studio**. A panel opens in the right sidebar with eleven tabs: **Colors**, **Background**, **Effects**, **Events**, **Particle Lab**, **Style**, **Layout**, **Editor**, **Branding**, **Presets**, and **CSS**. Every change applies immediately and is saved automatically. The first time you open it, a short welcome dialog outlines what's where; it won't show again.

At the top of the panel:

- **Undo / Redo** step through your changes this session (a slider drag counts as one step). They're also in the command palette as **Undo Theme Change** / **Redo Theme Change**.
- **Reset tab** restores everything in the current tab to its default. Individual sliders also get their own small **Reset** link next to them whenever they've been moved away from their default value, for a finer-grained undo than resetting the whole tab.

The fastest way to start is **Presets → Starter themes**: pick one, then tweak it.

### If something goes wrong: safe mode

Press **`Ctrl+Alt+Shift+R`** (`Cmd+Alt+Shift+R` on macOS), or run **Theme Studio Safe Mode (reset everything)** from the command palette, to instantly reset every Theme Studio setting to its default. Saved presets are kept, and Undo can bring your theme back. Use this if a theme ever makes JupyterLab hard to use.

### Colors tab

- **Generate a palette**: choose Light or Dark, a **Harmony** (Complementary, Triadic, or Analogous — how the secondary accent's hue relates to the main one), pick an accent color (or use the **Pick** eyedropper button, in browsers that support it, to sample any color on screen), and click **Generate from color**. Or click **From image…** to build a palette from a picture's dominant color and brightness. This sets a full coordinated palette (surfaces, text, borders, accents, status and syntax colors) and switches JupyterLab to its matching light or dark base theme.
- **Syntax highlighting presets**: one-click code-only color schemes — Dracula, Nord, Solarized Dark, and Monokai — that touch just the syntax colors, leaving the rest of your palette alone.
- **Every color individually**: colors are grouped into Accent, Surfaces, Text, Borders, Status, Editor, and Syntax highlighting. A color marked **auto** follows the active JupyterLab theme; pick a color to override it, and click **Reset** to go back to auto.
- **Hard-to-read text warnings**: if text doesn't contrast enough with its background (below the WCAG 4.5:1 guideline), a warning appears with a **Fix** button that switches the text to near-black or near-white.
- **Accessibility audit**: a full pass/fail list of WCAG contrast ratios across every meaningful text/surface pair in the theme, not just the ones currently failing.

### Background tab

The **base** background, painted behind JupyterLab's chrome (menu bar, sidebars, tab bars, status bar): **None**, **Solid color**, **Gradient**, or **Image** (with **Match colors to image** to generate a palette from it). Animated particles and shaders stack on top of it — see the Effects tab.

**Image positioning**: once an image is set, **Fit** controls how it fills the screen (**Cover**, **Contain**, **Stretch**, or **Tile**), **Zoom** scales it in or out, and the horizontal/vertical **Position** sliders pan it — useful for centering the interesting part of a photo or panning a tiled pattern.

**Texture**: once a background is on, **Grain** adds a subtle film-grain overlay and **Vignette** darkens the screen edges to draw focus to the center.

**Gradient editor**

- Click a swatch for a ready-made gradient.
- Drag the handles on the color bar to move colors; click empty space on the bar to add a color there; select a handle to change its color or **Remove** it. Handles also move with the arrow keys (hold Shift for bigger steps).
- Choose **Linear**, **Radial**, or **Conic**, and drag the **angle dial** (hold Shift for 1° steps).
- **Animation**:
  - **Rotate** slowly spins the gradient (radial gradients drift instead).
  - **Scroll** pans the gradient endlessly in the direction of the angle — use the **← ↑ ↓ →** buttons or the dial for any diagonal. The colors repeat mirrored, so there's never a seam. **Repeat length** sets how far it travels before repeating. Radial gradients ripple outward instead.
- The **CSS** box shows the generated CSS, if you want to copy it.

**See-through** (applies whenever there's a background or a background effect layer)

- **Background opacity / blur**: how strong and how soft the base is. Blur doesn't leave white edges.
- **Panel opacity**: how solid the chrome is. Combine a low value with **Style → Glass panels** for a frosted look.
- **Window opacity**: how solid notebooks, editors, **terminals**, consoles, and other windows are. Keep it high for readability.

Images are stored in this browser only (roughly 5 MB limit), but exported presets include them.

### Effects tab

Animated **effect layers**, as many as you like, stacked on the base background — for example an image, a shader blended over it, and particles on top.

- **+ Particles** / **+ Shader** add a layer. Particles drift, optionally linked by lines and pushed away by the mouse; pick their **shape** (circle, square, triangle, star, or falling characters for a digital-rain look) or an **uploaded image**, a **size variation** range, **opacity**, a soft **glow** halo, **spin** (visible on square/triangle/star), a motion-blur **trail**, where they **spawn from** (whole screen, the cursor, the edges, or the center), turn on **twinkle** for a per-particle fade cycle, optionally **blend toward a second color** for varied per-particle mixes, and dial in **gravity** to make them fall like rain/snow (positive) or float like embers (negative). Shaders are GPU (WebGL) effects: **Aurora**, **Liquid gradient**, **Plasma**, **Glowing waves**, **Nebula**, **Starfield warp**, **Rain**, **Retro grid**, and **Rising embers**.
- **Where**: the background (behind everything), or inside windows — **every window**, **notebooks**, **terminals**, **text editors**, **consoles**, or **one specific file** (by name or path). Each matching window gets its own copy, which follows it as you open, close, and move windows.
- **Placement** (window layers): **over the content** (never blocks clicks or typing) or **behind the content** (visible where the window is see-through — lower Background → Window opacity).
- **Opacity** and **Blend** control how a layer mixes with what's beneath (e.g. Screen or Color dodge make effects glow over an image).
- **Frame rate limit**: lower saves battery. Effects pause in hidden tabs and hidden windows, and stop if your system asks for reduced motion.
- **Send back / Bring forward** change the stacking order; the checkbox in a layer's header turns it on or off.

At most 8 shader copies run at once (a browser limit on GPU contexts).

### Events tab

Rules of the form **when _something happens_, do _something_**. Pick one from **Add** (e.g. "Confetti when a cell succeeds", "Power mode: sparks while typing", "Shake the cell on errors", "Fireworks when saving") or start from a blank rule.

- **When**: a cell runs successfully, a cell fails, any toolbar button is clicked, a file is saved, typing in an editor, a specific command runs (buttons, menus, and keyboard shortcuts all run commands — suggestions are offered), a keyboard shortcut is pressed (type a combo like `Ctrl+Shift+K`, independent of any registered command), you've been idle for a while, or JupyterLab starts.
- **Do**: confetti, fireworks, sparkles, a shockwave ring, a screen flash, shake or glow the window/cell, a **typing animation** (types out custom text with a blinking cursor, with its own adjustable font size) — or drive your effect layers: **pulse** them (a burst of speed and brightness), **turn one on/off**, or **show one briefly**.
- **Where**: where it happened (the cell, the button, your text cursor), at the mouse pointer, or the center of the screen. Pick colors and size for animations.
- **Advanced** (collapsed by default): **Also requires** — a compound "when X and Y" condition, where a second trigger must also have fired within the last few seconds; a **Sound** (a short synthesized tone, with its own volume); and **Then also run** — chains another rule after this one (with a delay) for simple multi-step macros.
- **Preview** plays the rule immediately.

Animations are skipped if your system asks for reduced motion.

### Particle Lab tab

Design a particle effect with a live preview — color, shape, count, size, speed, links, mouse reaction, twinkle, and gravity — then **Save as preset** under a name. Saved presets (plus a handful of built-in starters: Snow, Fireflies, Embers, Fairy dust, Bubbles) show up in a **Load preset** dropdown on any Particles layer in the Effects tab, so you build an effect once and reuse it anywhere.

### Style tab

- **Base theme**: keep your current JupyterLab theme, or force Light or Dark. Match it to your palette so everything you haven't customized (dialogs, toolbars, prompts) fits too. If you change JupyterLab's theme yourself later, this setting steps back to "keep my current theme" instead of fighting you.
- **Shape**: corner radius, border thickness, border **style** (solid, dashed, dotted, or double, on cells/toolbar/buttons), and **Floating panels** (sidebars, editor area, and bars become rounded cards with real gaps between them — drag a gap to resize), with gap size, shadow, and shadow color.
- **Surfaces**: **Glass panels** adds a frosted-glass blur behind the chrome (visible when a background is on and panel opacity is below 100%), with an optional **Acrylic texture** (a subtle noise grain over the glass, for a Windows 11 Mica-like feel). **Glow** adds a standing ambient accent glow around the active cell, accent buttons, and the active tab, with adjustable strength.
- **Fonts**: interface and code fonts (built-in choices, Google Fonts, or the name of any font installed on your computer), sizes, code line height, code ligatures, and **animated gradient headings** (markdown headings get a slowly animating accent-colored gradient).
- **Cursor and motion**: thin, thick, or block cursor; optional interface animations (hover transitions and fading-in outputs); and an optional **cursor trail** of small accent-colored sparkles that follow your mouse.

### Layout tab

- **Interface**: hide the menu bar, status bar, left icon bar, or right icon bar. If you hide the right icon bar (which contains Theme Studio's own icon), reopen Theme Studio from the command palette.
- **Density**: compact, normal, or comfortable spacing in file lists and notebooks.
- **Tab style**: default, pills, underline, or minimal.
- **Notebooks**: cell style (default, cards, borderless, or an accent bar on the active cell), hide the `[1]:` prompts, and limit notebook width to a centered, readable column.
- **Scrollbars**: default, thin, or hidden (still scrollable), plus an optional color.

### Editor tab

Editor behavior, applied to every notebook and file editor:

| Setting                        | Effect                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Auto-close brackets and quotes | Typing `(`, `[`, `{`, `'`, or `"` inserts the matching closing character with the cursor between them |
| Highlight matching brackets    | Highlights a bracket's pair when the cursor is next to it                                             |
| Code folding                   | Adds gutter arrows to collapse and expand code blocks                                                 |
| Highlight active line          | Shades the line the cursor is on                                                                      |
| Line numbers                   | Shows line numbers in the gutter                                                                      |
| Wrap long lines                | Long lines continue on the next line instead of scrolling sideways                                    |
| Show whitespace                | Draws faint markers for spaces and tabs                                                               |
| Highlight trailing spaces      | Marks stray spaces at the ends of lines                                                               |
| Indent with                    | 1, 2, 4, or 8 spaces, or tabs                                                                         |
| Cursor blink speed             | How fast the cursor blinks; 0 for a steady cursor                                                     |

### Branding tab

- **Favicon**: replaces the browser tab icon with an uploaded image, and optionally **pulses** it between two colors while a notebook cell is running.
- **Loading splash screen**: an optional full-screen message shown until JupyterLab finishes restoring, with its own text and background color.

### Presets tab

- **Save current theme**: saves everything (colors, background, effects, events, style, layout, editor, and custom CSS) under a name.
- **Your presets**: each shows a small preview. **Apply**, **Export** (downloads a `.json` file, including any background image), **Copy link** (a shareable URL encoding the preset, minus any image, for pasting to someone else), **Download image** (a PNG snapshot of the preview thumbnail), or **Delete**.
- **Import preset file…**: adds a shared `.json` preset. If it contains custom CSS you're asked to confirm first, since custom CSS can change anything on the page. Only import presets from people you trust. Opening someone's shared preset link works the same way — you're asked to confirm before it's added.
- **Randomize**: generates a coherent random theme — palette, background, an effect layer roughly half the time, shape, and fonts — as a quick source of inspiration.
- **Starter themes**: Midnight Glass, Deep Space, Synthwave, Cosmic Workshop (scrolling gradient, shader, notebook particles, and event effects), Ocean Liquid, Paper, Cyberpunk HUD, Windows 98, Hacker Terminal, Glassmorphism, Vaporwave, Brutalist Web, Material Hologram, Everything Is Alive, Windows 7, and Windows 10. Applying one replaces your current theme (use Undo to go back).

### CSS tab

An advanced escape hatch: CSS typed here is applied after every other style, as you type. Use your browser's inspector (F12) to find class names. If something breaks, clear the box or use safe mode.

### Advanced: editing settings as JSON

All of this is stored under **Settings → Settings Editor → Theme Studio**. The panel is a friendlier front end for the same values.

## Contributing

If you would like to contribute to this extension, please refer to the [Contributing Guide](CONTRIBUTING.md).

## AI Coding Assistant Support

This project includes an `AGENTS.md` file with coding standards and best practices for JupyterLab extension development. The file follows the [AGENTS.md standard](https://agents.md) for cross-tool compatibility.

### Compatible AI Tools

`AGENTS.md` works with AI coding assistants that support the standard, including Cursor, GitHub Copilot, Windsurf, Aider, and others. For a current list of compatible tools, see [the AGENTS.md standard](https://agents.md).
This project also includes symlinks for tool-specific compatibility:

- `CLAUDE.md` → `AGENTS.md` (for Claude Code)

Other conventions you might encounter:

- `.cursorrules` - Cursor's YAML/JSON format (Cursor also supports AGENTS.md natively)
- `CONVENTIONS.md` / `CONTRIBUTING.md` - For CodeConventions.ai and GitHub bots
- Project-specific rules in JetBrains AI Assistant settings

All tool-specific files should be symlinks to `AGENTS.md` as the single source of truth.

### What's Included

The `AGENTS.md` file provides guidance on:

- Code quality rules and file-scoped validation commands
- Naming conventions for packages, plugins, and files
- Coding standards (TypeScript)
- Development workflow and debugging
- Common pitfalls and how to avoid them

### Customization

You can edit `AGENTS.md` to add project-specific conventions or adjust guidelines to match your team's practices. The file uses plain Markdown with Do/Don't patterns and references to actual project files.

**Note**: `AGENTS.md` is living documentation. Update it when you change conventions, add dependencies, or discover new patterns. Include `AGENTS.md` updates in commits that modify workflows or coding standards.
