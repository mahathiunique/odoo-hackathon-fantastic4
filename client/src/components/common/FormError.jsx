export default function FormError({error}){return error?<span className="mt-1 block text-xs text-red-600">{error.message||error}</span>:null}
