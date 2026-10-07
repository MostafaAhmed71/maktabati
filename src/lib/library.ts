import {supabase} from './supabase'
export type ItemType='file'|'note'|'prompt'|'link'
export const library={
 projects:()=>supabase.from('projects').select('*').order('updated_at',{ascending:false}),
 items:(type?:ItemType)=>{let q=supabase.from('items').select('*').is('deleted_at',null).order('updated_at',{ascending:false});return type?q.eq('type',type):q},
 createProject:(name:string,description='',links?:{github_url?:string;vercel_url?:string;local_path?:string})=>supabase.from('projects').insert({name,description,...links}).select().single(),
 updateProject:(id:string,data:Record<string,unknown>)=>supabase.from('projects').update({...data,updated_at:new Date().toISOString()}).eq('id',id).select().single(),
 createItem:(data:{type:ItemType,title:string;content?:string;url?:string;project_id?:string})=>supabase.from('items').insert(data).select().single(),
 updateItem:(id:string,data:Record<string,unknown>)=>supabase.from('items').update({...data,updated_at:new Date().toISOString()}).eq('id',id).select().single(),
 trashItem:(id:string)=>supabase.from('items').update({deleted_at:new Date().toISOString()}).eq('id',id),
 restoreItem:(id:string)=>supabase.from('items').update({deleted_at:null}).eq('id',id),
 trash:()=>supabase.from('items').select('*').not('deleted_at','is',null).order('deleted_at',{ascending:false}),
 upload:async(file:File,projectId?:string)=>{const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('يجب تسجيل الدخول');const path=user.id+'/'+crypto.randomUUID()+'-'+file.name;const up=await supabase.storage.from('library').upload(path,file);if(up.error)throw up.error;return supabase.from('items').insert({type:'file',title:file.name,storage_path:path,mime_type:file.type,size_bytes:file.size,project_id:projectId||null}).select().single()},
 replaceFile:async(item:any,file:File)=>{const{data:{user}}=await supabase.auth.getUser();if(!user)throw new Error('يجب تسجيل الدخول');if(item.storage_path)await supabase.from('file_versions').insert({item_id:item.id,version:item.version||1,storage_path:item.storage_path,mime_type:item.mime_type,size_bytes:item.size_bytes});const next=(item.version||1)+1;const path=user.id+'/'+crypto.randomUUID()+'-'+file.name;const up=await supabase.storage.from('library').upload(path,file);if(up.error)throw up.error;return supabase.from('items').update({title:file.name,storage_path:path,mime_type:file.type,size_bytes:file.size,version:next,updated_at:new Date().toISOString()}).eq('id',item.id).select().single()},
 search:(term:string)=>supabase.from('items').select('*').is('deleted_at',null).or(`title.ilike.%${term}%,content.ilike.%${term}%`).order('updated_at',{ascending:false})
}