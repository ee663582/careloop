import type {AssessmentInput,AssessmentResult,ClinicallyReviewedKnowledgeBase,ConditionMatch,MatchStrength} from './types';

const strengthFor=(coverage:number,complete:boolean):MatchStrength=>{
  if(complete&&coverage>=.9)return 'Strong';
  if(coverage>=.7)return 'Moderate';
  if(coverage>=.4)return 'Fair';
  return 'Low';
};

/** Deterministic matching over an explicitly reviewed, sourced knowledge base.
 * No condition is inferred when the database lacks clinical review metadata. */
export function assess(input:AssessmentInput,kb?:ClinicallyReviewedKnowledgeBase):AssessmentResult{
  if(!kb||kb.status!=='clinically-reviewed'||!kb.reviewedAt||!kb.reviewers.length||!kb.sources.length||!kb.conditions.length)
    return {status:'knowledge-base-unavailable',matches:[]};
  const selected=new Set(input.symptoms.map(s=>s.id));
  const matches:ConditionMatch[]=kb.conditions.flatMap(condition=>{
    if(condition.minAge!==undefined&&input.age<condition.minAge)return [];
    if(condition.maxAge!==undefined&&input.age>condition.maxAge)return [];
    if(condition.bodyTypes&&!condition.bodyTypes.includes(input.bodyType))return [];
    if(condition.excludedSymptoms?.some(id=>selected.has(id)))return [];
    const entries=Object.entries(condition.symptomWeights).filter(([id])=>selected.has(id));
    const total=Object.values(condition.symptomWeights).reduce((a,b)=>a+b,0);
    if(!entries.length||total<=0)return [];
    const matched=entries.reduce((sum,[,weight])=>sum+weight,0),required=condition.requiredSymptoms??[];
    const missing=required.filter(id=>!selected.has(id));
    return [{condition,strength:strengthFor(matched/total,missing.length===0),matchedSymptoms:entries.map(([id])=>id),missingRequired:missing}];
  });
  const order:MatchStrength[]=['Strong','Moderate','Fair','Low'];
  matches.sort((a,b)=>order.indexOf(a.strength)-order.indexOf(b.strength));
  return {status:'matched',matches};
}

export function isValidatedKnowledgeBase(value:unknown):value is ClinicallyReviewedKnowledgeBase{
  if(!value||typeof value!=='object')return false;
  const kb=value as Partial<ClinicallyReviewedKnowledgeBase>;
  return kb.status==='clinically-reviewed'&&typeof kb.version==='string'&&!!kb.reviewedAt&&Array.isArray(kb.reviewers)&&kb.reviewers.length>0&&Array.isArray(kb.sources)&&kb.sources.length>0&&Array.isArray(kb.conditions)&&kb.conditions.length>0;
}
