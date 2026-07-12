import {Navigate,Route,Routes} from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import RoleGuard from '../components/auth/RoleGuard';
import DashboardLayout from '../components/layout/DashboardLayout';
import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import ModuleListPage from '../pages/ModuleListPage';
import ModuleFormPage from '../pages/ModuleFormPage';
import ModuleDetailsPage from '../pages/ModuleDetailsPage';
import NotificationsPage from '../pages/notifications/NotificationsPage';
import ProfilePage from '../pages/profile/ProfilePage';
import ActivityLogPage from '../pages/activity/ActivityLogPage';
import UnauthorizedPage from '../pages/UnauthorizedPage';
import NotFoundPage from '../pages/NotFoundPage';
import StatusBadge from '../components/common/StatusBadge';
import DepartmentListPage from '../pages/departments/DepartmentListPage';
import DepartmentFormPage from '../pages/departments/DepartmentFormPage';
import DepartmentDetailsPage from '../pages/departments/DepartmentDetailsPage';
import CategoryListPage from '../pages/categories/CategoryListPage';
import CategoryFormPage from '../pages/categories/CategoryFormPage';
import AllocationListPage from '../pages/allocations/AllocationListPage';
import AllocationFormPage from '../pages/allocations/AllocationFormPage';
import AllocationDetailsPage from '../pages/allocations/AllocationDetailsPage';
import MyAllocationsPage from '../pages/allocations/MyAllocationsPage';
// Stage 8 — Shared Resources and Resource Booking (real API-connected pages)
import ResourceListPage from '../pages/resources/ResourceListPage';
import ResourceFormPage from '../pages/resources/ResourceFormPage';
import ResourceDetailsPage from '../pages/resources/ResourceDetailsPage';
import BookingListPage from '../pages/bookings/BookingListPage';
import BookingFormPage from '../pages/bookings/BookingFormPage';
import BookingDetailsPage from '../pages/bookings/BookingDetailsPage';
import BookingCalendarPage from '../pages/bookings/BookingCalendarPage';
import MyBookingsPage from '../pages/bookings/MyBookingsPage';
import {employeeService,assetService,allocationService,resourceService,bookingService,maintenanceService} from '../services/entityServices';
import AuditListPage from '../pages/audits/AuditListPage';
import AuditFormPage from '../pages/audits/AuditFormPage';
import AuditDetailsPage from '../pages/audits/AuditDetailsPage';
import AuditReportPage from '../pages/audits/AuditReportPage';
import MyAuditsPage from '../pages/audits/MyAuditsPage';
import {userService} from '../services/userService';
import departmentService from '../services/departmentService';
import categoryService from '../services/categoryService';
import {codePattern,emailPattern} from '../utils/validators';

const ALL_ROLES=['Admin','Asset Manager','Maintenance Manager','Auditor','Employee'];
const badge=k=>({key:k,label:k.replace(/([A-Z])/g,' $1'),render:v=><StatusBadge status={v}/>});

// Generic mock-data modules that are not owned by Stage 8. Resources and bookings
// are intentionally excluded here — they use dedicated, backend-connected pages.
// Allocations use dedicated pages too.
const configs={
  employees:{title:'Employees',single:'Employee',description:'People directory and asset ownership context.',base:'/employees',service:employeeService,columns:[{key:'employeeId',label:'Employee ID'},{key:'name',label:'Name'},{key:'email',label:'Email'},{key:'designation',label:'Designation'},{key:'department',label:'Department'},badge('status')],fields:[['employeeId','Employee ID',1],['name','Full name',1],['email','Email',1,'email',null,emailPattern],['phone','Phone number'],['designation','Designation',1],['department','Department',1,'select',['Engineering','Finance','Operations','Facilities','People & Culture']],['joiningDate','Joining date',1,'date'],['status','Status',1,'select',['Active','Inactive']]]},
  assets:{title:'Assets',single:'Asset',description:'Track ownership, condition, assignment and lifecycle.',base:'/assets',service:assetService,columns:[{key:'assetTag',label:'Asset tag'},{key:'name',label:'Asset name'},{key:'category',label:'Category',render:v=>v?.name||'—'},{key:'department',label:'Department',render:v=>v?.name||'—'},{key:'assignedToEmployee',label:'Assigned to',render:v=>v?.name||'—'},{key:'currentLocation',label:'Location'},badge('condition'),badge('lifecycleStatus')],statusKey:'lifecycleStatus',fields:[['assetTag','Asset tag',1],['name','Asset name',1],['category','Category',1,'select',['Laptops','Monitors','Mobile Devices','Office Furniture','Network Equipment','Audio Visual','Vehicles','Tools & Equipment']],['serialNumber','Serial number',1],['manufacturer','Manufacturer'],['model','Model'],['department','Department',1,'select',['Engineering','Finance','Operations','Facilities','People & Culture']],['currentLocation','Current location',1],['condition','Condition',1,'select',['Excellent','Good','Fair','Damaged','Unusable']],['lifecycleStatus','Lifecycle status',1,'select',['Available','Reserved','Allocated','Under Maintenance','Lost','Retired','Disposed']],['purchaseDate','Purchase date',0,'date'],['warrantyExpiry','Warranty expiry',0,'date'],['description','Description',0,'textarea'],['notes','Notes',0,'textarea']]},
  maintenance:{title:'Maintenance requests',single:'Maintenance request',description:'Prioritize, approve and resolve asset issues.',base:'/maintenance',service:maintenanceService,columns:[{key:'requestNumber',label:'Request'},{key:'asset',label:'Asset'},{key:'issueTitle',label:'Issue'},badge('priority'),badge('requestStatus'),{key:'scheduledDate',label:'Scheduled'}],statusKey:'requestStatus',fields:[['asset','Asset',1,'select',['Dell Latitude 7440','MacBook Pro 14','ThinkPad X1 Carbon','Samsung ViewFinity S6']],['issueTitle','Issue title',1],['priority','Priority',1,'select',['Low','Medium','High','Critical']],['scheduledDate','Preferred date',0,'date'],['issueDescription','Issue description',1,'textarea']]},
  users:{title:'Users',single:'User',description:'Administer application roles and linked employee access.',base:'/users',service:userService,columns:[{key:'name',label:'Name'},{key:'email',label:'Email'},{key:'role',label:'Role'},{key:'status',label:'Status',render:v=><StatusBadge status={v}/>},{key:'lastLogin',label:'Last login',render:v=>v?new Date(v).toLocaleString():'Never'},{key:'createdAt',label:'Created',render:v=>new Date(v).toLocaleDateString()}],fields:[['name','Name',1],['email','Email',1,'email',null,emailPattern],['role','Role',1,'select',['Admin','Asset Manager','Maintenance Manager','Auditor','Employee']],['phone','Phone'],['status','Status',1,'select',['Active','Inactive']]]}
};
for(const c of Object.values(configs))c.fields=c.fields.map(([name,label,required,type,options,pattern])=>({name,label,required,type,options,pattern}));
const employeeDepartment=configs.employees.fields.find(field=>field.name==='department');employeeDepartment.options=[];employeeDepartment.loadOptions=()=>departmentService.getDepartmentOptions().then(items=>items.map(item=>({value:item.name,label:`${item.name} (${item.code})`})));
const assetDepartment=configs.assets.fields.find(field=>field.name==='department');assetDepartment.options=[];assetDepartment.loadOptions=employeeDepartment.loadOptions;
const assetCategory=configs.assets.fields.find(field=>field.name==='category');assetCategory.options=[];assetCategory.loadOptions=()=>categoryService.getCategoryOptions().then(items=>items.map(item=>({value:item.name,label:`${item.name} (${item.code})`})));

function Root(){const {user}=useAuth();return <Navigate to={user?'/dashboard':'/login'} replace/>}
const list=k=><ModuleListPage {...configs[k]}/>;
const form=k=><ModuleFormPage {...configs[k]} title={configs[k].single}/>;
const details=k=><ModuleDetailsPage {...configs[k]} title={configs[k].single}/>;

export default function AppRoutes(){
  return (
    <Routes>
      <Route path="/login" element={<LoginPage/>}/>
      <Route path="/" element={<Root/>}/>
      <Route element={<ProtectedRoute><DashboardLayout/></ProtectedRoute>}>
        <Route path="unauthorized" element={<UnauthorizedPage/>}/>
        <Route path="dashboard" element={<RoleGuard><DashboardPage/></RoleGuard>}/>

        <Route path="departments">
          <Route index element={<DepartmentListPage/>}/>
          <Route path="new" element={<RoleGuard allowedRoles={['Admin']}><DepartmentFormPage/></RoleGuard>}/>
          <Route path=":id" element={<DepartmentDetailsPage/>}/>
          <Route path=":id/edit" element={<RoleGuard allowedRoles={['Admin']}><DepartmentFormPage/></RoleGuard>}/>
        </Route>

        <Route path="categories">
          <Route index element={<CategoryListPage/>}/>
          <Route path="new" element={<RoleGuard allowedRoles={['Admin','Asset Manager']}><CategoryFormPage/></RoleGuard>}/>
          <Route path=":id/edit" element={<RoleGuard allowedRoles={['Admin','Asset Manager']}><CategoryFormPage/></RoleGuard>}/>
        </Route>

        <Route path="audits">
          <Route index element={<RoleGuard allowedRoles={['Admin','Auditor','Asset Manager','Maintenance Manager']}><AuditListPage/></RoleGuard>}/>
          <Route path="new" element={<RoleGuard allowedRoles={['Admin']}><AuditFormPage/></RoleGuard>}/>
          <Route path=":id" element={<RoleGuard allowedRoles={['Admin','Auditor','Asset Manager','Maintenance Manager']}><AuditDetailsPage/></RoleGuard>}/>
          <Route path=":id/edit" element={<RoleGuard allowedRoles={['Admin']}><AuditFormPage/></RoleGuard>}/>
          <Route path=":id/report" element={<RoleGuard allowedRoles={['Admin','Auditor','Asset Manager','Maintenance Manager']}><AuditReportPage/></RoleGuard>}/>
        </Route>
        <Route path="my-audits" element={<RoleGuard allowedRoles={['Admin','Auditor']}><MyAuditsPage/></RoleGuard>}/>

        {Object.entries(configs).map(([k,c])=>(
          <Route key={k} path={c.base.slice(1)}>
            <Route index element={<RoleGuard>{list(k)}</RoleGuard>}/>
            <Route path="new" element={<RoleGuard>{form(k)}</RoleGuard>}/>
            <Route path=":id" element={<RoleGuard>{details(k)}</RoleGuard>}/>
            <Route path=":id/edit" element={<RoleGuard>{form(k)}</RoleGuard>}/>
          </Route>
        ))}

        {/* Stage 7 — Asset allocations */}
        <Route path="allocations">
          <Route index element={<RoleGuard allowedRoles={['Admin','Asset Manager','Maintenance Manager','Auditor']}><AllocationListPage/></RoleGuard>}/>
          <Route path="new" element={<RoleGuard allowedRoles={['Admin','Asset Manager']}><AllocationFormPage/></RoleGuard>}/>
          <Route path=":id" element={<RoleGuard allowedRoles={['Admin','Asset Manager','Maintenance Manager','Auditor']}><AllocationDetailsPage/></RoleGuard>}/>
        </Route>
        <Route path="my-allocations" element={<RoleGuard allowedRoles={['Employee']}><MyAllocationsPage/></RoleGuard>}/>

        {/* Stage 8 — Shared resources */}
        <Route path="resources">
          <Route index element={<RoleGuard allowedRoles={ALL_ROLES}><ResourceListPage/></RoleGuard>}/>
          <Route path="new" element={<RoleGuard allowedRoles={['Admin','Asset Manager']}><ResourceFormPage/></RoleGuard>}/>
          <Route path=":id" element={<RoleGuard allowedRoles={ALL_ROLES}><ResourceDetailsPage/></RoleGuard>}/>
          <Route path=":id/edit" element={<RoleGuard allowedRoles={['Admin','Asset Manager']}><ResourceFormPage/></RoleGuard>}/>
        </Route>

        {/* Stage 8 — Bookings */}
        <Route path="bookings">
          <Route index element={<RoleGuard allowedRoles={['Admin','Asset Manager','Maintenance Manager','Auditor']}><BookingListPage/></RoleGuard>}/>
          <Route path="new" element={<RoleGuard allowedRoles={['Admin','Asset Manager','Employee']}><BookingFormPage/></RoleGuard>}/>
          <Route path="calendar" element={<RoleGuard allowedRoles={ALL_ROLES}><BookingCalendarPage/></RoleGuard>}/>
          <Route path=":id" element={<RoleGuard allowedRoles={ALL_ROLES}><BookingDetailsPage/></RoleGuard>}/>
        </Route>
        <Route path="my-bookings" element={<RoleGuard allowedRoles={ALL_ROLES}><MyBookingsPage/></RoleGuard>}/>

        <Route path="notifications" element={<RoleGuard><NotificationsPage/></RoleGuard>}/>
        <Route path="activity" element={<RoleGuard allowedRoles={['Admin','Asset Manager','Maintenance Manager','Auditor']}><ActivityLogPage/></RoleGuard>}/>
        <Route path="profile" element={<RoleGuard><ProfilePage/></RoleGuard>}/>
      </Route>
      <Route path="*" element={<NotFoundPage/>}/>
    </Routes>
  );
}
