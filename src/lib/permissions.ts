// Role-based permissions utility for the hotel inventory system
// This defines what each role can do in the application

export type Role = 'admin' | 'reception' | 'kitchen' | 'housekeeping' | 'bookkeeping';

export interface UserPermissions {
  // Dashboard access
  canViewDashboard: boolean;
  
  // Locations
  canViewLocations: boolean;
  canAddLocation: boolean;
  canEditLocation: boolean;
  canDeleteLocation: boolean;
  
  // Items management
  canViewItems: boolean;
  canAddItem: boolean;
  canEditItem: boolean;
  canDeleteItem: boolean;
  
  // Inventory management
  canViewInventory: boolean;
  canAddInventory: boolean;
  canEditInventory: boolean;
  canDeleteInventory: boolean;
  canModifyQuantity: boolean;
  
  // Global view
  canViewGlobalInventory: boolean;
  
  // Settings
  canViewSettings: boolean;
  canEditSettings: boolean;
  
  // Admin functions
  canManageLocations: boolean;
  canViewAuditLogs: boolean;
  canManageUsers: boolean;
}

// Define permissions for each role
const rolePermissions: Record<Role, UserPermissions> = {
  admin: {
    // Admin has full access to everything
    canViewDashboard: true,
    canViewLocations: true,
    canAddLocation: true,
    canEditLocation: true,
    canDeleteLocation: true,
    canViewItems: true,
    canAddItem: true,
    canEditItem: true,
    canDeleteItem: true,
    canViewInventory: true,
    canAddInventory: true,
    canEditInventory: true,
    canDeleteInventory: true,
    canModifyQuantity: true,
    canViewGlobalInventory: true,
    canViewSettings: true,
    canEditSettings: true,
    canManageLocations: true,
    canViewAuditLogs: true,
    canManageUsers: true,
  },
  
  reception: {
    // Reception can view most things and manage basic inventory
    canViewDashboard: true,
    canViewLocations: true,
    canAddLocation: false,
    canEditLocation: false,
    canDeleteLocation: false,
    canViewItems: true,
    canAddItem: false,
    canEditItem: false,
    canDeleteItem: false,
    canViewInventory: true,
    canAddInventory: true,
    canEditInventory: true,
    canDeleteInventory: false,
    canModifyQuantity: true,
    canViewGlobalInventory: true,
    canViewSettings: true,
    canEditSettings: true,
    canManageLocations: false,
    canViewAuditLogs: false,
    canManageUsers: false,
  },
  
  kitchen: {
    // Kitchen staff can manage items and inventory they need for cooking
    canViewDashboard: true,
    canViewLocations: true,
    canAddLocation: false,
    canEditLocation: false,
    canDeleteLocation: false,
    canViewItems: true,
    canAddItem: true,
    canEditItem: true,
    canDeleteItem: false,
    canViewInventory: true,
    canAddInventory: true,
    canEditInventory: true,
    canDeleteInventory: true,
    canModifyQuantity: true,
    canViewGlobalInventory: true,
    canViewSettings: true,
    canEditSettings: true,
    canManageLocations: false,
    canViewAuditLogs: false,
    canManageUsers: false,
  },
  
  housekeeping: {
    // Housekeeping can view inventory and modify cleaning supplies
    canViewDashboard: true,
    canViewLocations: true,
    canAddLocation: false,
    canEditLocation: false,
    canDeleteLocation: false,
    canViewItems: true,
    canAddItem: false,
    canEditItem: false,
    canDeleteItem: false,
    canViewInventory: true,
    canAddInventory: true,
    canEditInventory: true,
    canDeleteInventory: false,
    canModifyQuantity: true,
    canViewGlobalInventory: true,
    canViewSettings: true,
    canEditSettings: true,
    canManageLocations: false,
    canViewAuditLogs: false,
    canManageUsers: false,
  },
  
  bookkeeping: {
    // Bookkeeping has mostly read-only access for financial tracking
    canViewDashboard: true,
    canViewLocations: true,
    canAddLocation: false,
    canEditLocation: false,
    canDeleteLocation: false,
    canViewItems: true,
    canAddItem: false,
    canEditItem: false,
    canDeleteItem: false,
    canViewInventory: true,
    canAddInventory: false,
    canEditInventory: false,
    canDeleteInventory: false,
    canModifyQuantity: false,
    canViewGlobalInventory: true,
    canViewSettings: true,
    canEditSettings: true,
    canManageLocations: false,
    canViewAuditLogs: false,
    canManageUsers: false,
  },
};

/**
 * Get permissions for a specific role
 * @param role - The user's role
 * @returns UserPermissions object for the role
 */
export function getPermissions(role: Role): UserPermissions {
  return rolePermissions[role];
}

/**
 * Check if a role has a specific permission
 * @param role - The user's role
 * @param permission - The permission to check
 * @returns boolean indicating if the role has the permission
 */
export function hasPermission(role: Role, permission: keyof UserPermissions): boolean {
  return rolePermissions[role][permission];
}

/**
 * Check if a role can modify inventory (add/edit/quantity changes)
 * @param role - The user's role
 * @returns boolean indicating if the role can modify inventory
 */
export function canModifyInventory(role: Role): boolean {
  const permissions = getPermissions(role);
  return permissions.canAddInventory || permissions.canEditInventory || permissions.canModifyQuantity;
}

/**
 * Check if a role can manage items (add/edit/delete)
 * @param role - The user's role
 * @returns boolean indicating if the role can manage items
 */
export function canManageItems(role: Role): boolean {
  const permissions = getPermissions(role);
  return permissions.canAddItem || permissions.canEditItem || permissions.canDeleteItem;
}

/**
 * Get list of roles that have access to a specific feature
 * @param permission - The permission to check
 * @returns Array of roles that have this permission
 */
export function getRolesWithPermission(permission: keyof UserPermissions): Role[] {
  return (Object.keys(rolePermissions) as Role[]).filter(role => 
    rolePermissions[role][permission]
  );
}

// Helper function to check if a user profile has a specific permission
export function userHasPermission(userProfile: any, permission: keyof UserPermissions): boolean {
  if (!userProfile?.role?.name) return false;
  return hasPermission(userProfile.role.name as Role, permission);
} 