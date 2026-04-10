# Style Tiptap UI Components

### [](#add-styles)Add Styles

Component styles are written in SCSS. The SCSS compiler (`sass` or `sass-embedded`) is installed automatically when you install a component or template using the Tiptap CLI. If you follow a manual setup, you'll need to install it manually.

### Styles are added automatically

When you install your first Tiptap UI Component, the CLI automatically injects the required `.scss` imports into your project’s global stylesheet. In most cases, **no manual setup is needed**.

### Bun projects automatically convert SCSS to CSS

If you’re using **Bun**, the CLI converts all `.scss` files into `.css` files at install time and updates the imports accordingly. Your project will use:

```
@import './styles/_variables.css';
@import './styles/_keyframe-animations.css';
```

#### [](#where-styles-are-imported)Where Styles Are Imported

The CLI injects these imports into your global stylesheet:

```
@import '<path-to-styles>/_variables.scss';
@import '<path-to-styles>/_keyframe-animations.scss';
```

If you use a custom entry stylesheet, make sure the imports exist there.

#### [](#framework-specific-setup)Framework-Specific Setup

Below are the locations where the CLI adds the global stylesheet imports for each framework.

#### [](#nextjs-app-router)Next.js (App Router)

Injected into one of:

-   `app/globals.css`
-   `src/app/globals.css`

File: `app/globals.css` or `src/app/globals.css`

```
@import '<path-to-styles>/_variables.scss';
@import '<path-to-styles>/_keyframe-animations.scss';
```

#### [](#vite-react)Vite + React

Injected into:

-   `src/index.css`

File: `src/index.css`

```
@import '<path-to-styles>/_variables.scss';
@import '<path-to-styles>/_keyframe-animations.scss';
```

Paths may differ slightly depending on your project structure.

#### [](#astro)Astro

Injected into your global stylesheet, typically:

-   `src/styles/global.css` or whatever file you’ve designated as a global stylesheet

File: `src/styles/global.css` (or your custom entry)

```
@import '<path-to-styles>/_variables.scss';
@import '<path-to-styles>/_keyframe-animations.scss';
```

#### [](#laravel-vite)Laravel (Vite)

Injected into:

-   `resources/css/app.css`

File: `resources/css/app.css`

```
@import '<path-to-styles>/_variables.scss';
@import '<path-to-styles>/_keyframe-animations.scss';
```

#### [](#react-router-vanilla-react)React Router (Vanilla React)

Injected into:

-   `src/index.css`

File: `src/index.css`

```
@import '<path-to-styles>/_variables.scss';
@import '<path-to-styles>/_keyframe-animations.scss';
```