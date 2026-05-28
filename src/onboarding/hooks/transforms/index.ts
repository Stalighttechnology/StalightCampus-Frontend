/**
 * Barrel export for all per-role tutorial step transforms.
 *
 * `ROLE_TRANSFORM_MAP` routes a normalised role string to its transform function.
 * `applyRoleTransform` is the single entry-point used by useTutorial.ts.
 */

import { studentTransform } from './studentTransform';
import { facultyTransform } from './facultyTransform';
import { hodTransform } from './hodTransform';
import { adminTransform } from './adminTransform';
import { coeTransform } from './coeTransform';
import { deanTransform } from './deanTransform';
import { wardenTransform } from './wardenTransform';
import { feesManagerTransform } from './feesManagerTransform';
import { hmsTransform } from './hmsTransform';
import { transportAdminTransform } from './transportAdminTransform';

export { applyMobileLabels } from './mobileLabels';

/** Signature shared by every role transform function. */
export type RoleTransformFn = (step: any, isMobile: boolean) => any[] | null;

/**
 * Maps each known role (lowercase) to its dedicated transform function.
 * Roles that share the same sidebar layout point to the same function.
 */
export const ROLE_TRANSFORM_MAP: Record<string, RoleTransformFn> = {
  student: studentTransform,

  faculty: facultyTransform,
  teacher: facultyTransform,

  hod: hodTransform,

  admin: adminTransform,
  principal: adminTransform,

  coe: coeTransform,

  dean: deanTransform,

  feesmanager: feesManagerTransform,
  fees_manager: feesManagerTransform,

  warden: wardenTransform,
  hms: hmsTransform,
  hms_admin: hmsTransform,
  transport_admin: transportAdminTransform,
};

/**
 * Applies the correct role-specific transform to a single tour step.
 *
 * @returns An array of steps to push (may expand 1 sidebar step into many),
 *          or `null` if no role-specific rule matched (caller should fall
 *          through to the default handler).
 */
export function applyRoleTransform(
  step: any,
  isMobile: boolean,
  role: string,
): any[] | null {
  const transformFn = ROLE_TRANSFORM_MAP[role.toLowerCase()];
  if (!transformFn) return null;
  return transformFn(step, isMobile);
}
