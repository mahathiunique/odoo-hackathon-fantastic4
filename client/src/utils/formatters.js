export const dateFormat=v=>v?new Intl.DateTimeFormat('en-IN',{dateStyle:'medium'}).format(new Date(v)):'—';
export const money=v=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(v||0);
