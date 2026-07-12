export const ROLES=['Admin','Asset Manager','Maintenance Manager','Auditor','Employee'];
export const STATUS={asset:['Available','Reserved','Allocated','Under Maintenance','Lost','Retired','Disposed'],condition:['Excellent','Good','Fair','Damaged','Unusable'],general:['Active','Inactive','Pending','Confirmed','Completed','Cancelled','Submitted','Approved','Rejected','In Progress','Overdue','Verified','Discrepancy','Missing']};
export const ROLE_PATHS={
  Admin:['*'], 'Asset Manager':['/dashboard','/departments','/categories','/employees','/assets','/allocations','/resources','/bookings','/my-bookings','/notifications','/profile'],
  'Maintenance Manager':['/dashboard','/departments','/categories','/assets','/resources','/bookings','/maintenance','/notifications','/profile'], Auditor:['/dashboard','/departments','/categories','/assets','/resources','/bookings','/audits','/my-audits','/notifications','/profile'],
  Employee:['/dashboard','/departments','/categories','/assets','/resources','/bookings/new','/bookings/calendar','/my-bookings','/my-allocations','/maintenance/new','/notifications','/profile']
};
export const canAccess=(role,path)=>ROLE_PATHS[role]?.includes('*')||ROLE_PATHS[role]?.some(p=>path===p||path.startsWith(`${p}/`));
