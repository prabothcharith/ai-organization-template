export type AgentManifest = Record<string,unknown>;

const requiredStrings=['id','display_name','role_title','definition_ref','department','engine_profile','permission_profile','mission','activation'];
const engines=new Set(['codex','gemini']);
const activations=new Set(['core','later']);

export function validateAgentManifest(value:unknown,expectedId:string):string[] {
  if(!value||typeof value!=='object'||Array.isArray(value))return ['manifest must be a JSON object'];
  const manifest=value as AgentManifest;const errors:string[]=[];
  if(manifest.schema_version!==1)errors.push('schema_version must equal 1');
  for(const field of requiredStrings)if(typeof manifest[field]!=='string'||!(manifest[field] as string).trim())errors.push(`${field} must be a non-empty string`);
  if(manifest.id!==expectedId)errors.push(`id must match directory name ${expectedId}`);
  if(manifest.definition_ref!==`../catalog.yaml#${expectedId}`)errors.push('definition_ref must target the matching catalog entry');
  if(!engines.has(String(manifest.engine_profile)))errors.push('engine_profile must be codex or gemini');
  if(!activations.has(String(manifest.activation)))errors.push('activation must be core or later');
  if(manifest.organization_concurrency_limit!==4)errors.push('organization_concurrency_limit must equal 4');
  if(manifest.requires_project_preflight!==true)errors.push('requires_project_preflight must be true');
  if(manifest.governed_memory!==true)errors.push('governed_memory must be true');
  return errors;
}
