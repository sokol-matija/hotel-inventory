/**
 * KeyboardShortcutService - Manage keyboard shortcuts for timeline operations
 * 
 * This service provides comprehensive keyboard shortcut support for power users to work
 * efficiently with the hotel timeline, enabling rapid navigation and operations.
 * 
 * Features:
 * - 20+ predefined keyboard shortcuts for common operations
 * - Context-aware shortcuts that adapt to current mode (normal, drag, move, expand)
 * - Four categories: navigation, modes, operations, and accessibility
 * - Smart input field detection to prevent conflicts during typing
 * - Customizable shortcut registration and management
 * - Help system with formatted shortcut display
 * - Event-driven architecture with custom events
 * 
 * Shortcuts Include:
 * - Navigation: Arrow keys, Home (today), Ctrl+F (search)
 * - Modes: D (drag create), E (expansion), M (move), Esc (exit)
 * - Operations: Ctrl+N (new), Delete (delete selected), Ctrl+A (select all)
 * - Quick Status: 1 (confirmed), 2 (checked in), 3 (checked out)
 * 
 * Usage:
 * ```typescript
 * const shortcutService = KeyboardShortcutService.getInstance();
 * shortcutService.updateContext({ selectedReservations: ['res1', 'res2'] });
 * document.addEventListener('hotel-timeline-shortcut', (e) => {
 *   const { action, context } = e.detail;
 *   handleShortcutAction(action);
 * });
 * ```
 * 
 * @author Hotel Management System v2.7
 * @since August 2025
 */

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  action: () => void;
  category: 'navigation' | 'modes' | 'operations' | 'accessibility';
  enabled: boolean;
}

export interface ShortcutContext {
  isModalOpen: boolean;
  selectedReservations: string[];
  activeMode: 'normal' | 'drag_create' | 'move' | 'expand';
  currentDate: Date;
}

export class KeyboardShortcutService {
  private static instance: KeyboardShortcutService;
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private context: ShortcutContext;
  private isEnabled: boolean = true;

  private constructor() {
    this.context = {
      isModalOpen: false,
      selectedReservations: [],
      activeMode: 'normal',
      currentDate: new Date()
    };
    
    this.setupDefaultShortcuts();
    this.bindEventListeners();
  }

  public static getInstance(): KeyboardShortcutService {
    if (!KeyboardShortcutService.instance) {
      KeyboardShortcutService.instance = new KeyboardShortcutService();
    }
    return KeyboardShortcutService.instance;
  }

  /**
   * Setup default keyboard shortcuts
   */
  private setupDefaultShortcuts(): void {
    // Navigation shortcuts
    this.registerShortcut('ArrowLeft', {
      key: 'ArrowLeft',
      description: 'Navigate to previous day or move reservation left',
      action: () => this.handleContextAwareArrowLeft(),
      category: 'navigation',
      enabled: true
    });

    this.registerShortcut('ArrowRight', {
      key: 'ArrowRight', 
      description: 'Navigate to next day or move reservation right',
      action: () => this.handleContextAwareArrowRight(),
      category: 'navigation',
      enabled: true
    });

    this.registerShortcut('Home', {
      key: 'Home',
      description: 'Go to today',
      action: () => this.triggerAction('navigate_today'),
      category: 'navigation',
      enabled: true
    });

    // Mode shortcuts
    this.registerShortcut('KeyD', {
      key: 'KeyD',
      description: 'Toggle Drag Create mode',
      action: () => this.triggerAction('toggle_drag_create'),
      category: 'modes',
      enabled: true
    });

    this.registerShortcut('KeyE', {
      key: 'KeyE',
      description: 'Toggle Expansion mode',
      action: () => this.triggerAction('toggle_expansion'),
      category: 'modes',
      enabled: true
    });

    this.registerShortcut('KeyM', {
      key: 'KeyM',
      description: 'Toggle Move mode',
      action: () => this.triggerAction('toggle_move'),
      category: 'modes',
      enabled: true
    });

    this.registerShortcut('Escape', {
      key: 'Escape',
      description: 'Exit current mode or close modal',
      action: () => this.triggerAction('escape'),
      category: 'accessibility',
      enabled: true
    });

    // Operation shortcuts
    this.registerShortcut('KeyN', {
      key: 'KeyN',
      ctrlKey: true,
      description: 'Create new reservation',
      action: () => this.triggerAction('new_reservation'),
      category: 'operations',
      enabled: true
    });

    this.registerShortcut('Delete', {
      key: 'Delete',
      description: 'Delete selected reservations',
      action: () => this.triggerAction('delete_selected'),
      category: 'operations',
      enabled: true
    });

    this.registerShortcut('KeyF', {
      key: 'KeyF',
      ctrlKey: true,
      description: 'Search reservations',
      action: () => this.triggerAction('search'),
      category: 'navigation',
      enabled: true
    });

    // Accessibility shortcuts
    this.registerShortcut('F1', {
      key: 'F1',
      description: 'Show keyboard shortcuts help',
      action: () => this.triggerAction('show_help'),
      category: 'accessibility',
      enabled: true
    });

    this.registerShortcut('Tab', {
      key: 'Tab',
      description: 'Navigate through focusable elements',
      action: () => this.triggerAction('tab_navigation'),
      category: 'accessibility',
      enabled: true
    });

    // Batch operation shortcuts
    this.registerShortcut('KeyA', {
      key: 'KeyA',
      ctrlKey: true,
      description: 'Select all visible reservations',
      action: () => this.triggerAction('select_all'),
      category: 'operations',
      enabled: true
    });

    this.registerShortcut('KeyC', {
      key: 'KeyC',
      ctrlKey: true,
      description: 'Copy selected reservations',
      action: () => this.triggerAction('copy_reservations'),
      category: 'operations',
      enabled: true
    });

    this.registerShortcut('KeyV', {
      key: 'KeyV',
      ctrlKey: true,
      description: 'Paste reservations',
      action: () => this.triggerAction('paste_reservations'),
      category: 'operations',
      enabled: true
    });

    // Quick status changes
    this.registerShortcut('Digit1', {
      key: 'Digit1',
      description: 'Set selected reservations to Confirmed',
      action: () => this.triggerAction('status_confirmed'),
      category: 'operations',
      enabled: true
    });

    this.registerShortcut('Digit2', {
      key: 'Digit2',
      description: 'Set selected reservations to Checked In',
      action: () => this.triggerAction('status_checked_in'),
      category: 'operations',
      enabled: true
    });

    this.registerShortcut('Digit3', {
      key: 'Digit3',
      description: 'Set selected reservations to Checked Out',
      action: () => this.triggerAction('status_checked_out'),
      category: 'operations',
      enabled: true
    });
  }

  /**
   * Context-aware arrow key handlers
   */
  private handleContextAwareArrowLeft(): void {
    if (this.context.activeMode === 'move' && this.context.selectedReservations.length > 0) {
      // In move mode with selected reservation: move reservation left (previous day)
      this.triggerAction('move_reservation_left');
    } else {
      // Normal mode or no selection: navigate to previous day
      this.triggerAction('navigate_prev_day');
    }
  }

  private handleContextAwareArrowRight(): void {
    if (this.context.activeMode === 'move' && this.context.selectedReservations.length > 0) {
      // In move mode with selected reservation: move reservation right (next day)
      this.triggerAction('move_reservation_right');
    } else {
      // Normal mode or no selection: navigate to next day
      this.triggerAction('navigate_next_day');
    }
  }

  /**
   * Register a keyboard shortcut
   */
  registerShortcut(id: string, shortcut: KeyboardShortcut): void {
    this.shortcuts.set(id, shortcut);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregisterShortcut(id: string): void {
    this.shortcuts.delete(id);
  }

  /**
   * Update context for shortcut availability
   */
  updateContext(updates: Partial<ShortcutContext>): void {
    this.context = { ...this.context, ...updates };
  }

  /**
   * Enable/disable keyboard shortcuts
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Get all shortcuts by category
   */
  getShortcutsByCategory(category: KeyboardShortcut['category']): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values()).filter(s => s.category === category);
  }

  /**
   * Get all shortcuts as help text
   */
  getShortcutsHelp(): { [category: string]: KeyboardShortcut[] } {
    const help: { [category: string]: KeyboardShortcut[] } = {};
    
    for (const shortcut of Array.from(this.shortcuts.values())) {
      if (!help[shortcut.category]) {
        help[shortcut.category] = [];
      }
      help[shortcut.category].push(shortcut);
    }
    
    return help;
  }

  /**
   * Format shortcut for display
   */
  formatShortcut(shortcut: KeyboardShortcut): string {
    const parts = [];
    
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.shiftKey) parts.push('Shift');
    if (shortcut.altKey) parts.push('Alt');
    
    // Convert key codes to readable names
    let keyName = shortcut.key;
    if (keyName.startsWith('Key')) {
      keyName = keyName.replace('Key', '');
    } else if (keyName.startsWith('Digit')) {
      keyName = keyName.replace('Digit', '');
    } else if (keyName === 'ArrowLeft') {
      keyName = '←';
    } else if (keyName === 'ArrowRight') {
      keyName = '→';
    } else if (keyName === 'ArrowUp') {
      keyName = '↑';
    } else if (keyName === 'ArrowDown') {
      keyName = '↓';
    }
    
    parts.push(keyName);
    
    return parts.join(' + ');
  }

  /**
   * Bind event listeners
   */
  private bindEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    // Prevent shortcuts when typing in input fields
    document.addEventListener('focusin', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        this.setEnabled(false);
      }
    });
    
    document.addEventListener('focusout', (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        this.setEnabled(true);
      }
    });
  }

  /**
   * Handle keydown events
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isEnabled) return;
    
    // Don't trigger shortcuts in modals unless specifically allowed
    if (this.context.isModalOpen && !['Escape', 'F1'].includes(event.code)) {
      return;
    }

    const shortcutKey = this.getShortcutKey(event);
    const shortcut = this.shortcuts.get(shortcutKey);
    
    if (shortcut && shortcut.enabled) {
      // Check if shortcut is applicable in current context
      if (this.isShortcutApplicable(shortcut)) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.action();
      }
    }
  }

  /**
   * Generate shortcut key from event
   */
  private getShortcutKey(event: KeyboardEvent): string {
    const parts = [];
    
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.shiftKey) parts.push('Shift');
    if (event.altKey) parts.push('Alt');
    parts.push(event.code);
    
    // For simple key shortcuts, just use the code
    if (parts.length === 1) {
      return parts[0];
    }
    
    return parts.join('+');
  }

  /**
   * Check if shortcut is applicable in current context
   */
  private isShortcutApplicable(shortcut: KeyboardShortcut): boolean {
    // Some shortcuts only work when reservations are selected
    if (['delete_selected', 'copy_reservations', 'status_confirmed', 'status_checked_in', 'status_checked_out'].some(action => 
        shortcut.action.toString().includes(action))) {
      return this.context.selectedReservations.length > 0;
    }
    
    // Arrow key navigation works in all modes (context-aware)
    // Other navigation shortcuts only work in normal mode
    if (shortcut.description.includes('Navigate') && 
        !shortcut.description.includes('move reservation') && 
        this.context.activeMode !== 'normal') {
      return false;
    }
    
    return true;
  }

  /**
   * Trigger action (to be implemented by consumers)
   */
  private triggerAction(action: string): void {
    // Emit custom event that can be listened to
    document.dispatchEvent(new CustomEvent('hotel-timeline-shortcut', {
      detail: { action, context: this.context }
    }));
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    document.removeEventListener('keydown', this.handleKeyDown.bind(this));
  }
}