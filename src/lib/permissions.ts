import { UserProfile, UserRole } from './types';

// The hierarchy levels for our EMR system
// Higher number = More access (Admin can do what Doctor does, etc.)
const ROLE_HIERARCHY: Record<UserRole | 'super-admin', number> = {
    'super-admin': 100, // Developer/Owner
    'admin': 4,         // Clinic Owner / Manager
    'doctor': 3,        // Clinician / Physician
    'receptionist': 2,  // Front Desk / Intake
    'patient': 1,       // End User
};

/**
 * RBAC Helper: Check if a user meets or exceeds a required role level.
 * @param userRole The role of the currently logged-in user
 * @param requiredRole The minimum role required to perform the action
 * @returns boolean
 */
export const hasPermission = (userRole: UserRole | string | undefined, requiredRole: UserRole | 'super-admin'): boolean => {
    if (!userRole) return false;

    // Cast to string to safely check the hierarchy
    const userLevel = ROLE_HIERARCHY[userRole as UserRole | 'super-admin'] || 0;
    const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;

    return userLevel >= requiredLevel;
};

/**
 * Example wrapper component that can be used directly in JSX
 * to conditionally render elements based on user role.
 */
export function hasExactRole(userRole: UserRole | string | undefined, specificRoles: UserRole[]) {
    if (!userRole) return false;
    return specificRoles.includes(userRole as UserRole);
}
