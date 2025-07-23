# Project Structure

```
src/
├── components/
│   ├── admin/          # Admin-only components (LocationManagement)
│   ├── audit/          # Audit log viewing (AuditLogPage)
│   ├── auth/           # Authentication & authorization (AuthProvider, LoginPage, RoleSelection)
│   ├── dashboard/      # Main dashboard (Dashboard)
│   ├── global/         # Global inventory view (GlobalView)
│   ├── items/          # Item management (ItemsPage, AddItemDialog, EditItemDialog)
│   ├── layout/         # Layout components (Layout, Sidebar, MobileNav)
│   ├── locations/      # Location management (LocationsPage, LocationDetail, AddLocationDialog, AddInventoryDialog)
│   └── ui/             # Reusable UI components (shadcn/ui based)
├── hooks/              # Custom React hooks (use-toast)
├── lib/                # Utilities and configurations
│   ├── auditLog.ts     # Audit logging functions
│   ├── supabase.ts     # Database client & types
│   └── utils.ts        # General utilities (cn function for class merging)
├── i18n/               # Internationalization setup
├── App.tsx             # Main application component with routing
└── index.tsx           # React entry point
```

## Key Architectural Patterns
- **Component-based**: Organized by feature/domain
- **Context API**: Used for authentication state management
- **Protected Routes**: Role-based access control implemented in routing
- **Custom Hooks**: Reusable stateful logic (toast notifications)
- **TypeScript**: Strict typing throughout the application
- **Atomic Design**: UI components follow atomic design principles