import { supabase } from './supabase'
export type ItemType='file'|'note'|'prompt'|'link'
export const library={
 projects:()=>supabase.from('projects').select('*').order('updated_at',{ascending:false}),
 items:(type?:ItemType)=>{let q=supabase.from('items').select('*').order('updated_at',{ascending:false});return type?q.eq('type',type):q},
 createProject:(name:string,description='')=>supabase.from('projects').insert({name,description}).select().single(),
 createItem:(data:{type:ItemType,title:string;content?:string;url?:string;project_id?:string})=>supabase.from('items').insert(data).select().single(),
 upload:async(file:File,projectId?:string)=>{const {data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('يجب تسجيل الدخول');const path=user.id+'/'+crypto.randomUUID()+'-'+file.name;const up=await supabase.storage.from('library').upload(path,file);if(up.error)throw up.error;return supabase.from('items').insert({type:'file',title:file.name,storage_path:path,mime_type:file.type,size_bytes:file.size,project_id:projectId||null}).select().single()},
 search:(term:string)=>supabase.from('items').select('*').or(`title.ilike.%${term}%,content.ilike.%${term}%`).order('updated_at',{ascending:false})
}
