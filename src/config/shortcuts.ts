/**
 * Shortcuts this app defines, then the ones the browser and the controls give
 * for free. Listed by the help menu and the guide, so they cannot disagree.
 */
export const SHORTCUTS = [
  { keys: ['/'], action: 'search' },
  { keys: ['?'], action: 'help' },
  { keys: ['Ctrl', 'Z'], action: 'undo' },
  { keys: ['Ctrl', 'Y'], action: 'redo' },
  { keys: ['Ctrl', 'Enter'], action: 'register' },
  { keys: ['Enter'], action: 'submit' },
  { keys: ['Esc'], action: 'close' },
  { keys: ['A–Z'], action: 'jump' },
  { keys: ['↑', '↓'], action: 'navigate' },
  { keys: ['Tab'], action: 'focus' },
] as const;
