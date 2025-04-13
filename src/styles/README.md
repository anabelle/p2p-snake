# SCSS Architecture

This project uses a 7-1 pattern (adapted) for organizing SCSS files. The structure is organized to promote maintainability, reusability, and scalability.

## Directory Structure

```
styles/
│
├── abstracts/            # Variables, mixins, functions
│   ├── _variables.scss   # All variables
│   ├── _animations.scss  # Animation keyframes and settings
│   └── _index.scss       # Forwards all abstract modules
│
├── base/                 # Base styles
│   └── _reset.scss       # Reset/normalize and basic element styles
│
├── components/           # Component-specific styles
│   ├── _accessibility.scss # Accessibility related styles
│   ├── _badges.scss      # Game status badges
│   ├── _modal.scss       # Profile modal styles
│   ├── _snake-info.scss  # Snake game specific elements
│   ├── _tables.scss      # Table styles
│   └── _typography.scss  # Typography styles
│
├── layout/               # Layout components
│   └── _containers.scss  # Game container, canvas, and layout
│
└── main.scss             # Main file that imports all other files
```

## Features

### Modern SCSS Module System

This project uses the modern SCSS module system with `@use` and `@forward` instead of the deprecated `@import` rule:

```scss
// Using namespaced imports for clarity
@use '../abstracts/variables' as vars;

.some-element {
  color: vars.$primary-color;
}

// Forwarding modules to make their APIs available
@forward 'variables';
```

### Variables

All values are stored as variables in `abstracts/_variables.scss` to ensure consistency and make theme updates easier.

### Accessibility

This project includes an accessibility feature for users who prefer reduced motion:

```scss
@include vars.reduced-motion {
  :root {
    --duration-fast: 0s;
    --duration-normal: 0s;
    --duration-slow: 0s;
    --duration-spin: 0s;
  }
}
```

This sets all animation durations to 0 seconds when a user has the "prefers-reduced-motion" setting enabled in their operating system.

### Responsive Design

Mixins for responsive design are included to make the media queries consistent throughout the application:

```scss
@mixin mobile {
  @media (max-width: $mobile-breakpoint) {
    @content;
  }
}

@mixin desktop {
  @media (min-width: $desktop-breakpoint) {
    @content;
  }
}
```

## Usage

To use this SCSS architecture:

1. Import the main SCSS file in your application:

```jsx
import './styles/main.scss';
```

2. When adding new styles:

   - Add component-specific styles to the appropriate file in the `components/` directory
   - Add layout styles to the appropriate file in the `layout/` directory
   - Add new variables to `abstracts/_variables.scss`
   - Add new animations to `abstracts/_animations.scss`
   - Add new mixins or functions to the appropriate file in the `abstracts/` directory

3. When adding new SCSS files:
   - Use the `@use` directive to import dependencies
   - Use namespaced imports for clarity (e.g., `@use '../abstracts/variables' as vars;`)
   - If creating a new module with APIs to be used elsewhere, create an `_index.scss` file in that directory that forwards the module interfaces
