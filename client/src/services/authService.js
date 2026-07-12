import {users} from '../mock/data'; import {delay} from './store';
// Temporary mock authentication. Server-side identity and authorization replace this in a later phase.
export const authService={async login(email,password){await delay(500);const user=users.find(u=>u.email.toLowerCase()===email.toLowerCase()&&u.password===password);if(!user)throw new Error('Email or password is incorrect');const {password:_,...safe}=user;return{success:true,data:safe}},logout(){localStorage.removeItem('assetflow_user')}};
