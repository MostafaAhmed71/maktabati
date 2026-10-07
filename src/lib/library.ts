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
 versions:(itemId:string)=>supabase.from('file_versions').select('*').eq('item_id',itemId).order('version',{ascending:false}),
 restoreVersion:async(item:any,version:any)=>{if(item.storage_path)await supabase.from('file_versions').upsert({item_id:item.id,version:item.version||1,storage_path:item.storage_path,mime_type:item.mime_type,size_bytes:item.size_bytes},{onConflict:'item_id,version'});const next=(item.version||1)+1;return supabase.from('items').update({storage_path:version.storage_path,mime_type:version.mime_type,size_bytes:version.size_bytes,version:next,updated_at:new Date().toISOString()}).eq('id',item.id).select().single()},
 permanentDelete:async(item:any)=>{const paths:string[]=[];if(item.storage_path)paths.push(item.storage_path);const{data:vers}=await supabase.from('file_versions').select('storage_path').eq('item_id',item.id);for(const v of vers||[])if(v.storage_path)paths.push(v.storage_path);if(paths.length)await supabase.storage.from('library').remove([...new Set(paths)]);return supabase.from('items').delete().eq('id',item.id)},
 tags:()=>supabase.from('tags').select('*').order('name'),
 createTag:(name:string,color='#f97316')=>supabase.from('tags').insert({name,color}).select().single(),
 tagProject:(project_id:string,tag_id:string)=>supabase.from('project_tags').upsert({project_id,tag_id},{onConflict:'project_id,tag_id'}),
 untagProject:(project_id:string,tag_id:string)=>supabase.from('project_tags').delete().eq('project_id',project_id).eq('tag_id',tag_id),
 projectTags:(project_id:string)=>supabase.from('project_tags').select('tag_id,tags(*)').eq('project_id',project_id),
 tagItem:(item_id:string,tag_id:string)=>supabase.from('item_tags').upsert({item_id,tag_id},{onConflict:'item_id,tag_id'}),
 untagItem:(item_id:string,tag_id:string)=>supabase.from('item_tags').delete().eq('item_id',item_id).eq('tag_id',tag_id),
 itemTags:(item_id:string)=>supabase.from('item_tags').select('tag_id,tags(*)').eq('item_id',item_id),
 tasks:(projectId?:string)=>{let q=supabase.from('tasks').select('*').order('created_at',{ascending:false});return projectId?q.eq('project_id',projectId):q},
 createTask:(data:{title:string;description?:string;project_id?:string;priority?:string;due_at?:string})=>supabase.from('tasks').insert(data).select().single(),
 updateTask:(id:string,data:Record<string,unknown>)=>supabase.from('tasks').update({...data,updated_at:new Date().toISOString()}).eq('id',id).select().single(),
 deleteTask:(id:string)=>supabase.from('tasks').delete().eq('id',id),
 search:(term:string)=>supabase.from('items').select('*').is('deleted_at',null).or(`title.ilike.%${term}%,content.ilike.%${term}%`).order('updated_at',{ascending:false}),
 globalSearch:async(term:string)=>{
  const q=term.trim(); if(!q)return {projects:[],items:[],tasks:[],tags:[]};
  const [projects,items,tasks,tags]=await Promise.all([
   supabase.from('projects').select('*').or(`name.ilike.%${q}%,description.ilike.%${q}%`).order('updated_at',{ascending:false}).limit(12),
   supabase.from('items').select('*').is('deleted_at',null).or(`title.ilike.%${q}%,content.ilike.%${q}%`).order('updated_at',{ascending:false}).limit(12),
   supabase.from('tasks').select('*').or(`title.ilike.%${q}%,description.ilike.%${q}%`).order('updated_at',{ascending:false}).limit(12),
   supabase.from('tags').select('*').ilike('name',`%${q}%`).order('name').limit(12)
  ]);
  return {projects:projects.data||[],items:items.data||[],tasks:tasks.data||[],tags:tags.data||[]}
 },
 syncGithub:(username='MostafaAhmed71',github_token?:string)=>supabase.functions.invoke('github-sync',{body:{username,...(github_token?{github_token}:{})}}),
 syncProjectPreviews:()=>supabase.functions.invoke('sync-project-previews',{body:{}}),
 touchProject:(id:string)=>supabase.from('projects').update({last_accessed_at:new Date().toISOString()}).eq('id',id),
 activities:(limit=20)=>supabase.from('activity_log').select('*').order('created_at',{ascending:false}).limit(limit),
 logActivity:(action:string,entity_type:string,entity_id:string|undefined,title:string,metadata:Record<string,unknown>={})=>supabase.from('activity_log').insert({action,entity_type,entity_id:entity_id||null,title,metadata}),
 clearActivity:()=>supabase.from('activity_log').delete().not('id','is',null)
}